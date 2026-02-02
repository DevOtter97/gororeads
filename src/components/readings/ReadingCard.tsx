import type { Reading } from '../../domain/entities/Reading';
import { STATUS_LABELS, CATEGORY_LABELS } from '../../domain/entities/Reading';

interface Props {
  reading: Reading;
  onEdit: (reading: Reading) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Reading['status']) => void;
}

export default function ReadingCard({ reading, onEdit, onDelete, onStatusChange }: Props) {
  const handleStatusChange = (e: Event) => {
    const newStatus = (e.target as HTMLSelectElement).value as Reading['status'];
    onStatusChange(reading.id, newStatus);
  };

  return (
    <div class="card reading-card">
      <div class="reading-card-image">
        {reading.imageUrl ? (
          <img src={reading.imageUrl} alt={reading.title} loading="lazy" />
        ) : (
          <div class="reading-card-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
        )}
        <span class={`badge badge-category-${reading.category}`}>
          {CATEGORY_LABELS[reading.category]}
        </span>
        {reading.referenceUrl && (
          <a
            href={reading.referenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="reading-card-link"
            title="Ir a referencia"
            onClick={(e) => e.stopPropagation()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        )}
      </div>

      <div class="card-body">
        <h3 class="reading-card-title">{reading.title}</h3>

        <div class="reading-card-meta">
          <select
            class="status-select"
            value={reading.status}
            onChange={handleStatusChange}
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {reading.currentChapter !== undefined && (
            <span class="chapter-info">
              {reading.measureUnit === 'percentage'
                ? `${reading.currentChapter}%`
                : reading.measureUnit === 'pages'
                  ? `Pág. ${reading.currentChapter}`
                  : `Cap. ${reading.currentChapter}`}
              {reading.measureUnit !== 'percentage' && reading.totalChapters ? ` / ${reading.totalChapters}` : ''}
            </span>
          )}
        </div>

        {reading.tags.length > 0 && (
          <div class="reading-card-tags">
            {reading.tags.slice(0, 3).map((tag) => (
              <span key={tag} class="tag">{tag}</span>
            ))}
            {reading.tags.length > 3 && (
              <span class="tag tag-more">+{reading.tags.length - 3}</span>
            )}
          </div>
        )}

        <div class="reading-card-actions">
          <button
            class="btn btn-ghost btn-sm"
            onClick={() => onEdit(reading)}
            aria-label="Editar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Editar
          </button>
          <button
            class="btn btn-ghost btn-sm"
            onClick={() => onDelete(reading.id)}
            aria-label="Eliminar"
            style="color: var(--status-dropped);"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Eliminar
          </button>
        </div>
      </div>

      <style>{`
        .reading-card {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        
        .reading-card-image {
          position: relative;
          height: 180px;
          background: var(--bg-input);
          overflow: hidden;
        }
        
        .reading-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .reading-card-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }
        
        .reading-card-image .badge {
          position: absolute;
          top: var(--space-2);
          right: var(--space-2);
        }

        .reading-card-link {
            position: absolute;
            top: var(--space-2);
            left: var(--space-2);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            color: white;
            border-radius: 50%;
            transition: all var(--transition-fast);
            z-index: 10;
        }

        .reading-card-link:hover {
            background: var(--accent-primary);
            transform: scale(1.1);
        }
        
        .reading-card-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--space-2);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .reading-card-meta {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin-bottom: var(--space-3);
        }
        
        .status-select {
          flex: 1;
          padding: var(--space-1) var(--space-2);
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-sm);
          color: var(--text-primary);
          font-size: 0.75rem;
          cursor: pointer;
        }
        
        .status-select:focus {
          outline: none;
          border-color: var(--accent-primary);
        }
        
        .chapter-info {
          font-size: 0.75rem;
          color: var(--text-secondary);
          white-space: nowrap;
        }
        
        .reading-card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-1);
          margin-bottom: var(--space-3);
        }
        
        .tag-more {
          background: var(--accent-primary);
          color: white;
        }
        
        .reading-card-actions {
          display: flex;
          gap: var(--space-2);
          margin-top: auto;
          padding-top: var(--space-3);
          border-top: 1px solid var(--border-color);
        }
        
        .reading-card-actions .btn {
          flex: 1;
        }
      `}</style>
    </div>
  );
}
