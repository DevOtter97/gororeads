export interface User {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    photoURL?: string;
    age?: number;
    country?: string;
    createdAt: Date;
    isProfileComplete?: boolean;
}
