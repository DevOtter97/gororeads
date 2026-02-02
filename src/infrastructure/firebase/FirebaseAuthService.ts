import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged as firebaseOnAuthStateChanged,
    type User as FirebaseUser,
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { auth } from '../../config/firebase';
import { updateProfile } from 'firebase/auth'; // Import updateProfile
import type { IAuthService, AuthCredentials } from '../../domain/interfaces/IAuthService';
import type { User } from '../../domain/entities/User';
import { userRepository } from './FirestoreUserRepository';

function mapFirebaseUser(firebaseUser: FirebaseUser): User {
    // We strive to store username in displayName. 
    // For legacy users without one, we'll use a placeholder or handle it strictly.
    const username = firebaseUser.displayName || `user_${firebaseUser.uid.substring(0, 6)}`;

    return {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        username: username,
        displayName: firebaseUser.displayName || undefined,
        createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()),
        isProfileComplete: false // Defaults to false until verified against Firestore
    };
}

export class FirebaseAuthService implements IAuthService {
    async login(credentials: AuthCredentials): Promise<User> {
        let email = credentials.email.trim(); // Trim input
        console.log('[Auth] Attempting login with:', email);

        // Check if input is likely a username (no @)
        if (!email.includes('@')) {
            console.log('[Auth] Input detected as username. Resolving email...');
            const resolvedEmail = await userRepository.getEmailByUsername(email);
            console.log('[Auth] Resolved email:', resolvedEmail);

            if (!resolvedEmail) {
                console.error('[Auth] Username not found in registry');
                throw new Error('Usuario no encontrado');
            }
            email = resolvedEmail;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(
                auth,
                email,
                credentials.password
            );

            // Try to fetch full profile
            try {
                const userProfile = await userRepository.getUserProfile(userCredential.user.uid);
                if (userProfile) {
                    return userProfile;
                }
            } catch (error) {
                console.error('[Auth] Error fetching profile after login:', error);
            }

            return mapFirebaseUser(userCredential.user);
        } catch (error) {
            console.error('[Auth] Firebase login failed:', error);
            throw error;
        }
    }

    async register(credentials: AuthCredentials): Promise<User> {
        if (!credentials.username) {
            throw new Error('El nombre de usuario es obligatorio');
        }

        const isAvailable = await userRepository.checkUsernameAvailability(credentials.username);
        if (!isAvailable) {
            throw new Error('El nombre de usuario ya está en uso');
        }

        const userCredential = await createUserWithEmailAndPassword(
            auth,
            credentials.email,
            credentials.password
        );

        const firebaseUser = userCredential.user;

        // 1. Update Profile in Auth (store username as displayName)
        await updateProfile(firebaseUser, {
            displayName: credentials.username
        });

        // 2. Create Firestore Records
        const user: User = mapFirebaseUser(firebaseUser);
        // Force username from credentials in case mapFirebaseUser didn't catch the update yet
        user.username = credentials.username;

        await Promise.all([
            userRepository.createUsernameReservation(credentials.username, user.id, user.email),
            userRepository.createUserProfile(user)
        ]);

        return user;
        return user;
    }

    async loginWithGoogle(): Promise<User> {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            // Check Firestore for full profile
            try {
                const userProfile = await userRepository.getUserProfile(result.user.uid);
                if (userProfile) return userProfile;
            } catch (err) {
                console.error('[Auth] Error checking profile:', err);
            }
            // Fallback (will have isProfileComplete: false)
            return mapFirebaseUser(result.user);
        } catch (error) {
            console.error('[Auth] Google login failed:', error);
            throw error;
        }
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
        return firebaseOnAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                callback(null);
                return;
            }

            try {
                // Try to get complete profile from Firestore
                console.log('[Auth] Fetching user profile from Firestore for:', firebaseUser.uid);
                const userProfile = await userRepository.getUserProfile(firebaseUser.uid);
                console.log('[Auth] Firestore profile result:', userProfile);
                if (userProfile) {
                    callback(userProfile);
                    return;
                }
            } catch (error) {
                console.error('[Auth] Error fetching user profile:', error);
            }

            // Fallback to basic Firebase Auth data
            callback(mapFirebaseUser(firebaseUser));
        });
    }
}

// Singleton instance
export const authService = new FirebaseAuthService();
