import type { ReadingCategory } from '../../domain/entities/Reading';
import type { ExternalSearchResult } from '../../domain/entities/ExternalSearchResult';
import type { IExternalReadingSearchService } from '../../domain/interfaces/IExternalReadingSearchService';

const JIKAN_BASE = 'https://api.jikan.moe/v4';
const SEARCH_LIMIT = 10;

/**
 * Mapeo de la categoria interna del app al filtro `type` de Jikan/MAL.
 * Si devuelve null, Jikan no aplica para esa categoria (la maneja otro service).
 */
function categoryToJikanType(category: ReadingCategory): string | null {
    switch (category) {
        case 'manga': return 'manga';
        case 'manhwa': return 'manhwa';
        case 'manhua': return 'manhua';
        case 'light-novel': return 'lightnovel';
        // MAL no tiene tipo "webtoon"; la mayoria estan clasificados como manhwa
        case 'webtoon': return 'manhwa';
        case 'novel':
        case 'other':
        default:
            return null;
    }
}

function jikanTypeToCategory(type: string | undefined): ReadingCategory | undefined {
    if (!type) return undefined;
    switch (type.toLowerCase()) {
        case 'manga': return 'manga';
        case 'manhwa': return 'manhwa';
        case 'manhua': return 'manhua';
        case 'light novel':
        case 'lightnovel': return 'light-novel';
        case 'novel': return 'novel';
        default: return undefined;
    }
}

interface JikanMangaItem {
    mal_id: number;
    url?: string;
    title: string;
    title_english?: string | null;
    images?: { jpg?: { image_url?: string; large_image_url?: string } };
    type?: string;
    chapters?: number | null;
    volumes?: number | null;
    synopsis?: string | null;
    genres?: { name: string }[];
}

interface JikanResponse {
    data: JikanMangaItem[];
}

export class JikanSearchService implements IExternalReadingSearchService {
    async search(query: string, category: ReadingCategory, signal?: AbortSignal): Promise<ExternalSearchResult[]> {
        const type = categoryToJikanType(category);
        if (!type) return [];
        if (query.trim().length < 1) return [];
        // Nota: Jikan rechaza queries de <3 caracteres con 400 validation error.
        // Lo aceptamos: el throw cae al fallback de AniList que si admite 1-2 chars.

        // Sin order_by/sort: Jikan ordena por relevancia de match cuando hay `q`,
        // que es lo que queremos en autocomplete. Si añadiesemos `order_by=popularity`
        // sobreescribiriamos la relevancia y series populares saldrian antes que
        // las que de verdad coinciden con el texto.
        const params = new URLSearchParams({
            q: query.trim(),
            type,
            limit: String(SEARCH_LIMIT),
        });
        const url = `${JIKAN_BASE}/manga?${params.toString()}`;

        const res = await fetch(url, { signal });
        if (!res.ok) {
            // Lanzamos para que el unified service pueda caer al fallback (AniList).
            // No registramos warn aqui para evitar spam si Jikan esta caido durante minutos.
            throw new Error(`Jikan ${res.status}`);
        }
        const json = await res.json() as JikanResponse;

        return (json.data ?? []).map(item => this.toResult(item));
    }

    private toResult(item: JikanMangaItem): ExternalSearchResult {
        const tags = (item.genres ?? []).map(g => g.name.toLowerCase());
        return {
            externalId: `jikan:${item.mal_id}`,
            source: 'jikan',
            title: item.title_english || item.title,
            imageUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
            totalChapters: item.chapters ?? undefined,
            totalVolumes: item.volumes ?? undefined,
            sourceUrl: item.url,
            description: item.synopsis ?? undefined,
            tags: tags.length > 0 ? tags : undefined,
            suggestedCategory: jikanTypeToCategory(item.type),
        };
    }
}

export const jikanSearchService = new JikanSearchService();
