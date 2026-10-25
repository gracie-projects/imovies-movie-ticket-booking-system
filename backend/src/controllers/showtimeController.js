import { Showtime } from '../models/Showtime.js';
import { ApiError } from '../utils/ApiError.js';
import { assertObjectId } from '../utils/helpers.js';
import { CONVENIENCE_FEE_PER_SEAT } from '../services/pricing.js';

/** Seat map data for one show: layout, prices and currently booked seats */
export async function getShowtime(req, res) {
  assertObjectId(req.params.id, 'Showtime');
  const showtime = await Showtime.findById(req.params.id)
    .populate('movie', 'title slug posterUrl durationMins certificate genres')
    .populate('theater', 'name city address')
    .populate('screen', 'name rows seatsPerRow premiumRows aisleAfter');

  if (!showtime || showtime.status !== 'scheduled') throw ApiError.notFound('Showtime not found');

  res.json({
    success: true,
    showtime: {
      _id: showtime._id,
      startTime: showtime.startTime,
      endTime: showtime.endTime,
      language: showtime.language,
      format: showtime.format,
      prices: showtime.prices,
      bookedSeats: showtime.bookedSeats,
      movie: showtime.movie,
      theater: showtime.theater,
      screen: showtime.screen,
      convenienceFeePerSeat: CONVENIENCE_FEE_PER_SEAT,
      bookingOpen: showtime.startTime > new Date(),
    },
  });
}
