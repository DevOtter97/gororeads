import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config para tests e2e.
 *
 * - Solo tests del directorio tests/e2e (los unitarios los corre Vitest).
 * - webServer auto-arranca `npm run dev` y espera a que escuche en 4321.
 *   Si ya hay un dev server corriendo, lo reusa (`reuseExistingServer`).
 * - Por defecto solo Chromium para mantener la suite rápida; añadir Firefox
 *   o WebKit cuando haga falta cobertura adicional.
 */
export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:4321',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:4321',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});
