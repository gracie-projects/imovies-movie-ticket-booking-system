import mongoose from 'mongoose';
import { Movie } from '../models/Movie.js';
import { Showtime } from '../models/Showtime.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/helpers.js';

const SHOWTIME_WINDOW_DAYS = 7;

export async function listMovies(req, res) {
  const { search, genre, language, status, page, limit } = req.validatedQuery;
  const filter = { status: status === 'all' ? { $in: ['now_showing', 'coming_soon'] } : status };
  if (search) filter.title = { $regex: escapeRegex(search), $options: 'i' };
  if (genre) filter.genres = genre;
  if (language) filter.languages = language;

  const [movies, total] = await Promise.all([
    Movie.find(filter)
      .sort({ status: -1, releaseDate: -1, title: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Movie.countDocuments(filter),
  ]);

  res.json({
    success: true,
    movies,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
}

export async function getFilters(_req, res) {
  const active = { status: { $in: ['now_showing', 'coming_soon'] } };
  const [genres, languages] = await Promise.all([
    Movie.distinct('genres', active),
    Movie.distinct('languages', active),
  ]);
  res.json({ success: true, genres: genres.sort(), languages: languages.sort() });
}

async function findMovie(idOrSlug) {
  const filter = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() };
  const movie = await Movie.findOne({ ...filter, status: { $ne: 'archived' } });
  if (!movie) throw ApiError.notFound('Movie not found');
  return movie;
}

export async function getMovie(req, res) {
  const movie = await findMovie(req.params.idOrSlug);
  res.json({ success: true, movie });
}

/** Upcoming showtimes for the next week, grouped by theater on the client */
export async function getMovieShowtimes(req, res) {
  const movie = await findMovie(req.params.idOrSlug);
  const now = new Date();
  const until = new Date(now.getTime() + SHOWTIME_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const showtimes = await Showtime.find({
    movie: movie._id,
    status: 'scheduled',
    startTime: { $gt: now, $lte: until },
  })
    .sort({ startTime: 1 })
    .populate('theater', 'name city address amenities')
    .populate('screen', 'name rows seatsPerRow');

  const result = showtimes.map((s) => {
    const capacity = s.screen.rows * s.screen.seatsPerRow;
    return {
      _id: s._id,
      startTime: s.startTime,
      endTime: s.endTime,
      language: s.language,
      format: s.format,
      prices: s.prices,
      theater: s.theater,
      screen: { _id: s.screen._id, name: s.screen.name },
      seatsLeft: capacity - s.bookedSeats.length,
      capacity,
    };
  });

  res.json({ success: true, showtimes: result });
}
