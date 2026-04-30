import { useState, useEffect } from 'preact/hooks';
import type { Notification } from '../../domain/interfaces/INotificationRepository';
import { notificationRepository } from '../../infrastructure/firebase/FirestoreNotificationRepository';
import { useAuth } from '../../hooks/useAuth';
import Header from '../Header';
import LoadingState from '../LoadingState';
import EmptyState from '../EmptyState';
import { resolveNotificationTarget } from './notificationTarget';
import { timeAgo } from '../../utils/timeAgo';

const PAGE_LIMIT = 100;

export default function NotificationsPage() {
    const { user } = useAuth({ redirectIfUnauthenticated: '/' });
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user?.id) return;
        const load = async () => {
            try {
                setLoading(true);
                const data = await notificationRepository.getNotifications(user.id, PAGE_LIMIT);
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.read).length);
            } catch (err) {
                console.error('Error loading notifications:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user?.id]);

    const handleClick = async (n: Notification) => {
        if (!n.read) {
            await notificationRepository.markAsRead(n.id).catch(console.error);
            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
            setUnreadCount(c => Math.max(0, c - 1));
        }
        const target = resolveNotificationTarget(n);
        if (target) window.location.href = target;
    };

    const handleMarkAllAsRead = async () => {
        if (!user?.id) return;
        try {
            await notificationRepository.markAllAsRead(user.id);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    };

    if (loading) return <LoadingState message="Cargando notificaciones..." />;
    if (!user) return null;

    return (
        <div class="min-h-screen">
            <Header user={user} activeTab="home" />
            <main class="container notifications-main">
                <div class="notifications-header">
                    <h1 class="page-title">Notificaciones</h1>
                    {unreadCount > 0 && (
                        <button class="btn btn-ghost btn-sm" onClick={handleMarkAllAsRead}>
                            Marcar todas como leidas
                        </button>
                    )}
                </div>

                {notifications.length === 0 ? (
                    <EmptyState
                        icon={
                            <svg class="empty-state-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                        }
                        title="No tienes notificaciones"
                        description="Cuando alguien interactúe contigo aparecerá aquí."
                    />
                ) : (
                    <ul class="notifications-list">
                        {notifications.map(n => (
                            <li key={n.id}>
                                <button
                                    class={`notification-row ${!n.read ? 'unread' : ''}`}
                                    onClick={() => handleClick(n)}
                                >
                                    <div class="notification-row-avatar">
                                        {n.fromUserPhotoUrl ? (
                                            <img src={n.fromUserPhotoUrl} alt={n.fromUsername} />
                                        ) : (
                                            <span>{n.fromUsername.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div class="notification-row-content">
                                        <p class="notification-row-message">{n.message}</p>
                                        <span class="notification-row-time">{timeAgo(n.createdAt)}</span>
                                    </div>
                                    {!n.read && <div class="notification-row-dot" />}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </main>

            <style>{`
                .notifications-main {
                    padding-top: var(--space-6);
                    padding-bottom: var(--space-12);
                    max-width: 720px;
                    margin: 0 auto;
                }

                .notifications-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: var(--space-3);
                    margin-bottom: var(--space-5);
                    flex-wrap: wrap;
                }
                .page-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin: 0;
                    color: var(--text-primary);
                }

                .notifications-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-2);
                }

                .notification-row {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    width: 100%;
                    padding: var(--space-3) var(--space-4);
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-md);
                    text-align: left;
                    transition: all var(--transition-fast);
                }
                .notification-row:hover {
                    border-color: var(--accent-primary);
                }
                .notification-row.unread {
                    background: rgba(139, 92, 246, 0.08);
                }

                .notification-row-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: var(--accent-gradient);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    flex-shrink: 0;
                    color: white;
                    font-weight: 700;
                }
                .notification-row-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .notification-row-content {
                    flex: 1;
                    min-width: 0;
                }
                .notification-row-message {
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 0.9375rem;
                    line-height: 1.4;
                    word-break: break-word;
                }
                .notification-row-time {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    margin-top: 2px;
                    display: inline-block;
                }

                .notification-row-dot {
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
