import { config, fields, collection } from '@keystatic/core';

// Перевіряємо, чи ми запускаємо локально (npm run dev)
const isLocal = process.env.NODE_ENV === 'development';

export default config({
  // Якщо локально - зберігаємо на диск, якщо на сервері - в GitHub
  storage: isLocal 
    ? { kind: 'local' } 
    : {
        kind: 'github',
        repo: { owner: 'maximum20', name: 'kntsite' },
      },
  collections: {
    news: collection({
      label: 'Новини',
      slugField: 'title',
      path: 'src/content/news/*',
      format: { data: 'yaml', contentField: 'content' },
      // ... (початок файлу без змін)
      schema: {
        title: fields.slug({ name: { label: 'Заголовок' } }),
        date: fields.date({ label: 'Дата публікації' }),
        // 👇 Додаємо поле для фото
        image: fields.image({
  label: 'Головне фото',
  directory: 'src/assets/news',
  publicPath: '/src/assets/news/' // 👈 Починаємо від /src
}),
        description: fields.text({ label: 'Короткий опис', multiline: true }),
        content: fields.markdoc({ 
          label: 'Основний текст',
          extension: 'md'
        }),
      },
// ...
    }),
  },
});