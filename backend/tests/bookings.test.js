import { describe, it, expect, beforeEach } from 'vitest';
import { client, reseed, loginAs, registerUser, upcomingShowtime, bookingPayload } from './helpers.js';
import { Showtime, Booking } from '../src/models/index.js';
import { calculatePrice, CONVENIENCE_FEE_PER_SEAT } from '../src/services/pricing.js';

describe('Booking API', () => {
  let showtime;
  beforeEach(async () => {
    await reseed();
    showtime = await upcomingShowtime();
  });

  it('requires login to book', async () => {
    const res = await client().post('/api/bookings').send(bookingPayload(showtime, ['A1']));
    expect(res.status).toBe(401);
  });

  it('calculates prices on the server, ignoring any client supplied totals', async () => {
    const c = await loginAs('user');
    const premiumRow = showtime.screen.premiumRows[0];
    const res = await c.post('/api/bookings').send({
      ...bookingPayload(showtime, ['A1', `${premiumRow}2`]),
      total: 1,
      prices: { standard: 0 },
    });
    expect(res.status).toBe(201);
    const { booking } = res.body;
    const expectedSubtotal = showtime.prices.standard + showtime.prices.premium;
    expect(booking.subtotal).toBe(expectedSubtotal);
    expect(booking.convenienceFee).toBe(2 * CONVENIENCE_FEE_PER_SEAT);
    expect(booking.total).toBe(expectedSubtotal + 2 * CONVENIENCE_FEE_PER_SEAT);
    expect(booking.seats.map((s) => s.type)).toEqual(['standard', 'premium']);
    expect(booking.reference).toMatch(/^IMV-[A-Z0-9]{8}$/);
    expect(booking.paymentId).toMatch(/^SIM-/);
    expect(booking.idempotencyKey).toBeUndefined();
    expect(booking.movie.title).toBeTruthy();

    const stored = await Showtime.findById(showtime._id);
    expect(stored.bookedSeats.sort()).toEqual(['A1', `${premiumRow}2`].sort());
  });

  it('quotes a price without booking', async () => {
    const c = await loginAs('user');
    const res = await c.post('/api/bookings/quote').send({ showtimeId: showtime._id.toString(), seats: ['B3', 'B4'] });
    expect(res.status).toBe(200);
    expect(res.body.quote.total).toBe(2 * showtime.prices.standard + 2 * CONVENIENCE_FEE_PER_SEAT);
    expect(res.body.quote.unavailable).toEqual([]);
    expect(await Booking.countDocuments()).toBe(0);
  });

  it('rejects seats that do not exist, duplicates and too many seats', async () => {
    const c = await loginAs('user');
    const outside = await c.post('/api/bookings').send(bookingPayload(showtime, ['Z30']));
    expect(outside.status).toBe(400);
    const dup = await c.post('/api/bookings').send(bookingPayload(showtime, ['A1', 'A1']));
    expect(dup.status).toBe(400);
    const many = await c.post('/api/bookings').send(bookingPayload(showtime, Array.from({ length: 11 }, (_, i) => `C${i + 1}`)));
    expect(many.status).toBe(400);
  });

  it('rejects a seat already booked by another customer with 409', async () => {
    const alice = await loginAs('user');
    const bob = await registerUser();
    expect((await alice.post('/api/bookings').send(bookingPayload(showtime, ['D5', 'D6']))).status).toBe(201);
    const res = await bob.post('/api/bookings').send(bookingPayload(showtime, ['D6', 'D7']));
    expect(res.status).toBe(409);
    expect(res.body.details.conflictingSeats).toEqual(['D6']);
    // Bob's free seat D7 must not have been reserved by the failed attempt
    const stored = await Showtime.findById(showtime._id);
    expect(stored.bookedSeats).not.toContain('D7');
  });

  it('allows exactly one winner when many customers race for the same seat', async () => {
    const customers = await Promise.all(Array.from({ length: 8 }, () => registerUser()));
    const results = await Promise.all(
      customers.map((c) => c.post('/api/bookings').send(bookingPayload(showtime, ['E8']))),
    );
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(7);
    expect(await Booking.countDocuments({ showtime: showtime._id, 'seats.id': 'E8' })).toBe(1);
  });

  it('treats duplicate submissions with the same idempotency key as one booking', async () => {
    const c = await loginAs('user');
    const payload = bookingPayload(showtime, ['F1', 'F2'], 'double-click-key-123');
    const [first, second] = await Promise.all([c.post('/api/bookings').send(payload), c.post('/api/bookings').send(payload)]);
    expect([first.status, second.status].sort()).toEqual([200, 201]);
    expect(first.body.booking.reference).toBe(second.body.booking.reference);
    expect(await Booking.countDocuments()).toBe(1);
  });

  it('only lets the owner (or an admin) view and cancel a booking', async () => {
    const owner = await loginAs('user');
    const stranger = await registerUser();
    const admin = await loginAs('admin');
    const created = await owner.post('/api/bookings').send(bookingPayload(showtime, ['B1']));
    const id = created.body.booking._id;

    expect((await owner.get(`/api/bookings/${id}`)).status).toBe(200);
    expect((await stranger.get(`/api/bookings/${id}`)).status).toBe(404);
    expect((await admin.get(`/api/bookings/${id}`)).status).toBe(200);
    expect((await stranger.patch(`/api/bookings/${id}/cancel`)).status).toBe(404);

    const mine = await owner.get('/api/bookings/me');
    expect(mine.body.upcoming.map((b) => b._id)).toContain(id);
    const theirs = await stranger.get('/api/bookings/me');
    expect(theirs.body.upcoming).toHaveLength(0);
  });

  it('cancels a booking, releases its seats and refuses to cancel twice', async () => {
    const c = await loginAs('user');
    const created = await c.post('/api/bookings').send(bookingPayload(showtime, ['C1', 'C2']));
    const id = created.body.booking._id;

    const cancel = await c.patch(`/api/bookings/${id}/cancel`);
    expect(cancel.status).toBe(200);
    expect(cancel.body.booking.status).toBe('cancelled');
    expect((await Showtime.findById(showtime._id)).bookedSeats).not.toContain('C1');
    expect((await c.patch(`/api/bookings/${id}/cancel`)).status).toBe(409);

    // Released seats can be booked again
    const other = await registerUser();
    expect((await other.post('/api/bookings').send(bookingPayload(showtime, ['C1']))).status).toBe(201);
  });

  it('refuses bookings for shows that have already started', async () => {
    const past = await Showtime.findOneAndUpdate(
      { _id: showtime._id },
      { startTime: new Date(Date.now() - 60 * 1000) },
      { new: true },
    );
    const c = await loginAs('user');
    const res = await c.post('/api/bookings').send(bookingPayload(past, ['A1']));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already started/);
  });

  it('pricing service classifies premium rows', () => {
    const screen = showtime.screen;
    const result = calculatePrice({ prices: { standard: 100, premium: 150 } }, screen, ['A1', `${screen.premiumRows[0]}1`]);
    expect(result.subtotal).toBe(250);
    expect(result.total).toBe(250 + 2 * CONVENIENCE_FEE_PER_SEAT);
  });
});
