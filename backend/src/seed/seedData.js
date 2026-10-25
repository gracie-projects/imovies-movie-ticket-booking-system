import { env } from '../config/env.js';
import { User, Movie, Theater, Screen, Showtime, Booking } from '../models/index.js';
import { slugify } from '../utils/helpers.js';

// Demo-only credentials. Override them with environment variables for any public deployment.
export const DEMO_ACCOUNTS = {
  admin: {
    name: 'IMovies Admin',
    email: 'admin@imovies.test',
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
    role: 'admin',
  },
  user: {
    name: 'Demo Customer',
    email: 'demo@imovies.test',
    password: process.env.SEED_DEMO_PASSWORD || 'Demo@12345',
    role: 'user',
  },
};

// All titles, people and artwork are fictional and created for this project.
const MOVIES = [
  {
    title: 'Neon Horizon',
    tagline: 'The future has a pulse.',
    description:
      'In 2149, a courier who smuggles memories through a rain-soaked megacity discovers that one of her deliveries holds the key to switching off the city\'s artificial sun. Hunted by a corporation that controls the light itself, she must decide who deserves to see the dawn.',
    genres: ['Sci-Fi', 'Action'],
    languages: ['English', 'Hindi'],
    durationMins: 142,
    certificate: 'UA13+',
    rating: 8.4,
    director: 'Aarav Mehta',
    cast: ['Riya Kapoor', 'Daniel Okafor', 'Kabir Sethi', 'Mei Lin'],
    releaseOffsetDays: -12,
    status: 'now_showing',
  },
  {
    title: 'Monsoon Letters',
    tagline: 'Some promises arrive with the rain.',
    description:
      'A retired postman in coastal Kerala finds a bundle of undelivered letters from 1987 and sets out to deliver every one of them, reuniting a village with the words it never received.',
    genres: ['Drama', 'Romance'],
    languages: ['Hindi', 'Malayalam'],
    durationMins: 128,
    certificate: 'U',
    rating: 8.9,
    director: 'Meera Nair Iyer',
    cast: ['Sanjay Varma', 'Anika Thomas', 'Joseph Kurian'],
    releaseOffsetDays: -20,
    status: 'now_showing',
  },
  {
    title: "The Clockmaker's Heist",
    tagline: 'Every second is part of the plan.',
    description:
      'A gifted watchmaker assembles an unlikely crew to steal back the antique astronomical clock taken from his family - from inside the most secure auction house in Europe, during a sixty-minute power cut.',
    genres: ['Thriller', 'Crime'],
    languages: ['English'],
    durationMins: 118,
    certificate: 'UA',
    rating: 7.8,
    director: 'Elena Brandt',
    cast: ['Viktor Hale', 'Priya Raman', 'Lucas Moreau', 'Hana Sato'],
    releaseOffsetDays: -5,
    status: 'now_showing',
  },
  {
    title: 'Kaadu: Echoes of the Forest',
    tagline: 'The forest remembers.',
    description:
      'Two siblings follow their missing grandfather\'s trail into the Western Ghats and encounter a hidden tribe protecting an ancient seed vault from poachers and developers.',
    genres: ['Adventure', 'Drama'],
    languages: ['Tamil', 'Telugu', 'Hindi'],
    durationMins: 135,
    certificate: 'UA',
    rating: 8.1,
    director: 'Karthik Subramanian',
    cast: ['Nila Prakash', 'Arjun Reddy Rao', 'Devika Menon'],
    releaseOffsetDays: -8,
    status: 'now_showing',
  },
  {
    title: 'Laugh Track',
    tagline: 'Live, unscripted, completely out of control.',
    description:
      'A struggling stand-up comic accidentally becomes the producer of a national TV game show and has one week to stop it from becoming the biggest disaster in broadcasting history.',
    genres: ['Comedy'],
    languages: ['Hindi', 'English'],
    durationMins: 112,
    certificate: 'UA',
    rating: 7.2,
    director: 'Rohan Bhatia',
    cast: ['Vikram Joshi', 'Tara Fernandes', 'Imran Qureshi'],
    releaseOffsetDays: -3,
    status: 'now_showing',
  },
  {
    title: 'Paper Lanterns',
    tagline: 'Light the way home.',
    description:
      'An animated tale of a paper lantern that comes alive during a festival night and must guide a lost little girl back across the city before the last candle burns out.',
    genres: ['Animation', 'Family'],
    languages: ['English', 'Hindi'],
    durationMins: 96,
    certificate: 'U',
    rating: 8.6,
    director: 'Sophie Laurent',
    cast: ['Voices of Aditi Rao', 'Sam Whitaker', 'Lina Park'],
    releaseOffsetDays: -15,
    status: 'now_showing',
  },
  {
    title: 'Iron Valley',
    tagline: 'One town. One stand.',
    description:
      'When a mining company tries to flood a remote valley, a former army engineer rallies the villagers to defend their homes in a battle of wits, machines and courage.',
    genres: ['Action', 'Drama'],
    languages: ['Telugu', 'Hindi'],
    durationMins: 152,
    certificate: 'UA13+',
    rating: 0,
    director: 'Sai Charan Kumar',
    cast: ['Ravi Teja Naidu', 'Swathi Krishnan', 'Manoj Pillai'],
    releaseOffsetDays: 18,
    status: 'coming_soon',
  },
  {
    title: 'Silent Frequency',
    tagline: 'Do not answer the call.',
    description:
      'A late-night radio host starts receiving calls from listeners who claim to be broadcasting from the night of a storm thirty years ago - and they know her name.',
    genres: ['Horror', 'Mystery'],
    languages: ['English'],
    durationMins: 104,
    certificate: 'A',
    rating: 0,
    director: 'Nora Whitfield',
    cast: ['Claire Dunn', 'Omar Haddad', 'Isabel Cruz'],
    releaseOffsetDays: 30,
    status: 'coming_soon',
  },
];

