import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { timeAgo, timeAgoCompact } from './timeAgo';

/**
 * Tests para timeAgo / timeAgoCompact.
 *
 * Fijamos la fecha actual con vi.useFakeTimers para que los rangos
 * "menos de 60s", "menos de 60min" etc. sean deterministas.
 */
describe('timeAgo', () => {
    const NOW = new Date('2026-05-01T12:00:00Z');

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('devuelve "ahora" cuando la fecha es de hace menos de 1 minuto', () => {
        expect(timeAgo(new Date(NOW.getTime() - 30 * 1000))).toBe('ahora');
        expect(timeAgo(new Date(NOW.getTime() - 59 * 1000))).toBe('ahora');
    });

    it('devuelve minutos cuando la fecha es de hace 1-59 minutos', () => {
        expect(timeAgo(new Date(NOW.getTime() - 1 * 60 * 1000))).toBe('hace 1 min');
        expect(timeAgo(new Date(NOW.getTime() - 5 * 60 * 1000))).toBe('hace 5 min');
        expect(timeAgo(new Date(NOW.getTime() - 59 * 60 * 1000))).toBe('hace 59 min');
    });

    it('devuelve horas cuando la fecha es de hace 1-23 horas', () => {
        expect(timeAgo(new Date(NOW.getTime() - 1 * 60 * 60 * 1000))).toBe('hace 1 h');
        expect(timeAgo(new Date(NOW.getTime() - 5 * 60 * 60 * 1000))).toBe('hace 5 h');
        expect(timeAgo(new Date(NOW.getTime() - 23 * 60 * 60 * 1000))).toBe('hace 23 h');
    });

    it('devuelve dias cuando la fecha es de hace 1-6 dias', () => {
        expect(timeAgo(new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000))).toBe('hace 1 d');
        expect(timeAgo(new Date(NOW.getTime() - 6 * 24 * 60 * 60 * 1000))).toBe('hace 6 d');
    });

    it('devuelve fecha absoluta en español a partir de 7 dias', () => {
        const sevenDaysAgo = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000);
        // 24 abr 2026 (formato es-ES "day numeric, month short")
        const result = timeAgo(sevenDaysAgo);
        expect(result).toMatch(/24 abr/);
    });
});

describe('timeAgoCompact', () => {
    const NOW = new Date('2026-05-01T12:00:00Z');

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('devuelve "ahora" sin prefijo "hace"', () => {
        expect(timeAgoCompact(new Date(NOW.getTime() - 10 * 1000))).toBe('ahora');
    });

    it('devuelve numero + unidad sin prefijo "hace"', () => {
        expect(timeAgoCompact(new Date(NOW.getTime() - 5 * 60 * 1000))).toBe('5 min');
        expect(timeAgoCompact(new Date(NOW.getTime() - 3 * 60 * 60 * 1000))).toBe('3 h');
        expect(timeAgoCompact(new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000))).toBe('2 d');
    });

    it('cae a fecha absoluta a partir de 7 dias', () => {
        const result = timeAgoCompact(new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1000));
        expect(result).toMatch(/23 abr/);
    });
});
