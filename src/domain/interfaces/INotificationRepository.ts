export interface Notification {
    id: string;
    userId: string;
    type: 'friend_request_received' | 'friend_request_accepted';
    title: string;
    message: string;
    fromUserId: string;
    fromUsername: string;
    fromUserPhotoUrl?: string;
    read: boolean;
    createdAt: Date;
}

export interface INotificationRepository {
    createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<void>;
    getNotifications(userId: string, limitCount?: number): Promise<Notification[]>;
    getUnreadCount(userId: string): Promise<number>;
    markAsRead(notificationId: string): Promise<void>;
    markAllAsRead(userId: string): Promise<void>;
    onUnreadCountChanged(userId: string, callback: (count: number) => void): () => void;
}
