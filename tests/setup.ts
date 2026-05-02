/**
 * Setup global de Vitest. Se ejecuta antes de cada archivo de tests.
 *
 * - Extiende `expect` con los matchers de @testing-library/jest-dom
 *   (toBeInTheDocument, toHaveClass, etc.).
 * - Polyfills de APIs que jsdom no provee (matchMedia, IntersectionObserver,
 *   ResizeObserver) y de las que dependen algunos componentes/hooks.
 * - Limpia el DOM y los mocks entre tests.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/preact';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

/**
 * Polyfill de localStorage / sessionStorage.
 *
 * Con Vitest 4 + jsdom 29 + Node 25, el Storage que provee jsdom queda
 * como objeto vacio sin la API estandar (.setItem / .clear). Reemplazamos
 * con una implementacion en memoria que cumple la interfaz Storage.
 * En cada cleanup() lo vaciamos para que los tests sean independientes.
 */
class MemoryStorage implements Storage {
    private readonly map = new Map<string, string>();
    get length() { return this.map.size; }
    clear(): void { this.map.clear(); }
    getItem(key: string): string | null { return this.map.has(key) ? this.map.get(key)! : null; }
    setItem(key: string, value: string): void { this.map.set(key, String(value)); }
    removeItem(key: string): void { this.map.delete(key); }
    key(index: number): string | null { return Array.from(this.map.keys())[index] ?? null; }
}

if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
        value: new MemoryStorage(),
        writable: true,
        configurable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
        value: new MemoryStorage(),
        writable: true,
        configurable: true,
    });
}

afterEach(() => {
    if (typeof window !== 'undefined') {
        window.localStorage.clear();
        window.sessionStorage.clear();
    }
});

// matchMedia: necesario para el detector de prefers-color-scheme en theme.ts
if (typeof window !== 'undefined' && !window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(), // legacy
            removeListener: vi.fn(), // legacy
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
}

// IntersectionObserver: algunos hooks futuros podrian usarlo
if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
    class MockIntersectionObserver {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
        takeRecords = vi.fn().mockReturnValue([]);
        root = null;
        rootMargin = '';
        thresholds = [];
    }
    (window as unknown as { IntersectionObserver: typeof MockIntersectionObserver }).IntersectionObserver = MockIntersectionObserver;
}

// ResizeObserver: idem
if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
    class MockResizeObserver {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
    }
    (window as unknown as { ResizeObserver: typeof MockResizeObserver }).ResizeObserver = MockResizeObserver;
}
