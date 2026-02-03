import type { User } from '../entities/User';

export interface FriendRequest {
    id: string;
    fromUserId: string;
    fromUsername: string;
    fromUserPhotoUrl?: string;
    toUserId: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Date;
}

export interface Friend {
    userId: string;
    username: string;
    photoUrl?: string;
    addedAt: Date;
}

export interface IFriendRepository {
    searchUsers(query: string, currentUserId: string): Promise<User[]>;
    sendFriendRequest(fromUser: User, toUserId: string): Promise<void>;
    getPendingRequests(userId: string): Promise<FriendRequest[]>;
    respondToRequest(requestId: string, status: 'accepted' | 'rejected'): Promise<void>;
    getFriends(userId: string): Promise<Friend[]>;
    checkFriendshipStatus(currentUserId: string, targetUserId: string): Promise<'none' | 'pending_sent' | 'pending_received' | 'friends'>;
}