const THEATERS = [
  {
    name: 'IMovies Grand Central',
    city: 'Indore',
    address: 'AB Road, Vijay Nagar, Indore, Madhya Pradesh 452010',
    amenities: ['Recliners', 'Dolby Atmos', 'Food Court', 'Parking'],
    screens: [
      { name: 'Audi 1', rows: 8, seatsPerRow: 12, premiumRows: ['G', 'H'], aisleAfter: [3, 9] },
      { name: 'Audi 2 - IMAX', rows: 9, seatsPerRow: 14, premiumRows: ['H', 'I'], aisleAfter: [4, 10] },
    ],
  },
  {
    name: 'IMovies Riverside Mall',
    city: 'Indore',
    address: 'Riverside Mall, MG Road, Indore, Madhya Pradesh 452001',
    amenities: ['Wheelchair Access', 'Dolby 7.1', 'Cafe'],
    screens: [{ name: 'Screen 1', rows: 7, seatsPerRow: 10, premiumRows: ['F', 'G'], aisleAfter: [5] }],
  },
];

// Local show start times (hours, minutes) in the seed time zone
const SLOTS = [
  [10, 0],
  [13, 30],
  [17, 0],
  [20, 45],
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight "today" in the configured seed time zone, expressed as a UTC Date */
function localMidnight(offsetMinutes) {
  const shifted = new Date(Date.now() + offsetMinutes * 60 * 1000);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - offsetMinutes * 60 * 1000);
}

/**
 * Clears all collections and loads deterministic demo data.
 * Showtimes are generated relative to "today" so the demo never goes stale.
 */
