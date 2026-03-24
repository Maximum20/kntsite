import { config, fields, collection } from '@keystatic/core';

export default config({
  storage: {
    kind: 'github',
    repo: { owner: 'maximum20', name: 'kntsite' },
  },
  collections: {
    news: collection({
      label: 'Новини',
      slugField: 'title',
      path: 'src/content/news/*',
      // Використовуємо стандартний формат, він зазвичай дає .md або .mdoc
      format: { data: 'yaml', contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Заголовок' } }),
        date: fields.date({ label: 'Дата публікації' }),
        description: fields.text({ label: 'Короткий опис', multiline: true }),
        content: fields.document({ 
          label: 'Основний текст',
          formatting: true,
          dividers: true,
          links: true,
        }),
      },
    }),
  },
});