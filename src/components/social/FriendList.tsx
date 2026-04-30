import { useState, useEffect } from 'preact/hooks';
import type { Friend } from '../../domain/interfaces/IFriendRepository';
import { friendRepository } from '../../infrastructure/firebase/FirestoreFriendRepository';
import LoadingState from '../LoadingState';
import UserAvatar from '../UserAvatar';

interface Props {
    userId: string;
    onSwitchToSearch?: () => void;
}

export default function FriendList({ userId, onSwitchToSearch }: Props) {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);
    const [removeConfirm, setRemoveConfirm] = useState<Friend | null>(null);
    const [removing, setRemoving] = useState(false);

    useEffect(() => {
        if (!userId) return;

        const loadFriends = async () => {
            try {
                const data = await friendRepository.getFriends(userId);
                setFriends(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadFriends();
    }, [userId]);

    const handleRemove = async () => {
        if (!removeConfirm) return;
        setRemoving(true);
        try {
            await friendRepository.removeFriend(userId, removeConfirm.userId);
            setFriends(prev => prev.filter(f => f.userId !== removeConfirm.userId));
            setRemoveConfirm(null);
        } catch (err) {
            console.error('Error removing friend:', err);
            alert('Error al eliminar amigo');
        } finally {
            setRemoving(false);
        }
    };

    if (loading) {
        return <LoadingState message="Cargando amigos..." fullScreen={false} />;
    }

    if (friends.length === 0) {
        return (
            <div class="empty-state">
                <svg class="empty-state-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <h3 class="empty-state-title">No tienes amigos agregados</h3>
                <p class="empty-state-text">Encuentra gente y empieza a socializar.</p>
                {onSwitchToSearch && (
                    <button class="btn btn-primary" onClick={onSwitchToSearch}>
                        Buscar usuarios
                    </button>
                )}
            </div>
        );
    }

    return (
        <>
            <div class="friends-grid">
                {friends.map(friend => (
                    <div key={friend.userId} class="friend-card">
                        <div class="friend-card-info">
                            <UserAvatar username={friend.username} photoUrl={friend.photoUrl} />
                            <div class="friend-card-text">
                                <p class="friend-name">{friend.username}</p>
                                <p class="friend-since">Amigos desde {friend.addedAt.toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div class="friend-card-actions">
                            <a
                                href={`/profile/${friend.username}`}
                                class="btn btn-sm btn-ghost"
                                title="Ver perfil"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                                Perfil
                            </a>
                            <a
                                href={`/profile/${friend.username}#lists`}
                                class="btn btn-sm btn-ghost"
                                title="Ver listas publicas"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                                </svg>
                                Listas
                            </a>
                            <button
                                onClick={() => setRemoveConfirm(friend)}
                                class="btn btn-sm btn-ghost btn-remove"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="8.5" cy="7" r="4" />
                                    <line x1="23" y1="11" x2="17" y2="11" />
                                </svg>
                                Eliminar amigo
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {removeConfirm && (
                <div class="modal-overlay" onClick={() => !removing && setRemoveConfirm(null)}>
                    <div class="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div class="confirm-modal-body">
                            <h3 class="confirm-modal-title">¿Eliminar a {removeConfirm.username}?</h3>
                            <p class="confirm-modal-text">
                                Dejará de ser tu amigo. Podrás enviarle otra solicitud más adelante.
                            </p>
                        </div>
                        <div class="confirm-modal-actions">
                            <button class="btn btn-ghost" onClick={() => setRemoveConfirm(null)} disabled={removing}>
                                Cancelar
                            </button>
                            <button class="btn btn-danger" onClick={handleRemove} disabled={removing}>
                                {removing ? 'Eliminando...' : 'Eliminar amigo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .friends-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
                    gap: var(--space-4);
                }

                .friend-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-lg);
                    padding: var(--space-4);
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-3);
                    transition: border-color var(--transition-fast);
                }
                .friend-card:hover {
                    border-color: var(--accent-primary);
                }

                .friend-card-info {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    min-width: 0;
                }

                .friend-card-text {
                    min-width: 0;
                }

                .friend-name {
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .friend-since {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    margin: 0;
                }

                .friend-card-actions {
                    display: flex;
                    gap: var(--space-2);
                    padding-top: var(--space-3);
                    border-top: 1px solid var(--border-color);
                }
                .friend-card-actions .btn {
                    flex: 1 1 0;
                    min-width: 0;
                }
                .friend-card-actions .btn:not(.btn-remove):hover {
                    background: rgba(139, 92, 246, 0.12);
                    color: var(--accent-primary);
                }
                .friend-card-actions .btn-remove {
                    flex: 1.4 1 0;
                    color: var(--text-muted);
                }
                .friend-card-actions .btn-remove:hover {
                    color: var(--status-danger);
                    background: rgba(239, 68, 68, 0.12);
                }

                .confirm-modal {
                    max-width: 420px;
                }
                .confirm-modal-body {
                    padding: var(--space-6) var(--space-6) var(--space-4);
                }
                .confirm-modal-title {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0 0 var(--space-2);
                }
                .confirm-modal-text {
                    color: var(--text-secondary);
                    font-size: 0.9375rem;
                    line-height: 1.5;
                    margin: 0;
                }
                .confirm-modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: var(--space-2);
                    padding: var(--space-4) var(--space-6);
                    border-top: 1px solid var(--border-color);
                }
            `}</style>
        </>
    );
}
