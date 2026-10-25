import { Router } from 'express';
import { isDbReady } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';
import { validate } from '../middleware/validate.js';
import * as s from '../validators/schemas.js';
import * as auth from '../controllers/authController.js';
import * as movies from '../controllers/movieController.js';
import * as showtimes from '../controllers/showtimeController.js';
import * as bookings from '../controllers/bookingController.js';
import * as admin from '../controllers/adminController.js';

const router = Router();

// ---------- Health ----------
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() });
});
router.get('/health/ready', (_req, res) => {
  const ready = isDbReady();
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'unavailable', database: ready ? 'connected' : 'disconnected' });
});

// ---------- Auth ----------
router.post('/auth/register', authLimiter, validate(s.registerSchema), auth.register);
router.post('/auth/login', authLimiter, validate(s.loginSchema), auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', requireAuth, auth.me);
router.patch('/auth/me', requireAuth, validate(s.profileSchema), auth.updateProfile);
router.post('/auth/change-password', requireAuth, authLimiter, validate(s.changePasswordSchema), auth.changePassword);

// ---------- Catalog ----------
router.get('/movies', validate(s.movieQuerySchema, 'query'), movies.listMovies);
router.get('/movies/filters', movies.getFilters);
router.get('/movies/:idOrSlug', movies.getMovie);
router.get('/movies/:idOrSlug/showtimes', movies.getMovieShowtimes);
router.get('/showtimes/:id', showtimes.getShowtime);

// ---------- Bookings ----------
router.post('/bookings/quote', requireAuth, validate(s.quoteSchema), bookings.quote);
router.post('/bookings', requireAuth, validate(s.bookingSchema), bookings.create);
router.get('/bookings/me', requireAuth, bookings.listMine);
router.get('/bookings/:id', requireAuth, bookings.getOne);
router.patch('/bookings/:id/cancel', requireAuth, bookings.cancel);

// ---------- Admin ----------
const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin'));

adminRouter.get('/stats', admin.stats);

adminRouter.get('/movies', admin.listMovies);
adminRouter.post('/movies', validate(s.movieSchema), admin.createMovie);
adminRouter.put('/movies/:id', validate(s.movieSchema), admin.updateMovie);
adminRouter.delete('/movies/:id', admin.deleteMovie);

adminRouter.get('/theaters', admin.listTheaters);
adminRouter.post('/theaters', validate(s.theaterSchema), admin.createTheater);
adminRouter.put('/theaters/:id', validate(s.theaterSchema), admin.updateTheater);
adminRouter.delete('/theaters/:id', admin.deleteTheater);

adminRouter.post('/screens', validate(s.screenSchema), admin.createScreen);
adminRouter.put('/screens/:id', validate(s.screenSchema), admin.updateScreen);
adminRouter.delete('/screens/:id', admin.deleteScreen);

adminRouter.get('/showtimes', admin.listShowtimes);
adminRouter.post('/showtimes', validate(s.showtimeSchema), admin.createShowtime);
adminRouter.put('/showtimes/:id', validate(s.showtimeSchema), admin.updateShowtime);
adminRouter.delete('/showtimes/:id', admin.deleteShowtime);

adminRouter.get('/bookings', validate(s.adminBookingQuerySchema, 'query'), admin.listBookings);

router.use('/admin', adminRouter);

export default router;
