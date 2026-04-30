import { useState, useEffect } from 'preact/hooks';
import { authService } from '../../infrastructure/firebase/FirebaseAuthService';
import { userRepository } from '../../infrastructure/firebase/FirestoreUserRepository';
import { customListRepository } from '../../infrastructure/firebase/FirestoreCustomListRepository';
import type { User } from '../../domain/entities/User';
import type { CustomList } from '../../domain/entities/CustomList';
import Header from '../Header';
import LoadingState from '../LoadingState';
import UserAvatar from '../UserAvatar';

interface Props {
    username: string;
}

export default function PublicUserProfile({ username }: Props) {
    const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
    const [profile, setProfile] = useState<User | null>(null);
    const [lists, setLists] = useState<CustomList[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged((u) => {
            setCurrentUser(u);
            if (!u) window.location.href = '/';
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const userData = await userRepository.getUserByUsername(username);
                if (!userData) {
                    setNotFound(true);
                    return;
                }
                setProfile(userData);
                const userLists = await customListRepository.getPublicListsByUserId(userData.id);
                setLists(userLists);
            } catch (err) {
                console.error('Error loading public profile:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [username]);

    if (loading) return <LoadingState message="Cargando perfil..." />;

    if (notFound) {
        return (
            <div class="min-h-screen">
                <Header user={currentUser} activeTab="social" />
                <main class="container main">
                    <div class="empty-state" style="padding: var(--space-16) var(--space-4)">
                        <h2>Usuario no encontrado</h2>
                        <p class="empty-state-text">No existe ningun usuario con ese nombre.</p>
                        <a href="/social" class="btn btn-primary">Volver a Comunidad</a>
                    </div>
                </main>
            </div>
        );
    }

    if (!profile) return null;

    const memberSince = profile.createdAt.toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long',
    });

    return (
        <div class="min-h-screen">
            <Header user={currentUser} activeTab="social" />
            <main class="container main public-profile-main">
                <a href="/social" class="back-link">← Volver a Comunidad</a>

                <section class="profile-hero">
                    <UserAvatar username={profile.username} photoUrl={profile.photoURL} size={96} />
                    <div class="profile-hero-info">
                        <h1 class="profile-name">{profile.displayName || profile.username}</h1>
                        <p class="profile-username">@{profile.username}</p>
                        <p class="profile-meta">
                            {profile.country && <span>{profile.country}</span>}
                            {profile.country && profile.age && <span class="dot">·</span>}
                            {profile.age && <span>{profile.age} años</span>}
                            {(profile.country || profile.age) && <span class="dot">·</span>}
                            <span>Miembro desde {memberSince}</span>
                        </p>
                    </div>
                </section>

                <section id="lists" class="profile-lists-section">
                    <h2>Listas publicas</h2>
                    {lists.length === 0 ? (
                        <p class="empty-state-text">{profile.username} todavia no tiene listas publicas.</p>
                    ) : (
                        <div class="profile-lists-grid">
                            {lists.map(list => (
                                <a key={list.id} href={`/list/${list.slug}`} class="profile-list-card">
                                    <div class="profile-list-card-header">
                                        <h3>{list.name}</h3>
                                        <span class="profile-list-count">{list.readings.length} lecturas</span>
                                    </div>
                                    {list.description && <p class="profile-list-desc">{list.description}</p>}
                                </a>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            <style>{`
                .public-profile-main {
                    padding-top: var(--space-6);
                    padding-bottom: var(--space-12);
                    max-width: 800px;
                    margin: 0 auto;
                }

                .back-link {
                    display: inline-block;
                    color: var(--text-secondary);
                    text-decoration: none;
                    margin-bottom: var(--space-6);
                    font-size: 0.875rem;
                    transition: color var(--transition-fast);
                }
                .back-link:hover {
                    color: var(--accent-primary);
                }

                .profile-hero {
                    display: flex;
                    align-items: center;
                    gap: var(--space-6);
                    padding: var(--space-6);
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-xl);
                    margin-bottom: var(--space-8);
                }

                .profile-hero-info {
                    flex: 1;
                    min-width: 0;
                }

                .profile-name {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                }

                .profile-username {
                    color: var(--accent-primary);
                    font-size: 0.95rem;
                    margin: var(--space-1) 0 var(--space-2);
                }

                .profile-meta {
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                    display: flex;
                    flex-wrap: wrap;
                    gap: var(--space-2);
                    align-items: center;
                }
                .profile-meta .dot {
                    opacity: 0.5;
                }

                .profile-lists-section h2 {
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin-bottom: var(--space-4);
                    color: var(--text-primary);
                }

                .profile-lists-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
                    gap: var(--space-4);
                }

                .profile-list-card {
                    display: block;
                    padding: var(--space-4);
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-lg);
                    text-decoration: none;
                    transition: all var(--transition-fast);
                }
                .profile-list-card:hover {
                    border-color: var(--accent-primary);
                    transform: translateY(-2px);
                }

                .profile-list-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: baseline;
                    gap: var(--space-2);
                    margin-bottom: var(--space-2);
                }

                .profile-list-card-header h3 {
                    margin: 0;
                    font-size: 1rem;
                    color: var(--text-primary);
                }

                .profile-list-count {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    white-space: nowrap;
                }

                .profile-list-desc {
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                    margin: 0;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                @media (max-width: 600px) {
                    .profile-hero {
                        flex-direction: column;
                        text-align: center;
                    }
                    .profile-meta {
                        justify-content: center;
                    }
                }
            `}</style>
        </div>
    );
}
