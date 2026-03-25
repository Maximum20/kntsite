import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

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

export const collections = { news };