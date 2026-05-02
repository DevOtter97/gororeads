import { useState } from 'preact/hooks';
import type { Post, PostRepostRef } from '../../domain/entities/Post';
import type { User } from '../../domain/entities/User';
import { postRepository } from '../../infrastructure/firebase/FirestorePostRepository';
import { timeAgo } from '../../utils/timeAgo';
import UserAvatar from '../UserAvatar';
import ConfirmModal from '../ConfirmModal';
import PostActions from './PostActions';
import CommentList from './CommentList';
import PostMenu from './PostMenu';

interface Props {
    post: Post;
    currentUser: User;
    initialLiked: boolean;
    initialReposted: boolean;
    onDelete?: (postId: string) => void;
    onReposted?: (newRepost: Post) => void;
    onUnreposted?: (originalPostId: string) => void;
}

/** Render del contenido (text/image/reading/list) — usado tanto para post normal como para el embed del repost. */
function PostContent({ source, onImageClick }: Readonly<{
    source: Pick<Post, 'type' | 'text' | 'imageUrl' | 'readingRef' | 'listRef'> | PostRepostRef;
    onImageClick?: () => void;
}>) {
    return (
        <>
            {source.text && <p class="post-text">{source.text}</p>}

            {source.type === 'image' && source.imageUrl && (
                <button class="post-image-wrapper" onClick={onImageClick} aria-label="Abrir imagen">
                    <img src={source.imageUrl} alt="" loading="lazy" />
                </button>
            )}

            {source.type === 'reading' && source.readingRef && (
                <div class="post-ref post-ref-reading">
                    <div class="post-ref-thumb">
                        {source.readingRef.imageUrl
                            ? <img src={source.readingRef.imageUrl} alt={source.readingRef.title} />
                            : <span>{source.readingRef.title.charAt(0).toUpperCase()}</span>
                        }
                    </div>
                    <div class="post-ref-info">
                        <p class="post-ref-label">Lectura</p>
                        <p class="post-ref-title">{source.readingRef.title}</p>
                        <p class="post-ref-meta">{source.readingRef.category}</p>
                    </div>
                </div>
            )}

            {source.type === 'list' && source.listRef && (
                <a href={`/list/${source.listRef.slug}`} class="post-ref post-ref-list">
                    <div class="post-ref-thumb post-ref-thumb--list">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <div class="post-ref-info">
                        <p class="post-ref-label">Lista</p>
                        <p class="post-ref-title">{source.listRef.name}</p>
                        <p class="post-ref-meta">{source.listRef.coverCount} lecturas</p>
                    </div>
                    <svg class="post-ref-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </a>
            )}
        </>
    );
}

