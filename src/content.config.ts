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

// src/content.config.ts
// src/content.config.ts
const vacancies = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdoc,mdx}", base: "./src/content/vacancies" }), 
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.coerce.date(),
    isActive: z.boolean().default(true),
    description: z.string().optional(),
    image: image().optional(),
    benefits: z.array(z.object({
      title: z.string(),
      image: image().optional(),
    })).optional(),

    // 👇 Додаємо сюди контакти
    contacts: z.object({
      phone: z.string().optional(),
      email: z.string().optional(),
      messengerUrl: z.string().optional(),
      messengerName: z.string().optional(),
    }).optional(),
  }),
});

// Експортуємо УСІ колекції
export const collections = { 
  'services': services,
  'news': news,
  'vacancies': vacancies // 👈 Додано сюди
};