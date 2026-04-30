import { useState, useEffect, useMemo } from 'preact/hooks';
import type { Post, PostComment } from '../../domain/entities/Post';
import { COMMENT_TEXT_MAX_LENGTH } from '../../domain/entities/Post';
import type { User } from '../../domain/entities/User';
import { postRepository } from '../../infrastructure/firebase/FirestorePostRepository';
import { notificationRepository } from '../../infrastructure/firebase/FirestoreNotificationRepository';
import { timeAgoCompact as timeAgo } from '../../utils/timeAgo';
import UserAvatar from '../UserAvatar';

interface Props {
    post: Post;
    currentUser: User;
    onCountChange: (delta: number) => void;
}

interface CommentTree {
    /** Comments top-level (parentId vacio) y huerfanos (parentId apunta a un comment ya borrado) */
    roots: PostComment[];
    /** parentId -> replies */
    repliesByParent: Map<string, PostComment[]>;
}

function buildTree(comments: PostComment[]): CommentTree {
    const ids = new Set(comments.map(c => c.id));
    const roots: PostComment[] = [];
    const repliesByParent = new Map<string, PostComment[]>();

    for (const c of comments) {
        if (!c.parentId || !ids.has(c.parentId)) {
            // Top-level o huerfano (parent borrado): se trata como top-level.
            roots.push(c);
        } else {
            if (!repliesByParent.has(c.parentId)) {
                repliesByParent.set(c.parentId, []);
            }
            repliesByParent.get(c.parentId)!.push(c);
        }
    }
    return { roots, repliesByParent };
}

