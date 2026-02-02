import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged as firebaseOnAuthStateChanged,
    type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../../config/firebase';
import type { IAuthService, AuthCredentials } from '../../domain/interfaces/IAuthService';
import type { User } from '../../domain/entities/User';

function mapFirebaseUser(firebaseUser: FirebaseUser): User {
    return {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || undefined,
        createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()),
    };
}

export class FirebaseAuthService implements IAuthService {
    async login(credentials: AuthCredentials): Promise<User> {
        const userCredential = await signInWithEmailAndPassword(
            auth,
            credentials.email,
            credentials.password
        );
        return mapFirebaseUser(userCredential.user);
    }

    async register(credentials: AuthCredentials): Promise<User> {
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            credentials.email,
            credentials.password
        );
        return mapFirebaseUser(userCredential.user);
    }

    async logout(): Promise<void> {
        await signOut(auth);
    }

    getCurrentUser(): User | null {
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) return null;
        return mapFirebaseUser(firebaseUser);
    }

    onAuthStateChanged(callback: (user: User | null) => void): () => void {
        return firebaseOnAuthStateChanged(auth, (firebaseUser) => {
            callback(firebaseUser ? mapFirebaseUser(firebaseUser) : null);
        });
    }
}

// Singleton instance
export const authService = new FirebaseAuthService();
