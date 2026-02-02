import type { User } from '../entities/User';

export interface AuthCredentials {
    email: string;
    password: string;
}

export interface IAuthService {
    login(credentials: AuthCredentials): Promise<User>;
    register(credentials: AuthCredentials): Promise<User>;
    logout(): Promise<void>;
    getCurrentUser(): User | null;
    onAuthStateChanged(callback: (user: User | null) => void): () => void;
}
