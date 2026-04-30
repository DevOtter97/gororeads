import { useState, useEffect } from 'preact/hooks';
import type { FriendRequest } from '../../domain/interfaces/IFriendRepository';
import { friendRepository } from '../../infrastructure/firebase/FirestoreFriendRepository';
import { notificationRepository } from '../../infrastructure/firebase/FirestoreNotificationRepository';
import { userRepository } from '../../infrastructure/firebase/FirestoreUserRepository';
import LoadingState from '../LoadingState';
import EmptyState from '../EmptyState';
import UserAvatar from '../UserAvatar';

interface Props {
    userId: string;
    onRequestHandled?: () => void;
}

export default function FriendRequestList({ userId, onRequestHandled }: Props) {
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        const loadRequests = async () => {
            try {
                const data = await friendRepository.getPendingRequests(userId);
                setRequests(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadRequests();
    }, [userId]);

    const handleRespond = async (requestId: string, status: 'accepted' | 'rejected') => {
        try {
            const request = requests.find(r => r.id === requestId);
            await friendRepository.respondToRequest(requestId, status);
            setRequests(prev => prev.filter(r => r.id !== requestId));
            onRequestHandled?.();

            if (status === 'accepted' && request) {
                try {
                    const currentUser = await userRepository.getUserProfile(userId);
                    if (currentUser) {
                        await notificationRepository.createNotification({
                            userId: request.fromUserId,
                            type: 'friend_request_accepted',
                            title: 'Solicitud aceptada',
                            message: `${currentUser.username} acepto tu solicitud de amistad`,
                            fromUserId: userId,
                            fromUsername: currentUser.username,
                            fromUserPhotoUrl: currentUser.photoURL,
                            read: false
                        });
                    }
                } catch (notifErr) {
                    console.error('Error creating notification:', notifErr);
                }
            }
        } catch (err) {
            console.error('Error responding to request:', err);
            alert('Error al procesar la solicitud');
        }
    };

    if (loading) {
        return <LoadingState message="Cargando solicitudes..." fullScreen={false} />;
    }

    if (requests.length === 0) {
        return (
            <EmptyState
                icon={
                    <svg class="empty-state-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                        <line x1="20" y1="8" x2="20" y2="14" />
                        <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                }
                title="No hay solicitudes"
                description="Te avisaremos cuando alguien quiera conectar contigo."
            />
        );
    }

    return (
        <>
            <ul class="requests-list">
                {requests.map(req => (
                    <li key={req.id} class="request-card">
                        <a href={`/profile/${req.fromUsername}`} class="request-info">
                            <UserAvatar username={req.fromUsername} photoUrl={req.fromUserPhotoUrl} />
                            <div class="request-text">
                                <p class="request-message">
                                    <span class="request-username">{req.fromUsername}</span> quiere ser tu amigo
                                </p>
                                <p class="request-date">{req.createdAt.toLocaleDateString()}</p>
                            </div>
                        </a>
                        <div class="request-actions">
                            <button
                                onClick={() => handleRespond(req.id, 'accepted')}
                                class="btn btn-sm btn-accept"
                            >
                                Aceptar
                            </button>
                            <button
                                onClick={() => handleRespond(req.id, 'rejected')}
                                class="btn btn-sm btn-ghost btn-reject"
                            >
                                Rechazar
                            </button>
                        </div>
                    </li>
                ))}
            </ul>

            <style>{`
                .requests-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-3);
                }

                .request-card {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: var(--space-4);
                    padding: var(--space-4);
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-lg);
                    transition: border-color var(--transition-fast);
                }
                .request-card:hover {
                    border-color: var(--accent-primary);
                }

                .request-info {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    text-decoration: none;
                    color: inherit;
                    min-width: 0;
                    flex: 1;
                }

                .request-text {
                    min-width: 0;
                }

                .request-message {
                    color: var(--text-primary);
                    margin: 0;
                    font-weight: 500;
                }

                .request-username {
                    color: var(--accent-primary);
                }

                .request-date {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    margin: 2px 0 0;
                }

                .request-actions {
                    display: flex;
                    gap: var(--space-2);
                    flex-shrink: 0;
                }

                .btn-accept {
                    background: var(--status-success);
                    color: white;
                }
                .btn-accept:hover {
                    filter: brightness(1.1);
                }
                .btn-reject {
                    color: var(--text-muted);
                }
                .btn-reject:hover {
                    color: var(--status-danger);
                    background: transparent;
                }

                @media (max-width: 480px) {
                    .request-card {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .request-actions {
                        justify-content: flex-end;
                    }
                }
            `}</style>
        </>
    );
}
