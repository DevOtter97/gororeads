import { useState } from 'preact/hooks';

interface Props {
    name: string;
    description?: string;
    ownerName: string;
    readingsCount: number;
    likesCount: number;
    hasLiked: boolean;
    canLike: boolean;
    onLike: () => void;
    onRequireAuth: (message: string) => void;
}

export default function ListHero({
    name,
    description,
    ownerName,
    readingsCount,
    likesCount,
    hasLiked,
    canLike,
    onLike,
    onRequireAuth,
}: Readonly<Props>) {
    const [linkCopied, setLinkCopied] = useState(false);

    const copyLink = async () => {
        await navigator.clipboard.writeText(globalThis.location.href);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    return (
        <header class="list-header">
            <div class="container">
                <a href="/" class="list-back-link">← Volver a Inicio</a>
                <div class="list-header-row">
                    <div class="list-info">
                        <h1>{name}</h1>
                        {description && <p class="list-description">{description}</p>}
                        <div class="list-meta">
                            <span>Por {ownerName}</span>
                            <span>•</span>
                            <span>{readingsCount} lecturas</span>
                        </div>
                    </div>
                    <div class="list-actions">
                        <button class={`btn btn-ghost ${linkCopied ? 'btn-copied' : ''}`} onClick={copyLink}>
                            {linkCopied ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                </svg>
                            )}
                            {linkCopied ? 'Enlace copiado' : 'Copiar enlace'}
                        </button>
                        <button
                            class={`btn ${hasLiked ? 'btn-liked' : 'btn-ghost'}`}
                            onClick={() => {
                                if (canLike) {
                                    onLike();
                                } else {
                                    onRequireAuth('Inicia sesión o crea una cuenta para dar like a esta lista');
                                }
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill={hasLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                            {Math.max(0, likesCount)}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .list-header {
                    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
                    padding: var(--space-12) 0;
                    color: white;
                }

                .list-header .container {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-4);
                }

                .list-back-link {
                    display: inline-block;
                    color: rgba(255, 255, 255, 0.85);
                    text-decoration: none;
                    font-size: 0.875rem;
                    transition: color var(--transition-fast);
                    align-self: flex-start;
                }
                .list-back-link:hover { color: white; }

                .list-header-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: var(--space-6);
                }
                @media (max-width: 600px) {
                    .list-header-row {
                        flex-direction: column;
                    }
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

                .btn-copied {
                    background: white !important;
                    color: #10b981 !important;
                }
            `}</style>
        </header>
    );
}
