import { useState, useEffect, useRef } from 'preact/hooks';
import type { Reading, CreateReadingDTO, ReadingStatus, ReadingCategory, ReadingMeasureUnit } from '../../domain/entities/Reading';
import { STATUS_LABELS, CATEGORY_LABELS, MEASURE_UNIT_LABELS } from '../../domain/entities/Reading';
import type { ExternalSearchResult } from '../../domain/entities/ExternalSearchResult';
import { externalSearchService, ExternalReadingSearchService } from '../../infrastructure/external/ExternalReadingSearchService';
import ExternalSearchModal from './ExternalSearchModal';

const SEARCH_DEBOUNCE_MS = 400;

interface Props {
    reading?: Reading;
    onSubmit: (data: CreateReadingDTO) => Promise<void>;
    onCancel: () => void;
}

const formatDateInput = (date: Date | string | undefined, fallback = ''): string => {
    if (!date) return fallback;
    return new Date(date).toISOString().split('T')[0];
};

const todayDateInput = (): string => new Date().toISOString().split('T')[0];

const currentProgressLabel = (measureUnit: ReadingMeasureUnit): string => {
    if (measureUnit === 'percentage') return 'Porcentaje Actual (%)';
    if (measureUnit === 'pages') return 'Página Actual';
    return 'Capítulo Actual';
};

