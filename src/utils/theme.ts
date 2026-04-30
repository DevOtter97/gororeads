/**
 * Helpers para gestion del tema (system / light / dark).
 *
 * - 'system' (default): sigue la preferencia del SO via @media en CSS
 * - 'light' o 'dark': fuerza el tema, persiste en localStorage
 *
 * El script anti-FOUC en BaseLayout aplica el atributo data-theme
 * antes del primer render leyendo el mismo localStorage.
 */

export type ThemePref = 'system' | 'light' | 'dark';
const STORAGE_KEY = 'theme';

export function getThemePref(): ThemePref {
    if (typeof window === 'undefined') return 'system';
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        if (v === 'light' || v === 'dark') return v;
    } catch {
        // localStorage no disponible
    }
    return 'system';
}

export function setThemePref(pref: ThemePref): void {
    if (typeof window === 'undefined') return;
    const html = document.documentElement;
    if (pref === 'system') {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // ignore
        }
        delete html.dataset.theme;
    } else {
        try {
            localStorage.setItem(STORAGE_KEY, pref);
        } catch {
            // ignore
        }
        html.dataset.theme = pref;
    }
}
