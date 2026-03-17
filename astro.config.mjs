import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';

export default defineConfig({
  // ДОДАЙ ЦЕЙ РЯДОК (це і є "домен", про який я казав):
  site: 'https://example.com', 
  
  integrations: [icon()],
  vite: {
    plugins: [tailwindcss()],
  },
});