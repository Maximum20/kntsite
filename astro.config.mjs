import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import vercel from '@astrojs/vercel'; // Додаємо цей імпорт

export default defineConfig({
  // Встав сюди адресу свого сайту на Vercel
  site: 'https://kntsite.vercel.app', 
  
  // Цей рядок каже Astro працювати як сервер, щоб API ожило
  output: 'server',
  
  // Кажемо Astro використовувати потужності Vercel
  adapter: vercel(),

  integrations: [icon()],
  vite: {
    plugins: [tailwindcss()],
  },
});