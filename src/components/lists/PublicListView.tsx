import { useState, useEffect } from 'preact/hooks';
import type { CustomList, ListComment, ListReading } from '../../domain/entities/CustomList';
import type { Reading } from '../../domain/entities/Reading';
import { customListRepository } from '../../infrastructure/firebase/FirestoreCustomListRepository';
import { authService } from '../../infrastructure/firebase'; // Keep existing import
import { userRepository } from '../../infrastructure/firebase/FirestoreUserRepository'; // Import userRepository
import type { User } from '../../domain/entities/User';
import { CATEGORY_LABELS, STATUS_LABELS } from '../../domain/entities/Reading';

interface Props {
    slug: string;
}

export default function PublicListView({ slug }: Props) {
    const [user, setUser] = useState<User | null>(null);
    const [list, setList] = useState<CustomList | null>(null);
    const [readings, setReadings] = useState<ListReading[]>([]);
    const [comments, setComments] = useState<ListComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hasLiked, setHasLiked] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [ownerName, setOwnerName] = useState<string>(''); // State for owner name

    const [authInitializing, setAuthInitializing] = useState(true);

    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged((u) => {
            setUser(u);
            setAuthInitializing(false);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!authInitializing) {
            loadList();
        }
    }, [slug, authInitializing, user]);

    useEffect(() => {
        if (list && user) {
            checkIfLiked();
        }
    }, [list, user]);

    const loadList = async () => {
        if (authInitializing) return;

        try {
            setLoading(true);
            const data = await customListRepository.getBySlug(slug);

            if (!data) {
                setError('Lista no encontrada');
                return;
            }

            setList(data);
            setReadings(data.readings);

            // Load comments
            const commentsData = await customListRepository.getComments(data.id);
            setComments(commentsData);
        } catch (err) {
            console.error('Error loading list:', err);
            // Only set error if it's not a permission error or if we are sure the user should have access
            if (user) {
                setError('Error al cargar la lista. Verifica que tienes permisos.');
            } else {
                setError('Error al cargar la lista. Puede que sea privada.');
            }
        } finally {
            setLoading(false);
        }
    };



    // Fetch owner name when list is loaded
    useEffect(() => {
        const fetchOwnerName = async () => {
            if (!list) return;
            // Default to list.userName
            setOwnerName(list.userName);
            try {
                const owner = await userRepository.getUserProfile(list.userId);
                if (owner && (owner.displayName || owner.username)) {
                    setOwnerName(owner.displayName || owner.username);
                }
            } catch (err) {
                console.error('Error fetching list owner:', err);
            }
        };
        fetchOwnerName();
    }, [list]);

    const checkIfLiked = async () => {
        if (!list || !user) return;
        const liked = await customListRepository.hasUserLiked(list.id, user.id);
        setHasLiked(liked);
    };

    const handleLike = async () => {
        if (!list || !user) return;
        const liked = await customListRepository.toggleLike(list.id, user.id);
        setHasLiked(liked);
        setList({
            ...list,
            likesCount: liked ? list.likesCount + 1 : list.likesCount - 1
        });
    };

    const handleAddComment = async () => {
        if (!list || !user || !newComment.trim()) return;

        setCommentLoading(true);
        try {
            const comment = await customListRepository.addComment(
                list.id,
                user.id,
                user.username || user.displayName || user.email,
                { content: newComment.trim() }
            );
            setComments([comment, ...comments]);
            setNewComment('');
        } catch (err) {
            console.error('Error adding comment:', err);
        } finally {
            setCommentLoading(false);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
    };

    if (loading || authInitializing) {
        return (
            <div class="loading-container">
                <span class="spinner spinner-lg"></span>
                <p>Cargando lista...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div class="error-container">
                <h2>{error}</h2>
                <a href="/" class="btn btn-primary">Volver al inicio</a>
            </div>
        );
    }

    if (!list) return null;

    const isOwner = user && user.id === list.userId;
    const canView = list.visibility !== 'private' || isOwner;

    if (!canView) {
        return (
            <div class="error-container">
                <h2>Esta lista es privada</h2>
                <a href="/" class="btn btn-primary">Volver al inicio</a>
            </div>
        );
    }

    return (
        <div class="public-list-container">
            <header class="list-header">
                <div class="container">
                    <div class="list-info">
                        <h1>{list.name}</h1>
                        {list.description && <p class="list-description">{list.description}</p>}
                        <div class="list-meta">
                            <span>Por {ownerName}</span>
                            <span>•</span>
                            <span>{list.readings.length} lecturas</span>
                        </div>
                    </div>
                    <div class="list-actions">
                        <button class="btn btn-ghost" onClick={copyLink}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                            Copiar Enlace
                        </button>
                        {user ? (
                            <button class={`btn ${hasLiked ? 'btn-liked' : 'btn-ghost'}`} onClick={handleLike}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill={hasLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                </svg>
                                {list.likesCount}
                            </button>
                        ) : (
                            <span class="likes-count">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                </svg>
                                {list.likesCount}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            <main class="container">
                <section class="readings-section">
                    <h2>Lecturas</h2>
                    {readings.length === 0 ? (
                        <p class="no-readings">Esta lista aún no tiene lecturas</p>
                    ) : (
                        <div class="readings-grid">
                            {readings.map(reading => (
                                <div key={reading.id} class="reading-item">
                                    <div class="reading-image">
                                        {reading.imageUrl ? (
                                            <img src={reading.imageUrl} alt={reading.title} />
                                        ) : (
                                            <div class="reading-placeholder">
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                                </svg>
                                            </div>
                                        )}
                                        <span class={`badge badge-category-${reading.category}`}>
                                            {CATEGORY_LABELS[reading.category]}
                                        </span>
                                    </div>
                                    <div class="reading-info">
                                        <h3>{reading.title}</h3>
                                        <span class="reading-status">{STATUS_LABELS[reading.status]}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section class="comments-section">
                    <h2>Comentarios ({comments.length})</h2>

                    {user ? (
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
                        <p class="login-prompt">
                            <a href="/">Inicia sesión</a> para dejar un comentario
                        </p>
                    )}

                    <div class="comments-list">
                        {comments.map(comment => (
                            <div key={comment.id} class="comment">
                                <div class="comment-header">
                                    <span class="comment-author">
                                        {(user && comment.userId === user.id)
                                            ? (user.displayName || user.username || user.email)
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
                </section>
            </main>

            <style>{`
                .public-list-container {
                    min-height: 100vh;
                }

                .list-header {
                    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
                    padding: var(--space-12) 0;
                    color: white;
                }

                .list-header .container {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: var(--space-6);
                }

                .list-info h1 {
                    font-size: 2rem;
                    margin-bottom: var(--space-2);
                }

                .list-description {
                    font-size: 1.125rem;
                    opacity: 0.9;
                    margin-bottom: var(--space-3);
                }

                .list-meta {
                    display: flex;
                    gap: var(--space-2);
                    font-size: 0.875rem;
                    opacity: 0.8;
                }

                .list-actions {
                    display: flex;
                    gap: var(--space-2);
                }

                .list-actions .btn {
                    background: rgba(255,255,255,0.2);
                    color: white;
                    border: none;
                }

                .list-actions .btn:hover {
                    background: rgba(255,255,255,0.3);
                }

                .btn-liked {
                    background: white !important;
                    color: #ef4444 !important;
                }

                .likes-count {
                    display: flex;
                    align-items: center;
                    gap: var(--space-1);
                    padding: var(--space-2) var(--space-4);
                    background: rgba(255,255,255,0.2);
                    border-radius: var(--border-radius-md);
                }

                .readings-section,
                .comments-section {
                    padding: var(--space-8) 0;
                }

                .readings-section h2,
                .comments-section h2 {
                    margin-bottom: var(--space-6);
                }

                .readings-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: var(--space-4);
                }

                .reading-item {
                    background: var(--bg-card);
                    border-radius: var(--border-radius-lg);
                    overflow: hidden;
                    border: 1px solid var(--border-color);
                }

                .reading-image {
                    position: relative;
                    height: 150px;
                    background: var(--bg-input);
                }

                .reading-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .reading-placeholder {
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-muted);
                }

                .reading-image .badge {
                    position: absolute;
                    top: var(--space-2);
                    right: var(--space-2);
                }

                .reading-info {
                    padding: var(--space-3);
                }

                .reading-info h3 {
                    font-size: 0.9375rem;
                    margin-bottom: var(--space-1);
                }

                .reading-status {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                .no-readings {
                    color: var(--text-secondary);
                    text-align: center;
                    padding: var(--space-8);
                }

                .comment-form {
                    margin-bottom: var(--space-6);
                }

                .comment-form textarea {
                    margin-bottom: var(--space-2);
                }

                .login-prompt {
                    margin-bottom: var(--space-6);
                    color: var(--text-secondary);
                }

                .login-prompt a {
                    color: var(--accent-primary);
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

                .loading-container,
                .error-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    gap: var(--space-4);
                }

                .error-container h2 {
                    color: var(--text-secondary);
                }
            `}</style>
        </div>
    );
}
