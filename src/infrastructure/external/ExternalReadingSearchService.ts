import type { ReadingCategory } from '../../domain/entities/Reading';
import type { ExternalSearchResult } from '../../domain/entities/ExternalSearchResult';
import type { IExternalReadingSearchService } from '../../domain/interfaces/IExternalReadingSearchService';
import { jikanSearchService } from './JikanSearchService';
import { openLibrarySearchService } from './OpenLibrarySearchService';

/**
 * Service unificado: delega en el cliente correcto segun la categoria.
 * - manga / manhwa / manhua / light-novel / webtoon -> Jikan (MyAnimeList)
 * - novel -> Open Library
 * - other -> sin API
 */
export class ExternalReadingSearchService implements IExternalReadingSearchService {
    async search(query: string, category: ReadingCategory, signal?: AbortSignal): Promise<ExternalSearchResult[]> {
        switch (category) {
            case 'manga':
            case 'manhwa':
            case 'manhua':
            case 'light-novel':
            case 'webtoon':
                return jikanSearchService.search(query, category, signal);
            case 'novel':
                return openLibrarySearchService.search(query, category, signal);
            default:
                return [];
        }
    }

    /** Indica si la categoria tiene API de busqueda externa configurada. */
    static hasApiFor(category: ReadingCategory): boolean {
        return category !== 'other';
    }
}

export const externalSearchService = new ExternalReadingSearchService();
