// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import vercel from '@astrojs/vercel';
import AstroPWA from '@vite-pwa/astro';

// https://astro.build/config
export default defineConfig({
  // Adapter Vercel (serverless). Las paginas con `prerender = false`
  // (/list/[slug] y /profile/[username]) se sirven SSR via serverless
  // functions; las demas se prerenderizan como assets estaticos.
  adapter: vercel(),
  integrations: [
    preact(),
    AstroPWA({
      registerType: 'autoUpdate',
      // Habilita el SW tambien en `astro dev` para poder testear instalacion sin build.
      devOptions: { enabled: true },
      manifest: {
        name: 'GoroReads',
        short_name: 'GoroReads',
        description: 'Tracker de lecturas de manga, manhwa, novelas y webtoons con funciones sociales',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#8b5cf6',
        background_color: '#0a0a0f',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Las llamadas a Firebase (auth, firestore, storage) NO se cachean: ya
        // gestionan su propia persistencia y cachearlas romperia el realtime.
        navigateFallback: '/',
        navigateFallbackDenylist: [
          /^\/__/,
          /firestore\.googleapis\.com/,
          /identitytoolkit\.googleapis\.com/,
          /firebasestorage\.googleapis\.com/,
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\//,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\//,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
});
