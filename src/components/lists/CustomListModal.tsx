import { useState, useEffect } from 'preact/hooks';
import type { CustomList, ListVisibility, ListReading } from '../../domain/entities/CustomList';
import type { Reading } from '../../domain/entities/Reading';
import { VISIBILITY_LABELS } from '../../domain/entities/CustomList';
import { readingRepository } from '../../infrastructure/firebase';
import type { User } from '../../domain/entities/User';

interface Props {
    list?: CustomList;
    user: User;
    onSubmit: (data: { name: string; description?: string; visibility: ListVisibility; readings?: ListReading[] }) => Promise<void>;
    onClose: () => void;
}

export default function CustomListModal({ list, user, onSubmit, onClose }: Props) {
    const [name, setName] = useState(list?.name || '');
    const [description, setDescription] = useState(list?.description || '');
    const [visibility, setVisibility] = useState<ListVisibility>(list?.visibility || 'private');
    const [selectedReadings, setSelectedReadings] = useState<string[]>(list?.readings.map(r => r.id) || []);
    const [userReadings, setUserReadings] = useState<Reading[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingReadings, setLoadingReadings] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadUserReadings();
    }, [user]);

    const loadUserReadings = async () => {
        try {
            setLoadingReadings(true);
            const readings = await readingRepository.getByUserId(user.id);
            // Sort by most recently updated
            readings.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            setUserReadings(readings);
        } catch (err) {
            console.error('Error loading readings:', err);
        } finally {
            setLoadingReadings(false);
        }
    };

    const toggleReading = (readingId: string) => {
        if (selectedReadings.includes(readingId)) {
            setSelectedReadings(selectedReadings.filter(id => id !== readingId));
        } else {
            setSelectedReadings([...selectedReadings, readingId]);
        }
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('El nombre es obligatorio');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const selectedReadingObjects = userReadings
                .filter(r => selectedReadings.includes(r.id))
                .map(r => ({
                    id: r.id,
                    title: r.title,
                    imageUrl: r.imageUrl,
                    category: r.category,
                    status: r.status
                }));

            await onSubmit({
                name: name.trim(),
                description: description.trim() || undefined,
                visibility,
                readings: selectedReadingObjects,
            });
            onClose();
        } catch (err) {
            setError('Error al guardar la lista');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => {
            if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
                onClose();
            }
        }}>
            <div className="modal list-modal">
                <h2 className="modal-title">
                    {list ? 'Editar Lista' : 'Nueva Lista'}
                </h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Nombre *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={name}
                            onInput={(e) => setName((e.target as HTMLInputElement).value)}
                            placeholder="Mi lista de favoritos"
                            maxLength={100}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Descripción</label>
                        <textarea
                            className="form-input"
                            value={description}
                            onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
                            placeholder="Una breve descripción de esta lista..."
                            rows={2}
                            maxLength={500}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Visibilidad</label>
                        <div className="visibility-options">
                            {(Object.entries(VISIBILITY_LABELS) as [ListVisibility, string][]).map(([value, label]) => (
                                <label key={value} className={`visibility-option ${visibility === value ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="visibility"
                                        value={value}
                                        checked={visibility === value}
                                        onChange={() => setVisibility(value)}
                                    />
                                    <span className="visibility-label">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <div className="readings-header">
                            <label className="form-label">
                                Lecturas ({selectedReadings.length} seleccionadas)
                            </label>
                            <input
                                type="text"
                                className="readings-search"
                                placeholder="Buscar..."
                                value={searchQuery}
                                onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                            />
                        </div>
                        <div className="readings-selector">
                            {loadingReadings ? (
                                <div className="readings-loading">
                                    <span className="spinner"></span>
                                    Cargando lecturas...
                                </div>
                            ) : userReadings.length === 0 ? (
                                <div className="readings-empty">
                                    No tienes lecturas aún
                                </div>
                            ) : (
                                <div className="readings-list">
                                    {userReadings
                                        .filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map(reading => (
                                            <label
                                                key={reading.id}
                                                className={`reading-item ${selectedReadings.includes(reading.id) ? 'selected' : ''}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedReadings.includes(reading.id)}
                                                    onChange={() => toggleReading(reading.id)}
                                                />
                                                <div className="reading-thumb">
                                                    {reading.imageUrl ? (
                                                        <img src={reading.imageUrl} alt={reading.title} />
                                                    ) : (
                                                        <div className="reading-thumb-placeholder">📚</div>
                                                    )}
                                                </div>
                                                <span className="reading-title">{reading.title}</span>
                                                {selectedReadings.includes(reading.id) && (
                                                    <svg className="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                    </svg>
                                                )}
                                            </label>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {error && <div className="form-error">{error}</div>}

                    <div className="modal-actions">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Guardando...' : (list ? 'Guardar' : 'Crear Lista')}
                        </button>
                    </div>
                </form>

                <style>{`
                    .list-modal {
                        max-width: 550px;
                        width: 90%;
                        max-height: 90vh;
                        overflow-y: auto;
                        border: 1px solid var(--border-color);
                        box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.3), var(--shadow-lg);
                        padding: var(--space-6);
                    }

                    .modal-title {
                        margin-bottom: var(--space-5);
                        padding-bottom: var(--space-4);
                        border-bottom: 1px solid var(--border-color);
                    }

                    .visibility-options {
                        display: flex;
                        gap: var(--space-2);
                    }

                    .visibility-option {
                        flex: 1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: var(--space-3);
                        background: var(--bg-input);
                        border: 2px solid var(--border-color);
                        border-radius: var(--border-radius-md);
                        cursor: pointer;
                        transition: all var(--transition-fast);
                    }

                    .visibility-option:hover {
                        border-color: var(--accent-primary);
                    }

                    .visibility-option.active {
                        border-color: var(--accent-primary);
                        background: rgba(139, 92, 246, 0.15);
                    }

                    .visibility-option input {
                        display: none;
                    }

                    .visibility-label {
                        font-weight: 500;
                        color: var(--text-primary);
                        font-size: 0.875rem;
                    }

                    .readings-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: var(--space-2);
                        gap: var(--space-4);
                    }

                    .readings-header .form-label {
                        margin-bottom: 0;
                        flex-shrink: 0;
                    }

                    .readings-search {
                        padding: var(--space-2) var(--space-3);
                        background: var(--bg-input);
                        border: 1px solid var(--border-color);
                        border-radius: var(--border-radius-md);
                        color: var(--text-primary);
                        font-size: 0.875rem;
                        width: 150px;
                    }

                    .readings-search:focus {
                        outline: none;
                        border-color: var(--accent-primary);
                    }

                    .readings-selector {
                        border: 1px solid var(--border-color);
                        border-radius: var(--border-radius-md);
                        max-height: 200px;
                        overflow-y: auto;
                    }

                    .readings-loading,
                    .readings-empty {
                        padding: var(--space-6);
                        text-align: center;
                        color: var(--text-secondary);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: var(--space-2);
                    }

                    .readings-list {
                        display: flex;
                        flex-direction: column;
                    }

                    .reading-item {
                        display: flex;
                        align-items: center;
                        gap: var(--space-3);
                        padding: var(--space-2) var(--space-3);
                        cursor: pointer;
                        transition: background var(--transition-fast);
                        border-bottom: 1px solid var(--border-color);
                    }

                    .reading-item:last-child {
                        border-bottom: none;
                    }

                    .reading-item:hover {
                        background: var(--bg-input);
                    }

                    .reading-item.selected {
                        background: rgba(139, 92, 246, 0.1);
                    }

                    .reading-item input {
                        display: none;
                    }

                    .reading-thumb {
                        width: 36px;
                        height: 48px;
                        border-radius: var(--border-radius-sm);
                        overflow: hidden;
                        flex-shrink: 0;
                        background: var(--bg-input);
                    }

                    .reading-thumb img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }

                    .reading-thumb-placeholder {
                        width: 100%;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1rem;
                    }

                    .reading-title {
                        flex: 1;
                        font-size: 0.875rem;
                        color: var(--text-primary);
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .check-icon {
                        color: var(--accent-primary);
                        flex-shrink: 0;
                    }

                    .form-error {
                        color: var(--status-dropped);
                        font-size: 0.875rem;
                        margin-bottom: var(--space-4);
                    }

                    .modal-actions {
                        display: flex;
                        justify-content: flex-end;
                        gap: var(--space-2);
                        margin-top: var(--space-5);
                        padding-top: var(--space-4);
                        border-top: 1px solid var(--border-color);
                    }
                `}</style>
            </div>
        </div>
    );
}
