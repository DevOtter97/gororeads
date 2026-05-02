import { useState } from 'preact/hooks';
import type { Post } from '../../domain/entities/Post';
import type { User } from '../../domain/entities/User';
import { postRepository } from '../../infrastructure/firebase/FirestorePostRepository';
import { notificationRepository } from '../../infrastructure/firebase/FirestoreNotificationRepository';

interface Props {
    post: Post;
    currentUser: User;
    initialLiked: boolean;
    initialReposted: boolean;
    onCommentToggle: () => void;
    commentsExpanded: boolean;
    onReposted?: (newRepost: Post) => void;
    onUnreposted?: (originalPostId: string) => void;
}

/**
 * Resuelve cual es el "post original" sobre el que se opera al repostear:
 * - Si post.type === 'repost', el original esta en post.repostOf
 * - Si no, el original es el propio post
 * Devuelve un Post-shaped con los campos minimos que necesita repository.repost.
 */
function resolveOriginal(post: Post): Post {
    if (post.type === 'repost' && post.repostOf) {
        return {
            id: post.repostOf.postId,
            authorId: post.repostOf.authorId,
            authorUsername: post.repostOf.authorUsername,
            authorPhotoURL: post.repostOf.authorPhotoURL,
            type: post.repostOf.type,
            text: post.repostOf.text,
            imageUrl: post.repostOf.imageUrl,
            readingRef: post.repostOf.readingRef,
            listRef: post.repostOf.listRef,
            likesCount: 0,
            commentsCount: 0,
            repostsCount: 0,
            createdAt: post.repostOf.createdAt,
        };
    }
    return post;
}

export default function PostActions({
    post,
    currentUser,
    initialLiked,
    initialReposted,
    onCommentToggle,
    commentsExpanded,
    onReposted,
    onUnreposted,
}: Readonly<Props>) {
    const original = resolveOriginal(post);

    const [liked, setLiked] = useState(initialLiked);
    const [likesCount, setLikesCount] = useState(post.likesCount);
    const [reposted, setReposted] = useState(initialReposted);
    const [repostsCount, setRepostsCount] = useState(post.repostsCount);
    const [working, setWorking] = useState(false);

    const handleLike = async () => {
        if (working) return;
        setWorking(true);
        const next = !liked;
        setLiked(next);
        // Clampeamos a 0 en el unlike por si el counter optimista ya estaba en 0.
        setLikesCount(prev => next ? prev + 1 : Math.max(0, prev - 1));
        try {
            const confirmed = await postRepository.toggleLike(post.id, currentUser.id);
            if (confirmed !== next) {
                setLiked(confirmed);
                setLikesCount(prev => Math.max(0, prev + (confirmed ? 1 : -1) - (next ? 1 : -1)));
            }
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
            setLiked(!next);
            setLikesCount(prev => !next ? prev + 1 : Math.max(0, prev - 1));
        } finally {
            setWorking(false);
        }
    };

    const handleRepost = async () => {
        if (working) return;
        setWorking(true);
        try {
            if (reposted) {
                // Optimistic
                setReposted(false);
                setRepostsCount(prev => Math.max(0, prev - 1));
                await postRepository.unrepost(original.id, currentUser.id);
                onUnreposted?.(original.id);
            } else {
                setReposted(true);
                setRepostsCount(prev => prev + 1);
                const newRepost = await postRepository.repost(original, currentUser);
                onReposted?.(newRepost);
                if (original.authorId !== currentUser.id) {
                    await notificationRepository.createNotification({
                        userId: original.authorId,
                        type: 'post_reposted',
                        title: 'Repost',
                        message: `${currentUser.username} reposteó tu post`,
                        fromUserId: currentUser.id,
                        fromUsername: currentUser.username,
                        fromUserPhotoUrl: currentUser.photoURL,
                        metadata: { postId: original.id },
                        read: false,
                    }).catch(err => console.error('Error creating repost notification:', err));
                }
            }
        } catch (err) {
            console.error('Error toggling repost:', err);
            // Rollback
            if (reposted) {
                setReposted(true);
                setRepostsCount(prev => prev + 1);
            } else {
                setReposted(false);
                setRepostsCount(prev => Math.max(0, prev - 1));
            }
        } finally {
            setWorking(false);
        }
    };

    const repostTitle = reposted ? 'Quitar repost' : 'Repostear';

    return (
        <>
            <div class="post-actions">
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
                    class={`post-action ${reposted ? 'reposted' : ''}`}
                    onClick={handleRepost}
                    disabled={working}
                    aria-pressed={reposted}
                    title={repostTitle}
                    aria-label={repostTitle}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="17 1 21 5 17 9" />
                        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                        <polyline points="7 23 3 19 7 15" />
                        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                    {repostsCount > 0 && <span class="post-action-count">{repostsCount}</span>}
                </button>

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
                .post-action.liked:not(:disabled):hover {
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--status-danger);
                }
                .post-action.reposted {
                    color: var(--status-success);
                }
                .post-action.reposted:not(:disabled):hover {
                    background: rgba(16, 185, 129, 0.1);
                    color: var(--status-success);
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
