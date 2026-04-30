import type { CustomList } from '../../domain/entities/CustomList';
import CustomListCard from '../lists/CustomListCard';

interface Props {
    lists: CustomList[];
    loading: boolean;
    emptyMessage: string;
}

export default function ProfileListsTab({ lists, loading, emptyMessage }: Props) {
    return (
        <section id="lists" class="tab-section">
            {loading ? (
                <p class="tab-status">Cargando listas...</p>
            ) : lists.length === 0 ? (
                <p class="tab-status">{emptyMessage}</p>
            ) : (
                <div class="profile-lists-grid">
                    {lists.map(list => (
                        <CustomListCard
                            key={list.id}
                            list={list}
                            readings={list.readings}
                            onView={(l) => { window.location.href = `/list/${l.slug}`; }}
                        />
                    ))}
                </div>
            )}

            <style>{`
                .tab-section { min-height: 200px; }
                .tab-status {
                    text-align: center;
                    color: var(--text-muted);
                    padding: var(--space-8) var(--space-4);
                    margin: 0;
                }
                .profile-lists-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
                    gap: var(--space-4);
                }
            `}</style>
        </section>
    );
}
