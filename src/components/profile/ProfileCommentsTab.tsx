import type { PostComment } from '../../domain/entities/Post';
import UserAvatar from '../UserAvatar';
import { timeAgoCompact } from '../../utils/timeAgo';

interface Props {
    comments: PostComment[];
    loading: boolean;
    emptyMessage: string;
}

export default function ProfileCommentsTab({ comments, loading, emptyMessage }: Props) {
    let content;
    if (loading) {
        content = <p class="tab-status">Cargando comentarios...</p>;
    } else if (comments.length === 0) {
        content = <p class="tab-status">{emptyMessage}</p>;
    } else {
        content = (
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
        );
    }

    return (
        <section class="tab-section">
            {content}

            <style>{`
                .tab-section { min-height: 200px; }
                .tab-status {
                    text-align: center;
                    color: var(--text-muted);
                    padding: var(--space-8) var(--space-4);
                    margin: 0;
                }
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
            `}</style>
        </section>
    );
}
