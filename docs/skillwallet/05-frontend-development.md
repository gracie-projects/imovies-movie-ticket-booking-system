# Epic 5 — Frontend Development

[← Task index](README.md)

---

## 15. Frontend Structure

```text
frontend/
├── index.html                  root HTML, fonts, favicon
├── vite.config.js              dev server, /api proxy, Vitest config
├── eslint.config.js
├── public/
│   ├── favicon.svg
│   └── posters/*.svg           original artwork for the 8 fictional movies
├── scripts/generate-posters.mjs
└── src/
    ├── main.jsx                React root + BrowserRouter + providers + global CSS
    ├── App.jsx                 navbar, routes, footer, skip link, scroll-to-top
    ├── api/
    │   └── client.js           Axios instance, CSRF header, 401 → logout, error messages
    ├── context/
    │   ├── AuthContext.jsx     user, loading, login(), register(), logout(), isAdmin
    │   └── ToastContext.jsx    notify(message, variant) toast notifications
    ├── components/
    │   ├── AppNavbar.jsx       responsive navigation + account menu
    │   ├── MovieCard.jsx       poster card used on Home and Movies
    │   ├── SeatMap.jsx         interactive, keyboard-accessible seat grid
    │   ├── TicketCard.jsx      digital ticket with QR code
    │   ├── ProtectedRoute.jsx  login / admin route guard
    │   └── common.jsx          Loader, ErrorAlert, EmptyState, PaginationBar, StatusBadge
    ├── pages/
    │   ├── Home.jsx            hero + Now Showing + Coming Soon
    │   ├── Movies.jsx          search, genre/language filters, status tabs, pagination
    │   ├── MovieDetails.jsx    details + date tabs + theaters + showtimes
    │   ├── SeatSelection.jsx   seat map + live price summary
    │   ├── Checkout.jsx        server quote + simulated payment + conflict handling
    │   ├── BookingConfirmation.jsx  confirmation + ticket
    │   ├── MyBookings.jsx      upcoming / past tabs + cancel modal
    │   ├── Auth.jsx            Login and Register forms with validation
    │   ├── Profile.jsx         profile details + change password
    │   ├── NotFound.jsx
    │   └── admin/
    │       ├── AdminDashboard.jsx  tabs container
    │       ├── Overview.jsx        statistics cards, recent bookings, top movies
    │       ├── MoviesAdmin.jsx     movie table + add/edit modal
    │       ├── TheatersAdmin.jsx   theaters + screens management
    │       ├── ShowtimesAdmin.jsx  schedule table + add/edit modal
    │       ├── BookingsAdmin.jsx   all bookings, search, status filter
    │       └── useAdminData.js     shared data-loading hook
    ├── utils/format.js         currency, dates, seat sorting, price estimate, idempotency key
    ├── styles/app.css          dark cinematic theme (CSS variables)
    └── test/                   React Testing Library tests (25)
```

### Routes ([App.jsx](../../frontend/src/App.jsx))

| Path | Page | Access |
| --- | --- | --- |
| `/` | Home | Public |
| `/movies` | Movies (catalog) | Public |
| `/movies/:slug` | Movie details + showtimes | Public |
| `/booking/:showtimeId` | Seat selection | Public (login required to continue) |
| `/login`, `/register` | Auth forms | Public |
| `/checkout?showtime=&seats=` | Checkout | Logged in |
| `/bookings/:id` | Confirmation / ticket | Logged in (owner) |
| `/my-bookings` | My Bookings | Logged in |
| `/profile` | Profile | Logged in |
| `/admin` | Admin dashboard | Admin only |
| `*` | 404 page | Public |

---

## 16. Development and Explanation

