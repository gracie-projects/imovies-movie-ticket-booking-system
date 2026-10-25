import { describe, it, expect, beforeEach } from 'vitest';
import { client, reseed, loginAs, upcomingShowtime, bookingPayload } from './helpers.js';
import { Movie, Screen, Theater } from '../src/models/index.js';

const newMovie = {
  title: 'Test Movie',
  description: 'A movie created by the admin test suite.',
  genres: ['Drama'],
  languages: ['English'],
  durationMins: 100,
  director: 'Test Director',
  releaseDate: '2026-01-01',
  posterUrl: '/posters/neon-horizon.svg',
};

describe('Admin API', () => {
  beforeEach(reseed);

  it('blocks anonymous users and customers from admin endpoints', async () => {
    expect((await client().get('/api/admin/stats')).status).toBe(401);
    const user = await loginAs('user');
    expect((await user.get('/api/admin/stats')).status).toBe(403);
    expect((await user.post('/api/admin/movies').send(newMovie)).status).toBe(403);
  });

  it('returns dashboard statistics', async () => {
    const user = await loginAs('user');
    const showtime = await upcomingShowtime();
    await user.post('/api/bookings').send(bookingPayload(showtime, ['A1', 'A2']));

    const admin = await loginAs('admin');
    const res = await admin.get('/api/admin/stats');
    expect(res.status).toBe(200);
    expect(res.body.stats).toMatchObject({ customers: 1, confirmedBookings: 1, ticketsSold: 2, movies: 8 });
    expect(res.body.stats.revenue).toBeGreaterThan(0);
    expect(res.body.stats.topMovies[0].tickets).toBe(2);
  });

  it('creates, updates and deletes a movie with a unique slug', async () => {
    const admin = await loginAs('admin');
    const created = await admin.post('/api/admin/movies').send(newMovie);
    expect(created.status).toBe(201);
    expect(created.body.movie.slug).toBe('test-movie');
    const again = await admin.post('/api/admin/movies').send(newMovie);
    expect(again.body.movie.slug).toBe('test-movie-2');

    const id = created.body.movie._id;
    const updated = await admin.put(`/api/admin/movies/${id}`).send({ ...newMovie, title: 'Renamed Movie' });
    expect(updated.body.movie.slug).toBe('renamed-movie');
    expect((await admin.delete(`/api/admin/movies/${id}`)).status).toBe(200);
    expect(await Movie.exists({ _id: id })).toBeNull();
  });

  it('validates movie input', async () => {
    const admin = await loginAs('admin');
    const res = await admin.post('/api/admin/movies').send({ ...newMovie, genres: [], durationMins: 5 });
    expect(res.status).toBe(400);
  });

  it('protects records that are linked to confirmed bookings', async () => {
    const user = await loginAs('user');
    const showtime = await upcomingShowtime();
    await user.post('/api/bookings').send(bookingPayload(showtime, ['B2']));
    const admin = await loginAs('admin');

    expect((await admin.delete(`/api/admin/movies/${showtime.movie}`)).status).toBe(409);
    expect((await admin.delete(`/api/admin/showtimes/${showtime._id}`)).status).toBe(409);
    expect((await admin.delete(`/api/admin/screens/${showtime.screen._id}`)).status).toBe(409);
    expect((await admin.delete(`/api/admin/theaters/${showtime.theater}`)).status).toBe(409);

    const movie = await Movie.findById(showtime.movie).lean();
    const archive = await admin.put(`/api/admin/movies/${movie._id}`).send({
      ...newMovie, title: movie.title, genres: movie.genres, languages: movie.languages, status: 'archived',
    });
    expect(archive.status).toBe(409);

    const moved = await admin.put(`/api/admin/showtimes/${showtime._id}`).send({
      movie: showtime.movie.toString(),
      screen: showtime.screen._id.toString(),
      startTime: new Date(showtime.startTime.getTime() + 30 * 60 * 1000).toISOString(),
      language: showtime.language,
      prices: showtime.prices,
    });
    expect(moved.status).toBe(409);
  });

  it('manages theaters, screens and showtimes and rejects overlapping shows', async () => {
    const admin = await loginAs('admin');
    const theater = await admin.post('/api/admin/theaters').send({
      name: 'Test Cinema', city: 'Bhopal', address: '1 Test Street, Bhopal',
    });
    expect(theater.status).toBe(201);
    const screen = await admin.post('/api/admin/screens').send({
      theater: theater.body.theater._id, name: 'Hall A', rows: 5, seatsPerRow: 8, premiumRows: ['E'],
    });
    expect(screen.status).toBe(201);
    const badScreen = await admin.post('/api/admin/screens').send({
      theater: theater.body.theater._id, name: 'Hall B', rows: 3, seatsPerRow: 8, premiumRows: ['Z'],
    });
    expect(badScreen.status).toBe(400);

    const movie = await Movie.findOne({ slug: 'neon-horizon' });
    const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const show = {
      movie: movie._id.toString(),
      screen: screen.body.screen._id,
      startTime: start.toISOString(),
      language: 'English',
      format: '2D',
      prices: { standard: 150, premium: 250 },
    };
    const created = await admin.post('/api/admin/showtimes').send(show);
    expect(created.status).toBe(201);
    expect(new Date(created.body.showtime.endTime).getTime()).toBe(start.getTime() + movie.durationMins * 60000);

    const overlap = await admin.post('/api/admin/showtimes').send({
      ...show, startTime: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
    });
    expect(overlap.status).toBe(409);
    const wrongLanguage = await admin.post('/api/admin/showtimes').send({
      ...show, language: 'French', startTime: new Date(start.getTime() + 6 * 60 * 60 * 1000).toISOString(),
    });
    expect(wrongLanguage.status).toBe(400);

    const list = await admin.get('/api/admin/theaters');
    expect(list.body.theaters.find((t) => t.name === 'Test Cinema').screens).toHaveLength(1);

    // No bookings yet, so the whole theater can be removed
    expect((await admin.delete(`/api/admin/theaters/${theater.body.theater._id}`)).status).toBe(200);
    expect(await Theater.exists({ name: 'Test Cinema' })).toBeNull();
    expect(await Screen.exists({ name: 'Hall A' })).toBeNull();
  });

  it('lists and searches bookings', async () => {
    const user = await loginAs('user');
    const showtime = await upcomingShowtime();
    const booked = await user.post('/api/bookings').send(bookingPayload(showtime, ['A3']));
    const admin = await loginAs('admin');
    const res = await admin.get(`/api/admin/bookings?search=${booked.body.booking.reference.slice(0, 7)}`);
    expect(res.status).toBe(200);
    expect(res.body.bookings).toHaveLength(1);
    expect(res.body.bookings[0].user.email).toBe('demo@imovies.test');
  });
});
