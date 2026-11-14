import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    css: false,
    // The console screens (especially payments) are heavy, and this suite is run
    // on shared machines; 15s flakes under load, 30s leaves headroom.
    testTimeout: 30000,
    // Mocks are installed per test in beforeEach; restoring them automatically
    // would strip the implementations back out.
    restoreMocks: false,
    clearMocks: false,
  },
});
