import { test, expect } from '@playwright/test';
import { DEMO_USER, login, openFirstShowtime, selectAvailableSeats } from './helpers.js';

test.describe('Customer booking journey', () => {
  test('browse, search, choose seats, pay and see the booking in My Bookings', async ({ page }) => {
    // Home page and catalog
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Now Showing' })).toBeVisible();
    await page.getByRole('link', { name: 'Movies', exact: true }).click();
    await expect(page.getByTestId('movie-card')).toHaveCount(8);

    // Search and filter
    await page.getByLabel('Search by title').fill('neon');
    await expect(page.getByTestId('movie-card')).toHaveCount(1);
    await page.getByRole('button', { name: 'Clear' }).click();
    await page.getByLabel('Genre').selectOption('Comedy');
    await expect(page.getByTestId('movie-card')).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Laugh Track' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear' }).click();
    await page.getByLabel('Search by title').fill('Neon Horizon');
    await page.getByRole('link', { name: 'Neon Horizon' }).click();

    // Movie details and showtime
    await expect(page.getByRole('heading', { level: 1, name: 'Neon Horizon' })).toBeVisible();
    await expect(page.getByText('Aarav Mehta')).toBeVisible();
    await page.getByTestId('showtime-link').first().click();

    // Seat selection with live price
    await expect(page.getByRole('group', { name: 'Seat selection' })).toBeVisible();
    await expect(page.getByTestId('live-total')).toHaveText('₹0');
    const seats = await selectAvailableSeats(page, 2);
    await expect(page.getByTestId('selected-seats').locator('li')).toHaveCount(2);
    const liveTotal = await page.getByTestId('live-total').textContent();
    expect(liveTotal).not.toBe('₹0');

    // Anonymous users are sent to login and returned to checkout afterwards
    await page.getByRole('button', { name: /Proceed to checkout/ }).click();
    await expect(page).toHaveURL(/\/login\?redirect=/);
    await login(page, DEMO_USER);
    await expect(page).toHaveURL(/\/checkout\?/);

    // Checkout uses the server quote, which must match the live preview
    await expect(page.getByTestId('checkout-total')).toHaveText(liveTotal);
    await page.getByLabel('Credit / Debit card').check();
    await page.getByTestId('pay-button').click();

    // Confirmation + digital ticket
    await expect(page.getByTestId('confirmation-heading')).toHaveText('Booking confirmed!');
    const reference = (await page.getByTestId('booking-reference').textContent()).trim();
    expect(reference).toMatch(/^IMV-[A-Z0-9]{8}$/);
    for (const seat of seats) await expect(page.getByTestId('ticket-seats')).toContainText(seat);
    await expect(page.getByTestId('ticket-total')).toHaveText(liveTotal);

    // My Bookings history
    await page.getByRole('link', { name: 'Go to My Bookings' }).click();
    await expect(page.getByTestId('booking-row').filter({ hasText: reference })).toBeVisible();
  });

  test('a seat booked by someone else cannot be booked again', async ({ browser }) => {
    const alice = await browser.newContext();
    const bob = await browser.newContext();
    const pageA = await alice.newPage();
    const pageB = await bob.newPage();

    // Bob registers a fresh account
    await pageB.goto('/register');
    await pageB.getByLabel('Full name').fill('Bob Racer');
    await pageB.getByLabel('Email').fill(`bob${Date.now()}@example.com`);
    await pageB.getByLabel('Password', { exact: true }).fill('Racer1234');
    await pageB.getByLabel('Confirm password').fill('Racer1234');
    await pageB.getByRole('button', { name: 'Create account' }).click();
    await expect(pageB.getByRole('button', { name: /Bob/ })).toBeVisible();

    // Alice logs in and reaches checkout for a seat
    await pageA.goto('/login');
    await login(pageA, DEMO_USER);
    await expect(pageA.getByRole('button', { name: /Demo/ })).toBeVisible();
    await openFirstShowtime(pageA, 'paper-lanterns');
    const showUrl = pageA.url();
    const [seat] = await selectAvailableSeats(pageA, 1);
    await pageA.getByRole('button', { name: /Proceed to checkout/ }).click();
    await expect(pageA.getByTestId('pay-button')).toBeEnabled();

    // Bob grabs the same seat first
    await pageB.goto(`${showUrl}?seats=${seat}`);
    await expect(pageB.locator(`button[data-seat="${seat}"]`)).toHaveAttribute('data-state', 'selected');
    await pageB.getByRole('button', { name: /Proceed to checkout/ }).click();
    await pageB.getByTestId('pay-button').click();
    await expect(pageB.getByTestId('confirmation-heading')).toBeVisible();

    // Alice's payment is rejected with a clear message, and no booking is created for her
    await pageA.getByTestId('pay-button').click();
    await expect(pageA.getByTestId('seat-conflict')).toContainText(seat);
    await pageA.getByRole('link', { name: 'Choose different seats' }).click();
    await expect(pageA.locator(`button[data-seat="${seat}"]`)).toHaveAttribute('data-state', 'booked');

    await alice.close();
    await bob.close();
  });

  test('customers can cancel an upcoming booking', async ({ page }) => {
    await page.goto('/login');
    await login(page, DEMO_USER);
    await openFirstShowtime(page, 'monsoon-letters');
    await selectAvailableSeats(page, 1);
    await page.getByRole('button', { name: /Proceed to checkout/ }).click();
    await page.getByTestId('pay-button').click();
    const reference = (await page.getByTestId('booking-reference').textContent()).trim();

    await page.goto('/my-bookings');
    const row = page.getByTestId('booking-row').filter({ hasText: reference });
    await row.getByRole('button', { name: 'Cancel booking' }).click();
    await page.getByRole('button', { name: 'Yes, cancel' }).click();
    await expect(page.getByText(`Booking ${reference} cancelled`)).toBeVisible();
    await page.getByRole('tab', { name: /Past/ }).click();
    await expect(page.getByTestId('booking-row').filter({ hasText: reference })).toContainText('Cancelled');
  });
});
