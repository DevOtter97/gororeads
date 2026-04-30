import { useState, useEffect, useRef } from 'preact/hooks';
import { authService } from '../infrastructure/firebase/FirebaseAuthService';
import NotificationBell from './notifications/NotificationBell';
import { getThemePref, setThemePref, type ThemePref } from '../utils/theme';

type Tab = 'home' | 'dashboard' | 'lists' | 'social' | 'settings';

interface HeaderProps {
    user: any;
    activeTab: Tab;
}

const NAV_ITEMS: { tab: Tab; label: string; href: string; icon: preact.JSX.Element }[] = [
    {
        tab: 'home', label: 'Inicio', href: '/',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
            </svg>
        )
    },
    {
        tab: 'dashboard', label: 'Lecturas', href: '/dashboard',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
        )
    },
    {
        tab: 'lists', label: 'Listas', href: '/lists',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
        )
    },
    {
        tab: 'social', label: 'Comunidad', href: '/social',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        )
    },
];

const THEME_OPTIONS: { value: ThemePref; label: string; icon: preact.JSX.Element }[] = [
    {
        value: 'system', label: 'Sistema',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
        )
    },
    {
        value: 'light', label: 'Claro',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
        )
    },
    {
        value: 'dark', label: 'Oscuro',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
        )
    },
];

