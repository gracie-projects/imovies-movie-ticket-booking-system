import { env, validateEnv } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import { createApp } from './app.js';
import { seedDatabase, ensureUpcomingShowtimes } from './seed/seedData.js';
import { Movie } from './models/Movie.js';

async function start() {
  validateEnv();
  await connectDB();

  // The in-memory database always starts empty, so seed it automatically
  const seedWhenEmpty = env.MONGODB_URI === 'memory' || env.SEED_IF_EMPTY;
  if (env.SEED_ON_START || (seedWhenEmpty && !(await Movie.exists({})))) {
    const summary = await seedDatabase();
    logger.info(summary, 'Database seeded with demo data');
  }

  if (env.SCHEDULE_AUTOFILL) {
    const fill = () =>
      ensureUpcomingShowtimes()
        .then((added) => added && logger.info({ added }, 'Added showtimes for upcoming days'))
        .catch((err) => logger.error({ err }, 'Could not extend the schedule'));
    await fill();
    setInterval(fill, 6 * 60 * 60 * 1000).unref();
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`IMovies API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down gracefully');
    server.close(async () => {
      await disconnectDB();
      logger.info('Shutdown complete');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

start().catch((err) => {
  logger.fatal({ err: err.message }, 'Failed to start server');
  console.error(err.message);
  process.exit(1);
});
