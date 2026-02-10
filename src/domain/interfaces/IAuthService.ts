import type { User } from '../entities/User';

export interface AuthCredentials {
    email: string; // Can be email or username for login
    username?: string; // Required for registration
    password: string;
}

export interface IAuthService {
    login(credentials: AuthCredentials): Promise<User>;
    register(credentials: AuthCredentials): Promise<User>;
    logout(): Promise<void>;
    getCurrentUser(): User | null;
    onAuthStateChanged(callback: (user: User | null) => void): () => void;
}