function UserMenu({ user, onLogout }: { user: any; onLogout: () => void }) {
    const [open, setOpen] = useState(false);
    const [theme, setTheme] = useState<ThemePref>('system');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTheme(getThemePref());
    }, []);

    const handleThemeChange = (next: ThemePref) => {
        setTheme(next);
        setThemePref(next);
    };

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

    const initial = (user?.username || user?.displayName || user?.email || '?').charAt(0).toUpperCase();

    return (
        <div class="user-menu" ref={wrapperRef}>
            <button
                class="user-menu-trigger"
                onClick={() => setOpen(prev => !prev)}
                aria-label="Menu de usuario"
                aria-expanded={open}
                aria-haspopup="menu"
            >
                {user?.photoURL ? (
                    <img class="user-menu-avatar" src={user.photoURL} alt="" />
                ) : (
                    <span class="user-menu-avatar user-menu-avatar--initial">{initial}</span>
                )}
            </button>
            {open && (
                <div class="user-menu-dropdown" role="menu">
                    <div class="user-menu-info">
                        <p class="user-menu-name">{user?.username || user?.displayName || ''}</p>
                        {user?.email && <p class="user-menu-email">{user.email}</p>}
                    </div>
                    <a
                        href={user?.username ? `/profile/${user.username}` : '/profile'}
                        class="user-menu-item"
                        role="menuitem"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        Mi perfil
                    </a>
                    <a href="/settings" class="user-menu-item" role="menuitem">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                        Configuración
                    </a>

                    <div class="user-menu-section">
                        <p class="user-menu-section-label">Tema</p>
                        <div class="user-menu-theme-options" role="radiogroup" aria-label="Tema">
                            {THEME_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    class={`user-menu-theme-option ${theme === opt.value ? 'active' : ''}`}
                                    onClick={() => handleThemeChange(opt.value)}
                                    role="radio"
                                    aria-checked={theme === opt.value}
                                    title={opt.label}
                                >
                                    {opt.icon}
                                    <span>{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button class="user-menu-item user-menu-item--danger" onClick={onLogout} role="menuitem">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Cerrar sesión
                    </button>
                </div>
            )}
        </div>
    );
}

export default function Header({ user, activeTab }: HeaderProps) {
    const handleLogout = async () => {
        await authService.logout();
        window.location.href = '/';
    };

    return (
        <>
            <header class="header">
                <div class="container header-inner">
                    <a href="/" class="logo">
                        <span class="logo-icon">📚</span>
                        <span class="logo-text">gororeads</span>
                    </a>
                    <nav class="nav-links">
                        {NAV_ITEMS.map(item => (
                            <a key={item.tab} href={item.href} class={`nav-link ${activeTab === item.tab ? 'active' : ''}`}>
                                {item.label}
                            </a>
                        ))}
                    </nav>
                    <div class="header-actions">
                        {user ? (
                            <>
                                <NotificationBell userId={user.id} />
                                <UserMenu user={user} onLogout={handleLogout} />
                            </>
                        ) : (
                            <a href="/" class="btn btn-primary btn-sm header-login-cta">Iniciar sesión</a>
                        )}
                    </div>
                </div>
            </header>

            {/* Bottom nav: solo visible en mobile y para usuarios autenticados */}
            {user && (
            <nav class="bottom-nav" aria-label="Navegacion principal">
                {NAV_ITEMS.map(item => (
                    <a
                        key={item.tab}
                        href={item.href}
                        class={`bottom-nav-item ${activeTab === item.tab ? 'active' : ''}`}
                    >
                        {item.icon}
                        <span class="bottom-nav-label">{item.label}</span>
                    </a>
                ))}
            </nav>
            )}

            <style>{`
                .header {
                    background: var(--bg-secondary);
                    border-bottom: 1px solid var(--border-color);
                    padding: var(--space-4) 0;
                    position: sticky;
                    top: 0;
                    z-index: 100;
                }

                .header-inner {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: var(--space-3);
                }

                .logo {
                    font-size: 1.25rem;
                    font-weight: 700;
                    display: inline-flex;
                    align-items: center;
                    gap: var(--space-2);
                    color: var(--text-primary);
                    text-decoration: none;
                    flex-shrink: 0;
                }
                /* Texto del logo oculto en mobile (solo se ve el icono) */
                .logo-text {
                    display: none;
                }
                .logo-icon {
                    font-size: 1.5rem;
                }

                /* Nav links inline: ocultos en mobile, visibles en desktop */
                .nav-links {
                    display: none;
                    gap: var(--space-4);
                }

                .nav-link {
                    color: var(--text-secondary);
                    text-decoration: none;
                    font-weight: 500;
                    transition: color var(--transition-fast);
                }
                .nav-link:hover,
                .nav-link.active {
                    color: var(--accent-primary);
                }

                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                }

                /* Avatar dropdown */
                .user-menu { position: relative; }
                .user-menu-trigger {
                    display: flex; align-items: center; justify-content: center;
                    width: 36px; height: 36px;
                    border-radius: 50%;
                    background: transparent;
                    transition: opacity var(--transition-fast);
                }
                .user-menu-trigger:hover { opacity: 0.85; }
                .user-menu-avatar {
                    width: 36px; height: 36px;
                    border-radius: 50%;
                    object-fit: cover;
                    background: var(--accent-gradient);
                    display: flex; align-items: center; justify-content: center;
                    color: white; font-weight: 700; font-size: 0.95rem;
                }
                .user-menu-avatar--initial {
                    line-height: 1;
                }

                .user-menu-dropdown {
                    position: absolute;
                    top: calc(100% + 8px);
                    right: 0;
                    min-width: 220px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-md);
                    box-shadow: var(--shadow-lg);
                    padding: var(--space-1);
                    z-index: 150;
                    animation: user-menu-fade 0.12s ease;
                }
                @keyframes user-menu-fade {
                    from { opacity: 0; transform: translateY(-4px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                .user-menu-info {
                    padding: var(--space-3);
                    border-bottom: 1px solid var(--border-color);
                    margin-bottom: var(--space-1);
                }
                .user-menu-name {
                    margin: 0;
                    color: var(--text-primary);
                    font-weight: 600;
                    font-size: 0.875rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .user-menu-email {
                    margin: 2px 0 0;
                    color: var(--text-muted);
                    font-size: 0.75rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .user-menu-item {
                    display: flex; align-items: center; gap: var(--space-2);
                    width: 100%;
                    padding: var(--space-2) var(--space-3);
                    border-radius: var(--border-radius-sm);
                    color: var(--text-primary);
                    font-size: 0.875rem;
                    font-weight: 500;
                    text-align: left;
                    text-decoration: none;
                    transition: background var(--transition-fast);
                    background: transparent;
                }
                .user-menu-item:hover { background: var(--bg-secondary); }
                .user-menu-item--danger { color: var(--status-danger); }
                .user-menu-item--danger:hover { background: rgba(239, 68, 68, 0.1); }

                .user-menu-section {
                    padding: var(--space-2) var(--space-3);
                    border-top: 1px solid var(--border-color);
                    margin-top: var(--space-1);
                }
                .user-menu-section-label {
                    margin: 0 0 var(--space-2);
                    font-size: 0.6875rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--text-muted);
                    font-weight: 600;
                }
                .user-menu-theme-options {
                    display: flex;
                    gap: var(--space-1);
                    background: var(--bg-secondary);
                    padding: 2px;
                    border-radius: var(--border-radius-md);
                }
                .user-menu-theme-option {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 2px;
                    padding: var(--space-2);
                    border-radius: calc(var(--border-radius-md) - 2px);
                    color: var(--text-secondary);
                    font-size: 0.6875rem;
                    transition: all var(--transition-fast);
                }
                .user-menu-theme-option:hover {
                    color: var(--text-primary);
                }
                .user-menu-theme-option.active {
                    background: var(--bg-card);
                    color: var(--accent-primary);
                    box-shadow: var(--shadow-sm);
                }

                /* Bottom nav: visible en mobile por defecto */
                .bottom-nav {
                    display: flex;
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: var(--bg-secondary);
                    border-top: 1px solid var(--border-color);
                    padding: var(--space-2) 0;
                    padding-bottom: calc(var(--space-2) + env(safe-area-inset-bottom, 0));
                    z-index: 100;
                    backdrop-filter: blur(8px);
                }
                .bottom-nav-item {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 2px;
                    padding: var(--space-2) var(--space-1);
                    color: var(--text-muted);
                    text-decoration: none;
                    font-size: 0.6875rem;
                    font-weight: 500;
                    transition: color var(--transition-fast);
                }
                .bottom-nav-item.active {
                    color: var(--accent-primary);
                }
                .bottom-nav-label {
                    font-size: 0.6875rem;
                    line-height: 1;
                }

                /* Espacio para que el bottom-nav no tape contenido en mobile */
                body {
                    padding-bottom: calc(64px + env(safe-area-inset-bottom, 0));
                }

                /* Desktop: header inline + sin bottom nav */
                @media (min-width: 768px) {
                    .nav-links { display: flex; }
                    .logo-text { display: inline; }
                    .logo-icon { font-size: 1.25rem; }
                    .bottom-nav { display: none; }
                    body { padding-bottom: 0; }
                }
            `}</style>
        </>
    );
}
