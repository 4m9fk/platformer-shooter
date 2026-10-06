import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const SKY = '#6ec6ff'; // SKY_TOP in src/config.ts

export default defineConfig({
  base: '/platformer-shooter/',
  build: { chunkSizeWarningLimit: 2000 }, // Phaser alone is ~1.2 MB
  plugins: [
    VitePWA({
      registerType: 'autoUpdate', // a new deploy is picked up on the next launch
      injectRegister: 'auto',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Platformer Shooter',
        short_name: 'Shooter',
        display: 'standalone',
        orientation: 'landscape',
        theme_color: SKY,
        background_color: SKY,
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,json,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: { include: ['src/**/*.test.ts'], passWithNoTests: true },
});
