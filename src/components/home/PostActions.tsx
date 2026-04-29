import { useState } from 'preact/hooks';
import type { Post } from '../../domain/entities/Post';
import type { User } from '../../domain/entities/User';
import { postRepository } from '../../infrastructure/firebase/FirestorePostRepository';
import { notificationRepository } from '../../infrastructure/firebase/FirestoreNotificationRepository';

interface Props {
    post: Post;
    currentUser: User;
    initialLiked: boolean;
    onCommentToggle: () => void;
    commentsExpanded: boolean;
}

export default function PostActions({ post, currentUser, initialLiked, onCommentToggle, commentsExpanded }: Props) {
    const [liked, setLiked] = useState(initialLiked);
    const [likesCount, setLikesCount] = useState(post.likesCount);
    const [working, setWorking] = useState(false);

    const handleLike = async () => {
        if (working) return;
        setWorking(true);
        // Optimistic update
        const next = !liked;
        setLiked(next);
        setLikesCount(prev => prev + (next ? 1 : -1));
        try {
            const confirmed = await postRepository.toggleLike(post.id, currentUser.id);
            // Reconciliacion con el backend por si la transaction divergio
            if (confirmed !== next) {
                setLiked(confirmed);
                setLikesCount(prev => prev + (confirmed ? 1 : -1) - (next ? 1 : -1));
            }
            // Notifica solo en el like (no en el unlike) y no si es self-like
            if (confirmed && post.authorId !== currentUser.id) {
                await notificationRepository.createNotification({
                    userId: post.authorId,
                    type: 'post_liked',
                    title: 'Nuevo like',
                    message: `${currentUser.username} dio like a tu post`,
                    fromUserId: currentUser.id,
                    fromUsername: currentUser.username,
                    fromUserPhotoUrl: currentUser.photoURL,
                    metadata: { postId: post.id },
                    read: false,
                }).catch(err => console.error('Error creating like notification:', err));
            }
        } catch (err) {
            console.error('Error toggling like:', err);
            // Rollback
            setLiked(!next);
            setLikesCount(prev => prev + (!next ? 1 : -1));
        } finally {
            setWorking(false);
        }
    };

    return (
        <>
            <div class="post-actions">
                <button
                    class={`post-action ${liked ? 'liked' : ''}`}
                    onClick={handleLike}
                    disabled={working}
                    aria-pressed={liked}
                    aria-label={liked ? 'Quitar like' : 'Dar like'}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    {likesCount > 0 && <span class="post-action-count">{likesCount}</span>}
                </button>

                <button
                    class={`post-action ${commentsExpanded ? 'active' : ''}`}
                    onClick={onCommentToggle}
                    aria-expanded={commentsExpanded}
                    aria-label="Comentarios"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    {post.commentsCount > 0 && <span class="post-action-count">{post.commentsCount}</span>}
                </button>

                <button
                    class="post-action"
                    disabled
                    title="Próximamente"
                    aria-label="Repostear"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="17 1 21 5 17 9" />
                        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                        <polyline points="7 23 3 19 7 15" />
                        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                    {post.repostsCount > 0 && <span class="post-action-count">{post.repostsCount}</span>}
                </button>
            </div>
            <style>{`
                .post-actions {
                    display: flex;
                    gap: var(--space-1);
                    padding-top: var(--space-3);
                    margin-top: var(--space-3);
                    border-top: 1px solid var(--border-color);
                }
                .post-action {
                    display: inline-flex;
                    align-items: center;
                    gap: var(--space-2);
                    padding: var(--space-2) var(--space-3);
                    border-radius: var(--border-radius-md);
                    color: var(--text-muted);
                    font-size: 0.8125rem;
                    font-weight: 500;
                    transition: all var(--transition-fast);
                }
                .post-action:not(:disabled):hover {
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                }
                .post-action:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }
                .post-action.liked {
                    color: var(--status-danger);
                }
                .post-action.liked:hover {
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--status-danger);
                }
                .post-action.active {
                    color: var(--accent-primary);
                    background: rgba(139, 92, 246, 0.1);
                }
                .post-action-count {
                    font-variant-numeric: tabular-nums;
                }
            `}</style>
        </>
    );
}
