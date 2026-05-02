import { useState, useEffect } from 'preact/hooks';
import { authService } from '../../infrastructure/firebase/FirebaseAuthService';
import { readingRepository } from '../../infrastructure/firebase/FirestoreReadingRepository';
import type { Reading, ReadingStatus, ReadingCategory, CreateReadingDTO, UpdateReadingDTO } from '../../domain/entities/Reading';
import { useAuth } from '../../hooks/useAuth';
import ReadingCard from './ReadingCard';
import ReadingFilters from './ReadingFilters';
import ReadingForm from './ReadingForm';
import ReadingDetailsModal from './ReadingDetailsModal';
import StartReadingModal from './StartReadingModal';
import Header from '../Header';
import LoadingState from '../LoadingState';
import EmptyState from '../EmptyState';
import ConfirmModal from '../ConfirmModal';

export default function ReadingList() {
    const { user } = useAuth({ redirectIfUnauthenticated: '/' });
    const [readings, setReadings] = useState<Reading[]>([]);
    const [filteredReadings, setFilteredReadings] = useState<Reading[]>([]);
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [statusFilter, setStatusFilter] = useState<ReadingStatus | 'all'>('all');
    const [categoryFilter, setCategoryFilter] = useState<ReadingCategory | 'all'>('all');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [favoritesFilter, setFavoritesFilter] = useState(false);

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [viewingReading, setViewingReading] = useState<Reading | undefined>(undefined);
    const [editingReading, setEditingReading] = useState<Reading | undefined>(undefined);
    const [startingReading, setStartingReading] = useState<Reading | undefined>(undefined);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Load readings (depende solo del id para no re-fetchar cuando se enriquece el perfil)
    useEffect(() => {
        if (!user?.id) return;

        const loadReadings = async () => {
            try {
                setLoading(true);
                const data = await readingRepository.getByUserId(user.id);
                setReadings(data);

                // Extract unique tags
                const tags = new Set<string>();
                data.forEach((r) => r.tags.forEach((t) => tags.add(t)));
                setAvailableTags(Array.from(tags).sort((a, b) => a.localeCompare(b)));
            } catch (err) {
                setError('Error al cargar las lecturas');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadReadings();
    }, [user?.id]);

    // Apply filters
    useEffect(() => {
        let result = [...readings];

        if (statusFilter !== 'all') {
            result = result.filter((r) => r.status === statusFilter);
        }

        if (categoryFilter !== 'all') {
            result = result.filter((r) => r.category === categoryFilter);
        }

        if (selectedTags.length > 0) {
            result = result.filter((r) =>
                selectedTags.some((tag) => r.tags.includes(tag))
            );
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter((r) =>
                r.title.toLowerCase().includes(query)
            );
        }

        if (favoritesFilter) {
            result = result.filter((r) => r.isFavorite);
        }

        setFilteredReadings(result);
    }, [readings, statusFilter, categoryFilter, selectedTags, searchQuery, favoritesFilter]);

    const handleCreate = async (data: CreateReadingDTO) => {
        if (!user) {
            console.error('No user found');
            throw new Error('No user found');
        }
        try {
            const newReading = await readingRepository.create(user.id, data);
            setReadings([newReading, ...readings]);
            setShowModal(false);
        } catch (err) {
            console.error('Error creating reading:', err);
            throw err;
        }
    };

    const handleUpdate = async (data: CreateReadingDTO) => {
        if (!editingReading) {
            console.error('No editing reading found');
            throw new Error('No editing reading');
        }
        try {
            const updated = await readingRepository.update(editingReading, data);
            setReadings(readings.map((r) => (r.id === updated.id ? updated : r)));
            setShowModal(false);
            setEditingReading(undefined);
        } catch (err) {
            console.error('Error updating reading:', err);
            throw err;
        }
    };

    const handleStatusChange = async (id: string, status: ReadingStatus) => {
        const readingToUpdate = readings.find((r) => r.id === id);
        if (!readingToUpdate) return;

        try {
            // Intercept 'reading' status change
            if (status === 'reading') {
                setStartingReading(readingToUpdate);
                return;
            }

            const updates: UpdateReadingDTO = { status };

            // Auto-complete if status is completed and totals exist
            if (status === 'completed') {
                updates.finishedAt = new Date();
                if (readingToUpdate.totalChapters) {
                    updates.currentChapter = readingToUpdate.totalChapters;
                }
                if (readingToUpdate.measureUnit === 'percentage') {
                    updates.currentChapter = 100;
                }
            }

            const updated = await readingRepository.update(readingToUpdate, updates);
            setReadings(readings.map((r) => (r.id === id ? updated : r)));
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
        const reading = readings.find((r) => r.id === id);
        if (!reading) return;
        try {
            const updated = await readingRepository.update(reading, { isFavorite });
            setReadings(readings.map((r) => (r.id === id ? updated : r)));
        } catch (err) {
            console.error('Error toggling favorite:', err);
        }
    };

    const handleStartReadingConfirm = async (data: { startedAt: Date; currentChapter: number; measureUnit: ReadingMeasureUnit }) => {
        if (!startingReading) return;

        try {
            const updates: UpdateReadingDTO = {
                status: 'reading',
                startedAt: data.startedAt,
                currentChapter: data.currentChapter,
                measureUnit: data.measureUnit
            };

            const updated = await readingRepository.update(startingReading, updates);
            setReadings(readings.map((r) => (r.id === startingReading.id ? updated : r)));
            setStartingReading(undefined);
        } catch (err) {
            console.error('Error starting reading:', err);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await readingRepository.delete(id);
            setReadings(readings.filter((r) => r.id !== id));
            setDeleteConfirm(null);
        } catch (err) {
            console.error('Error deleting reading:', err);
        }
    };

    const handleEdit = (reading: Reading) => {
        setViewingReading(undefined);
        setEditingReading(reading);
        setShowModal(true);
    };

    const handleView = (reading: Reading) => {
        setViewingReading(reading);
    };

    const handleTagToggle = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter((t) => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleClearFilters = () => {
        setStatusFilter('all');
        setCategoryFilter('all');
        setSelectedTags([]);
        setSearchQuery('');
        setFavoritesFilter(false);
    };

    const handleLogout = async () => {
        await authService.logout();
        window.location.href = '/';
    };

    if (loading) {
        return <LoadingState message="Cargando lecturas..." />;
    }

    return (
        <div class="reading-list-container">
            {/* Header */}
            <Header user={user} activeTab="dashboard" />

            {/* Main Content */}
            < main class="main" >
                <div class="container">
                    <div class="page-header">
                        <h1 class="page-title">Mis Lecturas</h1>
                        <button
                            class="btn btn-primary"
                            onClick={() => {
                                setEditingReading(undefined);
                                setShowModal(true);
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Añadir Lectura
                        </button>
                    </div>

                    <ReadingFilters
                        currentStatus={statusFilter}
                        currentCategory={categoryFilter}
                        selectedTags={selectedTags}
                        availableTags={availableTags}
                        searchQuery={searchQuery}
                        showFavoritesOnly={favoritesFilter}
                        onStatusChange={setStatusFilter}
                        onCategoryChange={setCategoryFilter}
                        onTagToggle={handleTagToggle}
                        onSearchChange={setSearchQuery}
                        onFavoritesToggle={() => setFavoritesFilter(!favoritesFilter)}
                        onClearFilters={handleClearFilters}
                    />

                    {error && (
                        <div class="toast toast-error">
                            {error}
                            <button class="btn btn-ghost btn-sm" onClick={() => setError('')}>×</button>
                        </div>
                    )}

                    {filteredReadings.length === 0 ? (
                        <EmptyState
                            titleAs="h2"
                            icon={
                                <svg class="empty-state-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                </svg>
                            }
                            title={readings.length === 0 ? 'No hay lecturas' : 'Sin resultados'}
                            description={
                                readings.length === 0
                                    ? 'Añade tu primer manga, manhwa o novela para empezar'
                                    : 'Intenta ajustar los filtros para ver más resultados'
                            }
                        >
                            {readings.length === 0 && (
                                <button class="btn btn-primary" onClick={() => setShowModal(true)}>
                                    Añadir Primera Lectura
                                </button>
                            )}
                        </EmptyState>
                    ) : (
                        <div class="grid reading-grid">
                            {filteredReadings.map((reading) => (
                                <ReadingCard
                                    key={reading.id}
                                    reading={reading}
                                    onView={handleView}
                                    onEdit={handleEdit}
                                    onDelete={(id) => setDeleteConfirm(id)}
                                    onStatusChange={handleStatusChange}
                                    onToggleFavorite={handleToggleFavorite}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main >

            {/* Add/Edit Modal */}
            {
                showModal && (
                    <div
                        class="modal-overlay"
                        role="button"
                        tabIndex={-1}
                        aria-label="Cerrar dialogo"
                        onClick={(e) => {
                            if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
                                setShowModal(false);
                                setEditingReading(undefined);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                setShowModal(false);
                                setEditingReading(undefined);
                            }
                        }}
                    >
                        <div class="modal" role="dialog" aria-modal="true">
                            <div class="modal-header">
                                <h2 class="modal-title">
                                    {editingReading ? 'Editar Lectura' : 'Nueva Lectura'}
                                </h2>
                                <button
                                    class="modal-close"
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingReading(undefined);
                                    }}
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                            <div class="modal-body">
                                <ReadingForm
                                    reading={editingReading}
                                    onSubmit={editingReading ? handleUpdate : handleCreate}
                                    onCancel={() => {
                                        setShowModal(false);
                                        setEditingReading(undefined);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )
            }

            {/* View Details Modal */}
            {
                viewingReading && (
                    <ReadingDetailsModal
                        reading={viewingReading}
                        onClose={() => setViewingReading(undefined)}
                        onEdit={handleEdit}
                    />
                )
            }

            {/* Start Reading Modal */}
            {
                startingReading && (
                    <StartReadingModal
                        reading={startingReading}
                        onConfirm={handleStartReadingConfirm}
                        onCancel={() => setStartingReading(undefined)}
                    />
                )
            }

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <ConfirmModal
                    title="¿Eliminar esta lectura?"
                    message="Esta acción no se puede deshacer."
                    confirmLabel="Eliminar"
                    onConfirm={() => handleDelete(deleteConfirm)}
                    onCancel={() => setDeleteConfirm(null)}
                />
            )}

            <style>{`
        .user-email {
          font-size: 0.875rem;
          color: var(--text-secondary);
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

        @media (max-width: 640px) {
          .user-email {
            display: none;
          }
        }
      `}</style>
        </div >
    );
}
