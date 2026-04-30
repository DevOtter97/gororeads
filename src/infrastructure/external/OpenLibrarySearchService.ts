import type { ReadingCategory } from '../../domain/entities/Reading';
import type { ExternalSearchResult } from '../../domain/entities/ExternalSearchResult';
import type { IExternalReadingSearchService } from '../../domain/interfaces/IExternalReadingSearchService';

const OL_BASE = 'https://openlibrary.org';
const OL_COVERS = 'https://covers.openlibrary.org/b/id';
const SEARCH_LIMIT = 10;

interface OpenLibraryDoc {
    key: string;
    title: string;
    cover_i?: number;
    author_name?: string[];
    number_of_pages_median?: number;
    first_publish_year?: number;
    subject?: string[];
}

interface OpenLibraryResponse {
    docs: OpenLibraryDoc[];
}

/**
 * Cliente para Open Library (novelas y libros tradicionales).
 * Solo se usa cuando la categoria del lector es 'novel'.
 */
export class OpenLibrarySearchService implements IExternalReadingSearchService {
    async search(query: string, category: ReadingCategory, signal?: AbortSignal): Promise<ExternalSearchResult[]> {
        if (category !== 'novel') return [];
        if (query.trim().length < 2) return [];

        const params = new URLSearchParams({
            q: query.trim(),
            limit: String(SEARCH_LIMIT),
            fields: 'key,title,cover_i,author_name,number_of_pages_median,first_publish_year,subject',
        });
        const url = `${OL_BASE}/search.json?${params.toString()}`;

        const res = await fetch(url, { signal });
        if (!res.ok) {
            console.warn('[OpenLibrary] Search failed:', res.status);
            return [];
        }
        const json = await res.json() as OpenLibraryResponse;

        return (json.docs ?? []).map(doc => this.toResult(doc));
    }

    private toResult(doc: OpenLibraryDoc): ExternalSearchResult {
        const author = doc.author_name?.[0];
        const description = author ? `Por ${author}${doc.first_publish_year ? ` (${doc.first_publish_year})` : ''}` : undefined;
        const subjects = (doc.subject ?? []).slice(0, 6).map(s => s.toLowerCase());

        return {
            externalId: `ol:${doc.key}`,
            source: 'openlibrary',
            title: doc.title,
            imageUrl: doc.cover_i ? `${OL_COVERS}/${doc.cover_i}-L.jpg` : undefined,
            totalChapters: doc.number_of_pages_median, // semantica laxa: en novelas el "total" suele ser paginas
            sourceUrl: `${OL_BASE}${doc.key}`,
            description,
            tags: subjects.length > 0 ? subjects : undefined,
            suggestedCategory: 'novel',
        };
    }
}

export const openLibrarySearchService = new OpenLibrarySearchService();
