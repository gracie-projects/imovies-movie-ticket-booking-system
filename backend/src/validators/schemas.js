import { z } from 'zod';
import mongoose from 'mongoose';
import { MOVIE_STATUSES, CERTIFICATES } from '../models/Movie.js';
import { FORMATS } from '../models/Showtime.js';

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid id');
const trimmed = (min, max, label = 'This field') =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(min, min === 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);
const stringList = z.array(z.string().trim().min(1).max(60)).max(20);

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

// ---------- Auth ----------
export const registerSchema = z.object({
  name: trimmed(2, 60, 'Name'),
  email: z.email('Enter a valid email address').trim().toLowerCase().max(120),
  password,
  phone: z.string().trim().max(20).optional().default(''),
});

export const loginSchema = z.object({
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required').max(72),
});

export const profileSchema = z.object({
  name: trimmed(2, 60, 'Name').optional(),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9+\-\s]*$/, 'Phone may contain digits, spaces, + and - only')
    .optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(72),
  newPassword: password,
});

// ---------- Movies ----------
export const movieQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  genre: z.string().trim().max(40).optional(),
  language: z.string().trim().max(40).optional(),
  status: z.enum(['now_showing', 'coming_soon', 'all']).optional().default('all'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
});

export const movieSchema = z.object({
  title: trimmed(1, 120, 'Title'),
  tagline: z.string().trim().max(160).optional().default(''),
  description: trimmed(10, 2000, 'Description'),
  genres: stringList.min(1, 'At least one genre is required'),
  languages: stringList.min(1, 'At least one language is required'),
  durationMins: z.coerce.number().int().min(30).max(300),
  certificate: z.enum(CERTIFICATES).optional().default('UA'),
  rating: z.coerce.number().min(0).max(10).optional().default(0),
  director: trimmed(2, 80, 'Director'),
  cast: stringList.optional().default([]),
  releaseDate: z.coerce.date(),
  posterUrl: z.string().trim().min(1).max(500),
  backdropUrl: z.string().trim().max(500).optional().default(''),
  status: z.enum(MOVIE_STATUSES).optional().default('now_showing'),
});

// ---------- Theaters & screens ----------
export const theaterSchema = z.object({
  name: trimmed(2, 100, 'Theater name'),
  city: trimmed(2, 60, 'City'),
  address: trimmed(5, 200, 'Address'),
  amenities: stringList.optional().default([]),
  isActive: z.boolean().optional().default(true),
});

export const screenSchema = z
  .object({
    theater: objectId,
    name: trimmed(1, 40, 'Screen name'),
    rows: z.coerce.number().int().min(1).max(26),
    seatsPerRow: z.coerce.number().int().min(1).max(30),
    premiumRows: z.array(z.string().trim().regex(/^[A-Z]$/, 'Rows are single capital letters')).optional().default([]),
    aisleAfter: z.array(z.coerce.number().int().min(1).max(29)).optional().default([]),
  })
  .refine(
    (s) => s.premiumRows.every((row) => row.charCodeAt(0) - 65 < s.rows),
    { message: 'Premium rows must exist in the screen', path: ['premiumRows'] },
  );

// ---------- Showtimes ----------
export const showtimeSchema = z
  .object({
    movie: objectId,
    screen: objectId,
    startTime: z.coerce.date(),
    language: trimmed(2, 40, 'Language'),
    format: z.enum(FORMATS).optional().default('2D'),
    prices: z.object({
      standard: z.coerce.number().min(0).max(5000),
      premium: z.coerce.number().min(0).max(5000),
    }),
  })
  .refine((s) => s.prices.premium >= s.prices.standard, {
    message: 'Premium price must be at least the standard price',
    path: ['prices', 'premium'],
  });

// ---------- Bookings ----------
const seatIds = z
  .array(z.string().trim().toUpperCase().regex(/^[A-Z]([1-9]|[12]\d|30)$/, 'Invalid seat id'))
  .min(1, 'Select at least one seat')
  .max(10, 'You can book at most 10 seats at a time')
  .refine((seats) => new Set(seats).size === seats.length, 'Duplicate seats selected');

export const quoteSchema = z.object({
  showtimeId: objectId,
  seats: seatIds,
});

export const bookingSchema = z.object({
  showtimeId: objectId,
  seats: seatIds,
  paymentMethod: z.enum(['card', 'upi', 'wallet']),
  idempotencyKey: z.string().trim().min(8).max(100),
});

export const adminBookingQuerySchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'all']).optional().default('all'),
  search: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
