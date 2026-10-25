// Records a narrated video walkthrough of the REAL running IMovies application.
//
// 1. Start the app (from the repository root):   npm run start:demo
// 2. In another terminal (from e2e/):              npm run record-demo
//
// Options (environment variables):
//   DEMO_BASE_URL   app URL to record            (default http://localhost:5000)
//   DEMO_HEADED     "true" to watch it live       (default headless)
//
// Every step is verified with assertions. If anything fails, a screenshot and
// log are saved to output/demo/ and the script exits with an error.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = (process.env.DEMO_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
const OUT_DIR = path.join(__dirname, 'output', 'demo');
const RAW_VIDEO_DIR = path.join(OUT_DIR, 'raw');
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'screenshots');
const FINAL_VIDEO = path.join(OUT_DIR, 'IMovies_Project_Demo.webm');
const SIZE = { width: 1280, height: 720 };

const DEMO_USER = { email: 'demo@imovies.test', password: process.env.SEED_DEMO_PASSWORD || 'Demo@12345' };
const ADMIN_USER = { email: 'admin@imovies.test', password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345' };

const log = [];
function step(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  log.push(line);
  console.log(line);
}

async function assertReachable() {
  try {
    const res = await fetch(`${BASE_URL}/api/health/ready`);
    const body = await res.json();
    if (!res.ok || body.status !== 'ready') throw new Error(`readiness returned ${res.status}`);
    const page = await fetch(BASE_URL);
    if (!page.ok) throw new Error(`frontend returned ${page.status}`);
  } catch (err) {
    console.error(`IMovies is not reachable at ${BASE_URL} (${err.message}).`);
    console.error('Start it first with "npm run start:demo" from the repository root, or set DEMO_BASE_URL.');
    process.exit(1);
  }
}

/** Shows a caption bar at the bottom of the page (re-created after full page loads) */
async function caption(page, title, subtitle = '') {
  await page.evaluate(
    ([t, s]) => {
      let bar = document.getElementById('demo-caption');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'demo-caption';
        bar.setAttribute('aria-hidden', 'true');
        Object.assign(bar.style, {
          position: 'fixed', left: '50%', bottom: '22px', transform: 'translateX(-50%)', zIndex: 99999,
          background: 'rgba(10,10,18,0.92)', border: '1px solid #f5c518', borderRadius: '14px',
          padding: '10px 22px', color: '#fff', fontFamily: 'Inter, Segoe UI, sans-serif', textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,.6)', maxWidth: '86%', pointerEvents: 'none',
        });
        document.body.appendChild(bar);
      }
      bar.innerHTML = `<div style="font-weight:700;font-size:20px;color:#f5c518">${t}</div>${s ? `<div style="font-size:15px;margin-top:2px;opacity:.9">${s}</div>` : ''}`;
    },
    [title, subtitle],
  );
}

const pause = (page, ms = 1600) => page.waitForTimeout(ms);

