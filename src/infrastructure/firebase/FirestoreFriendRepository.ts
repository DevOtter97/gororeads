import { db } from '../../config/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    Timestamp,
    runTransaction,
    limit,
    orderBy,
    startAt,
    endAt,
    getDoc
} from 'firebase/firestore';
import type { IFriendRepository, FriendRequest, Friend } from '../../domain/interfaces/IFriendRepository';
import type { User } from '../../domain/entities/User';

export class FirestoreFriendRepository implements IFriendRepository {

    async searchUsers(searchQuery: string, currentUserId: string): Promise<User[]> {
        if (!searchQuery || searchQuery.length < 2) return [];

        const normalizedQuery = searchQuery.toLowerCase();
        // Note: Ideally we should store a lowercase 'username_lowercase' field for reliable search.
        // For now, we'll try a simple range query on 'username'. 
        // If the database has mixed case, this might be tricky without a dedicated lowercase field.
        // Assuming usernames are stored or can be searched.

        const usersRef = collection(db, 'users');
        // Simple prefix search
        const q = query(
            usersRef,
            orderBy('username'),
            startAt(searchQuery),
            endAt(searchQuery + '\uf8ff'),
            limit(10)
        );

        const snapshot = await getDocs(q);
        const users: User[] = [];

        snapshot.forEach(doc => {
            if (doc.id !== currentUserId) {
                const data = doc.data();
                users.push({
                    id: doc.id,
                    username: data.username,
                    email: data.email,
                    displayName: data.displayName,
                    photoURL: data.photoURL,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                    isProfileComplete: data.isProfileComplete
                } as User);
            }
        });

        return users;
    }

    async sendFriendRequest(fromUser: User, toUserId: string): Promise<void> {
        // Check if request already exists
        const status = await this.checkFriendshipStatus(fromUser.id, toUserId);
        if (status !== 'none') {
            throw new Error('Friendship status is not "none"');
        }

        const requestsRef = collection(db, 'friend_requests');
        await addDoc(requestsRef, {
            fromUserId: fromUser.id,
            fromUsername: fromUser.username,
            fromUserPhotoUrl: fromUser.photoURL || null,
            toUserId: toUserId,
            status: 'pending',
            createdAt: serverTimestamp()
        });
    }

    async getPendingRequests(userId: string): Promise<FriendRequest[]> {
        const requestsRef = collection(db, 'friend_requests');
        const q = query(
            requestsRef,
            where('toUserId', '==', userId),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                fromUserId: data.fromUserId,
                fromUsername: data.fromUsername,
                fromUserPhotoUrl: data.fromUserPhotoUrl,
                toUserId: data.toUserId,
                status: data.status,
                createdAt: data.createdAt?.toDate() || new Date()
            };
        });
    }

    async respondToRequest(requestId: string, status: 'accepted' | 'rejected'): Promise<void> {
        if (status === 'rejected') {
            const requestRef = doc(db, 'friend_requests', requestId);
            await updateDoc(requestRef, { status: 'rejected' });
            return;
        }

        if (status === 'accepted') {
            await runTransaction(db, async (transaction) => {
                const requestRef = doc(db, 'friend_requests', requestId);
                const requestDoc = await transaction.get(requestRef);

                if (!requestDoc.exists()) throw new Error('Request not found');
                const requestData = requestDoc.data();

                if (requestData.status !== 'pending') throw new Error('Request is not pending');

                const { fromUserId, toUserId, fromUsername, fromUserPhotoUrl } = requestData;

                // Get toUser data for the reciprocal friend entry
                const toUserDoc = await transaction.get(doc(db, 'users', toUserId));
                if (!toUserDoc.exists()) throw new Error('User not found');
                const toUserData = toUserDoc.data();

                // Add to fromUser's friend list
                const fromUserFriendRef = doc(db, `users/${fromUserId}/friends/${toUserId}`);
                transaction.set(fromUserFriendRef, {
                    username: toUserData.username,
                    photoUrl: toUserData.photoURL || null,
                    addedAt: serverTimestamp()
                });

                // Add to toUser's friend list
                const toUserFriendRef = doc(db, `users/${toUserId}/friends/${fromUserId}`);
                transaction.set(toUserFriendRef, {
                    username: fromUsername,
                    photoUrl: fromUserPhotoUrl || null,
                    addedAt: serverTimestamp()
                });

                // Update request status
                transaction.update(requestRef, { status: 'accepted' });
            });
        }
    }

    async getFriends(userId: string): Promise<Friend[]> {
        const friendsRef = collection(db, `users/${userId}/friends`);
        const snapshot = await getDocs(friendsRef);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                userId: doc.id,
                username: data.username,
                photoUrl: data.photoUrl,
                addedAt: data.addedAt?.toDate() || new Date()
            };
        });
    }

    async checkFriendshipStatus(currentUserId: string, targetUserId: string): Promise<'none' | 'pending_sent' | 'pending_received' | 'friends'> {
        // 1. Check if they are friends
        const friendDoc = await getDoc(doc(db, `users/${currentUserId}/friends/${targetUserId}`));
        if (friendDoc.exists()) return 'friends';

        // 2. Check for sent requests
        const sentQuery = query(
            collection(db, 'friend_requests'),
            where('fromUserId', '==', currentUserId),
            where('toUserId', '==', targetUserId),
            where('status', '==', 'pending')
        );
        const sentSnapshot = await getDocs(sentQuery);
        if (!sentSnapshot.empty) return 'pending_sent';

        // 3. Check for received requests
        const receivedQuery = query(
            collection(db, 'friend_requests'),
            where('fromUserId', '==', targetUserId),
            where('toUserId', '==', currentUserId),
            where('status', '==', 'pending')
        );
        const receivedSnapshot = await getDocs(receivedQuery);
        if (!receivedSnapshot.empty) return 'pending_received';

        return 'none';
    }
}

export const friendRepository = new FirestoreFriendRepository();
