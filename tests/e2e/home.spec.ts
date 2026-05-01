import { test, expect } from '@playwright/test';

/**
 * Tests e2e de la pagina raiz (/).
 *
 * En un contexto sin sesion (browser limpio), `RootGate` debe resolver el
 * estado de auth y renderizar el LoginForm con su chrome.
 */
test.describe('/', () => {
    test('muestra el LoginForm cuando no hay sesion', async ({ page }) => {
        await page.goto('/');

        // El gate puede mostrar "Cargando..." brevemente. Esperamos el estado final.
        await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();
        await expect(page.getByText('Inicia sesión para gestionar tus lecturas')).toBeVisible();

        // Inputs del LoginForm
        await expect(page.getByLabel('Email o Usuario')).toBeVisible();
        await expect(page.getByLabel('Contraseña')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Iniciar Sesión' })).toBeVisible();

        // Footer con link a registro
        await expect(page.getByRole('link', { name: 'Regístrate aquí' })).toBeVisible();
    });

    test('el link "Regístrate aquí" lleva a /register', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();

        await page.getByRole('link', { name: 'Regístrate aquí' }).click();
        await expect(page).toHaveURL('/register');
    });
});
