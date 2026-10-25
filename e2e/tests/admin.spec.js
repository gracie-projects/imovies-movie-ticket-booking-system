import { test, expect } from '@playwright/test';
import { ADMIN_USER, DEMO_USER, login } from './helpers.js';

test.describe('Access control and admin dashboard', () => {
  test('protected pages redirect anonymous visitors to login', async ({ page }) => {
    await page.goto('/my-bookings');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fmy-bookings/);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin/);
  });

  test('customers cannot open the admin dashboard or call admin APIs', async ({ page }) => {
    await page.goto('/login?redirect=%2Fadmin');
    await login(page, DEMO_USER);
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);

    const status = await page.evaluate(async () => (await fetch('/api/admin/stats')).status);
    expect(status).toBe(403);
  });

  test('admin can view statistics and manage showtimes', async ({ page }) => {
    await page.goto('/login');
    await login(page, ADMIN_USER);
    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
    await expect(page.getByTestId('stat-movies')).toContainText('8');

    // Movies tab
    await page.getByRole('tab', { name: 'Movies' }).click();
    await expect(page.getByRole('cell', { name: 'Neon Horizon', exact: true })).toBeVisible();

    // Theaters tab
    await page.getByRole('tab', { name: 'Theaters & Screens' }).click();
    await expect(page.getByRole('heading', { name: /IMovies Grand Central/ })).toBeVisible();

    // Create a showtime late at night three days from now on the Riverside screen
    await page.getByRole('tab', { name: 'Showtimes' }).click();
    await page.getByRole('button', { name: 'Add showtime' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Movie').selectOption({ label: 'Laugh Track' });
    await dialog.getByLabel('Theater / screen').selectOption({ label: 'Screen 1' });
    const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    start.setHours(23, 50, 0, 0);
    const pad = (n) => String(n).padStart(2, '0');
    await dialog.getByLabel('Start time').fill(
      `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T23:50`,
    );
    await dialog.getByLabel('Standard price (₹)').fill('199');
    await dialog.getByRole('button', { name: 'Save showtime' }).click();
    await expect(page.getByText('Showtime saved.')).toBeVisible();
    await expect(page.getByRole('cell', { name: '₹199 / ₹300' })).toBeVisible();

    // Overlapping showtime on the same screen is rejected
    await page.getByRole('button', { name: 'Add showtime' }).click();
    await dialog.getByLabel('Movie').selectOption({ label: 'Laugh Track' });
    await dialog.getByLabel('Theater / screen').selectOption({ label: 'Screen 1' });
    await dialog.getByLabel('Start time').fill(
      `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T23:00`,
    );
    await dialog.getByRole('button', { name: 'Save showtime' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Screen is busy');
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    // Bookings tab
    await page.getByRole('tab', { name: 'Bookings' }).click();
    await expect(page.getByRole('heading', { name: /Bookings \(/ })).toBeVisible();
  });
});
