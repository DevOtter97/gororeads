import { test, expect } from '@playwright/test';

/**
 * Tests e2e de redirecciones de paginas privadas sin sesion.
 *
 * Las paginas que usan `useAuth({ redirectIfUnauthenticated: '/' })` deben
 * mandar al login a usuarios sin sesion. Probamos un par de rutas privadas
 * (dashboard, lists) para asegurar que la redireccion vive en el hook
 * compartido y no en cada pagina.
 */
test.describe('redirecciones de paginas privadas', () => {
    test('/dashboard redirige a / cuando no hay sesion', async ({ page }) => {
        await page.goto('/dashboard');
        // useAuth usa window.location.href = '/' al detectar !user, por lo que
        // termina cargando la home con el LoginForm.
        await expect(page).toHaveURL('/');
        await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();
    });

    test('/lists redirige a / cuando no hay sesion', async ({ page }) => {
        await page.goto('/lists');
        await expect(page).toHaveURL('/');
        await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();
    });

    test('/social redirige a / cuando no hay sesion', async ({ page }) => {
        await page.goto('/social');
        await expect(page).toHaveURL('/');
        await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();
    });
});
