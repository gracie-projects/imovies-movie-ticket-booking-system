import { Movie } from '../models/Movie.js';
import { Theater } from '../models/Theater.js';
import { Screen } from '../models/Screen.js';
import { Showtime } from '../models/Showtime.js';
import { Booking } from '../models/Booking.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { assertObjectId, escapeRegex, slugify } from '../utils/helpers.js';
import { populateBooking } from '../services/bookingService.js';

const CHANGEOVER_MINS = 15;

async function findOr404(Model, id, label) {
  assertObjectId(id, label);
  const doc = await Model.findById(id);
  if (!doc) throw ApiError.notFound(`${label} not found`);
  return doc;
}

/** Records referenced by confirmed bookings for shows that have not happened yet must not be removed. */
async function assertNoActiveBookings(filter, label) {
  const count = await Booking.countDocuments({ ...filter, status: 'confirmed', showStartTime: { $gt: new Date() } });
  if (count > 0) {
    throw ApiError.conflict(
      `This ${label} has ${count} upcoming confirmed booking${count === 1 ? '' : 's'} and cannot be changed this way.`,
    );
  }
}

// ---------------- Dashboard ----------------
export async function stats(_req, res) {
  const now = new Date();
  const [customers, movies, theaters, upcomingShows, bookingAgg, recentBookings, topMovies] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Movie.countDocuments({ status: { $ne: 'archived' } }),
    Theater.countDocuments({ isActive: true }),
    Showtime.countDocuments({ status: 'scheduled', startTime: { $gt: now } }),
    Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$total' },
          tickets: { $sum: { $size: '$seats' } },
        },
      },
    ]),
    populateBooking(Booking.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name email')),
    Booking.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: '$movie', tickets: { $sum: { $size: '$seats' } }, revenue: { $sum: '$total' } } },
      { $sort: { tickets: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'movies', localField: '_id', foreignField: '_id', as: 'movie' } },
      { $unwind: '$movie' },
      { $project: { _id: 0, movieId: '$_id', title: '$movie.title', tickets: 1, revenue: 1 } },
    ]),
  ]);

  const confirmed = bookingAgg.find((b) => b._id === 'confirmed') || { count: 0, revenue: 0, tickets: 0 };
  const cancelled = bookingAgg.find((b) => b._id === 'cancelled') || { count: 0 };

  res.json({
    success: true,
    stats: {
      customers,
      movies,
      theaters,
      upcomingShows,
      confirmedBookings: confirmed.count,
      cancelledBookings: cancelled.count,
      ticketsSold: confirmed.tickets,
      revenue: confirmed.revenue,
      recentBookings,
      topMovies,
    },
  });
}

// ---------------- Movies ----------------
export async function listMovies(_req, res) {
  const movies = await Movie.find().sort({ createdAt: -1 });
  res.json({ success: true, movies });
}

async function uniqueSlug(title, ignoreId) {
  const base = slugify(title) || 'movie';
  let slug = base;
  for (let i = 2; await Movie.exists({ slug, _id: { $ne: ignoreId } }); i += 1) slug = `${base}-${i}`;
  return slug;
}

export async function createMovie(req, res) {
  const movie = await Movie.create({ ...req.body, slug: await uniqueSlug(req.body.title) });
  res.status(201).json({ success: true, movie });
}

export async function updateMovie(req, res) {
  const movie = await findOr404(Movie, req.params.id, 'Movie');
  if (req.body.status === 'archived' && movie.status !== 'archived') {
    await assertNoActiveBookings({ movie: movie._id }, 'movie');
  }
  if (req.body.title !== movie.title) movie.slug = await uniqueSlug(req.body.title, movie._id);
  movie.set(req.body);
  await movie.save();
  res.json({ success: true, movie });
}

export async function deleteMovie(req, res) {
  const movie = await findOr404(Movie, req.params.id, 'Movie');
  if (await Booking.exists({ movie: movie._id })) {
    throw ApiError.conflict('This movie has booking history. Archive it instead of deleting it.');
  }
  await Showtime.deleteMany({ movie: movie._id });
  await movie.deleteOne();
  res.json({ success: true, message: 'Movie deleted' });
}

// ---------------- Theaters ----------------
export async function listTheaters(_req, res) {
  const [theaters, screens] = await Promise.all([Theater.find().sort({ name: 1 }), Screen.find().sort({ name: 1 })]);
  const result = theaters.map((t) => ({
    ...t.toJSON(),
    screens: screens.filter((s) => s.theater.equals(t._id)).map((s) => s.toJSON({ virtuals: true })),
  }));
  res.json({ success: true, theaters: result });
}

export async function createTheater(req, res) {
  const theater = await Theater.create(req.body);
  res.status(201).json({ success: true, theater });
}

export async function updateTheater(req, res) {
  const theater = await findOr404(Theater, req.params.id, 'Theater');
  if (req.body.isActive === false && theater.isActive) {
    await assertNoActiveBookings({ theater: theater._id }, 'theater');
  }
  theater.set(req.body);
  await theater.save();
  res.json({ success: true, theater });
}