export default function CommentList({ post, currentUser, onCountChange }: Props) {
    const [comments, setComments] = useState<PostComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<PostComment | null>(null);
    const [replyText, setReplyText] = useState('');
    const [submittingReply, setSubmittingReply] = useState(false);

    useEffect(() => {
        postRepository.getComments(post.id)
            .then(setComments)
            .catch(err => console.error('Error loading comments:', err))
            .finally(() => setLoading(false));
    }, [post.id]);

    const tree = useMemo(() => buildTree(comments), [comments]);

    const remaining = COMMENT_TEXT_MAX_LENGTH - text.length;
    const canSubmit = text.trim().length > 0 && remaining >= 0 && !submitting;
    const replyRemaining = COMMENT_TEXT_MAX_LENGTH - replyText.length;
    const canReply = replyText.trim().length > 0 && replyRemaining >= 0 && !submittingReply;

    const notifyOnComment = async (toUserId: string, message: string) => {
        if (toUserId === currentUser.id) return;
        try {
            await notificationRepository.createNotification({
                userId: toUserId,
                type: 'post_commented',
                title: 'Nuevo comentario',
                message,
                fromUserId: currentUser.id,
                fromUsername: currentUser.username,
                fromUserPhotoUrl: currentUser.photoURL,
                metadata: { postId: post.id },
                read: false,
            });
        } catch (err) {
            console.error('Error creating comment notification:', err);
        }
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        try {
            const created = await postRepository.addComment(post.id, currentUser, text.trim());
            setComments(prev => [...prev, created]);
            setText('');
            onCountChange(1);
            await notifyOnComment(post.authorId, `${currentUser.username} comentó tu post`);
        } catch (err) {
            console.error('Error adding comment:', err);
            alert('No se pudo publicar el comentario.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitReply = async (e: Event) => {
        e.preventDefault();
        if (!canReply || !replyingTo) return;
        setSubmittingReply(true);
        try {
            const created = await postRepository.addComment(post.id, currentUser, replyText.trim(), replyingTo.id);
            setComments(prev => [...prev, created]);
            setReplyText('');
            setReplyingTo(null);
            onCountChange(1);
            await notifyOnComment(replyingTo.userId, `${currentUser.username} respondió a tu comentario`);
        } catch (err) {
            console.error('Error adding reply:', err);
            alert('No se pudo publicar la respuesta.');
        } finally {
            setSubmittingReply(false);
        }
    };

    const handleDelete = async (comment: PostComment) => {
        if (!confirm('¿Eliminar este comentario?')) return;
        try {
            await postRepository.deleteComment(post.id, comment.id);
            setComments(prev => prev.filter(c => c.id !== comment.id));
            onCountChange(-1);
        } catch (err) {
            console.error('Error deleting comment:', err);
            alert('No se pudo eliminar el comentario.');
        }
    };

    const renderComment = (c: PostComment, isReply: boolean) => {
        const canDelete = c.userId === currentUser.id;
        return (
            <div class={`comment ${isReply ? 'comment--reply' : ''}`}>
                <UserAvatar username={c.username} photoUrl={c.photoURL} size={isReply ? 28 : 32} />
                <div class="comment-body">
                    <div class="comment-header">
                        <a href={`/profile/${c.username}`} class="comment-author">{c.username}</a>
                        <span class="comment-time">{timeAgo(c.createdAt)}</span>
                        {canDelete && (
                            <button class="comment-delete" onClick={() => handleDelete(c)} aria-label="Eliminar comentario">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <p class="comment-text">{c.text}</p>
                    {!isReply && (
                        <button
                            class="comment-reply-btn"
                            onClick={() => {
                                setReplyingTo(c);
                                setReplyText('');
                            }}
                        >
                            Responder
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <div class="comments">
                <form class="comment-form" onSubmit={handleSubmit}>
                    <UserAvatar username={currentUser.username} photoUrl={currentUser.photoURL} size={32} />
                    <div class="comment-input-wrapper">
                        <input
                            type="text"
                            class="comment-input"
                            placeholder="Escribe un comentario..."
                            value={text}
                            onInput={(e) => setText((e.target as HTMLInputElement).value)}
                            maxLength={COMMENT_TEXT_MAX_LENGTH + 50}
                            disabled={submitting}
                        />
                    </div>
                    <button type="submit" class="btn btn-primary btn-sm" disabled={!canSubmit}>
                        {submitting ? '...' : 'Enviar'}
                    </button>
                </form>

                {loading ? (
                    <p class="comments-status">Cargando comentarios...</p>
                ) : tree.roots.length === 0 ? (
                    <p class="comments-status">Sé el primero en comentar.</p>
                ) : (
                    <ul class="comments-list">
                        {tree.roots.map(root => {
                            const replies = tree.repliesByParent.get(root.id) ?? [];
                            const showingReplyForm = replyingTo?.id === root.id;
                            return (
                                <li key={root.id} class="comment-thread">
                                    {renderComment(root, false)}

                                    {(replies.length > 0 || showingReplyForm) && (
                                        <div class="replies">
                                            {replies.map(r => (
                                                <div key={r.id}>{renderComment(r, true)}</div>
                                            ))}

                                            {showingReplyForm && (
                                                <form class="reply-form" onSubmit={handleSubmitReply}>
                                                    <UserAvatar username={currentUser.username} photoUrl={currentUser.photoURL} size={28} />
                                                    <div class="reply-input-wrapper">
                                                        <input
                                                            type="text"
                                                            class="comment-input"
                                                            placeholder={`Respondiendo a ${root.username}...`}
                                                            value={replyText}
                                                            onInput={(e) => setReplyText((e.target as HTMLInputElement).value)}
                                                            maxLength={COMMENT_TEXT_MAX_LENGTH + 50}
                                                            disabled={submittingReply}
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div class="reply-actions">
                                                        <button
                                                            type="button"
                                                            class="btn btn-ghost btn-sm"
                                                            onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                                            disabled={submittingReply}
                                                        >
                                                            Cancelar
                                                        </button>
                                                        <button type="submit" class="btn btn-primary btn-sm" disabled={!canReply}>
                                                            {submittingReply ? '...' : 'Responder'}
                                                        </button>
                                                    </div>
                                                </form>
                                            )}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
            <style>{`
                .comments {
                    margin-top: var(--space-3);
                    padding-top: var(--space-3);
                    border-top: 1px solid var(--border-color);
                }
                .comment-form {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    margin-bottom: var(--space-3);
                }
                .comment-input-wrapper { flex: 1; min-width: 0; }
                .comment-input {
                    width: 100%;
                    padding: var(--space-2) var(--space-3);
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-md);
                    color: var(--text-primary);
                    font-size: 0.875rem;
                    transition: border-color var(--transition-fast);
                    font-family: inherit;
                }
                .comment-input:focus {
                    outline: none;
                    border-color: var(--accent-primary);
                }

                .comments-status {
                    color: var(--text-muted);
                    font-size: 0.875rem;
                    text-align: center;
                    padding: var(--space-2) 0;
                    margin: 0;
                }

                .comments-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-3);
                }

                .comment-thread {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-2);
                }

                .comment {
                    display: flex;
                    gap: var(--space-2);
                    align-items: flex-start;
                }

                .comment-body {
                    flex: 1;
                    min-width: 0;
                    background: var(--bg-secondary);
                    border-radius: var(--border-radius-md);
                    padding: var(--space-2) var(--space-3);
                }

                .comment-header {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    margin-bottom: 2px;
                }

                .comment-author {
                    color: var(--accent-primary);
                    font-size: 0.8125rem;
                    font-weight: 600;
                    text-decoration: none;
                }
                .comment-author:hover { text-decoration: underline; }

                .comment-time {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                }

                .comment-delete {
                    margin-left: auto;
                    padding: 2px;
                    color: var(--text-muted);
                    border-radius: var(--border-radius-sm);
                    transition: all var(--transition-fast);
                }
                .comment-delete:hover {
                    color: var(--status-danger);
                    background: rgba(239, 68, 68, 0.1);
                }

                .comment-text {
                    margin: 0;
                    color: var(--text-primary);
                    font-size: 0.875rem;
                    line-height: 1.4;
                    word-break: break-word;
                }

                .comment-reply-btn {
                    margin-top: var(--space-1);
                    padding: 0;
                    background: transparent;
                    color: var(--text-muted);
                    font-size: 0.75rem;
                    font-weight: 600;
                    transition: color var(--transition-fast);
                }
                .comment-reply-btn:hover { color: var(--accent-primary); }

                .replies {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-2);
                    margin-left: calc(32px + var(--space-2));
                    padding-left: var(--space-3);
                    border-left: 2px solid var(--border-color);
                }

                .comment--reply .comment-body {
                    background: var(--bg-card);
                }

                .reply-form {
                    display: flex;
                    align-items: flex-start;
                    gap: var(--space-2);
                }
                .reply-input-wrapper { flex: 1; min-width: 0; }
                .reply-actions {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-1);
                }
            `}</style>
        </>
    );
}
