import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import vercel from '@astrojs/vercel';
import keystatic from '@keystatic/astro';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://kntsite.vercel.app',

  // Статична генерація (SSG) за замовчуванням для всіх публічних сторінок (0 навантаження на функції Vercel).
  // Маршрути адмінки Keystatic мають власний prerender = false і працюють динамічно через адаптер Vercel.
  output: 'static',

  adapter: vercel({
    imageService: false,
  }),

  integrations: [
    icon(),
    react(),
    keystatic(),
    mdx(),
  ],

  vite: {
    plugins: [tailwindcss()],
    build: {
      chunkSizeWarningLimit: 1200,
    },
  },
});
