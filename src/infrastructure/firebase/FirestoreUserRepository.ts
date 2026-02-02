import {
    collection,
    doc,
    getDoc,
    setDoc,
    query,
    where,
    getDocs,
    Timestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { User } from '../../domain/entities/User';

const USERS_COLLECTION = 'users';
const USERNAMES_COLLECTION = 'usernames';

export const userRepository = {
    async checkUsernameAvailability(username: string): Promise<boolean> {
        const usernameRef = doc(db, USERNAMES_COLLECTION, username.toLowerCase());
        const usernameSnap = await getDoc(usernameRef);
        return !usernameSnap.exists();
    },

    async createUsernameReservation(username: string, userId: string, email: string): Promise<void> {
        const usernameRef = doc(db, USERNAMES_COLLECTION, username.toLowerCase());
        await setDoc(usernameRef, {
            userId,
            email,
            createdAt: Timestamp.now()
        });
    },

    async createUserProfile(user: User): Promise<void> {
        const userRef = doc(db, USERS_COLLECTION, user.id);
        await setDoc(userRef, {
            email: user.email,
            username: user.username,
            displayName: user.displayName || user.username,
            createdAt: Timestamp.fromDate(user.createdAt),
            updatedAt: Timestamp.now()
        });
    },

    async getEmailByUsername(username: string): Promise<string | null> {
        const usernameRef = doc(db, USERNAMES_COLLECTION, username.toLowerCase());
        const usernameSnap = await getDoc(usernameRef);

        if (!usernameSnap.exists()) {
            return null;
        }

        return usernameSnap.data().email as string;
    },

    async getUserProfile(userId: string): Promise<User | null> {
        const userRef = doc(db, USERS_COLLECTION, userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return null;
        }

        const data = userSnap.data();
        return {
            id: userId,
            email: data.email,
            username: data.username,
            displayName: data.displayName,
            createdAt: data.createdAt.toDate(),
            isProfileComplete: true
        };
    }
};
