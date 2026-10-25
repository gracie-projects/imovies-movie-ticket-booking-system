import { Booking } from '../models/Booking.js';
import { ApiError } from '../utils/ApiError.js';
import { assertObjectId } from '../utils/helpers.js';
import { createBooking, cancelBooking, quoteBooking, populateBooking } from '../services/bookingService.js';

export async function quote(req, res) {
  const result = await quoteBooking(req.body);
  res.json({ success: true, quote: result });
}

export async function create(req, res) {
  const { booking, replayed } = await createBooking({ user: req.user, ...req.body });
  const populated = await populateBooking(Booking.findById(booking._id));
  res.status(replayed ? 200 : 201).json({ success: true, replayed, booking: populated });
}

export async function listMine(req, res) {
  const bookings = await populateBooking(Booking.find({ user: req.user._id }).sort({ showStartTime: -1 }));
  const now = new Date();
  res.json({
    success: true,
    upcoming: bookings
      .filter((b) => b.status === 'confirmed' && b.showStartTime > now)
      .sort((a, b) => a.showStartTime - b.showStartTime),
    past: bookings.filter((b) => b.status !== 'confirmed' || b.showStartTime <= now),
  });
}

export async function getOne(req, res) {
  assertObjectId(req.params.id, 'Booking');
  const booking = await populateBooking(Booking.findById(req.params.id));
  // Respond 404 rather than 403 so other customers' booking ids are not revealed
  if (!booking || (!booking.user.equals(req.user._id) && req.user.role !== 'admin')) {
    throw ApiError.notFound('Booking not found');
  }
  res.json({ success: true, booking });
}

export async function cancel(req, res) {
  assertObjectId(req.params.id, 'Booking');
  const booking = await cancelBooking({ bookingId: req.params.id, user: req.user });
  const populated = await populateBooking(Booking.findById(booking._id));
  res.json({ success: true, booking: populated });
}
