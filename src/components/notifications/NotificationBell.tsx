import { useState, useEffect, useRef } from 'preact/hooks';
import { notificationRepository } from '../../infrastructure/firebase/FirestoreNotificationRepository';
import type { Notification } from '../../domain/interfaces/INotificationRepository';

interface Props {
    userId: string;
}

function timeAgo(date: Date): string {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'hace un momento';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `hace ${days}d`;
    return date.toLocaleDateString();
}

export default function NotificationBell({ userId }: Props) {
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Real-time unread count
    useEffect(() => {
        if (!userId) return;
        return notificationRepository.onUnreadCountChanged(userId, setUnreadCount);
    }, [userId]);

    // Click outside to close
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const toggleDropdown = async () => {
        const opening = !isOpen;
        setIsOpen(opening);

        if (opening) {
            setLoading(true);
            try {
                const data = await notificationRepository.getNotifications(userId);
                setNotifications(data);
            } catch (err) {
                console.error('Error loading notifications:', err);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await notificationRepository.markAsRead(notificationId);
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
            );
        } catch (err) {
            console.error('Error marking as read:', err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationRepository.markAllAsRead(userId);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    };

    return (
        <div class="notification-bell" ref={dropdownRef}>
            <button class="notification-bell-btn" onClick={toggleDropdown} aria-label="Notificaciones">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && (
                    <span class="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div class="notification-dropdown">
                    <div class="notification-dropdown-header">
                        <span class="notification-dropdown-title">Notificaciones</span>
                        {unreadCount > 0 && (
                            <button class="notification-mark-all" onClick={handleMarkAllAsRead}>
                                Marcar todas como leidas
                            </button>
                        )}
                    </div>

                    <div class="notification-dropdown-body">
                        {loading ? (
                            <div class="notification-loading">
                                <div class="spinner"></div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div class="notification-empty">
                                No tienes notificaciones
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    class={`notification-item ${!n.read ? 'unread' : ''}`}
                                    onClick={() => !n.read && handleMarkAsRead(n.id)}
                                >
                                    <div class="notification-item-avatar">
                                        {n.fromUserPhotoUrl ? (
                                            <img src={n.fromUserPhotoUrl} alt={n.fromUsername} />
                                        ) : (
                                            <span>{n.fromUsername.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div class="notification-item-content">
                                        <p class="notification-item-message">{n.message}</p>
                                        <span class="notification-item-time">{timeAgo(n.createdAt)}</span>
                                    </div>
                                    {!n.read && <div class="notification-unread-dot"></div>}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            <style>{`
                .notification-bell {
                    position: relative;
                }

                .notification-bell-btn {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    color: var(--text-secondary);
                    transition: all var(--transition-fast);
                    cursor: pointer;
                    background: none;
                    border: none;
                }

                .notification-bell-btn:hover {
                    color: var(--text-primary);
                    background: var(--bg-tertiary, rgba(255,255,255,0.05));
                }

                .notification-badge {
                    position: absolute;
                    top: 2px;
                    right: 2px;
                    min-width: 16px;
                    height: 16px;
                    padding: 0 4px;
                    border-radius: 8px;
                    background: var(--status-dropped);
                    color: white;
                    font-size: 0.65rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    line-height: 1;
                }

                .notification-dropdown {
                    position: absolute;
                    top: calc(100% + 8px);
                    right: 0;
                    width: 340px;
                    max-height: 420px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                    z-index: 200;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .notification-dropdown-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: var(--space-3) var(--space-4);
                    border-bottom: 1px solid var(--border-color);
                }

                .notification-dropdown-title {
                    font-weight: 600;
                    font-size: 0.875rem;
                    color: var(--text-primary);
                }

                .notification-mark-all {
                    background: none;
                    border: none;
                    color: var(--accent-primary);
                    font-size: 0.75rem;
                    cursor: pointer;
                    padding: 0;
                }

                .notification-mark-all:hover {
                    text-decoration: underline;
                }

                .notification-dropdown-body {
                    overflow-y: auto;
                    flex: 1;
                }

                .notification-loading {
                    display: flex;
                    justify-content: center;
                    padding: var(--space-6);
                }

                .notification-empty {
                    padding: var(--space-6);
                    text-align: center;
                    color: var(--text-muted);
                    font-size: 0.875rem;
                }

                .notification-item {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    padding: var(--space-3) var(--space-4);
                    cursor: pointer;
                    transition: background var(--transition-fast);
                }

                .notification-item:hover {
                    background: var(--bg-tertiary, rgba(255,255,255,0.03));
                }

                .notification-item.unread {
                    background: rgba(139, 92, 246, 0.05);
                }

                .notification-item-avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: var(--accent-primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    overflow: hidden;
                    color: white;
                    font-weight: 700;
                    font-size: 0.875rem;
                }

                .notification-item-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .notification-item-content {
                    flex: 1;
                    min-width: 0;
                }

                .notification-item-message {
                    font-size: 0.8125rem;
                    color: var(--text-primary);
                    line-height: 1.4;
                    margin: 0;
                }

                .notification-item-time {
                    font-size: 0.7rem;
                    color: var(--text-muted);
                }

                .notification-unread-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--accent-primary);
                    flex-shrink: 0;
                }
            `}</style>
        </div>
    );
}
