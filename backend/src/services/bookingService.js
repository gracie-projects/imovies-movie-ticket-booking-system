import crypto from 'node:crypto';
import { Booking } from '../models/Booking.js';
import { Showtime } from '../models/Showtime.js';
import { ApiError } from '../utils/ApiError.js';
import { generateBookingReference } from '../utils/helpers.js';
import { calculatePrice } from './pricing.js';

const BOOKING_POPULATE = [
  { path: 'movie', select: 'title slug posterUrl durationMins certificate languages genres' },
  { path: 'theater', select: 'name city address' },
  { path: 'screen', select: 'name' },
  { path: 'showtime', select: 'startTime endTime language format' },
];

export function populateBooking(query) {
  return query.populate(BOOKING_POPULATE);
}

async function loadBookableShowtime(showtimeId) {
  const showtime = await Showtime.findById(showtimeId).populate('screen');
  if (!showtime || showtime.status !== 'scheduled') throw ApiError.notFound('Showtime not found');
  if (showtime.startTime <= new Date()) {
    throw ApiError.badRequest('Bookings are closed because this show has already started');
  }
  return showtime;
}

export async function quoteBooking({ showtimeId, seats }) {
  const showtime = await loadBookableShowtime(showtimeId);
  const unavailable = seats.filter((id) => showtime.bookedSeats.includes(id));
  return { ...calculatePrice(showtime, showtime.screen, seats), unavailable };
}

/**
 * Creates a booking safely under concurrency:
 *  1. Replays an earlier result for the same idempotency key (double clicks, retries).
 *  2. Reserves seats with ONE conditional atomic update - it only matches when none
 *     of the requested seats are already booked, so two customers can never both win.
 *  3. Creates the booking document, releasing the seats again if that fails.
 */
export async function createBooking({ user, showtimeId, seats, paymentMethod, idempotencyKey }) {
  const existing = await Booking.findOne({ user: user._id, idempotencyKey });
  if (existing) return { booking: existing, replayed: true };

  const showtime = await loadBookableShowtime(showtimeId);
  const pricing = calculatePrice(showtime, showtime.screen, seats);

  const reserved = await Showtime.findOneAndUpdate(
    { _id: showtime._id, status: 'scheduled', bookedSeats: { $nin: seats } },
    { $addToSet: { bookedSeats: { $each: seats } } },
    { new: true },
  );

  if (!reserved) {
    // A concurrent duplicate request with the same key may have just won the seats
    const replay = await Booking.findOne({ user: user._id, idempotencyKey });
    if (replay) return { booking: replay, replayed: true };

    const latest = await Showtime.findById(showtime._id).select('bookedSeats');
    const conflictingSeats = seats.filter((id) => latest?.bookedSeats.includes(id));
    throw ApiError.conflict(
      `Sorry, ${conflictingSeats.join(', ') || 'some seats'} ${conflictingSeats.length === 1 ? 'was' : 'were'} just booked by another customer. Please choose different seats.`,
      { conflictingSeats },
    );
  }

  try {
    const booking = await Booking.create({
      reference: generateBookingReference(),
      user: user._id,
      showtime: showtime._id,
      movie: showtime.movie,
      theater: showtime.theater,
      screen: showtime.screen._id,
      showStartTime: showtime.startTime,
      seats: pricing.seats,
      subtotal: pricing.subtotal,
      convenienceFee: pricing.convenienceFee,
      total: pricing.total,
      currency: pricing.currency,
      paymentMethod,
      // Simulated payment - no real card or UPI details are ever collected
      paymentId: `SIM-${crypto.randomUUID()}`,
      idempotencyKey,
    });
    return { booking, replayed: false };
  } catch (err) {
    await Showtime.updateOne({ _id: showtime._id }, { $pullAll: { bookedSeats: seats } });
    if (err?.code === 11000 && err.keyPattern?.idempotencyKey) {
      const replay = await Booking.findOne({ user: user._id, idempotencyKey });
      if (replay) return { booking: replay, replayed: true };
    }
    throw err;
  }
}

export async function cancelBooking({ bookingId, user }) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound('Booking not found');
  const isOwner = booking.user.equals(user._id);
  if (!isOwner && user.role !== 'admin') throw ApiError.notFound('Booking not found');
  if (booking.status === 'cancelled') throw ApiError.conflict('This booking is already cancelled');
  if (booking.showStartTime <= new Date()) {
    throw ApiError.badRequest('Bookings cannot be cancelled after the show has started');
  }

  // Atomic status flip guarantees seats are released exactly once
  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, status: 'confirmed' },
    { $set: { status: 'cancelled', cancelledAt: new Date() } },
    { new: true },
  );
  if (!updated) throw ApiError.conflict('This booking is already cancelled');

  await Showtime.updateOne(
    { _id: booking.showtime },
    { $pullAll: { bookedSeats: booking.seats.map((seat) => seat.id) } },
  );
  return updated;
}
