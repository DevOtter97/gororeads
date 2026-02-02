import type { CustomList, CreateCustomListDTO, UpdateCustomListDTO, ListComment, CreateCommentDTO, ListReading } from '../entities/CustomList';

export interface ICustomListRepository {
    // CRUD Lists
    create(userId: string, userName: string, data: CreateCustomListDTO): Promise<CustomList>;
    update(id: string, data: UpdateCustomListDTO): Promise<CustomList>;
    delete(id: string): Promise<void>;

    // Queries
    getById(id: string): Promise<CustomList | null>;
    getBySlug(slug: string): Promise<CustomList | null>;
    getByUserId(userId: string): Promise<CustomList[]>;
    getPublicLists(): Promise<CustomList[]>;

    // Readings management
    addReading(listId: string, reading: ListReading): Promise<void>;
    removeReading(listId: string, reading: ListReading): Promise<void>;

    // Likes
    toggleLike(listId: string, userId: string): Promise<boolean>;
    hasUserLiked(listId: string, userId: string): Promise<boolean>;

    // Comments
    addComment(listId: string, userId: string, userName: string, data: CreateCommentDTO): Promise<ListComment>;
    getComments(listId: string): Promise<ListComment[]>;
    deleteComment(listId: string, commentId: string): Promise<void>;
}
