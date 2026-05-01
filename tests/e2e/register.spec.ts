import { test, expect } from '@playwright/test';

/**
 * Tests e2e de /register.
 *
 * Flujo sin auth: la pagina renderiza el RegisterForm con sus 4 campos
 * (username, email, password, confirmPassword) y un footer con link a /.
 */
test.describe('/register', () => {
    test('renderiza el formulario completo', async ({ page }) => {
        await page.goto('/register');

        await expect(page.getByRole('heading', { name: 'Crea tu cuenta' })).toBeVisible();
        await expect(page.getByText('Empieza a organizar tus lecturas hoy')).toBeVisible();

        // Los 4 inputs del RegisterForm
        await expect(page.getByLabel('Usuario')).toBeVisible();
        await expect(page.getByLabel('Email')).toBeVisible();
        await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Confirmar Contraseña')).toBeVisible();

        await expect(page.getByRole('button', { name: 'Crear Cuenta' })).toBeVisible();
    });

    test('el link "Inicia sesión" lleva a /', async ({ page }) => {
        await page.goto('/register');
        await page.getByRole('link', { name: 'Inicia sesión' }).click();
        await expect(page).toHaveURL('/');
    });
});
