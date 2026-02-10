import { authService } from '../infrastructure/firebase/FirebaseAuthService';
import NotificationBell from './notifications/NotificationBell';

interface HeaderProps {
    user: any;
    activeTab: 'dashboard' | 'lists' | 'social';
}

export default function Header({ user, activeTab }: HeaderProps) {
    const handleLogout = async () => {
        await authService.logout();
        window.location.href = '/';
    };

    return (
        <header class="header">
            <div class="container header-inner">
                <div class="logo">
                    <span class="logo-icon">📚</span>
                    gororeads
                </div>
                <nav class="nav-links">
                    <a href="/dashboard" class={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}>Lecturas</a>
                    <a href="/lists" class={`nav-link ${activeTab === 'lists' ? 'active' : ''}`}>Listas</a>
                    <a href="/social" class={`nav-link ${activeTab === 'social' ? 'active' : ''}`}>Comunidad</a>
                </nav>
                <div class="header-actions">
                    {user && <NotificationBell userId={user.id} />}
                    <a href="/profile" class="user-info">
                        {user?.photoURL && (
                            <img class="user-avatar-mini" src={user.photoURL} alt="" />
                        )}
                        <span class="user-name">
                            {user?.username || user?.displayName || user?.email}
                        </span>
                    </a>
                    <button class="btn btn-ghost btn-sm" onClick={handleLogout}>
                        Cerrar Sesión
                    </button>
                </div>
            </div>
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
                }

                .logo {
                    font-size: 1.25rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    color: var(--text-primary);
                }

                .nav-links {
                    display: flex;
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
                    gap: var(--space-4);
                }

                .user-info {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    text-decoration: none;
                    padding: var(--space-1) var(--space-2);
                    border-radius: var(--border-radius-md);
                    transition: background var(--transition-fast);
                }

                .user-info:hover {
                    background: var(--bg-card);
                }

                .user-avatar-mini {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    object-fit: cover;
                }

                .user-name {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }
            `}</style>
        </header>
    );
}
