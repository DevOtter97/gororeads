import type { ReadingCategory } from './Reading';

/** Origen del resultado (para debug/UI). */
export type ExternalSource = 'jikan' | 'anilist' | 'openlibrary';

/**
 * Resultado normalizado de una busqueda en una API externa, listo para
 * autocompletar el form de lectura. Distintas APIs (Jikan, Open Library...)
 * mapean sus respuestas a esta forma comun.
 */
export interface ExternalSearchResult {
    /** Id en la API de origen, para deduplicar. */
    externalId: string;
    source: ExternalSource;
    title: string;
    imageUrl?: string;
    /** Numero total de capitulos (si la API lo expone). */
    totalChapters?: number;
    /** Numero total de volumenes/paginas (segun API). */
    totalVolumes?: number;
    /** URL canonica externa (MAL, OpenLibrary work...). Util como referenceUrl. */
    sourceUrl?: string;
    /** Sinopsis corta. */
    description?: string;
    /** Generos/tags como strings normalizados (lowercase). */
    tags?: string[];
    /** Tipo sugerido (puede diferir del seleccionado en el form). */
    suggestedCategory?: ReadingCategory;
}
