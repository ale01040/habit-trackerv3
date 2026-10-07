/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Le date dei test dipendono dal fuso: fissiamo quello italiano.
process.env.TZ = 'Europe/Rome';

/** Librerie in chunk separati: si aggiornano di rado e restano in cache. */
function vendorChunk(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined;
  if (id.includes('@supabase')) return 'supabase';
  if (id.includes('motion') || id.includes('framer')) return 'motion';
  if (/react|scheduler|@tanstack/.test(id)) return 'react';
  return 'vendor';
}

export default defineConfig({
  build: { rollupOptions: { output: { manualChunks: vendorChunk } } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Habit tracker',
        short_name: 'Habits',
        description: 'Spunta le tue abitudini ogni giorno.',
        lang: 'it',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F7FAFB',
        theme_color: '#073B4C',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    env: { TZ: 'Europe/Rome' },
    testTimeout: 15_000,
    coverage: {
      provider: 'v8',
      include: ['src/domain/**'],
      exclude: ['src/domain/**/*.test.ts', 'src/domain/test-fixtures.ts'],
      thresholds: { lines: 95, statements: 95, functions: 95, branches: 90 },
    },
  },
});
