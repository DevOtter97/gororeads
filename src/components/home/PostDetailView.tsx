import { useState, useEffect } from 'preact/hooks';
import type { Post } from '../../domain/entities/Post';
import type { User } from '../../domain/entities/User';
import { authService } from '../../infrastructure/firebase/FirebaseAuthService';
import { postRepository } from '../../infrastructure/firebase/FirestorePostRepository';
import Header from '../Header';
import LoadingState from '../LoadingState';
import PostCard from './PostCard';

interface Props {
    postId: string;
}

export default function PostDetailView({ postId }: Props) {
    const [user, setUser] = useState<User | null>(authService.getCurrentUser());
    const [authResolved, setAuthResolved] = useState(authService.getCurrentUser() !== null);
    const [post, setPost] = useState<Post | null>(null);
    const [liked, setLiked] = useState(false);
    const [reposted, setReposted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const unsub = authService.onAuthStateChanged((u) => {
            setUser(u);
            setAuthResolved(true);
            if (!u) window.location.href = '/';
        });
        return unsub;
    }, []);

    useEffect(() => {
        if (!authResolved || !user?.id) return;
        const load = async () => {
            try {
                setLoading(true);
                const p = await postRepository.getById(postId);
                if (!p) {
                    setNotFound(true);
                    return;
                }
                setPost(p);

                // Comprueba si el usuario actual ya dio like / repost en paralelo
                const originalId = p.repostOf?.postId ?? p.id;
                const [likedSet, repostedSet] = await Promise.all([
                    postRepository.getLikedPostIds([p.id], user.id),
                    postRepository.getRepostedPostIds([originalId], user.id),
                ]);
                setLiked(likedSet.has(p.id));
                setReposted(repostedSet.has(originalId));
            } catch (err) {
                console.error('Error loading post:', err);
                setNotFound(true); // por permisos o not found
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [postId, user?.id, authResolved]);

    if (loading) return <LoadingState message="Cargando post..." />;

    if (notFound || !user) {
        return (
            <div class="min-h-screen">
                <Header user={user} activeTab="home" />
                <main class="container post-detail-main">
                    <a href="/" class="back-link">← Volver a Inicio</a>
                    <div class="empty-state" style="padding: var(--space-12) var(--space-4)">
                        <h2>Post no encontrado</h2>
                        <p class="empty-state-text">
                            Puede que se haya borrado o que no tengas permiso para verlo.
                        </p>
                        <a href="/" class="btn btn-primary">Volver a Inicio</a>
                    </div>
                </main>
            </div>
        );
    }

    if (!post) return null;

    return (
        <div class="min-h-screen">
            <Header user={user} activeTab="home" />
            <main class="container post-detail-main">
                <a href="/" class="back-link">← Volver a Inicio</a>
                <PostCard
                    post={post}
                    currentUser={user}
                    initialLiked={liked}
                    initialReposted={reposted}
                    onDelete={() => { window.location.href = '/'; }}
                />
            </main>
            <style>{`
                .post-detail-main {
                    padding-top: var(--space-6);
                    padding-bottom: var(--space-12);
                    max-width: 640px;
                    margin: 0 auto;
                }
                .back-link {
                    display: inline-block;
                    color: var(--text-secondary);
                    text-decoration: none;
                    margin-bottom: var(--space-4);
                    font-size: 0.875rem;
                    transition: color var(--transition-fast);
                }
                .back-link:hover { color: var(--accent-primary); }
            `}</style>
        </div>
    );
}
