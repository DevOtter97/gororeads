import { useState } from 'preact/hooks';
import type { User } from '../../domain/entities/User';
import type { Post, CreatePostDTO } from '../../domain/entities/Post';
import { POST_TEXT_MAX_LENGTH } from '../../domain/entities/Post';
import { postRepository } from '../../infrastructure/firebase/FirestorePostRepository';
import UserAvatar from '../UserAvatar';

interface Props {
    user: User;
    onPosted: (post: Post) => void;
}

export default function PostComposer({ user, onPosted }: Props) {
    const [text, setText] = useState('');
    const [expanded, setExpanded] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const remaining = POST_TEXT_MAX_LENGTH - text.length;
    const canSubmit = text.trim().length > 0 && remaining >= 0 && !submitting;

    const reset = () => {
        setText('');
        setExpanded(false);
        setError('');
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        setError('');
        try {
            const data: CreatePostDTO = { type: 'text', text: text.trim() };
            const created = await postRepository.create(user, data);
            onPosted(created);
            reset();
        } catch (err) {
            console.error('Error creating post:', err);
            setError('No se pudo publicar. Intenta de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <form class="composer" onSubmit={handleSubmit}>
                <div class="composer-row">
                    <UserAvatar username={user.username} photoUrl={user.photoURL} size={40} />
                    <textarea
                        class="composer-input"
                        placeholder="¿Qué estás leyendo?"
                        value={text}
                        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
                        onFocus={() => setExpanded(true)}
                        rows={expanded ? 3 : 1}
                        maxLength={POST_TEXT_MAX_LENGTH + 50}
                        disabled={submitting}
                    />
                </div>
                {expanded && (
                    <div class="composer-footer">
                        <span class={`char-count ${remaining < 0 ? 'char-count--over' : remaining <= 50 ? 'char-count--low' : ''}`}>
                            {remaining}
                        </span>
                        <div class="composer-actions">
                            <button type="button" class="btn btn-ghost btn-sm" onClick={reset} disabled={submitting}>
                                Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary btn-sm" disabled={!canSubmit}>
                                {submitting ? 'Publicando...' : 'Publicar'}
                            </button>
                        </div>
                    </div>
                )}
                {error && <p class="composer-error">{error}</p>}
            </form>
            <style>{`
                .composer {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-lg);
                    padding: var(--space-4);
                    margin-bottom: var(--space-4);
                    transition: border-color var(--transition-fast);
                }
                .composer:focus-within {
                    border-color: var(--accent-primary);
                }

                .composer-row {
                    display: flex;
                    gap: var(--space-3);
                    align-items: flex-start;
                }

                .composer-input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    color: var(--text-primary);
                    font-family: inherit;
                    font-size: 0.95rem;
                    line-height: 1.5;
                    resize: none;
                    outline: none;
                    padding: var(--space-2) 0;
                }
                .composer-input::placeholder {
                    color: var(--text-muted);
                }

                .composer-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: var(--space-3);
                    margin-top: var(--space-3);
                    padding-top: var(--space-3);
                    border-top: 1px solid var(--border-color);
                }

                .composer-actions {
                    display: flex;
                    gap: var(--space-2);
                }

                .char-count {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-variant-numeric: tabular-nums;
                }
                .char-count--low {
                    color: var(--status-on-hold);
                }
                .char-count--over {
                    color: var(--status-danger);
                    font-weight: 600;
                }

                .composer-error {
                    color: var(--status-danger);
                    font-size: 0.875rem;
                    margin: var(--space-3) 0 0;
                }
            `}</style>
        </>
    );
}
