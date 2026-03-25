import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders'; // Додаємо новий завантажувач

const news = defineCollection({
  // Вказуємо Astro, де шукати файли новин
  loader: glob({ pattern: "**/*.md", base: "./src/content/news" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    image: z.string().optional(),
    description: z.string(),
  }),
});

export const collections = { news };