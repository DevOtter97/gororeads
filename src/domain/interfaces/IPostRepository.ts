import type { Post, CreatePostDTO, PostComment } from '../entities/Post';
import type { User } from '../entities/User';

export interface FeedPage {
    posts: Post[];
    /** Cursor opaco para la siguiente pagina; null si no hay mas. */
    nextCursor: Date | null;
}

export interface IPostRepository {
    create(author: User, data: CreatePostDTO): Promise<Post>;

    /**
     * Devuelve el feed de posts de los amigos del usuario.
     * @param friendIds Lista de userIds de los amigos del lector. Firestore limita
     *   `where in` a 30 valores; el repo se encarga de chunkear y mergear si hay mas.
     * @param pageSize Numero maximo de posts por pagina.
     * @param cursor Si se proporciona, devuelve posts con createdAt < cursor.
     */
    getFeedForUser(friendIds: string[], pageSize: number, cursor?: Date): Promise<FeedPage>;

    getById(id: string): Promise<Post | null>;

    delete(id: string): Promise<void>;

    // --- Likes ---
    /** Crea o quita el like del usuario sobre el post. Devuelve el estado final. */
    toggleLike(postId: string, userId: string): Promise<boolean>;
    /** Para un solo post. */
    hasUserLiked(postId: string, userId: string): Promise<boolean>;
    /** Comprueba en paralelo varios posts. Devuelve un set con los ids ya likeados. */
    getLikedPostIds(postIds: string[], userId: string): Promise<Set<string>>;

    // --- Comments ---
    /**
     * @param parentId Si se proporciona, el comment es una respuesta al comment con ese id.
     */
    addComment(postId: string, author: User, text: string, parentId?: string): Promise<PostComment>;
    getComments(postId: string): Promise<PostComment[]>;
    deleteComment(postId: string, commentId: string): Promise<void>;

    // --- Reposts ---
    /** Crea un post type='repost' con snapshot del original + marker + increment counter. */
    repost(originalPost: Post, author: User): Promise<Post>;
    /** Borra el post repost del usuario sobre originalPostId + marker + decrement. */
    unrepost(originalPostId: string, userId: string): Promise<void>;
    hasUserReposted(originalPostId: string, userId: string): Promise<boolean>;
    getRepostedPostIds(originalPostIds: string[], userId: string): Promise<Set<string>>;
}
