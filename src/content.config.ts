import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// src/content.config.ts
const services = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/services" }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdoc}", base: "./src/content/news" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string(),
    image: image().optional(),
  }),
});

// 👇 Нова колекція для Вакансій
const vacancies = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdoc}", base: "./src/content/vacancies" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string(),
    image: image().optional(), // залишаємо опціональне фото, як у новинах
  }),
});

// Експортуємо УСІ колекції
export const collections = { 
  'services': services,
  'news': news,
  'vacancies': vacancies // 👈 Додано сюди
};