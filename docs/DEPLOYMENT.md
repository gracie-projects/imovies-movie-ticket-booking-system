# Deploying IMovies (free tier)

IMovies deploys as **one web service**: Express serves both the REST API (`/api`) and the built React app. That keeps the auth cookie first-party (`SameSite=Lax`), so no cross-site cookie or CORS setup is needed.

Recommended free stack:

| Part | Service |
| --- | --- |
| Database | MongoDB Atlas, M0 free cluster |
| Web service (API + frontend) | Render, free web service |

## 1. Create the MongoDB Atlas database

1. Sign in at <https://cloud.mongodb.com> and create a **free M0 cluster**.
2. **Database Access** → *Add New Database User*. Choose a username and generate a strong password, and keep it private.
3. **Network Access** → *Add IP Address* → `0.0.0.0/0`. Render's free tier has no fixed outbound IPs, so this is required; access is still protected by the user and password.
4. **Connect** → *Drivers* → copy the connection string and add the database name `imovies`:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/imovies?retryWrites=true&w=majority`

## 2. Deploy on Render with the Blueprint

1. Sign in at <https://render.com> with your GitHub account and allow access to the `imovies-movie-ticket-booking-system` repository.
2. **New → Blueprint** → select the repository. Render reads [`render.yaml`](../render.yaml).
3. Fill in the secret values when prompted:
   - `MONGODB_URI`: the Atlas connection string from step 1.
   - `CLIENT_ORIGIN`: your Render URL, for example `https://imovies.onrender.com`. You can fill it in after the first deploy shows the URL, then redeploy.
   - `SEED_ADMIN_PASSWORD` / `SEED_DEMO_PASSWORD`: passwords for the demo accounts. Choose them yourself and don't reuse personal passwords.
4. Render generates `JWT_SECRET` automatically.
5. On the first start, `SEED_IF_EMPTY=true` loads the demo movies, theaters and accounts. Later restarts never wipe data. `SCHEDULE_AUTOFILL=true` keeps showtimes available for the next 5 days.

### Manual setup (without the Blueprint)

New → Web Service → connect the repo, then set:

- Build command: `npm run build`
- Start command: `npm start`
- Health check path: `/api/health/ready`
- Environment variables: `NODE_ENV=production`, `SERVE_FRONTEND=true`, `TRUST_PROXY=1`, `SEED_IF_EMPTY=true`, `SCHEDULE_AUTOFILL=true`, `JWT_SECRET` (48+ random characters), `MONGODB_URI`, `CLIENT_ORIGIN`, `SEED_ADMIN_PASSWORD`, `SEED_DEMO_PASSWORD`

## 3. Verify the deployment

```bash
curl https://<your-app>.onrender.com/api/health/ready
```

The response must be `{"status":"ready","database":"connected"}`. Then, in a private browser window:

1. Register a new customer and log in.
2. Open a movie, pick a showtime and select seats.
3. Pay with the simulated checkout and check the ticket and My Bookings.
4. Log in as `admin@imovies.test` and open the Admin dashboard.

The end-to-end suite can also run against the live site:

```bash
cd e2e
E2E_BASE_URL=https://<your-app>.onrender.com npx playwright test
```

Only do this against a demo deployment, because the tests create bookings.

## Notes

- **Cold starts:** free Render services sleep after about 15 minutes without traffic. The first request after that takes **30–60 seconds** while the service wakes up. Open the site once before a presentation.
- **Separate frontend hosting** (for example Vercel or Netlify) is also supported. Build the frontend with `VITE_API_URL=https://<api-host>/api`. On the API, set `CLIENT_ORIGIN=https://<frontend-host>`, `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true`. Some browsers block third-party cookies, so the single-service setup is recommended.
- Never commit `.env` files or connection strings. Set secrets only in the hosting provider's dashboard.
