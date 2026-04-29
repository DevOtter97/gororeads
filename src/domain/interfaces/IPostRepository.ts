import type { Post, CreatePostDTO } from '../entities/Post';
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
}
