import request from 'supertest';
import { createApp } from '../src/app.js';
import { seedDatabase, DEMO_ACCOUNTS } from '../src/seed/seedData.js';
import { Showtime } from '../src/models/index.js';

export const app = createApp();

/** A cookie-keeping client that sends the CSRF header like the real frontend */
export function client() {
  const agent = request.agent(app);
  const withHeader = (method) => (url) => agent[method](url).set('X-Requested-With', 'XMLHttpRequest');
  return {
    get: withHeader('get'),
    post: withHeader('post'),
    put: withHeader('put'),
    patch: withHeader('patch'),
    delete: withHeader('delete'),
  };
}

export async function loginAs(role) {
  const c = client();
  const { email, password } = DEMO_ACCOUNTS[role];
  const res = await c.post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`Login failed for ${role}: ${res.status}`);
  return c;
}

export async function registerUser(email = `user${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.com`) {
  const c = client();
  const res = await c.post('/api/auth/register').send({ name: 'Test User', email, password: 'Password1' });
  if (res.status !== 201) throw new Error(`Register failed: ${res.status} ${res.body.message}`);
  return c;
}

export async function reseed() {
  return seedDatabase();
}

export async function upcomingShowtime() {
  return Showtime.findOne({ startTime: { $gt: new Date(Date.now() + 60 * 60 * 1000) } })
    .sort({ startTime: 1 })
    .populate('screen');
}

export function bookingPayload(showtime, seats, key = `key-${Math.random().toString(36).slice(2)}`) {
  return { showtimeId: showtime._id.toString(), seats, paymentMethod: 'upi', idempotencyKey: key };
}
