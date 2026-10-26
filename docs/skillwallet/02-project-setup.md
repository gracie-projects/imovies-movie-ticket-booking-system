# Epic 2 — Project Setup and Configuration

[← Task index](README.md)

Commands work in **Windows PowerShell** and **Command Prompt** unless marked otherwise. Required tools: **Node.js 20+** (includes npm) and **Git**.

```bash
node -v
npm -v
git --version
```

---

## 7. Creating Project Folder

The project is a single Git repository with separate folders for the client, the server and the end-to-end tests:

```text
imovies-movie-ticket-booking-system/
├── backend/        ← Express + MongoDB server (Task 9)
├── frontend/       ← React + Vite client (Task 8)
├── e2e/            ← Playwright end-to-end tests and demo recorder
├── docs/           ← API, deployment and SkillWallet docs, demo video
├── screenshots/    ← output screenshots
├── scripts/        ← start-demo.mjs (one-command local demo)
├── .github/workflows/ci.yml
├── .gitignore  .gitattributes  .env.example
├── render.yaml     ← Render deployment blueprint
├── package.json    ← root helper scripts (no dependencies)
└── README.md
```

How it was created (PowerShell):

```powershell
mkdir imovies-movie-ticket-booking-system
cd imovies-movie-ticket-booking-system
git init -b main
mkdir backend, frontend, e2e, docs, screenshots, scripts, .github\workflows
```

Then the supporting files were added:

| File | Purpose |
| --- | --- |
| [`.gitignore`](../../.gitignore) | Keeps `node_modules/`, `.env` files, `dist/`, logs and test output out of Git |
| [`.gitattributes`](../../.gitattributes) | Uses LF line endings in the repo; marks images and video as binary |
| [`.env.example`](../../.env.example) | Documents every configuration variable, with **no real secrets** |
| [`package.json`](../../package.json) (root) | Shortcuts such as `npm run install:all`, `npm test`, `npm run start:demo` |

To install everything after cloning, run from the repository root:

```bash
npm run install:all
```

---

## 8. Client Setup

**1. Create the React + Vite app** (run in `frontend/`). The app was set up by hand to match the official Vite React template:

```bash
npm init -y
npm install react react-dom react-router-dom axios bootstrap react-bootstrap bootstrap-icons qrcode.react
npm install -D vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event eslint @eslint/js eslint-plugin-react-hooks eslint-plugin-react-refresh globals
```

**2. Scripts** in [`frontend/package.json`](../../frontend/package.json):

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `vite` | Development server on <http://localhost:5173> with hot reload |
| `build` | `vite build` | Production build in `frontend/dist/` |
| `preview` | `vite preview` | Serve the production build locally |
| `test` | `vitest run` | React Testing Library tests |
| `lint` | `eslint .` | Code quality checks |

**3. Vite configuration** ([`frontend/vite.config.js`](../../frontend/vite.config.js)):

```js
server: {
  port: 5173,
  // Same-origin proxy so the httpOnly auth cookie works in development
  proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
},
```

The proxy makes the browser think the API is on the same origin as the React app, so no CORS or cookie settings are needed during development.

**4. Global styles and providers** in [`frontend/src/main.jsx`](../../frontend/src/main.jsx). The app is wrapped in its providers:
`BrowserRouter` → `ToastProvider` → `AuthProvider` → `App`. Bootstrap CSS, Bootstrap Icons and the custom theme ([`styles/app.css`](../../frontend/src/styles/app.css)) are imported once here.

**5. API client** ([`frontend/src/api/client.js`](../../frontend/src/api/client.js)) is one shared Axios instance with:
- `baseURL` set to `/api`, or `VITE_API_URL` when the API is on another domain;
- `withCredentials: true`, so the auth cookie is sent;
- the `X-Requested-With: XMLHttpRequest` header (CSRF protection);
- a response interceptor that logs the user out on `401`.

**Run the client:**

```bash
cd frontend
npm run dev
```

---

## 9. Server Setup

**1. Initialise the Node.js project** (run in `backend/`):

```bash
npm init -y
npm install express mongoose jsonwebtoken bcryptjs cookie-parser cors helmet express-rate-limit zod dotenv pino pino-http
npm install -D vitest supertest mongodb-memory-server
```

[`backend/package.json`](../../backend/package.json) uses **ES modules** (`"type": "module"`) and defines:

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `node --watch src/server.js` | Auto-restart on file changes |
| `start` | `node src/server.js` | Production start |
| `seed` | `node src/seed/seed.js` | Load demo data into a persistent database |
| `test` | `vitest run` | API tests with Supertest |

**2. Environment configuration.** Copy the example file, then edit it.

PowerShell:

```powershell
Copy-Item .env.example backend\.env
```

Command Prompt:

```bat
copy .env.example backend\.env
```

[`backend/src/config/env.js`](../../backend/src/config/env.js) reads every variable once, applies safe defaults for development, and **refuses to start in production** without a strong `JWT_SECRET` (32+ characters) and a real `MONGODB_URI`.

| Variable | Development default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | HTTP port |
| `MONGODB_URI` | `memory` | `memory`, local MongoDB, or an Atlas connection string |
| `JWT_SECRET` | dev-only fallback | Signs login tokens (required in production) |
| `JWT_EXPIRES_IN` | `2h` | Session length |
| `CLIENT_ORIGIN` | `http://localhost:5173` | CORS allow-list |
| `SERVE_FRONTEND` | `false` | Serve `frontend/dist` from Express |
| `SEED_IF_EMPTY` / `SEED_ON_START` | `false` | Load demo data automatically |

**3. Express application** ([`backend/src/app.js`](../../backend/src/app.js)). Middleware runs in this order:

1. `helmet()`: security headers and a Content Security Policy.
2. `cors()`: allows only origins in `CLIENT_ORIGIN`, with credentials.
3. `pino-http`: structured request logs, with passwords and cookies redacted.
4. `express.json({ limit: '100kb' })` and `cookieParser()`.
5. `apiLimiter` (300 requests/minute) and `requireCsrfHeader`.
6. `/api` routes, then a JSON 404 handler.
7. Optionally, static hosting of the built React app.
8. `errorHandler`: one consistent JSON error format.

**4. Server entry point** ([`backend/src/server.js`](../../backend/src/server.js)):

1. Validates the environment.
2. Connects to MongoDB.
3. Seeds demo data when the database is empty and seeding is enabled.
4. Starts listening on `PORT`.
5. Handles `SIGINT`/`SIGTERM` for a **graceful shutdown**: it stops accepting requests, then closes the database connection.

**Run the server:**

```bash
cd backend
npm run dev
```

Check that it's healthy at <http://localhost:5000/api/health/ready>, which should return `{"status":"ready","database":"connected"}`.
