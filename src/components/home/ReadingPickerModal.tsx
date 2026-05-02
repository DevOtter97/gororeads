import { useState, useEffect, useMemo } from 'preact/hooks';
import { readingRepository } from '../../infrastructure/firebase/FirestoreReadingRepository';
import type { Reading } from '../../domain/entities/Reading';
import type { PostReadingRef } from '../../domain/entities/Post';
import LoadingState from '../LoadingState';

interface Props {
    userId: string;
    onSelect: (ref: PostReadingRef) => void;
    onClose: () => void;
}

export default function ReadingPickerModal({ userId, onSelect, onClose }: Readonly<Props>) {
    const [readings, setReadings] = useState<Reading[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        readingRepository.getByUserId(userId)
            .then(setReadings)
            .catch(err => console.error('Error loading readings:', err))
            .finally(() => setLoading(false));
    }, [userId]);

    const filtered = useMemo(() => {
        if (!search.trim()) return readings;
        const q = search.toLowerCase();
        return readings.filter(r => r.title.toLowerCase().includes(q));
    }, [readings, search]);

    const handlePick = (r: Reading) => {
        onSelect({
            id: r.id,
            title: r.title,
            imageUrl: r.imageUrl,
            category: r.category,
        });
    };

    return (
        <div
            class="modal-overlay"
            role="button"
            tabIndex={-1}
            aria-label="Cerrar dialogo"
            onClick={onClose}
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        >
            <div
                class="modal picker-modal"
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
            >
                <div class="modal-header">
                    <h3 class="modal-title">Compartir lectura</h3>
                    <button class="modal-close" onClick={onClose} aria-label="Cerrar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                <div class="picker-search">
                    <input
                        type="text"
                        class="form-input"
                        placeholder="Buscar lectura..."
                        value={search}
                        onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
                    />
                </div>
                <div class="picker-body">
                    {loading ? (
                        <LoadingState message="Cargando lecturas..." fullScreen={false} />
                    ) : filtered.length === 0 ? (
                        <p class="picker-empty">
                            {readings.length === 0
                                ? 'Aún no tienes lecturas. Añade alguna en el Dashboard.'
                                : 'Ninguna lectura coincide con la busqueda.'}
                        </p>
                    ) : (
                        <ul class="picker-list">
                            {filtered.map(r => (
                                <li key={r.id}>
                                    <button class="picker-item" onClick={() => handlePick(r)}>
                                        <div class="picker-thumb">
                                            {r.imageUrl
                                                ? <img src={r.imageUrl} alt={r.title} />
                                                : <span class="picker-thumb-placeholder">{r.title.charAt(0).toUpperCase()}</span>
                                            }
                                        </div>
                                        <div class="picker-item-info">
                                            <p class="picker-item-title">{r.title}</p>
                                            <p class="picker-item-meta">{r.category}</p>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            <style>{`
                .picker-modal { max-width: 480px; max-height: 70vh; display: flex; flex-direction: column; }
                .picker-search { padding: 0 var(--space-6) var(--space-4); }
                .picker-body { flex: 1; overflow-y: auto; padding: 0 var(--space-3) var(--space-4); }
                .picker-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-1); }
                .picker-item {
                    display: flex; align-items: center; gap: var(--space-3); width: 100%;
                    padding: var(--space-3); border-radius: var(--border-radius-md);
                    background: transparent; text-align: left; transition: background var(--transition-fast);
                }
                .picker-item:hover { background: var(--bg-card); }
                .picker-thumb {
                    width: 40px; height: 56px; border-radius: var(--border-radius-sm); overflow: hidden;
                    flex-shrink: 0; background: var(--bg-secondary);
                    display: flex; align-items: center; justify-content: center;
                }
                .picker-thumb img { width: 100%; height: 100%; object-fit: cover; }
                .picker-thumb-placeholder { font-weight: 700; color: var(--text-muted); }
                .picker-item-info { min-width: 0; }
                .picker-item-title { color: var(--text-primary); font-weight: 500; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .picker-item-meta { font-size: 0.75rem; color: var(--text-muted); margin: 2px 0 0; text-transform: capitalize; }
                .picker-empty { color: var(--text-muted); text-align: center; padding: var(--space-6); }
            `}</style>
        </div>
    );
}
