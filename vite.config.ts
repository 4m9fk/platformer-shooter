import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/platformer-shooter/',
  build: { chunkSizeWarningLimit: 2000 }, // Phaser alone is ~1.2 MB
  test: { include: ['src/**/*.test.ts'], passWithNoTests: true },
});
