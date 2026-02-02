import type { Reading } from '../../domain/entities/Reading';
import { STATUS_LABELS, CATEGORY_LABELS, MEASURE_UNIT_LABELS } from '../../domain/entities/Reading';

interface Props {
  reading: Reading;
  onClose: () => void;
  onEdit: (reading: Reading) => void;
}

export default function ReadingDetailsModal({ reading, onClose, onEdit }: Props) {
  const formatDate = (date?: Date) => {
    if (!date) return 'No definida';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => {
      if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
        onClose();
      }
    }}>
      <div className="modal reading-details-modal">
        <button className="modal-close-btn" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="details-grid">
          {/* Left Column: Image */}
          <div className="details-image-col">
            <div className="details-image-container">
              {reading.imageUrl ? (
                <img src={reading.imageUrl} alt={reading.title} />
              ) : (
                <div className="details-placeholder">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </div>
              )}
            </div>

            <div className="details-actions">
              {reading.referenceUrl && (
                <a
                  href={reading.referenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-block"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style="margin-right: 8px;">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  Ver Referencia
                </a>
              )}

              <button
                className="btn btn-primary btn-block"
                onClick={() => {
                  onClose();
                  onEdit(reading);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style="margin-right: 8px;">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Editar
              </button>
            </div>
          </div>

          {/* Right Column: Info */}
          <div className="details-info-col">
            <div className="details-header">
              <div className="details-badges">
                <span className={`badge badge-category-${reading.category}`}>
                  {CATEGORY_LABELS[reading.category]}
                </span>
                <span className="badge badge-outline">
                  {STATUS_LABELS[reading.status]}
                </span>
              </div>
              <h2 className="details-title">{reading.title}</h2>
            </div>

            {reading.status !== 'to-read' && (
              <div className="details-section">
                <h3 className="section-label">Progreso</h3>
                <div className="progress-display">
                  <span className="progress-value">
                    {reading.currentChapter || 0}
                    {reading.totalChapters ? ` / ${reading.totalChapters}` : ''}
                  </span>
                  <span className="progress-unit">
                    {MEASURE_UNIT_LABELS[reading.measureUnit]}
                  </span>
                </div>
                {(reading.status === 'completed' || reading.measureUnit === 'percentage' || (reading.measureUnit === 'pages' && reading.totalChapters)) && (
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: reading.status === 'completed'
                          ? '100%'
                          : reading.measureUnit === 'percentage'
                            ? `${Math.min(100, reading.currentChapter || 0)}%`
                            : `${Math.min(100, ((reading.currentChapter || 0) / (reading.totalChapters || 1)) * 100)}%`
                      }}
                    ></div>
                  </div>
                )}
              </div>
            )}

            {reading.status !== 'to-read' && (
              <div className="details-grid-dates">
                <div className="date-item">
                  <span className="date-label">Empezado</span>
                  <span className="date-value">{formatDate(reading.startedAt)}</span>
                </div>
                <div className="date-item">
                  <span className="date-label">Terminado</span>
                  <span className="date-value">{formatDate(reading.finishedAt)}</span>
                </div>
              </div>
            )}

            {reading.tags.length > 0 && (
              <div className="details-section">
                <h3 className="section-label">Etiquetas</h3>
                <div className="tags-list">
                  {reading.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {reading.notes && (
              <div className="details-section">
                <h3 className="section-label">Notas</h3>
                <p className="notes-text">{reading.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .reading-details-modal {
          max-width: 800px;
          width: 90%;
          padding: 0;
          overflow: hidden;
          background: var(--bg-card);
        }

        .modal-close-btn {
          position: absolute;
          top: var(--space-4);
          right: var(--space-4);
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          z-index: 10;
          padding: var(--space-1);
          border-radius: 50%;
          transition: all var(--transition-fast);
        }

        .modal-close-btn:hover {
          color: var(--text-primary);
          background: var(--bg-input);
        }

        .details-grid {
          display: grid;
          grid-template-columns: 300px 1fr;
          min-height: 400px;
        }

        /* Left Column */
        .details-image-col {
          background: var(--bg-input);
          padding: var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          border-right: 1px solid var(--border-color);
        }

        .details-image-container {
          width: 100%;
          aspect-ratio: 2/3;
          border-radius: var(--border-radius-md);
          overflow: hidden;
          box-shadow: var(--shadow-md);
          background: var(--bg-card);
        }

        .details-image-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .details-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }

        .details-actions {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .btn-block {
          width: 100%;
          justify-content: center;
        }

        /* Right Column */
        .details-info-col {
          padding: var(--space-6) var(--space-8);
          overflow-y: auto;
          max-height: 80vh;
        }

        .details-header {
          margin-bottom: var(--space-6);
          padding-right: var(--space-8); /* Space for close button */
        }

        .details-badges {
          display: flex;
          gap: var(--space-2);
          margin-bottom: var(--space-3);
        }

        .details-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .details-section {
          margin-bottom: var(--space-6);
        }

        .section-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          margin-bottom: var(--space-2);
          font-weight: 600;
        }

        .progress-display {
          display: flex;
          align-items: baseline;
          gap: var(--space-2);
          margin-bottom: var(--space-2);
        }

        .progress-value {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .progress-unit {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .progress-bar-container {
          height: 6px;
          background: var(--bg-input);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: var(--accent-primary);
          border-radius: 3px;
        }

        .details-grid-dates {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
          margin-bottom: var(--space-6);
          padding-bottom: var(--space-6);
          border-bottom: 1px solid var(--border-color);
        }

        .date-item {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .date-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .date-value {
          font-size: 0.9375rem;
          color: var(--text-primary);
          font-weight: 500;
        }

        .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
        }

        .notes-text {
          color: var(--text-secondary);
          line-height: 1.6;
          white-space: pre-wrap;
          font-size: 0.9375rem;
        }

        @media (max-width: 768px) {
          .details-grid {
            grid-template-columns: 1fr;
          }

          .details-image-col {
            padding: var(--space-4);
            border-right: none;
            border-bottom: 1px solid var(--border-color);
            flex-direction: row;
            align-items: center;
          }

          .details-image-container {
            width: 100px;
            margin-bottom: 0;
          }

          .details-actions {
            margin-top: 0;
            flex: 1;
          }

          .details-info-col {
            padding: var(--space-4);
          }
          
          .modal-close-btn {
            top: var(--space-2);
            right: var(--space-2);
            background: rgba(0,0,0,0.5);
            color: white;
          }
        }
      `}</style>
    </div>
  );
}
