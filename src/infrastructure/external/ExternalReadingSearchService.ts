import type { ReadingCategory } from '../../domain/entities/Reading';
import type { ExternalSearchResult } from '../../domain/entities/ExternalSearchResult';
import type { IExternalReadingSearchService } from '../../domain/interfaces/IExternalReadingSearchService';
import { jikanSearchService } from './JikanSearchService';
import { aniListSearchService } from './AniListSearchService';
import { openLibrarySearchService } from './OpenLibrarySearchService';

/**
 * Service unificado: delega en el cliente correcto segun la categoria.
 * - manga / manhwa / manhua / light-novel / webtoon -> Jikan (MyAnimeList)
 *   con fallback a AniList si Jikan falla por error de red/servidor
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
                return this.searchMangaWithFallback(query, category, signal);
            case 'novel':
                try {
                    return await openLibrarySearchService.search(query, category, signal);
                } catch (err) {
                    if ((err as Error).name === 'AbortError') throw err;
                    console.warn('[ExternalSearch] Open Library failed:', (err as Error).message);
                    return [];
                }
            default:
                return [];
        }
    }

    private async searchMangaWithFallback(
        query: string,
        category: ReadingCategory,
        signal?: AbortSignal,
    ): Promise<ExternalSearchResult[]> {
        try {
            return await jikanSearchService.search(query, category, signal);
        } catch (err) {
            // Si fue cancelado por debounce, propagamos para no caer al fallback
            // (el fallback haria una request mas a otra API que tambien va a abortar).
            if ((err as Error).name === 'AbortError') throw err;
            console.warn('[ExternalSearch] Jikan failed, trying AniList:', (err as Error).message);
            try {
                return await aniListSearchService.search(query, category, signal);
            } catch (err2) {
                if ((err2 as Error).name === 'AbortError') throw err2;
                console.warn('[ExternalSearch] AniList also failed:', (err2 as Error).message);
                return [];
            }
        }
    }

    /** Indica si la categoria tiene API de busqueda externa configurada. */
    static hasApiFor(category: ReadingCategory): boolean {
        return category !== 'other';
    }
}

export const externalSearchService = new ExternalReadingSearchService();
