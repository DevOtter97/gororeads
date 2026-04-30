import { useState } from 'preact/hooks';
import type { ListComment } from '../../domain/entities/CustomList';
import type { User } from '../../domain/entities/User';
import { customListRepository } from '../../infrastructure/firebase/FirestoreCustomListRepository';

interface Props {
    listId: string;
    comments: ListComment[];
    currentUser: User | null;
    onCommentAdded: (comment: ListComment) => void;
    onRequireAuth: (message: string) => void;
}

export default function ListCommentSection({
    listId,
    comments,
    currentUser,
    onCommentAdded,
    onRequireAuth,
}: Props) {
    const [newComment, setNewComment] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);

    const handleAddComment = async () => {
        if (!currentUser || !newComment.trim()) return;

        setCommentLoading(true);
        try {
            const comment = await customListRepository.addComment(
                listId,
                currentUser.id,
                currentUser.username || currentUser.displayName || currentUser.email,
                { content: newComment.trim() }
            );
            onCommentAdded(comment);
            setNewComment('');
        } catch (err) {
            console.error('Error adding comment:', err);
        } finally {
            setCommentLoading(false);
        }
    };

    return (
        <section class="comments-section">
            <h2>Comentarios ({comments.length})</h2>

            {currentUser ? (
                <div class="comment-form">
                    <textarea
                        class="form-input"
                        placeholder="Escribe un comentario..."
                        value={newComment}
                        onInput={(e) => setNewComment((e.target as HTMLTextAreaElement).value)}
                        rows={3}
                    />
                    <button
                        class="btn btn-primary"
                        onClick={handleAddComment}
                        disabled={commentLoading || !newComment.trim()}
                    >
                        {commentLoading ? 'Enviando...' : 'Comentar'}
                    </button>
                </div>
            ) : (
                <button
                    class="comment-login-cta"
                    onClick={() => onRequireAuth('Inicia sesión o crea una cuenta para dejar un comentario')}
                >
                    <span>Inicia sesión o regístrate para comentar</span>
                </button>
            )}

            <div class="comments-list">
                {comments.map(comment => (
                    <div key={comment.id} class="comment">
                        <div class="comment-header">
                            <span class="comment-author">
                                {(currentUser && comment.userId === currentUser.id)
                                    ? (currentUser.displayName || currentUser.username || currentUser.email)
                                    : comment.userName}
                            </span>
                            <span class="comment-date">
                                {new Date(comment.createdAt).toLocaleDateString('es-ES')}
                            </span>
                        </div>
                        <p class="comment-content">{comment.content}</p>
                    </div>
                ))}
            </div>

            <style>{`
                .comments-section {
                    padding: var(--space-8) 0;
                }

                .comments-section h2 {
                    margin-bottom: var(--space-6);
                }

                .comment-form {
                    margin-bottom: var(--space-6);
                }

                .comment-form textarea {
                    margin-bottom: var(--space-2);
                }

                .comment-login-cta {
                    width: 100%;
                    padding: var(--space-4);
                    background: var(--bg-card);
                    border: 1px dashed var(--border-color);
                    border-radius: var(--border-radius-md);
                    color: var(--accent-primary);
                    font-weight: 500;
                    font-size: 0.9375rem;
                    cursor: pointer;
                    margin-bottom: var(--space-6);
                    transition: all var(--transition-fast);
                }
                .comment-login-cta:hover {
                    border-color: var(--accent-primary);
                    background: rgba(139, 92, 246, 0.06);
                }

                .comments-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-4);
                }

                .comment {
                    background: var(--bg-card);
                    padding: var(--space-4);
                    border-radius: var(--border-radius-md);
                    border: 1px solid var(--border-color);
                }

                .comment-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: var(--space-2);
                }

                .comment-author {
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .comment-date {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                }

                .comment-content {
                    color: var(--text-secondary);
                    line-height: 1.6;
                }
            `}</style>
        </section>
    );
}
