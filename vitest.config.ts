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
        coverage: {
            provider: 'v8',
            // text -> consola en local; lcov -> formato estandar que SonarCloud lee.
            reporter: ['text', 'lcov'],
            reportsDirectory: 'coverage',
            // Solo medimos el codigo de la app, no los archivos de test ni los
            // de infraestructura del proyecto. Sonar usa este lcov para mostrar
            // % de cobertura en el dashboard y en cada PR.
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                '**/*.test.{ts,tsx}',
                '**/*.spec.{ts,tsx}',
                '**/*.d.ts',
                'src/env.d.ts',
                // Componentes Astro (no son TS analyzables aqui)
                'src/**/*.astro',
                // Tipos puros sin logica
                'src/domain/interfaces/**',
                'src/domain/entities/**',
            ],
        },
    },
});
