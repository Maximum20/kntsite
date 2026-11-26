import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const serviceSectionSchema = z.object({
  discriminant: z.string(),
  value: z.record(z.string(), z.any()).optional().default({}),
});

const services = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/services' }),
  schema: z.object({
    title: z.string().default('Відділення променевої терапії'),
    navTitle: z.string().optional().default(''),
    subtitle: z.string().optional().default('Напрямок лікування'),
    heroTitle: z.string().optional().default(''),
    description: z.string().optional().default(''),
    heroText: z.string().optional().default(''),
    gallery: z
      .array(
        z.object({
          image: z.string().nullable().optional(),
          caption: z.string().optional().default(''),
        })
      )
      .optional()
      .default([]),
    image: z.string().optional().default('/hero/main_page2.jpg'),
    icon: z.string().optional().default('🏥'),
    searchKeywords: z.array(z.string()).optional().default([]),
    order: z.number().optional().default(10),
    isVisible: z.boolean().optional().default(true),
    showScrollProgress: z.boolean().optional().default(true),
    sections: z.array(serviceSectionSchema).optional().default([]),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdoc}', base: './src/content/news' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().default('Новина відділення'),
      date: z.coerce.date().optional().default(() => new Date()),
      category: z.string().optional().default('Новина'),
      tags: z.array(z.string()).optional().default([]),
      isPinned: z.boolean().optional().default(false),
      description: z.string().optional().default(''),
      image: z.union([image(), z.string()]).nullable().optional(),
    }),
});

const staffRoles = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/staff-roles' }),
  schema: z.object({
    title: z.string().default('Фахівець відділення'),
    group: z.enum(['doctors', 'specialists']).optional().default('doctors'),
    order: z.number().optional().default(10),
    defaultShowBackCard: z.boolean().optional().default(true),
  }),
});

const staff = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/staff' }),
  schema: z.object({
    surname: z.string().default(''),
    name: z.string().optional().default(''),
    fullNamePatronymic: z.string().optional().default(''),
    badge: z.string().optional().default(''),
    isHead: z.boolean().optional().default(false),
    role: z.string().nullable().optional().default('likar-z-radiatsiinoi-onkolohii'),
    department: z.string().optional().default('Мегавольтна терапія'),
    bio: z.string().optional().default(''),
    image: z.string().nullable().optional().default(''),
    experience: z.string().optional().default(''),
    specializations: z.array(z.string()).optional().default([]),
    education: z.string().optional().default(''),
    achievements: z.string().optional().default(''),
    color: z.string().optional().default('from-slate-600 to-slate-700'),
    order: z.number().optional().default(100),
    isActive: z.boolean().optional().default(true),
    showBackCard: z.enum(['auto', 'show', 'hide']).optional().default('auto'),
  }),
});

const vacancies = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdoc,mdx}', base: './src/content/vacancies' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().default('Вакансія'),
      date: z.coerce.date().optional().default(() => new Date()),
      isActive: z.boolean().optional().default(true),
      description: z.string().optional().default(''),
      image: image().optional(),
      benefits: z
        .array(
          z.object({
            title: z.string().default(''),
            image: image().optional(),
          })
        )
        .optional()
        .default([]),
      contacts: z
        .object({
          phone: z.string().optional().default(''),
          email: z.string().optional().default(''),
          messengerUrl: z.string().optional().default(''),
          messengerName: z.string().optional().default('Telegram'),
        })
        .optional(),
    }),
});

export const collections = {
  services,
  news,
  staffRoles,
  staff,
  vacancies,
};
