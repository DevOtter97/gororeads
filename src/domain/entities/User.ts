export interface User {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    photoURL?: string;
    age?: number;
    country?: string;
    createdAt: Date;
    /**
     * Timestamp del ultimo cambio de username. Lo usa el flujo de "cambiar
     * username" para enforzar el cooldown (30 dias). Undefined si el usuario
     * nunca ha cambiado su username (creacion no cuenta como cambio).
     */
    usernameChangedAt?: Date;
    isProfileComplete?: boolean;
}

/**
 * Cooldown entre cambios de username, en milisegundos.
 * Mirar tambien firestore.rules (`users/{userId}` update rule) que enforza
 * lo mismo server-side para que el cliente no pueda saltarselo.
 */
export const USERNAME_CHANGE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