export default function PostCard({ post, currentUser, initialLiked, initialReposted, onDelete, onReposted, onUnreposted }: Readonly<Props>) {
    const [lightbox, setLightbox] = useState(false);
    const [commentsExpanded, setCommentsExpanded] = useState(false);
    const [commentsCount, setCommentsCount] = useState(post.commentsCount);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const isOwnPost = post.authorId === currentUser.id;
    const isRepost = post.type === 'repost' && post.repostOf;

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await postRepository.delete(post.id);
            onDelete?.(post.id);
            setConfirmDelete(false);
        } catch (err) {
            console.error('Error deleting post:', err);
            alert('No se pudo eliminar el post.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            <article class="post-card">
                {isRepost && (
                    <div class="repost-banner">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="17 1 21 5 17 9" />
                            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                            <polyline points="7 23 3 19 7 15" />
                            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                        </svg>
                        <span>
                            <a href={`/profile/${post.authorUsername}`} class="repost-banner-user">{post.authorUsername}</a>
                            {' '}reposteó
                        </span>
                        <a href={`/post/${post.id}`} class="repost-banner-time">· {timeAgo(post.createdAt)}</a>
                    </div>
                )}

                <header class="post-header">
                    {isRepost && post.repostOf ? (
                        <div class="post-author-row">
                            <a href={`/profile/${post.repostOf.authorUsername}`} class="post-author">
                                <UserAvatar username={post.repostOf.authorUsername} photoUrl={post.repostOf.authorPhotoURL} size={40} />
                                <span class="post-author-name">{post.repostOf.authorUsername}</span>
                            </a>
                            <a href={`/post/${post.repostOf.postId}`} class="post-time">{timeAgo(post.repostOf.createdAt)}</a>
                        </div>
                    ) : (
                        <div class="post-author-row">
                            <a href={`/profile/${post.authorUsername}`} class="post-author">
                                <UserAvatar username={post.authorUsername} photoUrl={post.authorPhotoURL} size={40} />
                                <span class="post-author-name">{post.authorUsername}</span>
                            </a>
                            <a href={`/post/${post.id}`} class="post-time">{timeAgo(post.createdAt)}</a>
                        </div>
                    )}
                    {isOwnPost && <PostMenu onDelete={() => setConfirmDelete(true)} />}
                </header>

                {/* Caption del reposter (text del post type=repost) va antes del embed */}
                {isRepost && post.text && <p class="post-text">{post.text}</p>}

                {/* Contenido principal */}
                {isRepost && post.repostOf ? (
                    <PostContent source={post.repostOf} onImageClick={() => setLightbox(true)} />
                ) : (
                    <PostContent source={post} onImageClick={() => setLightbox(true)} />
                )}

                <PostActions
                    post={{ ...post, commentsCount }}
                    currentUser={currentUser}
                    initialLiked={initialLiked}
                    initialReposted={initialReposted}
                    onCommentToggle={() => setCommentsExpanded(prev => !prev)}
                    commentsExpanded={commentsExpanded}
                    onReposted={onReposted}
                    onUnreposted={onUnreposted}
                />

                {commentsExpanded && (
                    <CommentList
                        post={post}
                        currentUser={currentUser}
                        onCountChange={(delta) => setCommentsCount(prev => prev + delta)}
                    />
                )}
            </article>

            {/* Lightbox para la imagen, sea del post o del embed */}
            {lightbox && (() => {
                const src = isRepost && post.repostOf?.imageUrl ? post.repostOf.imageUrl : post.imageUrl;
                return src ? (
                    <div
                        class="lightbox"
                        role="button"
                        tabIndex={-1}
                        aria-label="Cerrar imagen"
                        onClick={(e) => { if (e.target === e.currentTarget) setLightbox(false); }}
                        onKeyDown={(e) => { if (e.key === 'Escape') setLightbox(false); }}
                    >
                        <button class="lightbox-close" onClick={() => setLightbox(false)} aria-label="Cerrar">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                        <img class="lightbox-image" src={src} alt="" />
                    </div>
                ) : null;
            })()}

            {/* Modal de confirmacion de eliminar */}
            {confirmDelete && (
                <ConfirmModal
                    title="¿Eliminar este post?"
                    message="Se borrara permanentemente. Los comentarios y likes asociados ya no estaran accesibles."
                    confirmLabel="Eliminar post"
                    loadingLabel="Eliminando..."
                    loading={deleting}
                    onConfirm={handleDelete}
                    onCancel={() => setConfirmDelete(false)}
                />
            )}

            <style>{`
                .post-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-lg);
                    padding: var(--space-4);
                    margin-bottom: var(--space-3);
                }

                .repost-banner {
                    display: flex; align-items: center; gap: var(--space-2);
                    color: var(--text-muted); font-size: 0.8125rem;
                    margin-bottom: var(--space-3);
                }
                .repost-banner-user {
                    color: var(--text-secondary); font-weight: 600; text-decoration: none;
                }
                .repost-banner-user:hover { color: var(--accent-primary); }
                .repost-banner-time {
                    opacity: 0.7;
                    color: inherit;
                    text-decoration: none;
                }
                .repost-banner-time:hover {
                    opacity: 1;
                    text-decoration: underline;
                }

                .post-header {
                    display: flex; align-items: center; justify-content: space-between;
                    gap: var(--space-2);
                    margin-bottom: var(--space-3);
                }

                .post-author-row {
                    display: flex; align-items: center; gap: var(--space-2);
                    flex: 1; min-width: 0;
                }

                .post-author {
                    display: inline-flex; align-items: center; gap: var(--space-3);
                    text-decoration: none; color: inherit;
                    min-width: 0;
                }
                .post-author-name {
                    font-weight: 600;
                    color: var(--text-primary);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .post-author:hover .post-author-name { color: var(--accent-primary); }

                .post-time {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    text-decoration: none;
                    flex-shrink: 0;
                }
                .post-time::before {
                    content: '·';
                    margin-right: var(--space-2);
                    opacity: 0.5;
                }
                .post-time:hover {
                    color: var(--text-primary);
                    text-decoration: underline;
                }

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
