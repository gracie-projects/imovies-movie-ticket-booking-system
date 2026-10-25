import { ApiError } from '../utils/ApiError.js';

export const CONVENIENCE_FEE_PER_SEAT = 20;

/**
 * Calculates the authoritative price for the requested seats.
 * Prices always come from the database - never from the client.
 */
export function calculatePrice(showtime, screen, seatIds) {
  const validSeats = new Set(screen.allSeatIds());
  const invalid = seatIds.filter((id) => !validSeats.has(id));
  if (invalid.length) {
    throw ApiError.badRequest(`Seats do not exist in this screen: ${invalid.join(', ')}`);
  }

  const seats = seatIds.map((id) => {
    const type = screen.seatType(id);
    return { id, type, price: showtime.prices[type] };
  });
  const subtotal = seats.reduce((sum, seat) => sum + seat.price, 0);
  const convenienceFee = seats.length * CONVENIENCE_FEE_PER_SEAT;
  return { seats, subtotal, convenienceFee, total: subtotal + convenienceFee, currency: 'INR' };
}
