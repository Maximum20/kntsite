import { config, fields, collection, singleton } from '@keystatic/core';

const isLocal = import.meta.env.DEV;

export default config({
  storage: isLocal
    ? { kind: 'local' }
    : {
        kind: 'github',
        repo: { owner: 'maximum20', name: 'kntsite' },
      },

  singletons: {
    // 1. СІНГЛТОН: КОНТАКТИ, ГРАФІК РОБОТИ ТА ГОЛОВНА СТОРІНКА
    siteSettings: singleton({
      label: 'Налаштування сайту та Контакти',
      path: 'src/content/singletons/settings',
      format: { data: 'json' },
      schema: {
        clinicShortName: fields.text({
          label: 'Коротка назва закладу',
          defaultValue: 'КНП "ДОКОД" ДОР',
        }),
        clinicFullName: fields.text({
          label: 'Повна назва закладу',
          defaultValue: 'КНП «Дніпровський обласний клінічний онкологічний диспансер» ДОР',
        }),
        departmentName: fields.text({
          label: 'Назва відділення',
          defaultValue: 'Відділення променевої терапії №1 з блоком реабілітації',
        }),
        mainClinicUrl: fields.text({
          label: 'Посилання на головний сайт клініки',
          defaultValue: 'https://dokod.org.ua/',
        }),
        heroTitle: fields.text({
          label: 'Заголовок головної сторінки',
          defaultValue: 'Центр променевої терапії',
        }),
        heroSubtitle: fields.text({
          label: 'Підзаголовок локації',
          defaultValue: 'У місті Дніпро',
        }),
        heroDescription: fields.text({
          label: 'Опис на головному екрані',
          multiline: true,
          defaultValue:
            'Ми створили цей простір, щоб зробити складні технології зрозумілими. Тут ви знайдете повну інформацію про наше обладнання, методи лікування та кожен крок вашого шляху до одужання.',
        }),
        statsYears: fields.text({
          label: 'Статистика: років досвіду',
          defaultValue: '15+',
        }),
        statsPatients: fields.text({
          label: 'Статистика: пацієнтів щорічно',
          defaultValue: '1500+',
        }),
        schedule: fields.text({
          label: 'Графік роботи реєстратури та відділення',
          defaultValue: 'Пн–Пт: 08:00 – 16:00 • Сб–Нд: вихідний',
        }),
        scheduleNote: fields.text({
          label: 'Примітка щодо прийому',
          defaultValue: 'Прийом за електронним направленням від онколога або сімейного лікаря (безоплатно за програмою НСЗУ)',
        }),
        email: fields.text({
          label: 'Офіційний Email відділення',
          defaultValue: 'linac_olt1@ukr.net',
        }),
        phones: fields.array(
          fields.object({
            number: fields.text({ label: 'Номер телефону (напр., (056) 720-79-01)' }),
            label: fields.text({ label: 'Підпис (напр., Міський / Реєстратура / Водафон)' }),
          }),
          {
            label: 'Телефони реєстратури',
            itemLabel: (props) => `${props.fields.number.value || 'Телефон'} (${props.fields.label.value || ''})`,
          }
        ),
        addresses: fields.array(
          fields.object({
            address: fields.text({ label: 'Адреса (напр., м. Дніпро, вул. Космічна, 21)' }),
            subtitle: fields.text({ label: 'Підпис корпусу (напр., Корпус променевої терапії • КНП "ДОКОД" ДОР)' }),
            mapUrl: fields.text({ label: 'Посилання на маршрут у Google Maps' }),
          }),
          {
            label: 'Адреси та локації',
            itemLabel: (props) => props.fields.address.value || 'Адреса',
          }
        ),
        socials: fields.object(
          {
            facebook: fields.text({ label: 'Facebook URL', defaultValue: 'https://www.facebook.com/kz.kod.dor' }),
            telegram: fields.text({ label: 'Telegram URL', defaultValue: 'https://t.me/dokod_dp' }),
            instagram: fields.text({ label: 'Instagram URL', defaultValue: 'https://www.instagram.com/dokod.dp/' }),
            youtube: fields.text({ label: 'YouTube URL', defaultValue: 'https://www.youtube.com/@dokodlic' }),
            tiktok: fields.text({ label: 'TikTok URL', defaultValue: 'https://www.tiktok.com/@dokod.dp' }),
          },
          { label: 'Соціальні мережі' }
        ),
      },
    }),

    // 2. СІНГЛТОН: ОБЛАДНАННЯ, МЕТОДИ ЛІКУВАННЯ (IMRT, VMAT, IGRT, SBRT) ТА FAQ
    equipmentAndMethods: singleton({
      label: 'Обладнання, Методи та FAQ',
      path: 'src/content/singletons/equipment',
      format: { data: 'json' },
      schema: {
        sectionTitle: fields.text({
          label: 'Заголовок блоку обладнання',
          defaultValue: 'Сучасне обладнання для променевої терапії',
        }),
        sectionSubtitle: fields.text({
          label: 'Підзаголовок блоку обладнання',
          multiline: true,
          defaultValue:
            'У нашому центрі встановлено три лінійних прискорювача Elekta останнього покоління та систему стереотаксичної навігації BrainLAB для високоточного лікування онкологічних захворювань',
        }),
        methods: fields.array(
          fields.object({
            code: fields.text({ label: 'Абревіатура методу (IMRT, VMAT, IGRT, SBRT)' }),
            title: fields.text({ label: 'Повна назва методу' }),
            description: fields.text({ label: 'Опис суті та переваг для пацієнта', multiline: true }),
            badge: fields.text({ label: 'Короткий тег (напр., Захист органів / Швидкість 2-3 хв)' }),
          }),
          {
            label: 'Методики опромінення (IMRT, VMAT, IGRT, SBRT)',
            itemLabel: (props) => `${props.fields.code.value || 'Метод'} — ${props.fields.title.value || ''}`,
          }
        ),
        accelerators: fields.array(
          fields.object({
            name: fields.text({ label: 'Назва апарату (напр., Elekta Versa HD)' }),
            image: fields.text({ label: 'Шлях до фото (напр., /hero/versahd.jpg)' }),
            imaging: fields.text({ label: 'Система візуалізації (напр., XVI, iView)' }),
            controlSystem: fields.text({ label: 'Додаткова система контролю (напр., BrainLAB ExacTrac Dynamic)' }),
            description: fields.text({ label: 'Опис можливостей апарату', multiline: true }),
          }),
          {
            label: 'Лінійні прискорювачі та апарати',
            itemLabel: (props) => props.fields.name.value || 'Апарат',
          }
        ),
        faq: fields.array(
          fields.object({
            question: fields.text({ label: 'Запитання пацієнта' }),
            answer: fields.text({ label: 'Відповідь фахівців', multiline: true }),
            category: fields.text({ label: 'Категорія (НСЗУ, Підготовка, Безпека, Процедура)', defaultValue: 'Загальне' }),
          }),
          {
            label: 'Поширені запитання пацієнтів (FAQ)',
            itemLabel: (props) => props.fields.question.value || 'Питання FAQ',
          }
        ),
      },
    }),

    // 3. СІНГЛТОН: МАРШРУТ ТА ЧЕКЛІСТ ПАЦІЄНТА
    patientRoute: singleton({
      label: 'Маршрут та Чекліст пацієнта',
      path: 'src/content/singletons/patient-route',
      format: { data: 'json' },
      schema: {
        title: fields.text({
          label: 'Заголовок маршруту',
          defaultValue: 'Шлях пацієнта',
        }),
        subtitle: fields.text({
          label: 'Підзаголовок маршруту',
          defaultValue: 'Чотири послідовні кроки — персоналізований шлях для кожного пацієнта',
        }),
        checklistTitle: fields.text({
          label: 'Заголовок інтерактивного чекліста',
          defaultValue: 'Чекліст підготовки до першого візиту',
        }),
        checklistSubtitle: fields.text({
          label: 'Опис чекліста',
          defaultValue: 'Відмічайте підготовлені документи та етапи — ваш прогрес автоматично зберігається у браузері',
        }),
        checklistItems: fields.array(
          fields.object({
            id: fields.text({ label: 'Унікальний код пункту (напр., doc-referral)' }),
            title: fields.text({ label: 'Назва пункту чекліста' }),
            hint: fields.text({ label: 'Підказка / пояснення для пацієнта' }),
            stepBadge: fields.text({ label: 'Етап (напр., Документи / Обстеження / На сеанс)' }),
          }),
          {
            label: 'Пункти чекліста пацієнта',
            itemLabel: (props) => props.fields.title.value || 'Пункт чекліста',
          }
        ),
      },
    }),
  },

  collections: {
    // 1. КОЛЕКЦІЯ НОВИН
    news: collection({
      label: 'Новини та публікації',
      slugField: 'title',
      path: 'src/content/news/*',
      format: { data: 'yaml', contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Заголовок' } }),
        date: fields.date({ label: 'Дата публікації' }),
        category: fields.select({
          label: 'Категорія',
          options: [
            { label: 'Новина', value: 'Новина' },
            { label: 'Технології', value: 'Технології' },
            { label: 'Подія', value: 'Подія' },
            { label: 'Пацієнтам', value: 'Пацієнтам' },
          ],
          defaultValue: 'Новина',
        }),
        tags: fields.array(fields.text({ label: 'Тег' }), {
          label: 'Теги новини',
          itemLabel: (props) => props.value || 'Тег',
        }),
        isPinned: fields.checkbox({
          label: 'Закріпити в топі (показувати першою)',
          defaultValue: false,
        }),
        image: fields.image({
          label: 'Головне фото',
          directory: 'src/assets/news',
          publicPath: '/src/assets/news/',
        }),
        description: fields.text({ label: 'Короткий опис', multiline: true }),
        content: fields.markdoc({
          label: 'Основний текст',
          extension: 'md',
        }),
      },
    }),

    // 2. КОЛЕКЦІЯ ПЕРСОНАЛУ (Лікарі, медичні фізики, інженери-радіологи, медсестри)
    staff: collection({
      label: 'Персонал відділення',
      slugField: 'surname',
      path: 'src/content/staff/*',
      format: { data: 'json' },
      schema: {
        surname: fields.slug({ name: { label: 'Прізвище' } }),
        name: fields.text({ label: "Ім'я (та по батькові за потреби)" }),
        fullNamePatronymic: fields.text({ label: 'Повне ПІБ (для офіційних блоків)' }),
        role: fields.text({
          label: 'Посада (напр., Лікар з радіаційної онкології, Медичний фізик, Лікар-рентгенолог)',
          defaultValue: 'Лікар з радіаційної онкології',
        }),
        department: fields.select({
          label: 'Відділення / підрозділ',
          options: [
            { label: 'Мегавольтна терапія', value: 'Мегавольтна терапія' },
            { label: 'Гамма-терапія', value: 'Гамма-терапія' },
            { label: 'Брахітерапія', value: 'Брахітерапія' },
            { label: 'Близький фокус', value: 'Близький фокус' },
            { label: 'КТ-розмітка', value: 'КТ-розмітка' },
            { label: 'Реабілітація', value: 'Реабілітація' },
            { label: 'Інженерно-фізична група', value: 'Інженерно-фізична група' },
          ],
          defaultValue: 'Мегавольтна терапія',
        }),
        badge: fields.text({
          label: 'Особлива відзнака / керівна посада (необовʼязково)',
        }),
        isHead: fields.checkbox({
          label: 'Керівник відділення (відображати у виділеному блоці очільника)',
          defaultValue: false,
        }),
        experience: fields.text({
          label: 'Стаж роботи / кваліфікаційна категорія',
          defaultValue: '10 років',
        }),
        specializations: fields.array(fields.text({ label: 'Спеціалізація / методика' }), {
          label: 'Спеціалізації та ключові напрямки',
          itemLabel: (props) => props.value || 'Напрямок',
        }),
        bio: fields.text({
          label: 'Короткий опис / біографія',
          multiline: true,
        }),
        education: fields.text({
          label: 'Освіта та кваліфікація',
          defaultValue: '-',
        }),
        achievements: fields.text({
          label: 'Досягнення та стажування',
        }),
        image: fields.image({
          label: 'Фото фахівця',
          directory: 'public/hero/doctors',
          publicPath: '/hero/doctors/',
        }),
        color: fields.text({
          label: 'Кольоровий градієнт бейджа (Tailwind)',
          defaultValue: 'from-slate-600 to-slate-700',
        }),
        order: fields.integer({
          label: 'Порядок сортування (1 — перший)',
          defaultValue: 10,
        }),
        isVisible: fields.checkbox({
          label: 'Відображати на сайті',
          defaultValue: true,
        }),
      },
    }),

    // 3. КОЛЕКЦІЯ ВІДДІЛЕНЬ / НАПРЯМКІВ ЛІКУВАННЯ
    services: collection({
      label: 'Відділення та Послуги',
      slugField: 'title',
      path: 'src/content/services/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Назва відділення / послуги' } }),
        subtitle: fields.text({ label: 'Підзаголовок' }),
        description: fields.text({ label: 'Короткий опис для пошуку та мета-тегів', multiline: true }),
        image: fields.text({ label: 'Шлях до фото (напр., /hero/main_page2.jpg)' }),
        content: fields.mdx({
          label: 'Контент сторінки напрямку (MDX)',
        }),
      },
    }),

    // 4. КОЛЕКЦІЯ ВАКАНСІЙ
    vacancies: collection({
      label: 'Вакансії',
      slugField: 'title',
      path: 'src/content/vacancies/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Назва вакансії' } }),
        date: fields.date({ label: 'Дата публікації' }),
        isActive: fields.checkbox({ label: 'Актуальна вакансія (Відкрита)', defaultValue: true }),
        image: fields.image({
          label: 'Головне фото',
          directory: 'src/assets/vacancies',
          publicPath: '/src/assets/vacancies/',
        }),
        description: fields.text({ label: 'Короткий опис для списку', multiline: true }),
        benefits: fields.array(
          fields.object({
            title: fields.text({ label: 'Заголовок переваги (напр., 6-годинний графік)' }),
            image: fields.image({
              label: 'Фото для цієї плитки',
              directory: 'src/assets/vacancies/benefits',
              publicPath: '/src/assets/vacancies/benefits/',
            }),
          }),
          {
            label: 'Переваги компанії (плитки)',
            itemLabel: (props) => props.fields.title.value || 'Нова перевага',
          }
        ),
        contacts: fields.object(
          {
            phone: fields.text({ label: 'Номер телефону (напр., +380671234567)' }),
            email: fields.text({ label: 'Email для резюме' }),
            messengerUrl: fields.text({ label: 'Посилання на месенджер (напр., https://t.me/username)' }),
            messengerName: fields.text({
              label: 'Назва месенджера (напр., Telegram або Viber)',
              defaultValue: 'Telegram',
            }),
          },
          { label: 'Контакти для відгуку' }
        ),
        content: fields.mdx({
          label: 'Повний опис вакансії (обовʼязки, вимоги)',
          options: {
            image: {
              directory: 'src/assets/vacancies/inline',
              publicPath: '/src/assets/vacancies/inline/',
            },
          },
        }),
      },
    }),
  },
});
