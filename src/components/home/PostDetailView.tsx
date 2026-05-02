import { useState, useEffect } from 'preact/hooks';
import type { Post } from '../../domain/entities/Post';
import { postRepository } from '../../infrastructure/firebase/FirestorePostRepository';
import { useAuth } from '../../hooks/useAuth';
import Header from '../Header';
import LoadingState from '../LoadingState';
import EmptyState from '../EmptyState';
import PostCard from './PostCard';

interface Props {
    postId: string;
}

export default function PostDetailView({ postId }: Readonly<Props>) {
    const { user, authResolved } = useAuth({ redirectIfUnauthenticated: '/' });
    const [post, setPost] = useState<Post | null>(null);
    const [liked, setLiked] = useState(false);
    const [reposted, setReposted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

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
                    <EmptyState
                        titleAs="h2"
                        title="Post no encontrado"
                        description="Puede que se haya borrado o que no tengas permiso para verlo."
                    >
                        <a href="/" class="btn btn-primary">Volver a Inicio</a>
                    </EmptyState>
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
