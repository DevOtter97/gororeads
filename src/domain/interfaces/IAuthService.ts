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

    /**
     * Re-autentica al usuario actual con su contraseña vigente. Necesario antes
     * de operaciones sensibles (cambio de email/password) si Firebase devuelve
     * `auth/requires-recent-login`. Llamarlo previo siempre es la opcion segura.
     */
    reauthenticate(currentPassword: string): Promise<void>;

    /**
     * Solicita cambiar el email del usuario actual. Firebase envia un email de
     * verificacion al `newEmail`; el cambio NO se aplica hasta que el usuario
     * abra el link de ese email. El email actual sigue activo hasta entonces.
     *
     * Errores Firebase tipicos:
     * - `auth/email-already-in-use`: el nuevo email ya esta registrado
     * - `auth/invalid-email`: formato invalido
     * - `auth/requires-recent-login`: re-auth necesaria (llamar reauthenticate antes)
     */
    requestEmailChange(newEmail: string): Promise<void>;

    /**
     * Cambia la contraseña del usuario actual de forma inmediata. Firebase NO
     * envia email de notificacion automaticamente. Requiere re-auth reciente.
     *
     * Errores Firebase tipicos:
     * - `auth/weak-password`: nueva contraseña demasiado corta (<6 chars)
     * - `auth/requires-recent-login`: re-auth necesaria
     */
    changePassword(newPassword: string): Promise<void>;
}
