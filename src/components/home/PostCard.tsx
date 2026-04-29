import { useState } from 'preact/hooks';
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
    const [lightbox, setLightbox] = useState(false);

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

                {post.type === 'image' && post.imageUrl && (
                    <button class="post-image-wrapper" onClick={() => setLightbox(true)} aria-label="Abrir imagen">
                        <img src={post.imageUrl} alt="" loading="lazy" />
                    </button>
                )}

                {post.type === 'reading' && post.readingRef && (
                    <div class="post-ref post-ref-reading">
                        <div class="post-ref-thumb">
                            {post.readingRef.imageUrl
                                ? <img src={post.readingRef.imageUrl} alt={post.readingRef.title} />
                                : <span>{post.readingRef.title.charAt(0).toUpperCase()}</span>
                            }
                        </div>
                        <div class="post-ref-info">
                            <p class="post-ref-label">Lectura</p>
                            <p class="post-ref-title">{post.readingRef.title}</p>
                            <p class="post-ref-meta">{post.readingRef.category}</p>
                        </div>
                    </div>
                )}

                {post.type === 'list' && post.listRef && (
                    <a href={`/list/${post.listRef.slug}`} class="post-ref post-ref-list">
                        <div class="post-ref-thumb post-ref-thumb--list">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <div class="post-ref-info">
                            <p class="post-ref-label">Lista</p>
                            <p class="post-ref-title">{post.listRef.name}</p>
                            <p class="post-ref-meta">{post.listRef.coverCount} lecturas</p>
                        </div>
                        <svg class="post-ref-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </a>
                )}
            </article>

            {lightbox && post.imageUrl && (
                <div class="lightbox" onClick={() => setLightbox(false)}>
                    <button class="lightbox-close" onClick={() => setLightbox(false)} aria-label="Cerrar">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                    <img class="lightbox-image" src={post.imageUrl} alt="" onClick={(e) => e.stopPropagation()} />
                </div>
            )}

            <style>{`
                .post-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-lg);
                    padding: var(--space-4);
                    margin-bottom: var(--space-3);
                }

                .post-header { margin-bottom: var(--space-3); }

                .post-author {
                    display: inline-flex; align-items: center; gap: var(--space-3);
                    text-decoration: none; color: inherit;
                }
                .post-author-info { display: flex; flex-direction: column; line-height: 1.2; }
                .post-author-name { font-weight: 600; color: var(--text-primary); }
                .post-author:hover .post-author-name { color: var(--accent-primary); }
                .post-time { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }

                .post-text {
                    color: var(--text-primary); font-size: 0.95rem; line-height: 1.5;
                    margin: 0 0 var(--space-3); white-space: pre-wrap; word-break: break-word;
                }
                .post-text:last-child { margin-bottom: 0; }

                .post-image-wrapper {
                    display: block; width: 100%; padding: 0;
                    background: var(--bg-secondary); border-radius: var(--border-radius-md);
                    overflow: hidden; border: 1px solid var(--border-color);
                    cursor: zoom-in;
                }
                .post-image-wrapper img { display: block; width: 100%; height: auto; max-height: 480px; object-fit: contain; }

                .post-ref {
                    display: flex; align-items: center; gap: var(--space-3);
                    padding: var(--space-3);
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-md);
                    text-decoration: none; color: inherit;
                    transition: border-color var(--transition-fast);
                }
                .post-ref-list:hover { border-color: var(--accent-primary); }

                .post-ref-thumb {
                    width: 48px; height: 64px; flex-shrink: 0;
                    border-radius: var(--border-radius-sm); overflow: hidden;
                    background: var(--bg-card);
                    display: flex; align-items: center; justify-content: center;
                    color: var(--text-muted); font-weight: 700; font-size: 1.25rem;
                }
                .post-ref-thumb img { width: 100%; height: 100%; object-fit: cover; }
                .post-ref-thumb--list { width: 48px; height: 48px; color: var(--accent-primary); }

                .post-ref-info { flex: 1; min-width: 0; }
                .post-ref-label {
                    font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em;
                    color: var(--text-muted); margin: 0 0 2px; font-weight: 600;
                }
                .post-ref-title {
                    color: var(--text-primary); font-weight: 600; margin: 0;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .post-ref-meta {
                    font-size: 0.75rem; color: var(--text-muted);
                    margin: 2px 0 0; text-transform: capitalize;
                }
                .post-ref-arrow { color: var(--text-muted); flex-shrink: 0; }
                .post-ref-list:hover .post-ref-arrow { color: var(--accent-primary); }

                .lightbox {
                    position: fixed; inset: 0; z-index: 300;
                    background: rgba(0, 0, 0, 0.92);
                    display: flex; align-items: center; justify-content: center;
                    padding: var(--space-6);
                    animation: fadeIn 0.2s ease;
                }
                .lightbox-image {
                    max-width: 100%; max-height: 100%;
                    border-radius: var(--border-radius-md);
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                }
                .lightbox-close {
                    position: absolute; top: var(--space-4); right: var(--space-4);
                    width: 40px; height: 40px; border-radius: 50%;
                    background: rgba(255, 255, 255, 0.1); color: white;
                    display: flex; align-items: center; justify-content: center;
                    transition: background var(--transition-fast);
                }
                .lightbox-close:hover { background: rgba(255, 255, 255, 0.2); }
            `}</style>
        </>
    );
}
