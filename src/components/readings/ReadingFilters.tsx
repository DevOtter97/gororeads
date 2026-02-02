import { STATUS_LABELS, CATEGORY_LABELS } from '../../domain/entities/Reading';
import type { ReadingStatus, ReadingCategory } from '../../domain/entities/Reading';

interface Props {
    currentStatus: ReadingStatus | 'all';
    currentCategory: ReadingCategory | 'all';
    selectedTags: string[];
    availableTags: string[];
    searchQuery: string;
    onStatusChange: (status: ReadingStatus | 'all') => void;
    onCategoryChange: (category: ReadingCategory | 'all') => void;
    onTagToggle: (tag: string) => void;
    onSearchChange: (query: string) => void;
    onClearFilters: () => void;
}

export default function ReadingFilters({
    currentStatus,
    currentCategory,
    selectedTags,
    availableTags,
    searchQuery,
    onStatusChange,
    onCategoryChange,
    onTagToggle,
    onSearchChange,
    onClearFilters,
}: Props) {
    const hasActiveFilters = currentStatus !== 'all' || currentCategory !== 'all' || selectedTags.length > 0 || searchQuery;

    return (
        <div class="filters-container">
            {/* Search Bar */}
            <div class="search-bar">
                <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                    type="text"
                    class="form-input search-input"
                    placeholder="Buscar por título..."
                    value={searchQuery}
                    onInput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
                />
            </div>

            {/* Status Tabs */}
            <div class="status-tabs">
                <button
                    class={`status-tab ${currentStatus === 'all' ? 'active' : ''}`}
                    onClick={() => onStatusChange('all')}
                >
                    Todos
                </button>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <button
                        key={value}
                        class={`status-tab ${currentStatus === value ? 'active' : ''}`}
                        onClick={() => onStatusChange(value as ReadingStatus)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Category & Tags Row */}
            <div class="filters-row">
                <select
                    class="form-input form-select category-select"
                    value={currentCategory}
                    onChange={(e) => onCategoryChange((e.target as HTMLSelectElement).value as ReadingCategory | 'all')}
                >
                    <option value="all">Todas las categorías</option>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>

                {availableTags.length > 0 && (
                    <div class="tags-filter">
                        <span class="tags-label">Etiquetas:</span>
                        <div class="tags-list">
                            {availableTags.map((tag) => (
                                <button
                                    key={tag}
                                    class={`tag tag-filter ${selectedTags.includes(tag) ? 'active' : ''}`}
                                    onClick={() => onTagToggle(tag)}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {hasActiveFilters && (
                    <button class="btn btn-ghost btn-sm clear-btn" onClick={onClearFilters}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Limpiar filtros
                    </button>
                )}
            </div>

            <style>{`
        .filters-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          padding: var(--space-4);
          background: var(--bg-secondary);
          border-radius: var(--border-radius-lg);
          margin-bottom: var(--space-6);
        }

        .search-bar {
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: var(--space-3);
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }

        .search-input {
          padding-left: var(--space-10);
        }

        .filters-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: var(--space-3);
        }

        .category-select {
          width: auto;
          min-width: 180px;
        }

        .tags-filter {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          flex-wrap: wrap;
          flex: 1;
        }

        .tags-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          white-space: nowrap;
        }

        .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-1);
        }

        .tag-filter {
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .tag-filter:hover {
          border-color: var(--accent-primary);
        }

        .tag-filter.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: white;
        }

        .clear-btn {
          margin-left: auto;
        }

        @media (max-width: 640px) {
          .category-select {
            width: 100%;
          }

          .tags-filter {
            width: 100%;
          }

          .clear-btn {
            width: 100%;
            margin-left: 0;
          }
        }
      `}</style>
        </div>
    );
}