export async function deleteTheater(req, res) {
  const theater = await findOr404(Theater, req.params.id, 'Theater');
  if (await Booking.exists({ theater: theater._id })) {
    throw ApiError.conflict('This theater has booking history. Deactivate it instead of deleting it.');
  }
  await Showtime.deleteMany({ theater: theater._id });
  await Screen.deleteMany({ theater: theater._id });
  await theater.deleteOne();
  res.json({ success: true, message: 'Theater deleted' });
}

// ---------------- Screens ----------------
export async function createScreen(req, res) {
  await findOr404(Theater, req.body.theater, 'Theater');
  const screen = await Screen.create(req.body);
  res.status(201).json({ success: true, screen });
}

export async function updateScreen(req, res) {
  const screen = await findOr404(Screen, req.params.id, 'Screen');
  if (!screen.theater.equals(req.body.theater)) throw ApiError.badRequest('A screen cannot move to another theater');
  const layoutChanged = ['rows', 'seatsPerRow'].some((key) => req.body[key] !== screen[key])
    || req.body.premiumRows.join() !== screen.premiumRows.join();
  if (layoutChanged) await assertNoActiveBookings({ screen: screen._id }, 'screen');
  screen.set(req.body);
  await screen.save();
  res.json({ success: true, screen });
}

export async function deleteScreen(req, res) {
  const screen = await findOr404(Screen, req.params.id, 'Screen');
  if (await Booking.exists({ screen: screen._id })) {
    throw ApiError.conflict('This screen has booking history and cannot be deleted.');
  }
  await Showtime.deleteMany({ screen: screen._id });
  await screen.deleteOne();
  res.json({ success: true, message: 'Screen deleted' });
}

// ---------------- Showtimes ----------------
export async function listShowtimes(req, res) {
  const filter = {};
  if (req.query.upcoming !== 'false') filter.startTime = { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) };
  const showtimes = await Showtime.find(filter)
    .sort({ startTime: 1 })
    .limit(300)
    .populate('movie', 'title durationMins')
    .populate('theater', 'name')
    .populate('screen', 'name rows seatsPerRow');
  res.json({ success: true, showtimes });
}

async function buildShowtime(body, ignoreId) {
  const [movie, screen] = await Promise.all([
    findOr404(Movie, body.movie, 'Movie'),
    findOr404(Screen, body.screen, 'Screen'),
  ]);
  if (movie.status === 'archived') throw ApiError.badRequest('Cannot schedule an archived movie');
  if (!movie.languages.includes(body.language)) {
    throw ApiError.badRequest(`Language must be one of: ${movie.languages.join(', ')}`);
  }

  const startTime = body.startTime;
  const endTime = new Date(startTime.getTime() + movie.durationMins * 60 * 1000);
  const buffer = CHANGEOVER_MINS * 60 * 1000;
  const clash = await Showtime.findOne({
    _id: { $ne: ignoreId },
    screen: screen._id,
    status: 'scheduled',
    startTime: { $lt: new Date(endTime.getTime() + buffer) },
    endTime: { $gt: new Date(startTime.getTime() - buffer) },
  }).populate('movie', 'title');
  if (clash) {
    throw ApiError.conflict(
      `Screen is busy: "${clash.movie?.title}" starts at ${clash.startTime.toISOString()} (15 min changeover required)`,
    );
  }

  return { ...body, theater: screen.theater, endTime };
}

export async function createShowtime(req, res) {
  if (req.body.startTime <= new Date()) throw ApiError.badRequest('Showtime must be in the future');
  const showtime = await Showtime.create(await buildShowtime(req.body));
  res.status(201).json({ success: true, showtime });
}

export async function updateShowtime(req, res) {
  const showtime = await findOr404(Showtime, req.params.id, 'Showtime');
  const scheduleChanged =
    !showtime.movie.equals(req.body.movie)
    || !showtime.screen.equals(req.body.screen)
    || showtime.startTime.getTime() !== req.body.startTime.getTime();
  if (scheduleChanged) await assertNoActiveBookings({ showtime: showtime._id }, 'showtime');
  // Price changes only affect new bookings; confirmed bookings keep the price they paid
  showtime.set(await buildShowtime(req.body, showtime._id));
  await showtime.save();
  res.json({ success: true, showtime });
}

export async function deleteShowtime(req, res) {
  const showtime = await findOr404(Showtime, req.params.id, 'Showtime');
  if (await Booking.exists({ showtime: showtime._id })) {
    throw ApiError.conflict('This showtime has bookings and cannot be deleted.');
  }
  await showtime.deleteOne();
  res.json({ success: true, message: 'Showtime deleted' });
}

// ---------------- Bookings ----------------
export async function listBookings(req, res) {
  const { status, search, page, limit } = req.validatedQuery;
  const filter = {};
  if (status !== 'all') filter.status = status;
  if (search) filter.reference = { $regex: `^${escapeRegex(search.toUpperCase())}` };

  const [bookings, total] = await Promise.all([
    populateBooking(
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'name email'),
    ),
    Booking.countDocuments(filter),
  ]);
  res.json({ success: true, bookings, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
}
