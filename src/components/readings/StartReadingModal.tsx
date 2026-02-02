import { useState } from 'preact/hooks';
import type { Reading, ReadingMeasureUnit } from '../../domain/entities/Reading';
import { MEASURE_UNIT_LABELS } from '../../domain/entities/Reading';

interface Props {
    reading: Reading;
    onConfirm: (data: { startedAt: Date; currentChapter: number; measureUnit: ReadingMeasureUnit }) => void;
    onCancel: () => void;
}

export default function StartReadingModal({ reading, onConfirm, onCancel }: Props) {
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [progress, setProgress] = useState(reading.currentChapter || 0);
    const [measureUnit, setMeasureUnit] = useState<ReadingMeasureUnit>(reading.measureUnit);

    const handleSubmit = (e: Event) => {
        e.preventDefault();
        onConfirm({
            startedAt: new Date(startDate),
            currentChapter: progress,
            measureUnit
        });
    };

    return (
        <div className="modal-overlay" onClick={(e) => {
            if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
                onCancel();
            }
        }}>
            <div className="modal" style="max-width: 400px;">
                <div className="modal-header">
                    <h2 className="modal-title">Empezar Lectura</h2>
                    <button className="modal-close" onClick={onCancel}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <p style="margin-bottom: var(--space-4); color: var(--text-secondary);">
                            Vas a empezar a leer <strong>{reading.title}</strong>.
                        </p>

                        <div className="form-group">
                            <label htmlFor="start-date">Fecha de Inicio</label>
                            <input
                                type="date"
                                id="start-date"
                                className="form-input"
                                value={startDate}
                                onChange={(e) => setStartDate((e.target as HTMLInputElement).value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Unidad de Progreso</label>
                            <div className="radio-group">
                                {Object.entries(MEASURE_UNIT_LABELS).map(([value, label]) => (
                                    <label key={value} className={`radio-label ${measureUnit === value ? 'active' : ''}`}>
                                        <input
                                            type="radio"
                                            name="measureUnit"
                                            value={value}
                                            checked={measureUnit === value}
                                            onChange={() => setMeasureUnit(value as ReadingMeasureUnit)}
                                            className="sr-only"
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="start-progress">
                                Progreso Actual ({MEASURE_UNIT_LABELS[measureUnit]})
                            </label>
                            <input
                                type="number"
                                id="start-progress"
                                className="form-input"
                                min="0"
                                max={measureUnit === 'percentage' ? "100" : reading.totalChapters}
                                value={progress}
                                onChange={(e) => setProgress(Number((e.target as HTMLInputElement).value))}
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onCancel}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Confirmar
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
        .form-group {
          margin-bottom: var(--space-4);
        }
        
        .form-group label {
          display: block;
          margin-bottom: var(--space-2);
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        .form-input {
          width: 100%;
          padding: 0.625rem;
          border-radius: var(--border-radius-md);
          border: 1px solid var(--border-color);
          background: var(--bg-input);
          color: var(--text-primary);
          transition: border-color var(--transition-fast);
        }
        
        .form-input:focus {
          outline: none;
          border-color: var(--accent-primary);
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
      `}</style>
        </div>
    );
}
