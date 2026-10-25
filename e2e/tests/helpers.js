import { expect } from '@playwright/test';

export const DEMO_USER = { email: 'demo@imovies.test', password: process.env.SEED_DEMO_PASSWORD || 'Demo@12345' };
export const ADMIN_USER = { email: 'admin@imovies.test', password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345' };

/** Submits the login form and waits until the session cookie is set */
export async function login(page, { email, password }) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const response = page.waitForResponse((res) => res.url().endsWith('/api/auth/login'));
  await page.getByRole('button', { name: 'Log in' }).click();
  expect((await response).status()).toBe(200);
}

export async function loginFromNavbar(page, account) {
  await page.goto('/login');
  await login(page, account);
  await expect(page.getByRole('button', { name: /^(Demo|IMovies)/ })).toBeVisible();
}

/** Opens a movie, picks the first showtime and returns once the seat map is visible */
export async function openFirstShowtime(page, slug = 'neon-horizon') {
  await page.goto(`/movies/${slug}`);
  await page.getByTestId('showtime-link').first().click();
  await expect(page.getByRole('group', { name: 'Seat selection' })).toBeVisible();
}

/** Selects `count` seats that the UI currently shows as available and returns their ids */
export async function selectAvailableSeats(page, count) {
  const seats = page.locator('button.seat[data-state="available"]');
  const ids = [];
  for (let i = 0; i < count; i += 1) {
    const seat = seats.first();
    const id = await seat.getAttribute('data-seat');
    await seat.click();
    await expect(page.locator(`button[data-seat="${id}"]`)).toHaveAttribute('data-state', 'selected');
    ids.push(id);
  }
  return ids;
}
