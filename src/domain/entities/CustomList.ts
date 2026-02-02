export type ListVisibility = 'private' | 'public' | 'link';

import type { ReadingStatus, ReadingCategory } from './Reading';

export interface ListReading {
    id: string;
    title: string;
    imageUrl?: string;
    category: ReadingCategory;
    status: ReadingStatus;
}

export interface CustomList {
    id: string;
    userId: string;
    userName: string;
    name: string;
    description?: string;
    slug: string;
    coverImage?: string;
    readings: ListReading[];
    visibility: ListVisibility;
    likesCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateCustomListDTO {
    name: string;
    description?: string;
    visibility: ListVisibility;
    coverImage?: string;
    readings?: ListReading[];
}

export interface UpdateCustomListDTO {
    name?: string;
    description?: string;
    visibility?: ListVisibility;
    coverImage?: string;
    readings?: ListReading[];
}

export interface ListComment {
    id: string;
    listId: string;
    userId: string;
    userName: string;
    content: string;
    createdAt: Date;
}

export interface CreateCommentDTO {
    content: string;
}

export const VISIBILITY_LABELS: Record<ListVisibility, string> = {
    'private': 'Privada',
    'public': 'Pública',
    'link': 'Solo con enlace',
};
