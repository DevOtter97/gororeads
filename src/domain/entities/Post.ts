import type { ReadingCategory } from './Reading';

export type PostType = 'text' | 'image' | 'reading' | 'list' | 'repost';

/** Snapshot denormalizado de una lectura referenciada en un post. */
export interface PostReadingRef {
    id: string;
    title: string;
    imageUrl?: string;
    category: ReadingCategory;
}

/** Snapshot denormalizado de una lista referenciada en un post. */
export interface PostListRef {
    id: string;
    name: string;
    slug: string;
    coverCount: number;
}

/** Snapshot denormalizado del post original cuando type='repost'. */
export interface PostRepostRef {
    postId: string;
    authorId: string;
    authorUsername: string;
    authorPhotoURL?: string;
    type: PostType;
    text?: string;
    imageUrl?: string;
    readingRef?: PostReadingRef;
    listRef?: PostListRef;
    createdAt: Date;
}

export interface Post {
    id: string;
    authorId: string;
    authorUsername: string;
    authorPhotoURL?: string;
    type: PostType;
    text?: string;
    imageUrl?: string;
    readingRef?: PostReadingRef;
    listRef?: PostListRef;
    repostOf?: PostRepostRef;
    likesCount: number;
    commentsCount: number;
    repostsCount: number;
    createdAt: Date;
}

export interface CreatePostDTO {
    type: PostType;
    text?: string;
    imageUrl?: string;
    readingRef?: PostReadingRef;
    listRef?: PostListRef;
    repostOf?: PostRepostRef;
}

export const POST_TEXT_MAX_LENGTH = 500;
export const COMMENT_TEXT_MAX_LENGTH = 280;

export interface PostComment {
    id: string;
    userId: string;
    username: string;
    photoURL?: string;
    text: string;
    createdAt: Date;
}
