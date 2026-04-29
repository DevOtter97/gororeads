import { useState, useEffect } from 'preact/hooks';
import type { User } from '../../domain/entities/User';
import type { Post } from '../../domain/entities/Post';
import { authService } from '../../infrastructure/firebase/FirebaseAuthService';
import { friendRepository } from '../../infrastructure/firebase/FirestoreFriendRepository';
import { postRepository } from '../../infrastructure/firebase/FirestorePostRepository';
import Header from '../Header';
import LoadingState from '../LoadingState';
import PostComposer from './PostComposer';
import PostCard from './PostCard';

const PAGE_SIZE = 20;

export default function HomeFeed() {
    const [user, setUser] = useState<User | null>(authService.getCurrentUser());
    const [friendIds, setFriendIds] = useState<string[] | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [cursor, setCursor] = useState<Date | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState('');

    // Auth listener
    useEffect(() => {
        const unsub = authService.onAuthStateChanged((u) => {
            setUser(u);
            if (!u) window.location.href = '/';
        });
        return unsub;
    }, []);

    // Cargar amigos + primera pagina del feed
    useEffect(() => {
        if (!user?.id) return;
        const load = async () => {
            try {
                setLoading(true);
                const friends = await friendRepository.getFriends(user.id);
                // Incluimos al propio usuario en el feed para ver sus propios posts.
                const ids = [user.id, ...friends.map(f => f.userId)];
                setFriendIds(ids);
                const page = await postRepository.getFeedForUser(ids, PAGE_SIZE);
                setPosts(page.posts);
                setCursor(page.nextCursor);
                setHasMore(page.nextCursor !== null);

                // Precarga estado de likes en paralelo.
                const liked = await postRepository.getLikedPostIds(page.posts.map(p => p.id), user.id);
                setLikedIds(liked);
            } catch (err) {
                console.error('Error loading feed:', err);
                setError('No se pudo cargar el feed.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user?.id]);

    const handlePosted = (post: Post) => {
        setPosts(prev => [post, ...prev]);
    };

    const handleLoadMore = async () => {
        if (!friendIds || !cursor || loadingMore || !user) return;
        setLoadingMore(true);
        try {
            const page = await postRepository.getFeedForUser(friendIds, PAGE_SIZE, cursor);
            setPosts(prev => [...prev, ...page.posts]);
            setCursor(page.nextCursor);
            setHasMore(page.nextCursor !== null);

            const newLiked = await postRepository.getLikedPostIds(page.posts.map(p => p.id), user.id);
            setLikedIds(prev => new Set([...prev, ...newLiked]));
        } catch (err) {
            console.error('Error loading more posts:', err);
        } finally {
            setLoadingMore(false);
        }
    };

    if (loading) return <LoadingState message="Cargando feed..." />;
    if (!user) return null;

    const hasFriends = (friendIds?.length ?? 0) > 1; // mas alla del propio usuario

    return (
        <div class="home-page">
            <Header user={user} activeTab="home" />
            <main class="container home-main">
                <div class="home-content">
                    <h1 class="page-title">Inicio</h1>

                    <PostComposer user={user} onPosted={handlePosted} />

                    {error && <p class="feed-error">{error}</p>}

                    {posts.length === 0 ? (
                        hasFriends ? (
                            <div class="empty-state">
                                <h3 class="empty-state-title">Aún no hay nada por aquí</h3>
                                <p class="empty-state-text">Tus amigos aún no han posteado. ¡Sé el primero!</p>
                            </div>
                        ) : (
                            <div class="empty-state">
                                <h3 class="empty-state-title">Tu feed está vacío</h3>
                                <p class="empty-state-text">Aún no tienes amigos que sigan posteando. Encuentra gente para empezar.</p>
                                <a href="/social?tab=search" class="btn btn-primary">Buscar usuarios</a>
                            </div>
                        )
                    ) : (
                        <ul class="feed-list">
                            {posts.map(post => (
                                <li key={post.id}>
                                    <PostCard
                                        post={post}
                                        currentUser={user}
                                        initialLiked={likedIds.has(post.id)}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}

                    {hasMore && (
                        <div class="load-more-wrapper">
                            <button class="btn btn-ghost" onClick={handleLoadMore} disabled={loadingMore}>
                                {loadingMore ? 'Cargando...' : 'Cargar más'}
                            </button>
                        </div>
                    )}
                </div>
            </main>

            <style>{`
                .home-main {
                    padding-top: var(--space-6);
                    padding-bottom: var(--space-12);
                }
                .home-content {
                    max-width: 640px;
                    margin: 0 auto;
                }
                .page-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin: 0 0 var(--space-4);
                    color: var(--text-primary);
                }
                .feed-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                .feed-error {
                    color: var(--status-danger);
                    margin: var(--space-3) 0;
                }
                .load-more-wrapper {
                    display: flex;
                    justify-content: center;
                    padding: var(--space-4) 0;
                }
            `}</style>
        </div>
    );
}