export default function ReadingForm({ reading, onSubmit, onCancel }: Readonly<Props>) {
    const [title, setTitle] = useState(reading?.title || '');
    const [imageUrl, setImageUrl] = useState(reading?.imageUrl || '');
    const [category, setCategory] = useState<ReadingCategory>(reading?.category || 'manga');
    const [status, setStatus] = useState<ReadingStatus>(reading?.status || 'to-read');
    const [measureUnit, setMeasureUnit] = useState<ReadingMeasureUnit>(reading?.measureUnit || 'pages');
    const [tags, setTags] = useState<string[]>(reading?.tags || []);
    const [newTag, setNewTag] = useState('');
    const [currentChapter, setCurrentChapter] = useState(reading?.currentChapter?.toString() || '');
    const [totalChapters, setTotalChapters] = useState(reading?.totalChapters?.toString() || '');
    const [notes, setNotes] = useState(reading?.notes || '');
    const [url, setUrl] = useState(reading?.referenceUrl || '');
    const [startedAt, setStartedAt] = useState(
        formatDateInput(reading?.startedAt, todayDateInput())
    );
    const [finishedAt, setFinishedAt] = useState(formatDateInput(reading?.finishedAt));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Autocomplete externo
    const [suggestions, setSuggestions] = useState<ExternalSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [titleFocused, setTitleFocused] = useState(false);
    // Tags que vinieron del ultimo resultado externo aplicado. Sirven para que al
    // elegir otro resultado distinto se sustituyan (no se acumulen) sin perder
    // los tags que el usuario haya añadido a mano.
    const [externalTags, setExternalTags] = useState<string[]>([]);
    // Titulo del ultimo resultado seleccionado. Mientras el input coincida con
    // este valor no se busca ni se muestra el dropdown (acabas de elegirlo). En
    // cuanto el usuario teclea otra cosa, vuelve a funcionar normal.
    const lastPickedTitleRef = useRef<string | null>(null);
    const searchAbortRef = useRef<AbortController | null>(null);
    const apiAvailable = ExternalReadingSearchService.hasApiFor(category);

    const trimmedTitle = title.trim();
    const justPicked = lastPickedTitleRef.current !== null && title === lastPickedTitleRef.current;
    // El dropdown se muestra cuando hay foco, hay API, al menos 1 char y NO
    // estamos mostrando un resultado recien elegido.
    const showDropdown = apiAvailable && titleFocused && trimmedTitle.length >= 1 && !justPicked;

    // Debounce + fetch sugerencias cuando cambia titulo o categoria
    useEffect(() => {
        if (!apiAvailable || trimmedTitle.length < 1) {
            setSuggestions([]);
            setHasSearched(false);
            setSearchError(false);
            setSearching(false);
            return;
        }
        // Si el titulo coincide con la ultima seleccion, saltamos la busqueda
        // (evita una request inutil que ademas reabriria el dropdown con el
        // resultado que acabas de elegir).
        if (justPicked) {
            setSearching(false);
            return;
        }
        // Anuncia "buscando" inmediatamente para feedback rapido
        setSearching(true);
        setSearchError(false);

        const handler = window.setTimeout(async () => {
            searchAbortRef.current?.abort();
            const controller = new AbortController();
            searchAbortRef.current = controller;
            try {
                const data = await externalSearchService.search(title, category, controller.signal);
                if (!controller.signal.aborted) {
                    setSuggestions(data.slice(0, 6));
                    setHasSearched(true);
                }
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    console.error('Error searching external API:', err);
                    setSuggestions([]);
                    setHasSearched(true);
                    setSearchError(true);
                }
            } finally {
                if (!controller.signal.aborted) setSearching(false);
            }
        }, SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(handler);
    }, [title, category, apiAvailable, trimmedTitle, justPicked]);

    const applyExternalResult = (r: ExternalSearchResult) => {
        // Marcamos antes de cambiar title para que el useEffect que se dispara
        // por el setTitle vea la nueva referencia y salte la busqueda.
        lastPickedTitleRef.current = r.title;
        setTitle(r.title);
        if (r.imageUrl) setImageUrl(r.imageUrl);
        if (r.totalChapters != null) setTotalChapters(String(r.totalChapters));
        if (r.sourceUrl) setUrl(r.sourceUrl);
        if (r.suggestedCategory) setCategory(r.suggestedCategory);

        // Reemplaza los tags que vinieron del resultado anterior por los del nuevo,
        // manteniendo los que el usuario añadio a mano.
        const incomingTags = r.tags ?? [];
        const previousExternalSet = new Set(externalTags);
        setTags(prev => {
            const manualTags = prev.filter(t => !previousExternalSet.has(t));
            return Array.from(new Set([...manualTags, ...incomingTags]));
        });
        setExternalTags(incomingTags);

        setSuggestions([]);
        setShowSearchModal(false);
        // Importante: NO tocamos titleFocused. El foco real sigue en el input
        // (el onMouseDown(preventDefault) del item lo mantiene). Si lo pusieramos
        // a false, al teclear despues no se reabriria el dropdown porque
        // `showDropdown` lo requiere true y onFocus no se redispara mientras
        // ya tienes foco.
    };

    const handleAddTag = () => {
        const tag = newTag.trim().toLowerCase();
        if (tag && !tags.includes(tag)) {
            setTags([...tags, tag]);
            setNewTag('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter((t) => t !== tagToRemove));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        setError('');

        if (!title.trim()) {
            setError('El título es obligatorio');
            return;
        }

        setLoading(true);

        try {
            const dataToSubmit = {
                title: title.trim(),
                imageUrl: imageUrl.trim() || undefined,
                category,
                status,
                measureUnit,
                tags,
                currentChapter: currentChapter ? parseInt(currentChapter, 10) : undefined,
                totalChapters: totalChapters ? parseInt(totalChapters, 10) : undefined,
                notes: notes.trim() || undefined,
                referenceUrl: url.trim() || undefined,
                startedAt: startedAt ? new Date(startedAt) : undefined,
                finishedAt: finishedAt ? new Date(finishedAt) : undefined,
            };
            await onSubmit(dataToSubmit);
        } catch (err: unknown) {
            console.error('Form error:', err);
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(`Error: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} class="reading-form" novalidate>
            <div class="form-group">
                <label class="form-label" htmlFor="title">Título *</label>
                <div class="title-input-wrapper">
                    <input
                        id="title"
                        type="text"
                        class={`form-input ${error && !title.trim() ? 'input-error' : ''}`}
                        placeholder="Nombre del manga, manhwa, etc."
                        value={title}
                        onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
                        onFocus={() => setTitleFocused(true)}
                        onBlur={() => {
                            // Pequeño delay para permitir click en sugerencia antes de cerrar
                            window.setTimeout(() => setTitleFocused(false), 150);
                        }}
                        required
                        disabled={loading}
                        autoComplete="off"
                    />
                    {apiAvailable && (
                        <button
                            type="button"
                            class="title-search-btn"
                            onClick={() => setShowSearchModal(true)}
                            title="Buscar online"
                            aria-label="Buscar online"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                        </button>
                    )}
                    {showDropdown && (suggestions.length > 0 || searching || hasSearched) && (
                        <div class="title-suggestions" onMouseDown={(e) => e.preventDefault()}>
                            {searching && suggestions.length === 0 && (
                                <p class="title-suggestions-status">Buscando...</p>
                            )}
                            {!searching && hasSearched && suggestions.length === 0 && !searchError && (
                                <p class="title-suggestions-status">Sin resultados para "{trimmedTitle}".</p>
                            )}
                            {!searching && searchError && (
                                <p class="title-suggestions-status title-suggestions-error">
                                    No se pudo conectar con la API. Prueba "Buscar online" o rellena a mano.
                                </p>
                            )}
                            {suggestions.length > 0 && (
                                <ul class="title-suggestions-list">
                                    {suggestions.map(s => (
                                        <li key={s.externalId}>
                                            <button
                                                type="button"
                                                class="title-suggestion"
                                                onClick={() => applyExternalResult(s)}
                                            >
                                                <div class="title-suggestion-thumb">
                                                    {s.imageUrl
                                                        ? <img src={s.imageUrl} alt="" />
                                                        : <span>{s.title.charAt(0).toUpperCase()}</span>
                                                    }
                                                </div>
                                                <span class="title-suggestion-title">{s.title}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
                {error && !title.trim() && (
                    <span class="input-error-message">Este campo es obligatorio</span>
                )}
            </div>

            <div class="form-group">
                <label class="form-label" htmlFor="imageUrl">URL de Imagen (opcional)</label>
                <input
                    id="imageUrl"
                    type="url"
                    class="form-input"
                    placeholder="https://ejemplo.com/imagen.jpg"
                    value={imageUrl}
                    onInput={(e) => setImageUrl((e.target as HTMLInputElement).value)}
                    disabled={loading}
                />
                {imageUrl && (
                    <div class="image-preview">
                        <img src={imageUrl} alt="Preview" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                    </div>
                )}
            </div>

            <div class="form-group">
                <label class="form-label" htmlFor="referenceUrl">Link de Referencia (opcional)</label>
                <input
                    id="referenceUrl"
                    type="url"
                    class="form-input"
                    placeholder="https://tmofans.com/..."
                    value={url}
                    onInput={(e) => setUrl((e.target as HTMLInputElement).value)}
                    disabled={loading}
                />
            </div>

            <div class="form-row">
                {status !== 'to-read' && (
                    <div class="form-group">
                        <label class="form-label" htmlFor="startedAt">Fecha de Inicio</label>
                        <input
                            id="startedAt"
                            type="date"
                            class="form-input"
                            value={startedAt}
                            onInput={(e) => setStartedAt((e.target as HTMLInputElement).value)}
                            disabled={loading}
                        />
                    </div>
                )}

                {status === 'completed' && (
                    <div class="form-group">
                        <label class="form-label" htmlFor="finishedAt">Fecha de Fin</label>
                        <input
                            id="finishedAt"
                            type="date"
                            class="form-input"
                            value={finishedAt}
                            onInput={(e) => setFinishedAt((e.target as HTMLInputElement).value)}
                            disabled={loading}
                        />
                    </div>
                )}
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label" htmlFor="category">Categoría</label>
                    <select
                        id="category"
                        class="form-input form-select"
                        value={category}
                        onChange={(e) => setCategory((e.target as HTMLSelectElement).value as ReadingCategory)}
                        disabled={loading}
                    >
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label" htmlFor="status">Estado</label>
                    <select
                        id="status"
                        class="form-input form-select"
                        value={status}
                        onChange={(e) => {
                            const newStatus = (e.target as HTMLSelectElement).value as ReadingStatus;
                            setStatus(newStatus);
                            if (newStatus === 'completed') {
                                setFinishedAt(new Date().toISOString().split('T')[0]);
                                if (totalChapters) {
                                    setCurrentChapter(totalChapters);
                                } else if (measureUnit === 'percentage') {
                                    setCurrentChapter('100');
                                }
                            }
                        }}
                        disabled={loading}
                    >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {status !== 'to-read' && (
                <fieldset class="form-group" style={{ border: 'none', padding: 0, margin: 0 }}>
                    <legend class="form-label">Unidad de Progreso</legend>
                    <div class="radio-group">
                        {Object.entries(MEASURE_UNIT_LABELS).map(([value, label]) => (
                            <label key={value} class={`radio-label ${measureUnit === value ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="measureUnit"
                                    value={value}
                                    checked={measureUnit === value}
                                    onChange={() => {
                                        setMeasureUnit(value as ReadingMeasureUnit);
                                        setCurrentChapter('');
                                        setTotalChapters('');
                                    }}
                                    disabled={loading}
                                    class="sr-only"
                                />
                                {label}
                            </label>
                        ))}
                    </div>
                </fieldset>
            )}

            {status !== 'to-read' && (
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" htmlFor="currentChapter">
                            {currentProgressLabel(measureUnit)}
                        </label>
                        <input
                            id="currentChapter"
                            type="number"
                            min="0"
                            max={measureUnit === 'percentage' ? "100" : undefined}
                            class="form-input"
                            placeholder="0"
                            value={currentChapter}
                            onInput={(e) => setCurrentChapter((e.target as HTMLInputElement).value)}
                            disabled={loading}
                        />
                    </div>

                    {measureUnit !== 'percentage' && (
                        <div class="form-group">
                            <label class="form-label" htmlFor="totalChapters">
                                {measureUnit === 'pages' ? 'Total Páginas' : 'Total Capítulos'}
                            </label>
                            <input
                                id="totalChapters"
                                type="number"
                                min="0"
                                class="form-input"
                                placeholder="?"
                                value={totalChapters}
                                onInput={(e) => setTotalChapters((e.target as HTMLInputElement).value)}
                                disabled={loading}
                            />
                        </div>
                    )}
                </div>
            )}

            <div class="form-group">
                <label class="form-label" htmlFor="tags">Etiquetas</label>
                <div class="tags-input-container">
                    <div class="tags-list">
                        {tags.map((tag) => (
                            <span key={tag} class="tag">
                                {tag}
                                <button
                                    type="button"
                                    class="tag-remove"
                                    onClick={() => handleRemoveTag(tag)}
                                    aria-label={`Eliminar etiqueta ${tag}`}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                    <div class="tag-input-row">
                        <input
                            id="tags"
                            type="text"
                            class="form-input"
                            placeholder="Añadir etiqueta..."
                            value={newTag}
                            onInput={(e) => setNewTag((e.target as HTMLInputElement).value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                        />
                        <button
                            type="button"
                            class="btn btn-secondary"
                            onClick={handleAddTag}
                            disabled={loading || !newTag.trim()}
                        >
                            Añadir
                        </button>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label" htmlFor="notes">Notas (opcional)</label>
                <textarea
                    id="notes"
                    class="form-input form-textarea"
                    placeholder="Añade notas o comentarios..."
                    value={notes}
                    onInput={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
                    disabled={loading}
                />
            </div>

            {error && <p class="form-error" style="margin-bottom: 1rem;">{error}</p>}

            <div class="form-actions">
                <button
                    type="button"
                    class="btn btn-secondary"
                    onClick={onCancel}
                    disabled={loading}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    class="btn btn-primary"
                    disabled={loading}
                >
                    {loading && <span class="spinner"></span>}
                    {!loading && (reading ? 'Guardar Cambios' : 'Crear Lectura')}
                </button>
            </div>

            <style>{`
        .reading-form {
          display: flex;
          flex-direction: column;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }

        .radio-group {
            display: flex;
            gap: var(--space-2);
            margin-bottom: var(--space-2);
        }

        .radio-label {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: var(--space-2) var(--space-3);
            background: var(--bg-input);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius-md);
            cursor: pointer;
            font-size: 0.875rem;
            color: var(--text-secondary);
            transition: all var(--transition-fast);
        }

        .radio-label:hover {
            border-color: var(--text-muted);
            color: var(--text-primary);
        }

        .radio-label.active {
            background: var(--bg-card);
            border-color: var(--accent-primary);
            color: var(--accent-primary);
            font-weight: 500;
        }

        @media (max-width: 480px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }

        .image-preview {
          margin-top: var(--space-2);
          max-height: 150px;
          overflow: hidden;
          border-radius: var(--border-radius-md);
        }

        .image-preview img {
          max-height: 150px;
          object-fit: cover;
        }

        .tags-input-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-1);
        }

        .tag-input-row {
          display: flex;
          gap: var(--space-2);
        }

        .tag-input-row .form-input {
          flex: 1;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-3);
          margin-top: var(--space-4);
        }

        .input-error {
            border-color: var(--error);
        }

        .input-error:focus {
            box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
        }

        .input-error-message {
            display: block;
            font-size: 0.75rem;
            color: var(--error);
            margin-top: 0.25rem;
        }

        /* Autocomplete del titulo */
        .title-input-wrapper {
            position: relative;
        }
        .title-search-btn {
            position: absolute;
            right: var(--space-2);
            top: 50%;
            transform: translateY(-50%);
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: var(--border-radius-sm);
            color: var(--text-muted);
            background: transparent;
            transition: all var(--transition-fast);
        }
        .title-search-btn:hover {
            color: var(--accent-primary);
            background: var(--bg-card);
        }
        .title-input-wrapper input {
            padding-right: calc(32px + var(--space-3));
        }

        .title-suggestions {
            position: absolute;
            top: calc(100% + 4px);
            left: 0;
            right: 0;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius-md);
            box-shadow: var(--shadow-lg);
            padding: var(--space-1);
            max-height: 320px;
            overflow-y: auto;
            z-index: 50;
        }
        .title-suggestions-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .title-suggestions-status {
            margin: 0;
            padding: var(--space-3);
            color: var(--text-muted);
            font-size: 0.8125rem;
            text-align: center;
        }
        .title-suggestions-error {
            color: var(--status-danger);
        }
        .title-suggestion {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            width: 100%;
            padding: var(--space-2);
            border-radius: var(--border-radius-sm);
            background: transparent;
            text-align: left;
            transition: background var(--transition-fast);
        }
        .title-suggestion:hover {
            background: var(--bg-secondary);
        }
        .title-suggestion-thumb {
            width: 32px;
            height: 44px;
            border-radius: var(--border-radius-sm);
            overflow: hidden;
            flex-shrink: 0;
            background: var(--bg-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-muted);
            font-weight: 700;
            font-size: 0.875rem;
        }
        .title-suggestion-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .title-suggestion-title {
            color: var(--text-primary);
            font-size: 0.875rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            min-width: 0;
        }
      `}</style>

            {showSearchModal && (
                <ExternalSearchModal
                    initialQuery={title}
                    initialCategory={category}
                    onSelect={applyExternalResult}
                    onClose={() => setShowSearchModal(false)}
                />
            )}
        </form>
    );
}