async function shot(page, name) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`) });
  step(`screenshot saved: screenshots/${name}.png`);
}

async function smoothScroll(page, y) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'smooth' }), y);
  await pause(page, 1200);
}

async function run() {
  await assertReachable();
  fs.rmSync(RAW_VIDEO_DIR, { recursive: true, force: true });
  fs.mkdirSync(RAW_VIDEO_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: process.env.DEMO_HEADED !== 'true' });
  const context = await browser.newContext({
    viewport: SIZE,
    deviceScaleFactor: 1,
    recordVideo: { dir: RAW_VIDEO_DIR, size: SIZE },
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  page.on('pageerror', (err) => step(`browser error: ${err.message}`));
  let failed = null;

  try {
    // 1. Home
    step('Opening the home page');
    await page.goto(BASE_URL);
    await expect(page.getByRole('heading', { name: 'Now Showing' })).toBeVisible();
    await caption(page, 'IMovies - Movie ticket booking made simple', 'MERN stack: React + Express + MongoDB');
    await pause(page, 2500);
    await shot(page, '01-home');
    await smoothScroll(page, 520);
    await caption(page, 'Now Showing & Coming Soon', 'Live data from the Express + MongoDB API');
    await pause(page, 2000);
    await smoothScroll(page, 1100);
    await pause(page, 1200);

    // 2. Catalog
    step('Browsing the movie catalog');
    await page.getByRole('link', { name: 'Movies', exact: true }).first().click();
    await expect(page.getByTestId('movie-card')).toHaveCount(8);
    await caption(page, 'Movie catalog', '8 movies loaded from the database');
    await pause(page, 2000);
    await shot(page, '02-catalog');

    // 3. Search + filter
    step('Filtering by genre and searching by title');
    await caption(page, 'Filter by genre', 'Genre: Sci-Fi');
    await page.getByLabel('Genre').selectOption('Sci-Fi');
    await expect(page.getByTestId('movie-card')).toHaveCount(1);
    await pause(page, 1800);
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByTestId('movie-card')).toHaveCount(8);
    await caption(page, 'Search by title', 'Typing "neon"');
    await page.getByLabel('Search by title').pressSequentially('neon', { delay: 140 });
    await expect(page.getByTestId('movie-card')).toHaveCount(1);
    await pause(page, 1500);
    await shot(page, '03-search');

    // 4. Movie details
    step('Opening the movie details page');
    await page.getByRole('link', { name: 'Neon Horizon' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Neon Horizon' })).toBeVisible();
    await caption(page, 'Movie details', 'Duration, cast, director, release date and languages');
    await pause(page, 2500);
    await shot(page, '04-movie-details');

    // 5. Theater, date and showtime
    step('Choosing a date, theater and showtime');
    await smoothScroll(page, 380);
    const dateTabs = page.getByTestId('date-tab');
    await expect(dateTabs.first()).toBeVisible();
    await caption(page, 'Pick a date, theater and showtime', 'Seats left and starting price shown for every show');
    if ((await dateTabs.count()) > 1) {
      await dateTabs.nth(1).click();
      await pause(page, 1500);
    }
    await expect(page.getByTestId('showtime-link').first()).toBeVisible();
    await pause(page, 1200);
    await shot(page, '05-showtimes');
    await page.getByTestId('showtime-link').first().click();
    await page.waitForURL(/\/booking\//);
    const seatPageUrl = page.url();

    // 6. Seat layout
    step('Viewing the seat layout');
    await expect(page.getByRole('group', { name: 'Seat selection' })).toBeVisible();
    await caption(page, 'Interactive seat map', 'Classic & premium seats - booked seats cannot be selected');
    await pause(page, 2500);

    // 7. Select available seats (only seats the server reports as available)
    step('Selecting available seats');
    const available = page.locator('button.seat[data-state="available"]');
    const total = await available.count();
    if (total < 3) throw new Error('Not enough available seats for the demo; reseed the database.');
    // One classic seat pair from the middle of the hall + one premium seat when available
    const picks = [];
    const middle = available.nth(Math.floor(total / 3));
    picks.push(await middle.getAttribute('data-seat'));
    const premium = page.locator('button.seat.premium[data-state="available"]');
    if (await premium.count()) picks.push(await premium.nth(Math.floor((await premium.count()) / 2)).getAttribute('data-seat'));
    else picks.push(await available.nth(Math.floor(total / 3) + 1).getAttribute('data-seat'));

    await caption(page, 'Selecting seats', `Seats ${picks.join(' & ')}`);
    for (const id of picks) {
      const seat = page.locator(`button[data-seat="${id}"]`);
      await seat.scrollIntoViewIfNeeded();
      await seat.hover();
      await pause(page, 500);
      await seat.click();
      await expect(seat).toHaveAttribute('data-state', 'selected');
      await pause(page, 900);
    }

    // 8. Live price
    step('Reviewing the live price');
    const liveTotal = (await page.getByTestId('live-total').textContent()).trim();
    if (liveTotal === '₹0') throw new Error('Live total did not update');
    await caption(page, 'Live price calculation', `Tickets + convenience fee = ${liveTotal}`);
    await page.getByTestId('live-total').scrollIntoViewIfNeeded();
    await pause(page, 2500);
    await shot(page, '06-seat-selection');

    // Login (redirected because checkout is a protected route)
    step('Proceeding to checkout - redirected to login');
    await page.getByRole('button', { name: /Proceed to checkout/ }).click();
    await expect(page).toHaveURL(/\/login/);
    await caption(page, 'Protected route', 'Log in with the seeded demo customer account');
    await page.getByLabel('Email').pressSequentially(DEMO_USER.email, { delay: 40 });
    await page.getByLabel('Password').fill(DEMO_USER.password);
    await pause(page, 900);
    await shot(page, '07-login');
    await page.getByRole('button', { name: 'Log in' }).click();

    // 9. Checkout
    step('Completing the simulated checkout');
    await expect(page.getByTestId('checkout-total')).toHaveText(liveTotal);
    await caption(page, 'Checkout - price confirmed by the server', 'Simulated payment: no real card details are collected');
    await pause(page, 2500);
    await shot(page, '08-checkout');
    await page.getByLabel('Credit / Debit card').check();
    await pause(page, 1000);
    await page.getByTestId('pay-button').click();

    // 10. Confirmation + ticket
    step('Viewing the confirmation and digital ticket');
    await expect(page.getByTestId('confirmation-heading')).toHaveText('Booking confirmed!');
    const reference = (await page.getByTestId('booking-reference').textContent()).trim();
    for (const id of picks) await expect(page.getByTestId('ticket-seats')).toContainText(id);
    await expect(page.getByTestId('ticket-total')).toHaveText(liveTotal);
    await caption(page, 'Booking confirmed!', `Unique reference ${reference} with a QR-code ticket`);
    await pause(page, 2500);
    await shot(page, '09-confirmation');
    await smoothScroll(page, 420);
    await pause(page, 1500);

    // 11-12. My Bookings
    step('Opening My Bookings');
    await page.getByRole('link', { name: 'Go to My Bookings' }).click();
    const row = page.getByTestId('booking-row').filter({ hasText: reference });
    await expect(row).toBeVisible();
    await row.scrollIntoViewIfNeeded();
    await caption(page, 'My Bookings', `Booking ${reference} appears in the upcoming history`);
    await row.evaluate((el) => { el.style.outline = '3px solid #f5c518'; el.style.outlineOffset = '4px'; });
    await pause(page, 3000);
    await shot(page, '10-my-bookings');

    // The booked seats are now unavailable to other customers
    step('Showing that the seats are now booked');
    await page.goto(seatPageUrl);
    for (const id of picks) await expect(page.locator(`button[data-seat="${id}"]`)).toHaveAttribute('data-state', 'booked');
    await page.locator(`button[data-seat="${picks[0]}"]`).scrollIntoViewIfNeeded();
    await caption(page, 'Seats are now locked', `${picks.join(' & ')} show as booked - double booking is prevented by the server`);
    await pause(page, 3000);

    // 13. Admin dashboard
    step('Switching to the admin account');
    await page.getByRole('button', { name: /Demo/ }).click();
    await page.getByText('Log out').click();
    await page.goto(`${BASE_URL}/login`);
    await caption(page, 'Admin dashboard', 'Logging in as administrator');
    await page.getByLabel('Email').fill(ADMIN_USER.email);
    await page.getByLabel('Password').fill(ADMIN_USER.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
    await expect(page.getByTestId('stat-revenue')).toBeVisible();
    await caption(page, 'Admin overview', 'Revenue, bookings, customers and top movies');
    await pause(page, 3000);
    await shot(page, '11-admin-overview');

    for (const [tab, title, sub, name] of [
      ['Movies', 'Movie management', 'Add, edit, archive or delete movies', '12-admin-movies'],
      ['Theaters & Screens', 'Theater & screen management', 'Seat layouts and premium rows per screen', '13-admin-theaters'],
      ['Showtimes', 'Showtime management', 'Overlap checks and safe edits for booked shows', '14-admin-showtimes'],
    ]) {
      await page.getByRole('tab', { name: tab }).click();
      await page.waitForLoadState('networkidle');
      await caption(page, title, sub);
      await pause(page, 2200);
      await shot(page, name);
    }

    await page.getByRole('tab', { name: 'Bookings' }).click();
    await page.getByLabel('Search by booking reference').pressSequentially(reference, { delay: 60 });
    await expect(page.getByRole('cell', { name: reference })).toBeVisible();
    await caption(page, 'Booking overview', `Customer booking ${reference} found by reference`);
    await pause(page, 3000);
    await shot(page, '15-admin-bookings');

    await page.goto(BASE_URL);
    await caption(page, 'Thank you for watching!', 'IMovies - Movie ticket booking made simple');
    await pause(page, 3000);
    step(`Demo completed successfully (booking ${reference}, seats ${picks.join(', ')}, total ${liveTotal})`);
  } catch (err) {
    failed = err;
    step(`FAILED: ${err.message}`);
    await page.screenshot({ path: path.join(OUT_DIR, 'failure.png'), fullPage: true }).catch(() => {});
  }

  const video = page.video();
  await context.close(); // finalises the video file
  await browser.close();

  const rawPath = await video.path();
  if (failed) {
    fs.copyFileSync(rawPath, path.join(OUT_DIR, 'failed-run.webm'));
  } else {
    fs.copyFileSync(rawPath, FINAL_VIDEO);
  }
  fs.rmSync(RAW_VIDEO_DIR, { recursive: true, force: true });
  fs.writeFileSync(path.join(OUT_DIR, 'demo-log.txt'), `${log.join('\n')}\n`);

  if (failed) {
    console.error(`\nDemo failed. See ${path.join(OUT_DIR, 'failure.png')} and demo-log.txt`);
    process.exit(1);
  }
  const sizeMb = (fs.statSync(FINAL_VIDEO).size / 1024 / 1024).toFixed(1);
  console.log(`\nVideo saved: ${FINAL_VIDEO} (${sizeMb} MB)`);
  console.log(`Screenshots: ${SCREENSHOT_DIR}`);
  console.log(`Log:         ${path.join(OUT_DIR, 'demo-log.txt')}`);
}

run();
