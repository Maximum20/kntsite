import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import vercel from '@astrojs/vercel';
import keystatic from '@keystatic/astro'; // Додаємо адмінку
import react from '@astrojs/react';     // Адмінці потрібен React
//import { mdx } from 'node_modules/@keystatic/core/dist/declarations/src/form/fields';
import mdx from '@astrojs/mdx';


export default defineConfig({
  // Твій сайт
  site: 'https://kntsite.vercel.app', 
  
  // Працюємо як сервер для API та адмінки
  output: 'server',
  
  // Використовуємо Vercel
  adapter: vercel(),

  // Додаємо нові інтеграції до існуючих
  integrations: [
    icon(), 
    react(),     // Потрібен для інтерфейсу Keystatic
    keystatic(),  // Сама адмінка
    mdx()
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});