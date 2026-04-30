import { useState, useEffect } from 'preact/hooks';
import { userRepository } from '../../infrastructure/firebase/FirestoreUserRepository';
import { customListRepository } from '../../infrastructure/firebase/FirestoreCustomListRepository';
import { postRepository } from '../../infrastructure/firebase/FirestorePostRepository';
import type { User } from '../../domain/entities/User';
import type { CustomList } from '../../domain/entities/CustomList';
import type { Post, PostComment } from '../../domain/entities/Post';
import Header from '../Header';
import LoadingState from '../LoadingState';
import EmptyState from '../EmptyState';
import UserAvatar from '../UserAvatar';
import { useAuth } from '../../hooks/useAuth';
import ProfilePostsTab from './ProfilePostsTab';
import ProfileCommentsTab from './ProfileCommentsTab';
import ProfileListsTab from './ProfileListsTab';

interface Props {
    username: string;
}

type Tab = 'posts' | 'comments' | 'lists';

const POSTS_PAGE_SIZE = 20;

export default function PublicUserProfile({ username }: Props) {
    const { user: currentUser } = useAuth({ redirectIfUnauthenticated: '/' });
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
                    <EmptyState
                        titleAs="h2"
                        title="Usuario no encontrado"
                        description="No existe ningun usuario con ese nombre."
                        size="large"
                    >
                        <a href="/social" class="btn btn-primary">Volver a Comunidad</a>
                    </EmptyState>
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

                {activeTab === 'posts' && (
                    <ProfilePostsTab
                        posts={posts}
                        loading={postsLoading}
                        hasMore={postsHasMore}
                        loadingMore={postsLoadingMore}
                        currentUser={currentUser}
                        likedIds={likedIds}
                        repostedIds={repostedIds}
                        emptyMessage={`${profile.username} todavía no ha publicado nada.`}
                        onLoadMore={loadMorePosts}
                    />
                )}

                {activeTab === 'comments' && (
                    <ProfileCommentsTab
                        comments={comments}
                        loading={commentsLoading}
                        emptyMessage={`${profile.username} todavía no ha comentado nada visible para ti.`}
                    />
                )}

                {activeTab === 'lists' && (
                    <ProfileListsTab
                        lists={lists}
                        loading={listsLoading}
                        emptyMessage={`${profile.username} todavía no tiene listas publicas.`}
                    />
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
