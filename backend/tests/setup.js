import { beforeAll, afterAll } from 'vitest';
import { connectDB, disconnectDB } from '../src/config/db.js';

beforeAll(async () => {
  await connectDB('memory');
});

afterAll(async () => {
  await disconnectDB();
});
