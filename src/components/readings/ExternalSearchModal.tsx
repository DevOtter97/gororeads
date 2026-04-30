import { useState, useEffect, useRef } from 'preact/hooks';
import type { ReadingCategory } from '../../domain/entities/Reading';
import { CATEGORY_LABELS } from '../../domain/entities/Reading';
import type { ExternalSearchResult } from '../../domain/entities/ExternalSearchResult';
import { externalSearchService } from '../../infrastructure/external/ExternalReadingSearchService';

interface Props {
    initialQuery: string;
    initialCategory: ReadingCategory;
    onSelect: (result: ExternalSearchResult) => void;
    onClose: () => void;
}

const SEARCHABLE_CATEGORIES: ReadingCategory[] = ['manga', 'manhwa', 'manhua', 'light-novel', 'webtoon', 'novel'];

const SOURCE_LABELS: Record<ExternalSearchResult['source'], string> = {
    jikan: 'MyAnimeList',
    anilist: 'AniList',
    openlibrary: 'Open Library',
};

export default function ExternalSearchModal({ initialQuery, initialCategory, onSelect, onClose }: Props) {
    const [query, setQuery] = useState(initialQuery);
    const [category, setCategory] = useState<ReadingCategory>(
        SEARCHABLE_CATEGORIES.includes(initialCategory) ? initialCategory : 'manga'
    );
    const [results, setResults] = useState<ExternalSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Autofocus + busqueda inicial si llega query
    useEffect(() => {
        inputRef.current?.focus();
        if (initialQuery.trim().length >= 2) {
            void runSearch(initialQuery, category);
        }
        return () => abortRef.current?.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const runSearch = async (q: string, cat: ReadingCategory) => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        if (q.trim().length < 2) {
            setResults([]);
            setSearched(false);
            return;
        }
        setLoading(true);
        try {
            const data = await externalSearchService.search(q, cat, controller.signal);
            if (!controller.signal.aborted) {
                setResults(data);
                setSearched(true);
            }
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error('Error searching external API:', err);
            }
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    };

    const handleSubmit = (e: Event) => {
        e.preventDefault();
        void runSearch(query, category);
    };

    return (
        <div class="modal-overlay" onClick={onClose}>
            <div class="modal external-search-modal" onClick={(e) => e.stopPropagation()}>
                <div class="modal-header">
                    <h3 class="modal-title">Buscar online</h3>
                    <button class="modal-close" onClick={onClose} aria-label="Cerrar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <form class="external-search-form" onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        type="text"
                        class="form-input external-search-input"
                        placeholder="Buscar por titulo..."
                        value={query}
                        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
                    />
                    <select
                        class="form-input external-search-select"
                        value={category}
                        onChange={(e) => setCategory((e.target as HTMLSelectElement).value as ReadingCategory)}
                    >
                        {SEARCHABLE_CATEGORIES.map(c => (
                            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                        ))}
                    </select>
                    <button type="submit" class="btn btn-primary" disabled={loading || query.trim().length < 2}>
                        {loading ? 'Buscando...' : 'Buscar'}
                    </button>
                </form>

                <div class="external-search-body">
                    {loading && results.length === 0 ? (
                        <p class="external-search-status">Buscando...</p>
                    ) : !searched ? (
                        <p class="external-search-status">Escribe un titulo y pulsa Buscar.</p>
                    ) : results.length === 0 ? (
                        <p class="external-search-status">Sin resultados. Prueba con otras palabras o cambia de categoria.</p>
                    ) : (
                        <ul class="external-search-results">
                            {results.map(r => (
                                <li key={r.externalId}>
                                    <button class="external-result" onClick={() => onSelect(r)}>
                                        <div class="external-result-thumb">
                                            {r.imageUrl
                                                ? <img src={r.imageUrl} alt={r.title} />
                                                : <span>{r.title.charAt(0).toUpperCase()}</span>
                                            }
                                        </div>
                                        <div class="external-result-info">
                                            <p class="external-result-title">{r.title}</p>
                                            {r.description && (
                                                <p class="external-result-desc">{r.description}</p>
                                            )}
                                            <div class="external-result-meta">
                                                <span class="external-result-source">{SOURCE_LABELS[r.source]}</span>
                                                {r.totalChapters != null && (
                                                    <span>· {r.totalChapters} {category === 'novel' ? 'pags' : 'caps'}</span>
                                                )}
                                                {r.totalVolumes != null && (
                                                    <span>· {r.totalVolumes} vols</span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <style>{`
                .external-search-modal {
                    max-width: 640px;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                }

                .external-search-form {
                    display: flex;
                    gap: var(--space-2);
                    padding: 0 var(--space-6) var(--space-4);
                    flex-wrap: wrap;
                }
                .external-search-input { flex: 1 1 200px; min-width: 0; }
                .external-search-select { flex: 0 0 auto; }

                .external-search-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0 var(--space-3) var(--space-4);
                }

                .external-search-status {
                    color: var(--text-muted);
                    text-align: center;
                    padding: var(--space-6);
                    margin: 0;
                }

                .external-search-results {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-1);
                }

                .external-result {
                    display: flex;
                    align-items: stretch;
                    gap: var(--space-3);
                    width: 100%;
                    padding: var(--space-3);
                    border-radius: var(--border-radius-md);
                    background: transparent;
                    text-align: left;
                    transition: background var(--transition-fast);
                }
                .external-result:hover { background: var(--bg-card); }

                .external-result-thumb {
                    width: 56px;
                    height: 80px;
                    border-radius: var(--border-radius-sm);
                    overflow: hidden;
                    flex-shrink: 0;
                    background: var(--bg-secondary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-muted);
                    font-weight: 700;
                }
                .external-result-thumb img { width: 100%; height: 100%; object-fit: cover; }

                .external-result-info { flex: 1; min-width: 0; }
                .external-result-title {
                    color: var(--text-primary);
                    font-weight: 600;
                    margin: 0 0 var(--space-1);
                    line-height: 1.3;
                }
                .external-result-desc {
                    color: var(--text-secondary);
                    font-size: 0.8125rem;
                    margin: 0 0 var(--space-1);
                    line-height: 1.4;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .external-result-meta {
                    color: var(--text-muted);
                    font-size: 0.75rem;
                    display: flex;
                    flex-wrap: wrap;
                    gap: var(--space-1);
                }
                .external-result-source { font-weight: 600; color: var(--accent-primary); }
            `}</style>
        </div>
    );
}
