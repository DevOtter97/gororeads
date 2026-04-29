import type { Post } from '../../domain/entities/Post';
import UserAvatar from '../UserAvatar';

interface Props {
    post: Post;
}

function timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'ahora';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `hace ${days} d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function PostCard({ post }: Props) {
    return (
        <>
            <article class="post-card">
                <header class="post-header">
                    <a href={`/profile/${post.authorUsername}`} class="post-author">
                        <UserAvatar username={post.authorUsername} photoUrl={post.authorPhotoURL} size={40} />
                        <div class="post-author-info">
                            <span class="post-author-name">{post.authorUsername}</span>
                            <span class="post-time">{timeAgo(post.createdAt)}</span>
                        </div>
                    </a>
                </header>

                {post.text && <p class="post-text">{post.text}</p>}
            </article>
            <style>{`
                .post-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-lg);
                    padding: var(--space-4);
                    margin-bottom: var(--space-3);
                    transition: border-color var(--transition-fast);
                }
                .post-card:hover {
                    border-color: var(--border-color);
                }

                .post-header {
                    margin-bottom: var(--space-3);
                }

                .post-author {
                    display: inline-flex;
                    align-items: center;
                    gap: var(--space-3);
                    text-decoration: none;
                    color: inherit;
                }

                .post-author-info {
                    display: flex;
                    flex-direction: column;
                    line-height: 1.2;
                }

                .post-author-name {
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .post-author:hover .post-author-name {
                    color: var(--accent-primary);
                }

                .post-time {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    margin-top: 2px;
                }

                .post-text {
                    color: var(--text-primary);
                    font-size: 0.95rem;
                    line-height: 1.5;
                    margin: 0;
                    white-space: pre-wrap;
                    word-break: break-word;
                }
            `}</style>
        </>
    );
}
