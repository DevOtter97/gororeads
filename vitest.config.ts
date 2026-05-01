import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

/**
 * Vitest config para el proyecto.
 *
 * Configuracion manual con el plugin oficial de Preact (en vez de heredar
 * de astro/config via getViteConfig) porque getViteConfig pasa el flag
 * experimental --localstorage-file de Node 22+ a Vitest, lo que rompe
 * el localStorage de jsdom (.clear / .removeItem dejan de ser funciones).
 *
 * Con el plugin de Preact directo conseguimos JSX/TSX + alias internos,
 * que es lo unico que necesitan los tests unitarios.
 */
export default defineConfig({
    plugins: [preact()],
    test: {
        globals: true, // describe/it/expect disponibles sin importar
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        // Excluye los e2e (los corre Playwright) y node_modules
        exclude: ['**/node_modules/**', '**/dist/**', '**/.{idea,git,cache,output,temp}/**', 'tests/e2e/**'],
        // Tests co-localizados (*.test.ts/*.test.tsx) o en tests/unit/
        include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/unit/**/*.{test,spec}.{ts,tsx}'],
        css: false, // los <style>{`...`}</style> de los componentes son strings, no nos hace falta procesarlos
    },
});
