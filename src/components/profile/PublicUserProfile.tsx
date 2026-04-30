import { useState, useEffect } from 'preact/hooks';
import { authService } from '../../infrastructure/firebase/FirebaseAuthService';
import { userRepository } from '../../infrastructure/firebase/FirestoreUserRepository';
import { customListRepository } from '../../infrastructure/firebase/FirestoreCustomListRepository';
import { postRepository } from '../../infrastructure/firebase/FirestorePostRepository';
import type { User } from '../../domain/entities/User';
import type { CustomList } from '../../domain/entities/CustomList';
import type { Post, PostComment } from '../../domain/entities/Post';
import Header from '../Header';
import LoadingState from '../LoadingState';
import UserAvatar from '../UserAvatar';
import PostCard from '../home/PostCard';
import CustomListCard from '../lists/CustomListCard';

interface Props {
    username: string;
}

type Tab = 'posts' | 'comments' | 'lists';

const POSTS_PAGE_SIZE = 20;

function timeAgoCompact(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'ahora';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function PublicUserProfile({ username }: Props) {
    const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
    const [profile, setProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('posts');

    // Datos de cada tab (lazy: se cargan al activar)
    const [posts, setPosts] = useState<Post[]>([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const [postsLoaded, setPostsLoaded] = useState(false);
    const [postsCursor, setPostsCursor] = useState<Date | null>(null);
    const [postsHasMore, setPostsHasMore] = useState(false);
    const [postsLoadingMore, setPostsLoadingMore] = useState(false);
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
    const [repostedIds, setRepostedIds] = useState<Set<string>>(new Set());

    const [comments, setComments] = useState<PostComment[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentsLoaded, setCommentsLoaded] = useState(false);

    const [lists, setLists] = useState<CustomList[]>([]);
    const [listsLoading, setListsLoading] = useState(false);
    const [listsLoaded, setListsLoaded] = useState(false);

    // Auth
    useEffect(() => {
        const unsub = authService.onAuthStateChanged((u) => {
            setCurrentUser(u);
            if (!u) window.location.href = '/';
        });
        return unsub;
    }, []);

    // Carga del perfil basico
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
            } catch (err) {
                console.error('Error loading public profile:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [username]);

    // Honra ?tab=... y #lists para deeplinks
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const t = params.get('tab');
        if (t === 'comments' || t === 'lists' || t === 'posts') {
            setActiveTab(t);
        } else if (window.location.hash === '#lists') {
            setActiveTab('lists');
        }
    }, []);

    // Lazy load por tab
    useEffect(() => {
        if (!profile || !currentUser) return;

        if (activeTab === 'posts' && !postsLoaded) {
            (async () => {
                setPostsLoading(true);
                try {
                    const page = await postRepository.getFeedForUser([profile.id], POSTS_PAGE_SIZE);
                    setPosts(page.posts);
                    setPostsCursor(page.nextCursor);
                    setPostsHasMore(page.nextCursor !== null);

                    const ids = page.posts.map(p => p.id);
                    const originalIds = page.posts.map(p => p.repostOf?.postId ?? p.id);
                    const [liked, reposted] = await Promise.all([
                        postRepository.getLikedPostIds(ids, currentUser.id),
                        postRepository.getRepostedPostIds(originalIds, currentUser.id),
                    ]);
                    setLikedIds(liked);
                    setRepostedIds(reposted);
                } catch (err) {
                    console.error('Error loading user posts:', err);
                } finally {
                    setPostsLoading(false);
                    setPostsLoaded(true);
                }
            })();
        }

        if (activeTab === 'comments' && !commentsLoaded) {
            (async () => {
                setCommentsLoading(true);
                try {
                    const data = await postRepository.getCommentsByUser(profile.id);
                    setComments(data);
                } catch (err) {
                    console.error('Error loading user comments:', err);
                } finally {
                    setCommentsLoading(false);
                    setCommentsLoaded(true);
                }
            })();
        }

        if (activeTab === 'lists' && !listsLoaded) {
            (async () => {
                setListsLoading(true);
                try {
                    const data = await customListRepository.getPublicListsByUserId(profile.id);
                    setLists(data);
                } catch (err) {
                    console.error('Error loading user lists:', err);
                } finally {
                    setListsLoading(false);
                    setListsLoaded(true);
                }
            })();
        }
    }, [activeTab, profile?.id, currentUser?.id]);

    const loadMorePosts = async () => {
        if (!profile || !currentUser || !postsCursor || postsLoadingMore) return;
        setPostsLoadingMore(true);
        try {
            const page = await postRepository.getFeedForUser([profile.id], POSTS_PAGE_SIZE, postsCursor);
            setPosts(prev => [...prev, ...page.posts]);
            setPostsCursor(page.nextCursor);
            setPostsHasMore(page.nextCursor !== null);

            const ids = page.posts.map(p => p.id);
            const originalIds = page.posts.map(p => p.repostOf?.postId ?? p.id);
            const [newLiked, newReposted] = await Promise.all([
                postRepository.getLikedPostIds(ids, currentUser.id),
                postRepository.getRepostedPostIds(originalIds, currentUser.id),
            ]);
            setLikedIds(prev => new Set([...prev, ...newLiked]));
            setRepostedIds(prev => new Set([...prev, ...newReposted]));
        } catch (err) {
            console.error('Error loading more posts:', err);
        } finally {
            setPostsLoadingMore(false);
        }
    };

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

    if (!profile || !currentUser) return null;

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

                {/* Tabs */}
                <div class="profile-tabs" role="tablist">
                    <button
                        class={`profile-tab ${activeTab === 'posts' ? 'active' : ''}`}
                        onClick={() => setActiveTab('posts')}
                        role="tab"
                        aria-selected={activeTab === 'posts'}
                    >
                        Posts
                    </button>
                    <button
                        class={`profile-tab ${activeTab === 'comments' ? 'active' : ''}`}
                        onClick={() => setActiveTab('comments')}
                        role="tab"
                        aria-selected={activeTab === 'comments'}
                    >
                        Comentarios
                    </button>
                    <button
                        class={`profile-tab ${activeTab === 'lists' ? 'active' : ''}`}
                        onClick={() => setActiveTab('lists')}
                        role="tab"
                        aria-selected={activeTab === 'lists'}
                    >
                        Listas
                    </button>
                </div>

                {/* Tab: Posts */}
                {activeTab === 'posts' && (
                    <section class="tab-section">
                        {postsLoading ? (
                            <p class="tab-status">Cargando posts...</p>
                        ) : posts.length === 0 ? (
                            <p class="tab-status">{profile.username} todavía no ha publicado nada.</p>
                        ) : (
                            <>
                                <ul class="profile-posts-list">
                                    {posts.map(post => {
                                        const originalId = post.repostOf?.postId ?? post.id;
                                        return (
                                            <li key={post.id}>
                                                <PostCard
                                                    post={post}
                                                    currentUser={currentUser}
                                                    initialLiked={likedIds.has(post.id)}
                                                    initialReposted={repostedIds.has(originalId)}
                                                />
                                            </li>
                                        );
                                    })}
                                </ul>
                                {postsHasMore && (
                                    <div class="load-more-wrapper">
                                        <button class="btn btn-ghost" onClick={loadMorePosts} disabled={postsLoadingMore}>
                                            {postsLoadingMore ? 'Cargando...' : 'Cargar más'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                )}

                {/* Tab: Comentarios */}
                {activeTab === 'comments' && (
                    <section class="tab-section">
                        {commentsLoading ? (
                            <p class="tab-status">Cargando comentarios...</p>
                        ) : comments.length === 0 ? (
                            <p class="tab-status">{profile.username} todavía no ha comentado nada visible para ti.</p>
                        ) : (
                            <ul class="profile-comments-list">
                                {comments.map(c => (
                                    <li key={c.id} class="profile-comment">
                                        <UserAvatar username={c.username} photoUrl={c.photoURL} size={32} />
                                        <div class="profile-comment-body">
                                            <div class="profile-comment-header">
                                                <span class="profile-comment-author">{c.username}</span>
                                                <span class="profile-comment-time">· {timeAgoCompact(c.createdAt)}</span>
                                                {c.parentId && <span class="profile-comment-tag">respuesta</span>}
                                            </div>
                                            <p class="profile-comment-text">{c.text}</p>
                                            {c.postId && (
                                                <a href={`/post/${c.postId}`} class="profile-comment-link">
                                                    Ver post →
                                                </a>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                )}

                {/* Tab: Listas */}
                {activeTab === 'lists' && (
                    <section id="lists" class="tab-section">
                        {listsLoading ? (
                            <p class="tab-status">Cargando listas...</p>
                        ) : lists.length === 0 ? (
                            <p class="tab-status">{profile.username} todavía no tiene listas publicas.</p>
                        ) : (
                            <div class="profile-lists-grid">
                                {lists.map(list => (
                                    <CustomListCard
                                        key={list.id}
                                        list={list}
                                        readings={list.readings}
                                        onView={(l) => { window.location.href = `/list/${l.slug}`; }}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                )}
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
                .back-link:hover { color: var(--accent-primary); }

                .profile-hero {
                    display: flex;
                    align-items: center;
                    gap: var(--space-6);
                    padding: var(--space-6);
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-xl);
                    margin-bottom: var(--space-6);
                }

                .profile-hero-info { flex: 1; min-width: 0; }
                .profile-name {
                    font-size: 1.5rem; font-weight: 700;
                    color: var(--text-primary); margin: 0;
                }
                .profile-username {
                    color: var(--accent-primary);
                    font-size: 0.95rem;
                    margin: var(--space-1) 0 var(--space-2);
                }
                .profile-meta {
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                    display: flex; flex-wrap: wrap; gap: var(--space-2);
                    align-items: center;
                }
                .profile-meta .dot { opacity: 0.5; }

                /* Tabs */
                .profile-tabs {
                    display: flex;
                    gap: var(--space-1);
                    border-bottom: 1px solid var(--border-color);
                    margin-bottom: var(--space-5);
                }
                .profile-tab {
                    flex: 1 1 auto;
                    padding: var(--space-3) var(--space-3);
                    color: var(--text-secondary);
                    font-weight: 500;
                    font-size: 0.875rem;
                    border-bottom: 2px solid transparent;
                    transition: all var(--transition-fast);
                }
                .profile-tab:hover { color: var(--text-primary); }
                .profile-tab.active {
                    color: var(--accent-primary);
                    border-bottom-color: var(--accent-primary);
                }
                @media (min-width: 640px) {
                    .profile-tab { flex: 0 0 auto; padding: var(--space-3) var(--space-5); font-size: 1rem; }
                }

                .tab-section { min-height: 200px; }
                .tab-status {
                    text-align: center;
                    color: var(--text-muted);
                    padding: var(--space-8) var(--space-4);
                    margin: 0;
                }

                /* Posts list */
                .profile-posts-list {
                    list-style: none; padding: 0; margin: 0;
                }
                .load-more-wrapper {
                    display: flex; justify-content: center;
                    padding: var(--space-4) 0;
                }

                /* Comments list */
                .profile-comments-list {
                    list-style: none; padding: 0; margin: 0;
                    display: flex; flex-direction: column; gap: var(--space-3);
                }
                .profile-comment {
                    display: flex;
                    gap: var(--space-3);
                    padding: var(--space-3) var(--space-4);
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-md);
                }
                .profile-comment-body { flex: 1; min-width: 0; }
                .profile-comment-header {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    margin-bottom: var(--space-1);
                }
                .profile-comment-author {
                    font-weight: 600;
                    color: var(--text-primary);
                    font-size: 0.875rem;
                }
                .profile-comment-time {
                    color: var(--text-muted);
                    font-size: 0.75rem;
                }
                .profile-comment-tag {
                    margin-left: auto;
                    font-size: 0.6875rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--text-muted);
                    background: var(--bg-secondary);
                    padding: 2px 6px;
                    border-radius: var(--border-radius-sm);
                }
                .profile-comment-text {
                    color: var(--text-primary);
                    font-size: 0.9375rem;
                    line-height: 1.4;
                    margin: 0 0 var(--space-2);
                    word-break: break-word;
                }
                .profile-comment-link {
                    display: inline-block;
                    color: var(--accent-primary);
                    font-size: 0.8125rem;
                    font-weight: 500;
                    text-decoration: none;
                }
                .profile-comment-link:hover { text-decoration: underline; }

                /* Lists grid */
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
                    .profile-meta { justify-content: center; }
                }
            `}</style>
        </div>
    );
}
