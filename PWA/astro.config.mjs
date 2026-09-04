// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import AstroPWA from '@vite-pwa/astro';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    AstroPWA({
      mode: 'production',
      registerType: 'autoUpdate',
      manifest: {
        name: 'My Astro React PWA',
        short_name: 'AstroPWA',
        description: 'An offline-capable Astro + React App',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        navigateFallback: '/',
        globPatterns: ['**/*.{html,js,css,png,svg,ico}']
      },
      devOptions: {
        enabled: true
      }
    })
  ]
});