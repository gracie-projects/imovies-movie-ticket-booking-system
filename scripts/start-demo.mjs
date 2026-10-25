// Starts IMovies as ONE local server (API + built React app) on http://localhost:5000
// using a fresh, seeded in-memory MongoDB. Used for demos and the video recording.
// Run from the repository root with:  npm run start:demo
process.env.NODE_ENV ||= 'development';
process.env.PORT ||= '5000';
process.env.MONGODB_URI ||= 'memory';
process.env.SEED_ON_START ||= 'true';
process.env.SERVE_FRONTEND = 'true';
process.env.CLIENT_ORIGIN ||= `http://localhost:${process.env.PORT}`;

await import('../backend/src/server.js');
