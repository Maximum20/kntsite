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
    // 1. КОЛЕКЦІЯ НОВИН
    news: collection({
      label: 'Новини',
      slugField: 'title',
      path: 'src/content/news/*',
      format: { data: 'yaml', contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Заголовок' } }),
        date: fields.date({ label: 'Дата публікації' }),
        image: fields.image({
          label: 'Головне фото',
          directory: 'src/assets/news',
          publicPath: '/src/assets/news/'
        }),
        description: fields.text({ label: 'Короткий опис', multiline: true }),
        content: fields.markdoc({ 
          label: 'Основний text',
          extension: 'md'
        }),
      },
    }),

    // 2. КОЛЕКЦІЯ ВАКАНСІЙ
    vacancies: collection({
      label: 'Вакансії',
      slugField: 'title',
      path: 'src/content/vacancies/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Назва вакансії' } }),
        date: fields.date({ label: 'Дата публікації' }),
        
        // Зелений кружечок / статус актуальності
        isActive: fields.checkbox({ label: 'Актуальна вакансія (Відкрита)', defaultValue: true }),
        
        image: fields.image({
          label: 'Головне фото',
          directory: 'src/assets/vacancies',
          publicPath: '/src/assets/vacancies/'
        }),
        description: fields.text({ label: 'Короткий опис для списку', multiline: true }),
        
        // Шаблон для плиток переваг
        benefits: fields.array(
          fields.object({
            title: fields.text({ label: 'Заголовок переваги (напр., 6-годинний графік)' }),
            image: fields.image({
              label: 'Фото для цієї плитки',
              directory: 'src/assets/vacancies/benefits',
              publicPath: '/src/assets/vacancies/benefits/'
            })
          }),
          {
            label: 'Переваги компанії (плитки)',
            itemLabel: props => props.fields.title.value || 'Нова перевага'
          }
        ),
        
        // 👇 БЛОК КОНТАКТІВ (ДОДАНО СЮДИ)
        contacts: fields.object({
          phone: fields.text({ label: 'Номер телефону (напр., +380671234567)' }),
          email: fields.text({ label: 'Email для резюме' }),
          messengerUrl: fields.text({ label: 'Посилання на месенджер (напр., https://t.me/username)' }),
          messengerName: fields.text({ label: 'Назва месенджера (напр., Telegram або Viber)', defaultValue: 'Telegram' }),
        }, { label: 'Контакти для відгуку' }),
        
        content: fields.mdx({ 
          label: 'Повний опис вакансії (обовʼязки, вимоги)',
          options: {
            image: {
              directory: 'src/assets/vacancies/inline',
              publicPath: '/src/assets/vacancies/inline/'
            }
          }
        }),
      },
    }),
  },
});