// Usage: npm run seed            (development database)
//        npm run seed -- --force (required when NODE_ENV=production)
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from './seedData.js';

async function main() {
  if (env.MONGODB_URI === 'memory') {
    console.log('MONGODB_URI is "memory": the in-memory database is seeded automatically when the server starts.');
    console.log('Set MONGODB_URI to a local MongoDB or Atlas connection string to seed a persistent database.');
    return;
  }
  if (env.isProduction && !process.argv.includes('--force')) {
    console.error('Refusing to wipe a production database. Re-run with "--force" if you really mean it.');
    process.exitCode = 1;
    return;
  }

  await connectDB();
  const summary = await seedDatabase();
  console.log('Seed complete:', summary);
  await disconnectDB();
}

main().catch(async (err) => {
  console.error('Seeding failed:', err.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
