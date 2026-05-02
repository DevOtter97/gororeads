import { useState } from 'preact/hooks';
import type { User } from '../../domain/entities/User';
import { friendRepository } from '../../infrastructure/firebase/FirestoreFriendRepository';
import { authService } from '../../infrastructure/firebase/FirebaseAuthService';
import { userRepository } from '../../infrastructure/firebase/FirestoreUserRepository';
import { notificationRepository } from '../../infrastructure/firebase/FirestoreNotificationRepository';
import UserAvatar from '../UserAvatar';

export default function UserSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [sentTo, setSentTo] = useState<Set<string>>(new Set());
    const [friendIds, setFriendIds] = useState<Set<string>>(new Set());

    const handleSearch = async (e: Event) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        if (query.trim().length < 2) {
            setError('Ingresa al menos 2 caracteres.');
            return;
        }

        setLoading(true);
        try {
            const currentUser = authService.getCurrentUser();
            if (!currentUser) throw new Error('No autenticado');

            // Search + friends list en paralelo: la lista de amigos nos permite
            // distinguir resultados que ya son amigos sin hacer N queries extra.
            const [users, friends] = await Promise.all([
                friendRepository.searchUsers(query, currentUser.id),
                friendRepository.getFriends(currentUser.id),
            ]);
            setFriendIds(new Set(friends.map(f => f.userId)));

            // Doble filtro defensivo: excluye tanto por id como por username (usernames
            // son unicos asi que cualquiera de los dos detecta al usuario actual,
            // incluso si la sesion auth esta mid-resolution en Safari).
            const filtered = users.filter(u =>
                u.id !== currentUser.id && u.username.toLowerCase() !== currentUser.username?.toLowerCase()
            );
            setResults(filtered);
            if (filtered.length === 0) {
                setError('No se encontraron usuarios con ese nombre.');
            }
        } catch (err) {
            console.error(err);
            setError('Error al buscar usuarios.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddFriend = async (targetUser: User) => {
        setError('');
        setSuccessMsg('');
        try {
            const currentUser = authService.getCurrentUser();
            if (!currentUser) return;

            const fullProfile = await userRepository.getUserProfile(currentUser.id);
            if (!fullProfile) {
                setError('Error: No se pudo obtener tu perfil.');
                return;
            }

            await friendRepository.sendFriendRequest(fullProfile, targetUser.id);
            setSentTo(prev => new Set(prev).add(targetUser.id));
            setSuccessMsg(`Solicitud enviada a ${targetUser.username}`);

            try {
                await notificationRepository.createNotification({
                    userId: targetUser.id,
                    type: 'friend_request_received',
                    title: 'Nueva solicitud de amistad',
                    message: `${fullProfile.username} te envio una solicitud de amistad`,
                    fromUserId: fullProfile.id,
                    fromUsername: fullProfile.username,
                    fromUserPhotoUrl: fullProfile.photoURL,
                    read: false
                });
            } catch (notifErr: any) {
                console.error('Error creating notification:', notifErr);
            }
        } catch (err: any) {
            console.error(err);
            if (err.message?.includes('Friendship status')) {
                setError('Ya tienes una solicitud pendiente o son amigos.');
            } else {
                setError('Error al enviar solicitud.');
            }
        }
    };

    return (
        <>
            <div class="search-card">
                <h3 class="search-title">Buscar Usuarios</h3>

                <form onSubmit={handleSearch} class="search-form">
                    <div class="search-input-wrapper">
                        <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            value={query}
                            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
                            placeholder="Buscar por nombre de usuario..."
                            class="form-input search-input"
                        />
                    </div>
                    <button type="submit" class="btn btn-primary" disabled={loading}>
                        {loading ? <span class="spinner" /> : 'Buscar'}
                    </button>
                </form>

                {error && <p class="search-msg search-msg--error">{error}</p>}
                {successMsg && <p class="search-msg search-msg--success">{successMsg}</p>}

                {results.length > 0 && (
                    <ul class="results-list">
                        {results.map(user => {
                            const isFriend = friendIds.has(user.id);
                            const alreadySent = sentTo.has(user.id);
                            let action;
                            if (isFriend) {
                                action = (
                                    <a href={`/profile/${user.username}`} class="btn btn-sm btn-friends" title="Ver perfil">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Amigos
                                    </a>
                                );
                            } else if (alreadySent) {
                                action = (
                                    <button class="btn btn-sm btn-secondary" disabled>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Enviada
                                    </button>
                                );
                            } else {
                                action = (
                                    <button onClick={() => handleAddFriend(user)} class="btn btn-sm btn-secondary">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                            <circle cx="8.5" cy="7" r="4" />
                                            <line x1="20" y1="8" x2="20" y2="14" />
                                            <line x1="23" y1="11" x2="17" y2="11" />
                                        </svg>
                                        Añadir
                                    </button>
                                );
                            }
                            return (
                                <li key={user.id} class="result-row">
                                    <a href={`/profile/${user.username}`} class="result-info">
                                        <UserAvatar username={user.username} photoUrl={user.photoURL} />
                                        <p class="result-name">{user.username}</p>
                                    </a>
                                    {action}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <style>{`
                .search-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-lg);
                    padding: var(--space-6);
                }

                .search-title {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0 0 var(--space-4);
                }

                .search-form {
                    display: flex;
                    gap: var(--space-3);
                    margin-bottom: var(--space-5);
                }

                .search-input-wrapper {
                    position: relative;
                    flex: 1;
                }

                .search-icon {
                    position: absolute;
                    left: var(--space-3);
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                    pointer-events: none;
                }

                .search-input {
                    width: 100%;
                    padding-left: calc(var(--space-3) * 2 + 18px);
                }

                .search-msg {
                    margin: 0 0 var(--space-4);
                    padding: var(--space-3) var(--space-4);
                    border-radius: var(--border-radius-md);
                    font-size: 0.875rem;
                }

                .search-msg--error {
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--status-danger);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }

                .search-msg--success {
                    background: rgba(16, 185, 129, 0.1);
                    color: var(--status-success);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                }

                .results-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-3);
                }

                .result-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: var(--space-3);
                    padding: var(--space-3) var(--space-4);
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-md);
                    transition: border-color var(--transition-fast);
                }
                .result-row:hover {
                    border-color: var(--accent-primary);
                }

                .result-info {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    text-decoration: none;
                    color: inherit;
                    min-width: 0;
                    flex: 1;
                }

                .result-name {
                    font-weight: 500;
                    color: var(--text-primary);
                    margin: 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .btn-friends {
                    background: rgba(16, 185, 129, 0.1);
                    color: var(--status-success);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    text-decoration: none;
                }
                .btn-friends:hover {
                    background: rgba(16, 185, 129, 0.18);
                    border-color: var(--status-success);
                }

                @media (max-width: 480px) {
                    .search-form {
                        flex-direction: column;
                    }
                }
            `}</style>
        </>
    );
}
