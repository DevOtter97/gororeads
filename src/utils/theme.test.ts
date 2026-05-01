import { describe, it, expect, beforeEach } from 'vitest';
import { getThemePref, setThemePref } from './theme';

/**
 * Tests para getThemePref / setThemePref.
 *
 * Verifica:
 * - Default 'system' cuando no hay nada en localStorage
 * - Persistencia de 'light' y 'dark' en localStorage
 * - 'system' borra la entrada y limpia data-theme del html
 * - Valores invalidos en localStorage caen a 'system'
 */
describe('theme preferences', () => {
    beforeEach(() => {
        window.localStorage.clear();
        delete document.documentElement.dataset.theme;
    });

    describe('getThemePref', () => {
        it('devuelve "system" por defecto cuando no hay valor guardado', () => {
            expect(getThemePref()).toBe('system');
        });

        it('devuelve "light" si esta guardado', () => {
            window.localStorage.setItem('theme', 'light');
            expect(getThemePref()).toBe('light');
        });

        it('devuelve "dark" si esta guardado', () => {
            window.localStorage.setItem('theme', 'dark');
            expect(getThemePref()).toBe('dark');
        });

        it('cae a "system" si el valor guardado es invalido', () => {
            window.localStorage.setItem('theme', 'invalido');
            expect(getThemePref()).toBe('system');
        });
    });

    describe('setThemePref', () => {
        it('setear "light" guarda en localStorage y aplica data-theme', () => {
            setThemePref('light');
            expect(window.localStorage.getItem('theme')).toBe('light');
            expect(document.documentElement.dataset.theme).toBe('light');
        });

        it('setear "dark" guarda en localStorage y aplica data-theme', () => {
            setThemePref('dark');
            expect(window.localStorage.getItem('theme')).toBe('dark');
            expect(document.documentElement.dataset.theme).toBe('dark');
        });

        it('setear "system" borra el valor guardado y limpia data-theme', () => {
            // Primero ponemos algo concreto
            setThemePref('dark');
            expect(window.localStorage.getItem('theme')).toBe('dark');
            expect(document.documentElement.dataset.theme).toBe('dark');

            // Y ahora pasamos a system
            setThemePref('system');
            expect(window.localStorage.getItem('theme')).toBeNull();
            expect(document.documentElement.dataset.theme).toBeUndefined();
        });
    });
});
