import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'memory',
      JWT_SECRET: 'test-secret-that-is-long-enough-for-hs256-signing',
      AUTH_RATE_LIMIT: '1000',
      BCRYPT_ROUNDS: '4',
    },
    setupFiles: ['./tests/setup.js'],
    testTimeout: 30000,
    hookTimeout: 120000,
    // Each file starts its own in-memory MongoDB, so run files one at a time
    fileParallelism: false,
  },
});
