import { describe, it, expect, beforeAll } from 'vitest';
import { client, reseed } from './helpers.js';
import { Showtime } from '../src/models/index.js';
import { ensureUpcomingShowtimes } from '../src/seed/seedData.js';

describe('Health and catalog API', () => {
  beforeAll(reseed);

  it('reports health and database readiness', async () => {
    const health = await client().get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body.status).toBe('ok');
    const ready = await client().get('/api/health/ready');
    expect(ready.status).toBe(200);
    expect(ready.body.database).toBe('connected');
  });

  it('lists now showing and coming soon movies with pagination', async () => {
    const res = await client().get('/api/movies?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.movies).toHaveLength(5);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 5, total: 8, pages: 2 });

    const soon = await client().get('/api/movies?status=coming_soon');
    expect(soon.body.movies.every((m) => m.status === 'coming_soon')).toBe(true);
    expect(soon.body.movies).toHaveLength(2);
  });

  it('searches by title case-insensitively and treats regex characters literally', async () => {
    const res = await client().get('/api/movies?search=neon');
    expect(res.body.movies.map((m) => m.title)).toEqual(['Neon Horizon']);
    const weird = await client().get(`/api/movies?search=${encodeURIComponent('.*')}`);
    expect(weird.status).toBe(200);
    expect(weird.body.movies).toHaveLength(0);
  });

  it('filters by genre and language', async () => {
    const comedy = await client().get('/api/movies?genre=Comedy');
    expect(comedy.body.movies.map((m) => m.title)).toEqual(['Laugh Track']);
    const tamil = await client().get('/api/movies?language=Tamil');
    expect(tamil.body.movies.every((m) => m.languages.includes('Tamil'))).toBe(true);
    const both = await client().get('/api/movies?genre=Action&language=Telugu');
    expect(both.body.movies.map((m) => m.title)).toEqual(['Iron Valley']);
  });

  it('returns available filter values', async () => {
    const res = await client().get('/api/movies/filters');
    expect(res.body.genres).toContain('Sci-Fi');
    expect(res.body.languages).toContain('Hindi');
  });

  it('returns movie details by slug and 404 for unknown movies', async () => {
    const res = await client().get('/api/movies/neon-horizon');
    expect(res.status).toBe(200);
    expect(res.body.movie).toMatchObject({ title: 'Neon Horizon', director: 'Aarav Mehta' });
    expect((await client().get('/api/movies/does-not-exist')).status).toBe(404);
  });

  it('returns only upcoming showtimes with seat availability', async () => {
    const res = await client().get('/api/movies/neon-horizon/showtimes');
    expect(res.status).toBe(200);
    expect(res.body.showtimes.length).toBeGreaterThan(0);
    const now = Date.now();
    for (const s of res.body.showtimes) {
      expect(new Date(s.startTime).getTime()).toBeGreaterThan(now);
      expect(s.seatsLeft).toBe(s.capacity);
      expect(s.theater.name).toBeTruthy();
    }
  });

  it('returns seat map data for a showtime', async () => {
    const list = await client().get('/api/movies/neon-horizon/showtimes');
    const id = list.body.showtimes[0]._id;
    const res = await client().get(`/api/showtimes/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.showtime.screen.rows).toBeGreaterThan(0);
    expect(res.body.showtime.bookedSeats).toEqual([]);
    expect((await client().get('/api/showtimes/not-an-id')).status).toBe(404);
  });

  it('autofills empty upcoming days without touching existing showtimes', async () => {
    const before = await Showtime.countDocuments();
    expect(await ensureUpcomingShowtimes()).toBe(0);
    const last = await Showtime.findOne().sort({ startTime: -1 });
    const dayStart = new Date(last.startTime.getTime() - 20 * 60 * 60 * 1000);
    const removed = await Showtime.deleteMany({ startTime: { $gte: dayStart } });
    expect(removed.deletedCount).toBeGreaterThan(0);
    expect(await ensureUpcomingShowtimes()).toBe(removed.deletedCount);
    expect(await Showtime.countDocuments()).toBe(before);
  });

  it('returns JSON 404 for unknown API routes', async () => {
    const res = await client().get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
