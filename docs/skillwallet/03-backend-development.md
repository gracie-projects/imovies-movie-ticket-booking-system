# Epic 3 — Backend Development

[← Task index](README.md)

---

## 10. Backend Structure

```text
backend/
├── package.json
├── vitest.config.js            test environment (in-memory MongoDB, fast bcrypt)
├── src/
│   ├── server.js               entry point: env check → DB → seed → listen → graceful shutdown
│   ├── app.js                  Express app: security middleware, routes, static frontend, errors
│   ├── config/
│   │   ├── env.js              reads and validates environment variables
│   │   └── db.js               connectDB / disconnectDB / isDbReady (Atlas, local or in-memory)
│   ├── models/                 Mongoose schemas (Model layer)
│   │   ├── User.js  Movie.js  Theater.js  Screen.js  Showtime.js  Booking.js
│   │   └── index.js
│   ├── routes/
│   │   └── index.js            every /api endpoint and the middleware chain for each
│   ├── middleware/
│   │   ├── auth.js             signToken, cookies, requireAuth, requireRole
│   │   ├── security.js         CSRF header check, rate limiters
│   │   ├── validate.js         zod validation middleware
│   │   └── errorHandler.js     404 + central error formatter
│   ├── validators/
│   │   └── schemas.js          zod schemas for every request body / query
│   ├── controllers/            HTTP layer (Controller)
│   │   ├── authController.js       register, login, logout, me, profile, change password
│   │   ├── movieController.js      catalog list, filters, details, showtimes per movie
│   │   ├── showtimeController.js   seat-map data for one show
│   │   ├── bookingController.js    quote, create, my bookings, view, cancel
│   │   └── adminController.js      stats + CRUD for movies, theaters, screens, showtimes, bookings
│   ├── services/               business rules
│   │   ├── pricing.js              authoritative price calculation
│   │   └── bookingService.js       atomic, idempotent booking and cancellation
│   ├── seed/
│   │   ├── seedData.js             demo movies, theaters, screens, showtimes, accounts
│   │   └── seed.js                 CLI: npm run seed
│   └── utils/
│       ├── ApiError.js             error class with HTTP status
│       ├── helpers.js              booking reference, slugify, regex escape, pagination
│       └── logger.js               pino logger with secret redaction
└── tests/                      Vitest + Supertest (40 tests)
    ├── auth.test.js  movies.test.js  bookings.test.js  admin.test.js
    └── helpers.js  setup.js
```

**Request lifecycle:** `app.js` security middleware → `routes/index.js` → `requireAuth` / `requireRole` → `validate(schema)` → controller → service → model → JSON response, or `errorHandler` if anything fails.

---

## 11. Development and Explanation

### 11.1 REST API endpoints

