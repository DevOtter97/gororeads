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
    writeBatch,
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

    async removeFriend(currentUserId: string, friendUserId: string): Promise<void> {
        // Borra ambas entradas reciprocas en una sola operacion atomica
        const batch = writeBatch(db);
        batch.delete(doc(db, `users/${currentUserId}/friends/${friendUserId}`));
        batch.delete(doc(db, `users/${friendUserId}/friends/${currentUserId}`));
        await batch.commit();
    }

    /**
     * Borra TODAS las amistades del usuario (ambos lados) y todas las friend
     * requests donde participa (como `fromUserId` o `toUserId`). Usado por el
     * cascade de eliminacion de cuenta.
     *
     * Las reglas de Firestore permiten al user borrar:
     * - `users/{me}/friends/X` (mi side, auth.uid == userId del path)
     * - `users/{X}/friends/{me}` (su side, auth.uid == friendId del path)
     * - `friend_requests/*` donde fromUserId == me OR toUserId == me
     */
    async deleteAllForUser(userId: string): Promise<void> {
        const CHUNK = 500;

        // 1. Friendships: leer mis amigos, borrar mi side y el suyo
        const friendsRef = collection(db, `users/${userId}/friends`);
        const friendsSnap = await getDocs(friendsRef);
        const friendIds = friendsSnap.docs.map(d => d.id);

        // Cada amistad son 2 docs -> max 250 amistades por batch
        for (let i = 0; i < friendIds.length; i += CHUNK / 2) {
            const batch = writeBatch(db);
            for (const friendId of friendIds.slice(i, i + CHUNK / 2)) {
                batch.delete(doc(db, `users/${userId}/friends/${friendId}`));
                batch.delete(doc(db, `users/${friendId}/friends/${userId}`));
            }
            await batch.commit();
        }

        // 2. Friend requests: where fromUserId == me OR toUserId == me
        // Firestore no soporta OR nativamente -> dos queries y deduplicamos
        const reqRef = collection(db, 'friend_requests');
        const [fromSnap, toSnap] = await Promise.all([
            getDocs(query(reqRef, where('fromUserId', '==', userId))),
            getDocs(query(reqRef, where('toUserId', '==', userId))),
        ]);
        const seen = new Set<string>();
        const requestRefs: ReturnType<typeof doc>[] = [];
        for (const docSnap of [...fromSnap.docs, ...toSnap.docs]) {
            if (seen.has(docSnap.id)) continue;
            seen.add(docSnap.id);
            requestRefs.push(docSnap.ref);
        }
        for (let i = 0; i < requestRefs.length; i += CHUNK) {
            const batch = writeBatch(db);
            for (const ref of requestRefs.slice(i, i + CHUNK)) {
                batch.delete(ref);
            }
            await batch.commit();
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
