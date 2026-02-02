import { useState } from 'preact/hooks';
import type { CustomList, ListReading } from '../../domain/entities/CustomList';
import { VISIBILITY_LABELS } from '../../domain/entities/CustomList';

interface Props {
    list: CustomList;
    readings: ListReading[]; // First 4 readings for covers
    onEdit: (list: CustomList) => void;
    onDelete: (id: string) => void;
    onView: (list: CustomList) => void;
}

const getInitials = (title: string): string => {
    return title
        .split(' ')
        .slice(0, 2)
        .map(word => word.charAt(0).toUpperCase())
        .join('');
};

export default function CustomListCard({ list, readings, onEdit, onDelete, onView }: Props) {
    const getVisibilityIcon = () => {
        switch (list.visibility) {
            case 'private':
                return (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                );
            case 'public':
                return (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                );
            case 'link':
                return (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                );
        }
    };

    const [copied, setCopied] = useState(false);

    const copyLink = async (e: Event) => {
        e.stopPropagation();
        const url = `${window.location.origin}/list/${list.slug}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const displayReadings = readings.slice(0, 4);
    const coverCount = displayReadings.length;

    return (
        <div class="card custom-list-card" onClick={() => onView(list)}>
            <div class="list-card-header">
                <div class="list-card-covers">
                    {coverCount === 0 ? (
                        <div class="list-cover-placeholder">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                    ) : (
                        <div class={`list-cover-grid count-${coverCount}`}>
                            {displayReadings.map((reading, index) => (
                                <div key={reading.id} class="list-cover-item" style={`--index: ${index}`}>
                                    {reading.imageUrl ? (
                                        <img src={reading.imageUrl} alt={reading.title} />
                                    ) : (
                                        <div class="list-cover-initials">
                                            {getInitials(reading.title)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <span class={`badge badge-visibility-${list.visibility}`}>
                    {getVisibilityIcon()}
                    {VISIBILITY_LABELS[list.visibility]}
                </span>
            </div>

            <div class="card-body">
                <h3 class="list-card-title">{list.name}</h3>
                {list.description && (
                    <p class="list-card-description">{list.description}</p>
                )}

                <div class="list-card-meta">
                    <span class="list-readings-count">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                        {list.readings.length} lecturas
                    </span>
                    <span class="list-likes-count">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        {list.likesCount}
                    </span>
                </div>

                <div class="list-card-actions">
                    {list.visibility !== 'private' && (
                        <button
                            class={`btn btn-ghost btn-sm ${copied ? 'text-success' : ''}`}
                            onClick={copyLink}
                            title={copied ? "¡Enlace copiado!" : "Copiar enlace"}
                        >
                            {copied ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                </svg>
                            )}
                        </button>
                    )}
                    <button
                        class="btn btn-ghost btn-sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(list);
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                    </button>
                    <button
                        class="btn btn-ghost btn-sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(list.id);
                        }}
                        style="color: var(--status-dropped);"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                    </button>
                </div>
            </div>

            <style>{`
                .custom-list-card {
                    cursor: pointer;
                    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
                }

                .custom-list-card:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-lg);
                }

                .list-card-header {
                    position: relative;
                    height: 120px;
                    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: var(--space-3);
                }

                .list-card-header .badge {
                    position: absolute;
                    top: var(--space-2);
                    right: var(--space-2);
                    display: flex;
                    align-items: center;
                    gap: var(--space-1);
                }

                .badge-visibility-private {
                    background: var(--bg-input);
                    color: var(--text-secondary);
                }

                .badge-visibility-public {
                    background: var(--status-completed);
                    color: white;
                }

                .badge-visibility-link {
                    background: var(--accent-primary);
                    color: white;
                }

                .list-cover-placeholder {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: rgba(255, 255, 255, 0.5);
                }

                .list-cover-grid {
                    display: grid;
                    gap: 6px;
                    place-items: center;
                }

                .list-cover-grid.count-1 {
                    grid-template-columns: 1fr;
                }

                .list-cover-grid.count-1 .list-cover-item {
                    width: 55px;
                    height: 75px;
                }

                .list-cover-grid.count-2 {
                    grid-template-columns: repeat(2, 1fr);
                }

                .list-cover-grid.count-2 .list-cover-item {
                    width: 45px;
                    height: 60px;
                }

                .list-cover-grid.count-3,
                .list-cover-grid.count-4 {
                    grid-template-columns: repeat(2, 1fr);
                }

                .list-cover-grid.count-3 .list-cover-item,
                .list-cover-grid.count-4 .list-cover-item {
                    width: 40px;
                    height: 52px;
                }

                .list-cover-item {
                    border-radius: var(--border-radius-sm);
                    overflow: hidden;
                    background: rgba(255, 255, 255, 0.15);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                }

                .list-cover-item img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .list-cover-initials {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1rem;
                    font-weight: 700;
                    color: white;
                    background: rgba(0, 0, 0, 0.2);
                }

                .list-card-title {
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: var(--space-1);
                }

                .list-card-description {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                    margin-bottom: var(--space-3);
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .list-card-meta {
                    display: flex;
                    gap: var(--space-4);
                    margin-bottom: var(--space-3);
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                }

                .list-readings-count,
                .list-likes-count {
                    display: flex;
                    align-items: center;
                    gap: var(--space-1);
                }

                .list-card-actions {
                    display: flex;
                    gap: var(--space-2);
                    padding-top: var(--space-3);
                    border-top: 1px solid var(--border-color);
                    margin-top: auto;
                }
            `}</style>
        </div>
    );
}
