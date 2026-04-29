import { useState, useEffect } from 'preact/hooks';
import type { Post, PostComment } from '../../domain/entities/Post';
import { COMMENT_TEXT_MAX_LENGTH } from '../../domain/entities/Post';
import type { User } from '../../domain/entities/User';
import { postRepository } from '../../infrastructure/firebase/FirestorePostRepository';
import { notificationRepository } from '../../infrastructure/firebase/FirestoreNotificationRepository';
import UserAvatar from '../UserAvatar';

interface Props {
    post: Post;
    currentUser: User;
    onCountChange: (delta: number) => void;
}

function timeAgo(date: Date): string {
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

export default function CommentList({ post, currentUser, onCountChange }: Props) {
    const [comments, setComments] = useState<PostComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        postRepository.getComments(post.id)
            .then(setComments)
            .catch(err => console.error('Error loading comments:', err))
            .finally(() => setLoading(false));
    }, [post.id]);

    const remaining = COMMENT_TEXT_MAX_LENGTH - text.length;
    const canSubmit = text.trim().length > 0 && remaining >= 0 && !submitting;

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        try {
            const created = await postRepository.addComment(post.id, currentUser, text.trim());
            setComments(prev => [...prev, created]);
            setText('');
            onCountChange(1);

            if (post.authorId !== currentUser.id) {
                await notificationRepository.createNotification({
                    userId: post.authorId,
                    type: 'post_commented',
                    title: 'Nuevo comentario',
                    message: `${currentUser.username} comentó tu post`,
                    fromUserId: currentUser.id,
                    fromUsername: currentUser.username,
                    fromUserPhotoUrl: currentUser.photoURL,
                    metadata: { postId: post.id },
                    read: false,
                }).catch(err => console.error('Error creating comment notification:', err));
            }
        } catch (err) {
            console.error('Error adding comment:', err);
            alert('No se pudo publicar el comentario.');
        } finally {
            setSubmitting(false);
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
                ) : comments.length === 0 ? (
                    <p class="comments-status">Sé el primero en comentar.</p>
                ) : (
                    <ul class="comments-list">
                        {comments.map(c => {
                            const canDelete = c.userId === currentUser.id || post.authorId === currentUser.id;
                            return (
                                <li key={c.id} class="comment">
                                    <UserAvatar username={c.username} photoUrl={c.photoURL} size={32} />
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
                                    </div>
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
            `}</style>
        </>
    );
}
