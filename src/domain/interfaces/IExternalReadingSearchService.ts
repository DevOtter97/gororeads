import type { ReadingCategory } from '../entities/Reading';
import type { ExternalSearchResult } from '../entities/ExternalSearchResult';

export interface IExternalReadingSearchService {
    /**
     * Busca lecturas en la API externa correspondiente a la categoria.
     * Devuelve [] si no hay API para esa categoria o no hay resultados.
     * @param query Texto de busqueda. Se ignoran consultas con menos de 2 caracteres.
     * @param category Categoria del lector que delimita la API a consultar.
     * @param signal AbortSignal opcional para cancelar requests pendientes (debounce).
     */
    search(query: string, category: ReadingCategory, signal?: AbortSignal): Promise<ExternalSearchResult[]>;
}
