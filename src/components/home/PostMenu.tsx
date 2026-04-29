import { useState, useEffect, useRef } from 'preact/hooks';

interface Props {
    onDelete: () => void;
}

export default function PostMenu({ onDelete }: Props) {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [open]);

    return (
        <>
            <div class="post-menu" ref={wrapperRef}>
                <button
                    class="post-menu-trigger"
                    onClick={() => setOpen(prev => !prev)}
                    aria-label="Mas opciones"
                    aria-expanded={open}
                    aria-haspopup="menu"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="1.6" />
                        <circle cx="12" cy="12" r="1.6" />
                        <circle cx="12" cy="19" r="1.6" />
                    </svg>
                </button>
                {open && (
                    <div class="post-menu-dropdown" role="menu">
                        <button
                            class="post-menu-item post-menu-item--danger"
                            onClick={() => { setOpen(false); onDelete(); }}
                            role="menuitem"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                            </svg>
                            Eliminar post
                        </button>
                    </div>
                )}
            </div>
            <style>{`
                .post-menu { position: relative; }
                .post-menu-trigger {
                    display: flex; align-items: center; justify-content: center;
                    width: 32px; height: 32px;
                    border-radius: var(--border-radius-md);
                    color: var(--text-muted);
                    transition: all var(--transition-fast);
                }
                .post-menu-trigger:hover {
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                }

                .post-menu-dropdown {
                    position: absolute;
                    top: calc(100% + 4px);
                    right: 0;
                    min-width: 160px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-md);
                    box-shadow: var(--shadow-lg);
                    padding: var(--space-1);
                    z-index: 50;
                    animation: post-menu-fade 0.12s ease;
                }
                @keyframes post-menu-fade {
                    from { opacity: 0; transform: translateY(-4px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                .post-menu-item {
                    display: flex; align-items: center; gap: var(--space-2);
                    width: 100%;
                    padding: var(--space-2) var(--space-3);
                    border-radius: var(--border-radius-sm);
                    color: var(--text-primary);
                    font-size: 0.875rem;
                    font-weight: 500;
                    text-align: left;
                    transition: background var(--transition-fast);
                }
                .post-menu-item:hover { background: var(--bg-secondary); }

                .post-menu-item--danger { color: var(--status-danger); }
                .post-menu-item--danger:hover {
                    background: rgba(239, 68, 68, 0.1);
                }
            `}</style>
        </>
    );
}
