import type { Post } from '../../domain/entities/Post';
import type { User } from '../../domain/entities/User';
import PostCard from '../home/PostCard';

interface Props {
    posts: Post[];
    loading: boolean;
    hasMore: boolean;
    loadingMore: boolean;
    currentUser: User;
    likedIds: Set<string>;
    repostedIds: Set<string>;
    emptyMessage: string;
    onLoadMore: () => void;
}

export default function ProfilePostsTab({
    posts,
    loading,
    hasMore,
    loadingMore,
    currentUser,
    likedIds,
    repostedIds,
    emptyMessage,
    onLoadMore,
}: Props) {
    let content;
    if (loading) {
        content = <p class="tab-status">Cargando posts...</p>;
    } else if (posts.length === 0) {
        content = <p class="tab-status">{emptyMessage}</p>;
    } else {
        content = (
            <>
                <ul class="profile-posts-list">
                    {posts.map(post => {
                        const originalId = post.repostOf?.postId ?? post.id;
                        return (
                            <li key={post.id}>
                                <PostCard
                                    post={post}
                                    currentUser={currentUser}
                                    initialLiked={likedIds.has(post.id)}
                                    initialReposted={repostedIds.has(originalId)}
                                />
                            </li>
                        );
                    })}
                </ul>
                {hasMore && (
                    <div class="load-more-wrapper">
                        <button class="btn btn-ghost" onClick={onLoadMore} disabled={loadingMore}>
                            {loadingMore ? 'Cargando...' : 'Cargar más'}
                        </button>
                    </div>
                )}
            </>
        );
    }

    return (
        <section class="tab-section">
            {content}

            <style>{`
                .tab-section { min-height: 200px; }
                .tab-status {
                    text-align: center;
                    color: var(--text-muted);
                    padding: var(--space-8) var(--space-4);
                    margin: 0;
                }
                .profile-posts-list {
                    list-style: none; padding: 0; margin: 0;
                }
                .load-more-wrapper {
                    display: flex; justify-content: center;
                    padding: var(--space-4) 0;
                }
            `}</style>
        </section>
    );
}
