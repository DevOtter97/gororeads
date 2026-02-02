export type ReadingStatus = 'to-read' | 'reading' | 'completed' | 'dropped' | 'on-hold';
export type ReadingCategory = 'manga' | 'manhwa' | 'manhua' | 'novel' | 'light-novel' | 'webtoon' | 'other';
export type ReadingMeasureUnit = 'chapters' | 'pages' | 'percentage';

export interface Reading {
    id: string;
    userId: string;
    title: string;
    imageUrl?: string;
    category: ReadingCategory;
    status: ReadingStatus;
    measureUnit: ReadingMeasureUnit;
    tags: string[];
    currentChapter?: number;
    totalChapters?: number;
    notes?: string;
    referenceUrl?: string; // Optional reference link
    startedAt?: Date; // Optional start date
    finishedAt?: Date; // Optional completion date
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateReadingDTO {
    title: string;
    imageUrl?: string;
    category: ReadingCategory;
    status: ReadingStatus;
    measureUnit: ReadingMeasureUnit;
    tags: string[];
    currentChapter?: number;
    totalChapters?: number;
    notes?: string;
    referenceUrl?: string;
    startedAt?: Date;
    finishedAt?: Date;
}

export interface UpdateReadingDTO {
    title?: string;
    imageUrl?: string;
    category?: ReadingCategory;
    status?: ReadingStatus;
    measureUnit?: ReadingMeasureUnit;
    tags?: string[];
    currentChapter?: number;
    totalChapters?: number;
    notes?: string;
    referenceUrl?: string;
    startedAt?: Date;
    finishedAt?: Date;
}

export const STATUS_LABELS: Record<ReadingStatus, string> = {
    'to-read': 'Por Leer',
    'reading': 'Leyendo',
    'completed': 'Completado',
    'dropped': 'Abandonado',
    'on-hold': 'En Pausa',
};

export const CATEGORY_LABELS: Record<ReadingCategory, string> = {
    'manga': 'Manga',
    'manhwa': 'Manhwa',
    'manhua': 'Manhua',
    'novel': 'Novela',
    'light-novel': 'Light Novel',
    'webtoon': 'Webtoon',
    'other': 'Otro',
};

export const MEASURE_UNIT_LABELS: Record<ReadingMeasureUnit, string> = {
    'chapters': 'Capítulos',
    'pages': 'Páginas',
    'percentage': 'Porcentaje',
};
