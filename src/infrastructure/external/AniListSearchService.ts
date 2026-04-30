import type { ReadingCategory } from '../../domain/entities/Reading';
import type { ExternalSearchResult } from '../../domain/entities/ExternalSearchResult';
import type { IExternalReadingSearchService } from '../../domain/interfaces/IExternalReadingSearchService';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const SEARCH_LIMIT = 10;

/**
 * Mapea la categoria interna a los filtros de AniList:
 * - format MANGA: manga, manhwa, manhua, webtoon
 * - format NOVEL: light-novel
 * - countryOfOrigin: JP/KR/CN para distinguir manga/manhwa/manhua
 */
function categoryToAniListFilter(category: ReadingCategory):
    { format?: string; country?: string } | null {
    switch (category) {
        case 'manga': return { format: 'MANGA', country: 'JP' };
        case 'manhwa': return { format: 'MANGA', country: 'KR' };
        case 'manhua': return { format: 'MANGA', country: 'CN' };
        case 'light-novel': return { format: 'NOVEL' };
        case 'webtoon': return { format: 'MANGA', country: 'KR' }; // AniList no tiene webtoon
        case 'novel':
        case 'other':
        default:
            return null;
    }
}

function aniListFormatToCategory(format: string | undefined, country: string | undefined): ReadingCategory | undefined {
    if (format === 'NOVEL') return 'light-novel';
    if (format !== 'MANGA') return undefined;
    switch (country) {
        case 'KR': return 'manhwa';
        case 'CN':
        case 'TW': return 'manhua';
        case 'JP': return 'manga';
        default: return 'manga';
    }
}

interface AniListMedia {
    id: number;
    title: { romaji?: string; english?: string };
    coverImage?: { large?: string };
    chapters?: number | null;
    volumes?: number | null;
    description?: string | null;
    genres?: string[];
    format?: string;
    countryOfOrigin?: string;
    siteUrl?: string;
}

interface AniListResponse {
    data?: { Page?: { media?: AniListMedia[] } };
    errors?: { message: string }[];
}

// Sin sort explicito: AniList ordena por relevancia (SEARCH_MATCH) cuando hay
// un parametro `search`, que es lo que queremos para autocomplete. Anteriormente
// usabamos POPULARITY_DESC y eso devolvia obras populares pero sin matchear el
// texto buscado.
const SEARCH_QUERY = `
query ($search: String, $format: MediaFormat, $country: CountryCode, $perPage: Int) {
    Page(perPage: $perPage) {
        media(search: $search, type: MANGA, format: $format, countryOfOrigin: $country) {
            id
            title { romaji english }
            coverImage { large }
            chapters
            volumes
            description(asHtml: false)
            genres
            format
            countryOfOrigin
            siteUrl
        }
    }
}
`;

export class AniListSearchService implements IExternalReadingSearchService {
    async search(query: string, category: ReadingCategory, signal?: AbortSignal): Promise<ExternalSearchResult[]> {
        const filter = categoryToAniListFilter(category);
        if (!filter) return [];
        if (query.trim().length < 1) return [];

        const variables: Record<string, unknown> = {
            search: query.trim(),
            perPage: SEARCH_LIMIT,
        };
        if (filter.format) variables.format = filter.format;
        if (filter.country) variables.country = filter.country;

        const res = await fetch(ANILIST_ENDPOINT, {
            method: 'POST',
            signal,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query: SEARCH_QUERY, variables }),
        });
        if (!res.ok) {
            throw new Error(`AniList ${res.status}`);
        }
        const json = await res.json() as AniListResponse;
        if (json.errors && json.errors.length > 0) {
            throw new Error(`AniList: ${json.errors[0].message}`);
        }

        const media = json.data?.Page?.media ?? [];
        return media.map(m => this.toResult(m));
    }

    private toResult(m: AniListMedia): ExternalSearchResult {
        // AniList descripcion incluye HTML (<br/>); lo limpiamos light
        const description = m.description?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || undefined;
        const genres = (m.genres ?? []).map(g => g.toLowerCase());
        return {
            externalId: `anilist:${m.id}`,
            source: 'anilist',
            title: m.title?.english || m.title?.romaji || '(sin titulo)',
            imageUrl: m.coverImage?.large,
            totalChapters: m.chapters ?? undefined,
            totalVolumes: m.volumes ?? undefined,
            sourceUrl: m.siteUrl,
            description,
            tags: genres.length > 0 ? genres : undefined,
            suggestedCategory: aniListFormatToCategory(m.format, m.countryOfOrigin),
        };
    }
}

export const aniListSearchService = new AniListSearchService();
