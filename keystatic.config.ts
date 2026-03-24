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
      path: 'src/content/news/*.md',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Заголовок' } }),
        date: fields.date({ label: 'Дата публікації' }),
        description: fields.text({ label: 'Короткий опис (анонс)', multiline: true }),
        content: fields.markdoc({ label: 'Основний текст' }),
      },
    }),
  },
});