| Area | Method & path | Access |
| --- | --- | --- |
| Health | `GET /api/health`, `GET /api/health/ready` | Public |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` | Public (rate limited) |
| Auth | `GET /api/auth/me`, `PATCH /api/auth/me`, `POST /api/auth/change-password` | Logged in |
| Catalog | `GET /api/movies`, `GET /api/movies/filters`, `GET /api/movies/:idOrSlug`, `GET /api/movies/:idOrSlug/showtimes`, `GET /api/showtimes/:id` | Public |
| Bookings | `POST /api/bookings/quote`, `POST /api/bookings`, `GET /api/bookings/me`, `GET /api/bookings/:id`, `PATCH /api/bookings/:id/cancel` | Logged in (owner) |
| Admin | `/api/admin/stats`, `/movies`, `/theaters`, `/screens`, `/showtimes`, `/bookings` | Admin only |

The full reference, with request and response details, is in [docs/API.md](../API.md).

### 11.2 Authentication ([middleware/auth.js](../../backend/src/middleware/auth.js), [controllers/authController.js](../../backend/src/controllers/authController.js))

1. **Register:** zod validates the name, email and password (8+ characters with a letter and a number). The email must be unused. The password is hashed with **bcrypt (cost 12)**, and the role is always `user`.
2. **Login:** finds the user, compares the password hash and returns the *same* error for an unknown email or a wrong password, so attackers can't discover accounts.
3. A **JWT** containing `{ sub: userId, role }` is signed with `JWT_SECRET` (2-hour expiry) and stored in an **httpOnly** cookie (`SameSite=Lax`, `Secure` in production).
4. **`requireAuth`** reads the cookie (or a `Bearer` header), verifies the JWT and **loads the user from the database**. Expired tokens return `401 "Your session has expired"`.
5. **`requireRole('admin')`** returns `403` for non-admins.

### 11.3 Validation and errors
- Every body and query passes through a **zod schema** ([validators/schemas.js](../../backend/src/validators/schemas.js)). Unknown fields are removed, so a client can't send `role: "admin"` or `total: 1`.
- Errors are thrown as `ApiError(status, message)`. The central [errorHandler](../../backend/src/middleware/errorHandler.js) also converts Mongoose validation, cast and duplicate-key errors into clean `400` / `409` responses. Example:

```json
{ "success": false, "message": "Password must contain a number", "details": [{ "field": "password", "message": "Password must contain a number" }] }
```

### 11.4 Pricing ([services/pricing.js](../../backend/src/services/pricing.js))
- Each seat's type comes from the screen layout: rows listed in `premiumRows` are premium, all others are standard.
- `price = showtime.prices[type]`, `subtotal = Σ price`, `convenienceFee = ₹20 × seats`, `total = subtotal + fee`.
- Seats that don't exist in the screen layout are rejected. The browser's total is **never trusted**.

### 11.5 Concurrency-safe booking ([services/bookingService.js](../../backend/src/services/bookingService.js))

```js
const reserved = await Showtime.findOneAndUpdate(
  { _id: showtime._id, status: 'scheduled', bookedSeats: { $nin: seats } }, // only if ALL seats are free
  { $addToSet: { bookedSeats: { $each: seats } } },
  { new: true },
);
if (!reserved) throw ApiError.conflict('Sorry, H6 was just booked by another customer...', { conflictingSeats });
```

- MongoDB applies this update **atomically on one document**, so out of many simultaneous requests for the same seat, exactly one wins. The others get `409 Conflict` with the conflicting seat IDs.
- **Idempotency:** the client sends a random `idempotencyKey` for each checkout. A unique index on `(user, idempotencyKey)` means a double-click or network retry returns the **same booking** instead of creating two.
- **Rollback:** if creating the `Booking` document fails, the reserved seats are released with `$pullAll`.
- **Cancellation** atomically changes `confirmed → cancelled` (so it can happen only once), then releases the seats. Shows that have already started can't be booked or cancelled.

### 11.6 Admin rules ([controllers/adminController.js](../../backend/src/controllers/adminController.js))
- Showtime `endTime` is calculated from the movie's duration. A new show on the same screen must not overlap another one, including a **15-minute changeover**.
- Movies, theaters, screens and showtimes with **booking history can't be deleted**. Archive or deactivate them instead. Booked shows can't be moved to a different time, screen or movie.
- Statistics use MongoDB **aggregation pipelines**: `$group` by status for revenue and tickets, and `$lookup` for top movies.

### 11.7 Security summary
Helmet headers and CSP, a strict CORS allow-list, a CSRF header check, login rate limiting (20 failed attempts / 15 min), a global rate limit (300 requests/min), escaped search input (no regex injection), log redaction of passwords and cookies, and a 100 kb body limit.

### 11.8 Backend tests (40 passing)
`cd backend && npm test` runs [tests/](../../backend/tests) against a fresh in-memory MongoDB. The tests cover registration and login validation, CSRF, role protection, catalog search and filters, server pricing, seat conflicts, an **8-request race for one seat (exactly 1 succeeds)**, duplicate submissions, ownership, cancellation, admin CRUD, overlap checks and safe deletion.
