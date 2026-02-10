import { useState, useEffect } from 'preact/hooks';
import type { FriendRequest } from '../../domain/interfaces/IFriendRepository';
import { friendRepository } from '../../infrastructure/firebase/FirestoreFriendRepository';
import { notificationRepository } from '../../infrastructure/firebase/FirestoreNotificationRepository';
import { userRepository } from '../../infrastructure/firebase/FirestoreUserRepository';

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
                } catch (notifErr: any) {
                    console.error('Error creating notification:', notifErr);
                    if (notifErr?.code === 'permission-denied') {
                        console.error('Permission denied when creating notification. Check Firestore rules.');
                    }
                }
            }
        } catch (err) {
            console.error('Error responding to request:', err);
            alert('Error al procesar la solicitud');
        }
    };

    if (loading) {
        return (
            <div class="loading-container">
                <div class="spinner"></div>
                <p>Cargando solicitudes...</p>
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div class="empty-state">
                <svg class="empty-state-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                    <line x1="20" y1="8" x2="20" y2="14"></line>
                    <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
                <h3 class="empty-state-title">No hay solicitudes</h3>
                <p class="empty-state-text">Te avisaremos cuando alguien quiera conectar contigo.</p>
            </div>
        );
    }

    return (
        <div class="grid gap-4">
            {requests.map(req => (
                <div key={req.id} class="card p-4 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-white font-bold overflow-hidden">
                            {req.fromUserPhotoUrl ? (
                                <img src={req.fromUserPhotoUrl} alt={req.fromUsername} class="w-full h-full object-cover" />
                            ) : (
                                req.fromUsername.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div>
                            <p class="font-medium text-[var(--text-primary)]">
                                <span class="text-[var(--accent-primary)]">{req.fromUsername}</span> quiere ser tu amigo
                            </p>
                            <p class="text-xs text-[var(--text-muted)]">
                                {req.createdAt.toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button
                            onClick={() => handleRespond(req.id, 'accepted')}
                            class="btn btn-sm btn-primary"
                        >
                            Aceptar
                        </button>
                        <button
                            onClick={() => handleRespond(req.id, 'rejected')}
                            class="btn btn-sm btn-secondary"
                        >
                            Rechazar
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
