/**
 * Helpers para mostrar el tiempo relativo a una fecha en español.
 *
 * - `timeAgo(date)` -> formato largo "hace 3 min" / "ahora"
 * - `timeAgoCompact(date)` -> formato corto "3 min" / "ahora"
 *
 * Ambos rompen a fecha absoluta a partir de 7 dias (ej. "30 abr").
 */

const ABSOLUTE_DATE_OPTS: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
};

interface Buckets {
    seconds: number;
    minutes: number;
    hours: number;
    days: number;
}

function toBuckets(date: Date): Buckets {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    return { seconds, minutes, hours, days };
}

/** "hace 3 min" / "hace 2 h" / "hace 5 d" / "30 abr". */
export function timeAgo(date: Date): string {
    const { seconds, minutes, hours, days } = toBuckets(date);
    if (seconds < 60) return 'ahora';
    if (minutes < 60) return `hace ${minutes} min`;
    if (hours < 24) return `hace ${hours} h`;
    if (days < 7) return `hace ${days} d`;
    return date.toLocaleDateString('es-ES', ABSOLUTE_DATE_OPTS);
}

/** "3 min" / "2 h" / "5 d" / "30 abr". Util para metadatos compactos. */
export function timeAgoCompact(date: Date): string {
    const { seconds, minutes, hours, days } = toBuckets(date);
    if (seconds < 60) return 'ahora';
    if (minutes < 60) return `${minutes} min`;
    if (hours < 24) return `${hours} h`;
    if (days < 7) return `${days} d`;
    return date.toLocaleDateString('es-ES', ABSOLUTE_DATE_OPTS);
}
