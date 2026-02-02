import type { Reading, ReadingStatus, CreateReadingDTO, UpdateReadingDTO } from '../entities/Reading';

export interface ReadingFilters {
    status?: ReadingStatus;
    category?: string;
    tags?: string[];
    searchQuery?: string;
}

export interface IReadingRepository {
    create(userId: string, data: CreateReadingDTO): Promise<Reading>;
    update(id: string, data: UpdateReadingDTO): Promise<Reading>;
    delete(id: string): Promise<void>;
    getById(id: string): Promise<Reading | null>;
    getByUserId(userId: string, filters?: ReadingFilters): Promise<Reading[]>;
    getUserTags(userId: string): Promise<string[]>;
}
