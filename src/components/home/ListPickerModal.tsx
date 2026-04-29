import { useState, useEffect, useMemo } from 'preact/hooks';
import { customListRepository } from '../../infrastructure/firebase/FirestoreCustomListRepository';
import type { CustomList } from '../../domain/entities/CustomList';
import type { PostListRef } from '../../domain/entities/Post';
import LoadingState from '../LoadingState';

interface Props {
    userId: string;
    onSelect: (ref: PostListRef) => void;
    onClose: () => void;
}

export default function ListPickerModal({ userId, onSelect, onClose }: Props) {
    const [lists, setLists] = useState<CustomList[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        customListRepository.getByUserId(userId)
            .then(setLists)
            .catch(err => console.error('Error loading lists:', err))
            .finally(() => setLoading(false));
    }, [userId]);

    const filtered = useMemo(() => {
        if (!search.trim()) return lists;
        const q = search.toLowerCase();
        return lists.filter(l => l.name.toLowerCase().includes(q));
    }, [lists, search]);

    const handlePick = (l: CustomList) => {
        onSelect({
            id: l.id,
            name: l.name,
            slug: l.slug,
            coverCount: l.readings.length,
        });
    };

    return (
        <div class="modal-overlay" onClick={onClose}>
            <div class="modal picker-modal" onClick={(e) => e.stopPropagation()}>
                <div class="modal-header">
                    <h3 class="modal-title">Compartir lista</h3>
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
                        placeholder="Buscar lista..."
                        value={search}
                        onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
                    />
                </div>
                <div class="picker-body">
                    {loading ? (
                        <LoadingState message="Cargando listas..." fullScreen={false} />
                    ) : filtered.length === 0 ? (
                        <p class="picker-empty">
                            {lists.length === 0
                                ? 'Aún no tienes listas. Crea alguna en /lists.'
                                : 'Ninguna lista coincide con la busqueda.'}
                        </p>
                    ) : (
                        <ul class="picker-list">
                            {filtered.map(l => (
                                <li key={l.id}>
                                    <button class="picker-item" onClick={() => handlePick(l)}>
                                        <div class="picker-list-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                                            </svg>
                                        </div>
                                        <div class="picker-item-info">
                                            <p class="picker-item-title">{l.name}</p>
                                            <p class="picker-item-meta">{l.readings.length} lecturas</p>
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
                .picker-list-icon {
                    width: 40px; height: 40px; flex-shrink: 0;
                    border-radius: var(--border-radius-sm); background: var(--bg-secondary);
                    display: flex; align-items: center; justify-content: center; color: var(--accent-primary);
                }
                .picker-item-info { min-width: 0; }
                .picker-item-title { color: var(--text-primary); font-weight: 500; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .picker-item-meta { font-size: 0.75rem; color: var(--text-muted); margin: 2px 0 0; }
                .picker-empty { color: var(--text-muted); text-align: center; padding: var(--space-6); }
            `}</style>
        </div>
    );
}