### 16.1 State management
- **AuthContext** keeps the logged-in user for the whole app. On start, it calls `GET /api/auth/me` to restore the session from the cookie. It exposes `login`, `register`, `logout` and `isAdmin`. It also registers a handler with the Axios client: on any `401`, the user is cleared, a "session expired" toast is shown, and the app redirects to `/login?redirect=<page>`.
- **ToastContext** gives every page `notify(message, variant)` for success, error and info messages.
- Page data such as movies, showtimes and bookings is loaded with `useEffect` + Axios, with `loading`, `error` and `empty` states on every page.
- Filters on the Movies page are stored in the **URL query string** (`?search=&genre=&language=&status=&page=`), so searches can be shared, bookmarked, and reached with the browser Back button.

### 16.2 Route protection ([ProtectedRoute.jsx](../../frontend/src/components/ProtectedRoute.jsx))
- While the session is loading, it shows a spinner.
- Not logged in: redirects to `/login?redirect=<original page>`. After login, the user returns to that page. Only internal paths are accepted (`safeRedirect`), which prevents open-redirect attacks.
- `role="admin"` for a customer shows an **Access denied** page. The backend enforces this too.

### 16.3 Seat map ([SeatMap.jsx](../../frontend/src/components/SeatMap.jsx))
- Builds the grid from the screen layout returned by the API: `rows`, `seatsPerRow`, `premiumRows` and `aisleAfter`.
- Each seat is a real `<button>` with `aria-pressed` and a descriptive `aria-label` ("Seat C4, standard, ₹180, available"), so it works with the keyboard and screen readers.
- Seat states: **available** (green), **premium** (purple), **selected** (yellow) and **booked** (grey, disabled). The limit is 10 seats.
- [SeatSelection.jsx](../../frontend/src/pages/SeatSelection.jsx) shows a **live price** using `estimatePrice()`, which uses the same rules as the server. The note "Final price is confirmed by the server" makes clear the server decides.

### 16.4 Checkout and conflict handling ([Checkout.jsx](../../frontend/src/pages/Checkout.jsx))
1. Calls `POST /api/bookings/quote` to show the **server-calculated** total.
2. Creates one `idempotencyKey` (`crypto.randomUUID()`) when the page opens. Double clicks or retries reuse it, so only **one booking** can be created.
3. **Pay** sends `POST /api/bookings`. Success opens the confirmation page.
4. A `409` response shows "Seat H6 was just booked by another customer" and a button back to the seat map that keeps the seats that are still free.
5. Other errors show "Payment failed. You have not been charged".

### 16.5 Confirmation, ticket and history
- [TicketCard.jsx](../../frontend/src/components/TicketCard.jsx) shows the movie, date, time, theater, screen, seats, price breakdown, payment method, booking reference and a **QR code** (`qrcode.react`). It can be printed.
- [MyBookings.jsx](../../frontend/src/pages/MyBookings.jsx) has **Upcoming** and **Past & cancelled** tabs. Cancelling uses a confirmation modal, then the list reloads.

### 16.6 Admin dashboard ([pages/admin/](../../frontend/src/pages/admin))
- Bootstrap tabs: Overview, Movies, Theaters & Screens, Showtimes, Bookings. Each tab loads its data only when it's opened (`mountOnEnter`).
- Add and edit use modal forms. Server validation errors (for example "Screen is busy", or "This movie has booking history") are shown inside the modal.
- The `useAdminData(url, params)` hook handles loading, errors and reloading for every tab.

### 16.7 UI / UX
- Dark cinematic theme using CSS variables ([app.css](../../frontend/src/styles/app.css)), Bebas Neue display font, gold and red accents, and poster cards with hover effects.
- Fully responsive: Bootstrap grid, collapsible navbar, horizontally scrollable seat map on phones.
- Accessibility: skip-to-content link, labelled form fields with error messages, visible focus outline, `aria-live` totals, and reduced-motion support.

### 16.8 Frontend tests (25 passing)
`cd frontend && npm test` covers catalog loading, filters, debounced search, empty and error states, login and registration validation, redirect safety, protected and admin routes, seat selection, live price, keyboard use, checkout with idempotency, the seat-conflict message and the ticket view. `npm run lint` passes with no errors.
