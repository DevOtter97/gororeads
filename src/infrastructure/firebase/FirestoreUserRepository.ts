import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
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
        const data: Record<string, any> = {
            email: user.email,
            username: user.username,
            displayName: user.displayName || user.username,
            createdAt: Timestamp.fromDate(user.createdAt),
            updatedAt: Timestamp.now()
        };
        if (user.photoURL) data.photoURL = user.photoURL;
        await setDoc(userRef, data);
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
            photoURL: data.photoURL || undefined,
            age: data.age || undefined,
            country: data.country || undefined,
            createdAt: data.createdAt.toDate(),
            isProfileComplete: true
        };
    },

    async updateUserProfile(userId: string, data: Partial<Pick<User, 'displayName' | 'photoURL' | 'age' | 'country'>>): Promise<void> {
        const userRef = doc(db, USERS_COLLECTION, userId);
        const updateData: Record<string, any> = { updatedAt: Timestamp.now() };
        if (data.displayName !== undefined) updateData.displayName = data.displayName;
        if (data.photoURL !== undefined) updateData.photoURL = data.photoURL;
        if (data.age !== undefined) updateData.age = data.age;
        if (data.country !== undefined) updateData.country = data.country;
        await updateDoc(userRef, updateData);
    }
};
