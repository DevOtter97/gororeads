import type { ListReading } from '../../domain/entities/CustomList';
import { CATEGORY_LABELS, STATUS_LABELS } from '../../domain/entities/Reading';

interface Props {
    readings: ListReading[];
}

export default function ListReadingsGrid({ readings }: Props) {
    return (
        <section class="readings-section">
            <h2>Lecturas</h2>
            {readings.length === 0 ? (
                <p class="no-readings">Esta lista aún no tiene lecturas</p>
            ) : (
                <div class="readings-grid">
                    {readings.map(reading => (
                        <div key={reading.id} class="reading-item">
                            <div class="reading-image">
                                {reading.imageUrl ? (
                                    <img src={reading.imageUrl} alt={reading.title} />
                                ) : (
                                    <div class="reading-placeholder">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                        </svg>
                                    </div>
                                )}
                                <span class={`badge badge-category-${reading.category}`}>
                                    {CATEGORY_LABELS[reading.category]}
                                </span>
                            </div>
                            <div class="reading-info">
                                <h3>{reading.title}</h3>
                                <span class="reading-status">{STATUS_LABELS[reading.status]}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                .readings-section {
                    padding: var(--space-8) 0;
                }

                .readings-section h2 {
                    margin-bottom: var(--space-6);
                }

                .readings-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
                    gap: var(--space-4);
                }

                .reading-item {
                    background: var(--bg-card);
                    border-radius: var(--border-radius-lg);
                    overflow: hidden;
                    border: 1px solid var(--border-color);
                }

                .reading-image {
                    position: relative;
                    height: 150px;
                    background: var(--bg-input);
                }

                .reading-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .reading-placeholder {
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-muted);
                }

                .reading-image .badge {
                    position: absolute;
                    top: var(--space-2);
                    right: var(--space-2);
                }

                .reading-info {
                    padding: var(--space-3);
                }

                .reading-info h3 {
                    font-size: 0.9375rem;
                    margin-bottom: var(--space-1);
                }

                .reading-status {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                .no-readings {
                    color: var(--text-secondary);
                    text-align: center;
                    padding: var(--space-8);
                }
            `}</style>
        </section>
    );
}
