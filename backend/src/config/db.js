import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { describeMongoUri } from './uriCheck.js';

const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let memoryServer = null;

/**
 * Connects to MongoDB. When the URI is "memory" an in-memory server is
 * started instead - convenient for development and tests, but all data is
 * lost when the process stops.
 */
export async function connectDB(uri = env.MONGODB_URI) {
  let target = uri;
  if (uri === 'memory') {
    // Keep the downloaded mongod binary in one place no matter which folder the server is started from
    process.env.MONGOMS_DOWNLOAD_DIR ||= path.resolve(BACKEND_ROOT, 'node_modules/.cache/mongodb-memory-server');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    target = memoryServer.getUri('imovies');
    logger.warn('Using in-memory MongoDB - data is NOT persisted between restarts');
  }

  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(target, { serverSelectionTimeoutMS: 10000 });
  } catch (err) {
    if (uri !== 'memory') {
      // Safe summary of the connection string (never includes the password itself)
      logger.error({ connection: describeMongoUri(uri), reason: err.message }, 'Could not connect to MongoDB');
    }
    throw err;
  }
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
  logger.info({ db: mongoose.connection.name }, 'MongoDB connected');
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

export function isDbReady() {
  return mongoose.connection.readyState === 1;
}
