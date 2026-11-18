import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import vercel from '@astrojs/vercel';
import keystatic from '@keystatic/astro';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';

// Обгортка над @keystatic/astro для Astro 6:
// Сторінка /keystatic/[...params] рендериться через src/pages/keystatic/[...params].astro (origin: "project", з <!DOCTYPE html>),
// щоб Astro 6 гарантовано включав @astrojs/react у SSR-бандл функції Vercel (_render.func) і не дублював маршрут.
function keystaticIntegration() {
  const base = keystatic();
  const originalSetup = base.hooks['astro:config:setup'];
  return {
    ...base,
    hooks: {
      ...base.hooks,
      'astro:config:setup': (params) => {
        return originalSetup({
          ...params,
          injectRoute: (route) => {
            if (route.pattern === '/keystatic/[...params]') {
              return;
            }
            params.injectRoute(route);
          },
        });
      },
    },
  };
}

export default defineConfig({
  site: 'https://kntsite.vercel.app',

  // Гібридний режим Astro 6: всі публічні сторінки генеруються статично (SSG),
  // а маршрути з prerender = false (/keystatic/[...params] та /api/keystatic/[...params]) працюють через SSR-функцію Vercel.
  output: 'static',

  adapter: vercel({
    imageService: false,
  }),

  integrations: [
    icon(),
    react(),
    keystaticIntegration(),
    mdx(),
  ],

  vite: {
    plugins: [tailwindcss()],
    build: {
      chunkSizeWarningLimit: 1200,
    },
  },
});
