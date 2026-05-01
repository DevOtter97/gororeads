import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    getDocs,
    writeBatch,
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

    async getUserByUsername(username: string): Promise<User | null> {
        // Resuelve username -> userId via la coleccion de reservas y luego trae el perfil
        const usernameRef = doc(db, USERNAMES_COLLECTION, username.toLowerCase());
        const usernameSnap = await getDoc(usernameRef);
        if (!usernameSnap.exists()) return null;
        const userId = usernameSnap.data().userId as string;
        return this.getUserProfile(userId);
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
    },

    /**
     * Sincroniza el email en Firestore tras un cambio confirmado en Firebase Auth.
     *
     * Actualiza atomicamente:
     * - `users/{userId}.email`
     * - `usernames/{username}.email` (para que el login por username siga
     *    resolviendo al email correcto)
     *
     * Llamado desde el listener `onAuthStateChanged` cuando el email del
     * FirebaseUser difiere del guardado en Firestore — tipicamente justo
     * despues de que el usuario haya pulsado el link de verifyBeforeUpdateEmail.
     */
    async updateUserEmail(userId: string, username: string, newEmail: string): Promise<void> {
        const batch = writeBatch(db);
        batch.update(doc(db, USERS_COLLECTION, userId), {
            email: newEmail,
            updatedAt: Timestamp.now(),
        });
        batch.update(doc(db, USERNAMES_COLLECTION, username.toLowerCase()), {
            email: newEmail,
        });
        await batch.commit();
    }
};