export async function seedDatabase({ days = 5 } = {}) {
  if (env.isProduction && !process.env.SEED_ADMIN_PASSWORD) {
    // The default admin password is public in the README, so it must never protect a live site
    throw new Error('Set SEED_ADMIN_PASSWORD before seeding a production database');
  }
  await Promise.all([User, Movie, Theater, Screen, Showtime, Booking].map((Model) => Model.deleteMany({})));

  for (const account of Object.values(DEMO_ACCOUNTS)) {
    const user = new User({ name: account.name, email: account.email, role: account.role });
    await user.setPassword(account.password);
    await user.save();
  }

  const now = Date.now();
  const movies = await Movie.insertMany(
    MOVIES.map(({ releaseOffsetDays, ...movie }) => {
      const slug = slugify(movie.title);
      return {
        ...movie,
        slug,
        releaseDate: new Date(now + releaseOffsetDays * DAY_MS),
        posterUrl: `/posters/${slug}.svg`,
        backdropUrl: `/posters/${slug}.svg`,
      };
    }),
  );

  const screens = [];
  for (const { screens: screenDefs, ...theaterData } of THEATERS) {
    const theater = await Theater.create(theaterData);
    for (const def of screenDefs) screens.push(await Screen.create({ ...def, theater: theater._id }));
  }

  const showtimes = buildSchedule(movies, screens, 0, days);
  await Showtime.insertMany(showtimes);

  return {
    users: Object.keys(DEMO_ACCOUNTS).length,
    movies: movies.length,
    theaters: THEATERS.length,
    screens: screens.length,
    showtimes: showtimes.length,
  };
}

/** Builds a deterministic schedule for days [fromDay, toDay) relative to today */
function buildSchedule(movies, screens, fromDay, toDay) {
  const nowShowing = movies.filter((m) => m.status === 'now_showing');
  if (!nowShowing.length || !screens.length) return [];
  const midnight = localMidnight(env.SEED_UTC_OFFSET_MINUTES);
  const showtimes = [];

  for (let day = fromDay; day < toDay; day += 1) {
    // Use the absolute day number so the rotation stays stable across restarts
    const dayNumber = Math.floor((midnight.getTime() + day * DAY_MS) / DAY_MS);
    screens.forEach((screen, screenIndex) => {
      SLOTS.forEach(([hour, minute], slotIndex) => {
        // Rotate movies across screens, slots and days for a varied but deterministic schedule
        const movie = nowShowing[(screenIndex * SLOTS.length + slotIndex + dayNumber) % nowShowing.length];
        const startTime = new Date(midnight.getTime() + day * DAY_MS + (hour * 60 + minute) * 60 * 1000);
        const isImax = screen.name.includes('IMAX');
        showtimes.push({
          movie: movie._id,
          theater: screen.theater,
          screen: screen._id,
          startTime,
          endTime: new Date(startTime.getTime() + movie.durationMins * 60 * 1000),
          language: movie.languages[(slotIndex + dayNumber) % movie.languages.length],
          format: isImax ? 'IMAX' : '2D',
          prices: isImax ? { standard: 320, premium: 480 } : { standard: 180, premium: 280 },
        });
      });
    });
  }
  return showtimes;
}

/**
 * Keeps a long-running demo deployment useful: adds the standard schedule for any of the
 * next `days` days that has no showtimes at all. Never deletes or changes existing data.
 */
export async function ensureUpcomingShowtimes({ days = 5 } = {}) {
  const [movies, screens] = await Promise.all([
    Movie.find({ status: 'now_showing' }).sort({ createdAt: 1 }),
    Screen.find().sort({ createdAt: 1 }),
  ]);
  const midnight = localMidnight(env.SEED_UTC_OFFSET_MINUTES);
  let added = 0;
  for (let day = 0; day < days; day += 1) {
    const from = new Date(midnight.getTime() + day * DAY_MS);
    const to = new Date(from.getTime() + DAY_MS);
    if (await Showtime.exists({ startTime: { $gte: from, $lt: to } })) continue;
    const showtimes = buildSchedule(movies, screens, day, day + 1);
    await Showtime.insertMany(showtimes);
    added += showtimes.length;
  }
  return added;
}
