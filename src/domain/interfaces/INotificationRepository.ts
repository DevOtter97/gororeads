export type NotificationType =
    | 'friend_request_received'
    | 'friend_request_accepted'
    | 'post_liked'
    | 'post_commented'
    | 'post_reposted';

export interface NotificationMetadata {
    /** id del post asociado a la notificacion (post_liked / post_commented / post_reposted) */
    postId?: string;
}

export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    fromUserId: string;
    fromUsername: string;
    fromUserPhotoUrl?: string;
    metadata?: NotificationMetadata;
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
