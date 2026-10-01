import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['Icon.png', 'hero.png'],
      manifest: {
        name: 'FuelPass - Gestión de Combustible',
        short_name: 'FuelPass',
        description: 'Plataforma de control y despacho de combustible',
        theme_color: '#1d4ed8',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/Icon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/Icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg}'],
        navigateFallback: '/index.html',
        // Add these two lines to force the new Service Worker to take over immediately
        clientsClaim: true,
        skipWaiting: true
      },
      devOptions: {
        enabled: true,
        type: 'module', 
        suppressWarnings: true 
      }
    })
  ],
  server: {
    host: true 
  },
  build: {
    chunkSizeWarningLimit: 1000 
  }
})