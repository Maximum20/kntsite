import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';


// src/content.config.ts
const services = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/services" }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string().optional(), // зробили optional
    image: z.string().optional(),       // зробили optional
  }),
});

const news = defineCollection({
  // pattern: "**/*.{md,mdoc}" шукає всі md файли
  // base: "./src/content/news" вказує Astro, куди саме дивитись
  loader: glob({ pattern: "**/*.{md,mdoc}", base: "./src/content/news" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string(),
    image: image().optional(),
  }),
});

// Експортуємо ОБИДВІ колекції
export const collections = { 
  'services': services,
  'news': news 
};