# IMovies REST API

Base URL: `/api` (same origin as the web app). All responses are JSON.

**Conventions**

- Errors look like `{ "success": false, "message": "...", "details": [...] }`.
- Authentication uses an **httpOnly cookie** (`imovies_token`) set by login/register. API clients may alternatively send `Authorization: Bearer <token>`.
- Every `POST / PUT / PATCH / DELETE` must include the header `X-Requested-With: XMLHttpRequest` (CSRF protection). Requests without it get `403`.
- Rate limits: 300 requests/minute per IP; 20 failed auth attempts per 15 minutes.

## Health

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Process liveness: `{ status: "ok", uptime }` |
| GET | `/health/ready` | Database readiness: `200 { status: "ready" }` or `503` |

## Authentication

| Method | Path | Auth | Body / notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | – | `{ name, email, password, phone? }` — password ≥ 8 chars with a letter and a number. Always creates role `user`. |
| POST | `/auth/login` | – | `{ email, password }` → `{ user }` + cookie |
| POST | `/auth/logout` | – | Clears the cookie |
| GET | `/auth/me` | user | Current user |
| PATCH | `/auth/me` | user | `{ name?, phone? }` |
| POST | `/auth/change-password` | user | `{ currentPassword, newPassword }` |

## Catalog

| Method | Path | Description |
| --- | --- | --- |
| GET | `/movies?search=&genre=&language=&status=all\|now_showing\|coming_soon&page=&limit=` | Paginated catalog |
| GET | `/movies/filters` | `{ genres: [], languages: [] }` |
| GET | `/movies/:idOrSlug` | Movie details |
| GET | `/movies/:idOrSlug/showtimes` | Upcoming shows for 7 days with `seatsLeft` and theater info |
| GET | `/showtimes/:id` | Seat map data: screen layout, prices, `bookedSeats`, `bookingOpen` |

## Bookings (logged-in customers)

| Method | Path | Description |
| --- | --- | --- |
| POST | `/bookings/quote` | `{ showtimeId, seats: ["A1","A2"] }` → server-calculated price and any `unavailable` seats |
| POST | `/bookings` | `{ showtimeId, seats, paymentMethod: "upi"\|"card"\|"wallet", idempotencyKey }` → `201 { booking }`. A repeated `idempotencyKey` returns the original booking with `200`. Seats already taken → `409 { details: { conflictingSeats } }` |
| GET | `/bookings/me` | `{ upcoming: [], past: [] }` |
| GET | `/bookings/:id` | Owner or admin only (others get `404`) |
| PATCH | `/bookings/:id/cancel` | Cancels before showtime and releases the seats |

## Admin (role `admin`)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/admin/stats` | Revenue, tickets, customers, upcoming shows, recent bookings, top movies |
| GET / POST | `/admin/movies` | List / create |
| PUT / DELETE | `/admin/movies/:id` | Update / delete (`409` if the movie has booking history — archive instead) |
| GET / POST | `/admin/theaters` | List (with screens) / create |
| PUT / DELETE | `/admin/theaters/:id` | Update / delete (`409` with booking history) |
| POST | `/admin/screens` | `{ theater, name, rows, seatsPerRow, premiumRows, aisleAfter }` |
| PUT / DELETE | `/admin/screens/:id` | Layout changes blocked while upcoming bookings exist |
| GET / POST | `/admin/showtimes` | List / create (`409` on overlapping shows; 15 min changeover) |
| PUT / DELETE | `/admin/showtimes/:id` | Time/screen/movie changes blocked while confirmed bookings exist; price changes apply to new bookings only |
| GET | `/admin/bookings?status=&search=&page=` | All bookings, search by reference prefix |
