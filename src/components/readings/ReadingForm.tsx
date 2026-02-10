import { useState, useEffect } from 'preact/hooks';
import type { Reading, CreateReadingDTO, ReadingStatus, ReadingCategory, ReadingMeasureUnit } from '../../domain/entities/Reading';
import { STATUS_LABELS, CATEGORY_LABELS, MEASURE_UNIT_LABELS } from '../../domain/entities/Reading';

interface Props {
    reading?: Reading;
    onSubmit: (data: CreateReadingDTO) => Promise<void>;
    onCancel: () => void;
}

export default function ReadingForm({ reading, onSubmit, onCancel }: Props) {
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
        reading?.startedAt
            ? new Date(reading.startedAt).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
    );
    const [finishedAt, setFinishedAt] = useState(
        reading?.finishedAt
            ? new Date(reading.finishedAt).toISOString().split('T')[0]
            : ''
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
                <label class="form-label" for="title">Título *</label>
                <input
                    id="title"
                    type="text"
                    class={`form-input ${error && !title.trim() ? 'input-error' : ''}`}
                    placeholder="Nombre del manga, manhwa, etc."
                    value={title}
                    onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
                    required
                    disabled={loading}
                />
                {error && !title.trim() && (
                    <span class="input-error-message">Este campo es obligatorio</span>
                )}
            </div>

            <div class="form-group">
                <label class="form-label" for="imageUrl">URL de Imagen (opcional)</label>
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
                <label class="form-label" for="referenceUrl">Link de Referencia (opcional)</label>
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
                        <label class="form-label" for="startedAt">Fecha de Inicio</label>
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
                        <label class="form-label" for="finishedAt">Fecha de Fin</label>
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
                    <label class="form-label" for="category">Categoría</label>
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
                    <label class="form-label" for="status">Estado</label>
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
                <div class="form-group">
                    <label class="form-label">Unidad de Progreso</label>
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
                </div>
            )}

            {status !== 'to-read' && (
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="currentChapter">
                            {measureUnit === 'percentage' ? 'Porcentaje Actual (%)' :
                                measureUnit === 'pages' ? 'Página Actual' : 'Capítulo Actual'}
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
                            <label class="form-label" for="totalChapters">
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
                <label class="form-label" for="tags">Etiquetas</label>
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
                <label class="form-label" for="notes">Notas (opcional)</label>
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
                    {loading ? <span class="spinner"></span> : (reading ? 'Guardar Cambios' : 'Crear Lectura')}
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
      `}</style>
        </form>
    );
}
