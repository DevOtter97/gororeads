import { useState, useEffect } from 'preact/hooks';
import type { CustomList, ListVisibility, ListReading } from '../../domain/entities/CustomList';
import { customListRepository } from '../../infrastructure/firebase/FirestoreCustomListRepository';
import { authService } from '../../infrastructure/firebase';
import type { User } from '../../domain/entities/User';
import CustomListCard from './CustomListCard';
import CustomListModal from './CustomListModal';

export default function ListManager() {
    const [user, setUser] = useState<User | null>(null);
    const [lists, setLists] = useState<CustomList[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingList, setEditingList] = useState<CustomList | undefined>(undefined);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged((u) => {
            setUser(u);
            if (!u) {
                window.location.href = '/';
            }
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!user) return;
        loadLists();
    }, [user]);

    const loadLists = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const data = await customListRepository.getByUserId(user.id);
            setLists(data);
        } catch (err) {
            console.error('Error loading lists:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (data: { name: string; description?: string; visibility: ListVisibility; readings?: ListReading[] }) => {
        if (!user) return;
        // Use username first, then displayName, then fallback (though username should exist)
        const userNameToUse = user.username || user.displayName || user.email;
        const newList = await customListRepository.create(user.id, userNameToUse, data);
        setLists([newList, ...lists]);
    };

    const handleUpdate = async (data: { name: string; description?: string; visibility: ListVisibility; readings?: ListReading[] }) => {
        if (!editingList || !user) return;
        const userNameToUse = user.username || user.displayName || user.email;
        const updated = await customListRepository.update(editingList.id, { ...data, userName: userNameToUse });
        setLists(lists.map(l => l.id === updated.id ? updated : l));
        setEditingList(undefined);
    };

    const handleDelete = async (id: string) => {
        await customListRepository.delete(id);
        setLists(lists.filter(l => l.id !== id));
        setDeleteConfirm(null);
    };

    const handleEdit = (list: CustomList) => {
        setEditingList(list);
        setShowModal(true);
    };

    const handleView = (list: CustomList) => {
        window.location.href = `/list/${list.slug}`;
    };

    const handleLogout = async () => {
        await authService.logout();
        window.location.href = '/';
    };

    if (loading) {
        return (
            <div class="loading-container">
                <span class="spinner spinner-lg"></span>
                <p>Cargando listas...</p>
            </div>
        );
    }

    return (
        <div class="list-manager-container">
            <header class="header">
                <div class="container header-inner">
                    <div class="logo">
                        <span class="logo-icon">📚</span>
                        gororeads
                    </div>
                    <nav class="nav-links">
                        <a href="/dashboard" class="nav-link">Lecturas</a>
                        <a href="/lists" class="nav-link active">Listas</a>
                    </nav>
                    <div class="header-actions">
                        <span class="user-email">{user?.username || user?.displayName || user?.email}</span>
                        <button class="btn btn-ghost btn-sm" onClick={handleLogout}>
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </header>

            <main class="container main-content">
                <div class="page-header">
                    <h1>Mis Listas</h1>
                    <button class="btn btn-primary" onClick={() => {
                        setEditingList(undefined);
                        setShowModal(true);
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Nueva Lista
                    </button>
                </div>

                {lists.length === 0 ? (
                    <div class="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                        <h3>No tienes listas todavía</h3>
                        <p class="empty-state-text">Crea tu primera lista para organizar y compartir tus lecturas</p>
                        <button class="btn btn-primary" onClick={() => setShowModal(true)}>
                            Crear Primera Lista
                        </button>
                    </div>
                ) : (
                    <div class="grid lists-grid">
                        {lists.map((list) => (
                            <CustomListCard
                                key={list.id}
                                list={list}
                                readings={list.readings}
                                onEdit={handleEdit}
                                onDelete={(id) => setDeleteConfirm(id)}
                                onView={handleView}
                            />
                        ))}
                    </div>
                )}
            </main>

            {showModal && user && (
                <CustomListModal
                    list={editingList}
                    user={user}
                    onSubmit={editingList ? handleUpdate : handleCreate}
                    onClose={() => {
                        setShowModal(false);
                        setEditingList(undefined);
                    }}
                />
            )}

            {deleteConfirm && (
                <div class="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div class="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>¿Eliminar lista?</h3>
                        <p>Esta acción no se puede deshacer.</p>
                        <div class="modal-actions">
                            <button class="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>
                                Cancelar
                            </button>
                            <button class="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .list-manager-container {
                    min-height: 100vh;
                }

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

                .user-email {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .main-content {
                    padding-top: var(--space-8);
                    padding-bottom: var(--space-8);
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--space-6);
                }

                .page-header h1 {
                    font-size: 1.75rem;
                }

                .lists-grid {
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                }

                .empty-state {
                    text-align: center;
                    padding: var(--space-16) var(--space-4);
                    color: var(--text-secondary);
                }

                .empty-state svg {
                    margin-bottom: var(--space-4);
                    opacity: 0.3;
                }

                .empty-state h3 {
                    color: var(--text-primary);
                    margin-bottom: var(--space-2);
                }

                .empty-state-text {
                    margin-bottom: var(--space-6);
                }

                .confirm-modal {
                    max-width: 400px;
                    text-align: center;
                }

                .confirm-modal h3 {
                    margin-bottom: var(--space-2);
                }

                .confirm-modal p {
                    color: var(--text-secondary);
                    margin-bottom: var(--space-6);
                }

                .modal-actions {
                    display: flex;
                    justify-content: center;
                    gap: var(--space-2);
                }

                .btn-danger {
                    background: var(--status-dropped);
                    color: white;
                }

                .btn-danger:hover {
                    opacity: 0.9;
                }

                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    gap: var(--space-4);
                }
            `}</style>
        </div>
    );
}
