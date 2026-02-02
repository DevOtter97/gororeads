export interface User {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    createdAt: Date;
    isProfileComplete?: boolean;
}
