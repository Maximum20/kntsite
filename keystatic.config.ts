import { config, fields, collection, singleton } from '@keystatic/core';
import {
  optimizedImageField,
  KeystaticBrandMark,
} from './src/components/keystatic/optimizedImageField';

const isLocal = import.meta.env.DEV;

const UA_TRANSLIT_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'h',
  ґ: 'g',
  д: 'd',
  е: 'e',
  є: 'ye',
  ж: 'zh',
  з: 'z',
  и: 'y',
  і: 'i',
  ї: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ь: '',
  ю: 'yu',
  я: 'ya',
  ё: 'yo',
  ъ: '',
  ы: 'y',
  э: 'e',
};

function transliterateUaToSlug(input: string): string {
  const lowered = String(input || '')
    .toLowerCase()
    .replace(/['ʼ’`]/g, '');
  let out = '';
  for (const ch of lowered) {
    out += ch in UA_TRANSLIT_MAP ? UA_TRANSLIT_MAP[ch] : ch;
  }
  return out
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/[\s-]+/g, '-');
}

export default config({
  ui: {
    brand: {
      name: 'КНТ «ДОКОД» ДОР',
      mark: KeystaticBrandMark,
    },
  },
  storage: isLocal
    ? { kind: 'local' }
    : {
        kind: 'github',
        repo: { owner: 'maximum20', name: 'kntsite' },
      },

  singletons: {
    // 1. СІНГЛТОН: КОНТАКТИ, ГРАФІК РОБОТИ, ГОЛОВНА СТОРІНКА ТА ОГОЛОШЕННЯ
    siteSettings: singleton({
      label: 'Налаштування сайту, Головна та Контакти',
      path: 'src/content/singletons/settings',
      format: { data: 'json' },
      schema: {
        clinicShortName: fields.text({
          label: 'Коротка назва закладу',
          defaultValue: 'КНТ "ДОКОД" ДОР',
        }),
        clinicFullName: fields.text({
          label: 'Повна назва закладу',
          defaultValue: 'КНТ «Дніпровський обласний клінічний онкологічний диспансер» ДОР',
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

        // Керування фотографіями головної сторінки та старим фотоархівом
        heroGallery: fields.array(
          fields.object({
            image: optimizedImageField({
              label: 'Фотографія',
              description: 'Горизонтальне фото 16:9 для верхнього слайдера на головній сторінці.',
              directory: 'public/images/hero',
              publicPath: '/images/hero/',
              defaultAspect: '16:9',
              maxWidth: 1600,
              quality: 0.82,
            }),
            alt: fields.text({
              label: 'Короткий опис фото (необовʼязково)',
            }),
          }),
          {
            label: 'Фото на головній (карусель)',
            description:
              'Додайте одне або декілька фото для слайдера у верхній частині головної сторінки.',
            itemLabel: (props) => props.fields.alt.value || 'Фото на головній',
          }
        ),
        hideLegacyPhotos: fields.checkbox({
          label: 'Сховати старі фото сайту',
          description:
            'Якщо увімкнути, на сайті залишаться лише фото, додані через адмінку, а замість старих зʼявляться акуратні заглушки. Самі файли не видаляються.',
          defaultValue: false,
        }),

        // Керування видимістю основних секцій головної сторінки
        homeSections: fields.object(
          {
            showDepartments: fields.checkbox({
              label: 'Секція «Напрямки / Відділення»',
              defaultValue: true,
            }),
            showAdvantages: fields.checkbox({
              label: 'Секція «Наші переваги»',
              defaultValue: true,
            }),
            showPatientJourney: fields.checkbox({
              label: 'Секція «Шлях пацієнта та Чекліст»',
              defaultValue: true,
            }),
            showEquipment: fields.checkbox({
              label: 'Секція «Обладнання та Методики»',
              defaultValue: true,
            }),
            showFaq: fields.checkbox({
              label: 'Секція «Поширені запитання (FAQ)»',
              defaultValue: true,
            }),
            showTeam: fields.checkbox({
              label: 'Секція «Команда / Лікарі»',
              defaultValue: true,
            }),
            showContacts: fields.checkbox({
              label: 'Секція «Контакти»',
              defaultValue: true,
            }),
            showNews: fields.checkbox({
              label: 'Секція «Новини»',
              defaultValue: true,
            }),
          },
          {
            label: 'Видимість блоків головної сторінки',
            description: 'Вмикайте або тимчасово приховуйте секції головної сторінки без втрати контенту.',
          }
        ),

        // Кастомний блок тимчасового / важливого оголошення
        announcement: fields.object(
          {
            isActive: fields.checkbox({
              label: 'Показувати оголошення на головній сторінці',
              description: 'Вимкніть, щоб приховати оголошення без видалення тексту.',
              defaultValue: false,
            }),
            type: fields.select({
              label: 'Стиль / тип оголошення',
              options: [
                { label: 'Інформаційне (info)', value: 'info' },
                { label: 'Важливе попередження (warning)', value: 'warning' },
                { label: 'Термінове (urgent)', value: 'urgent' },
              ],
              defaultValue: 'info',
            }),
            title: fields.text({
              label: 'Заголовок оголошення',
            }),
            text: fields.text({
              label: 'Текст оголошення (підтримує **жирний**, *курсив* та [посилання](https://...))',
              multiline: true,
            }),
            buttonText: fields.text({
              label: 'Текст кнопки-посилання (необовʼязково)',
            }),
            buttonUrl: fields.text({
              label: 'URL кнопки-посилання (необовʼязково, напр. /#contacts або https://...)',
            }),
          },
          {
            label: 'Важливе оголошення (банер у верхній частині головної)',
          }
        ),

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
            subtitle: fields.text({ label: 'Підпис корпусу (напр., Корпус променевої терапії • КНТ "ДОКОД" ДОР)' }),
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
        image: optimizedImageField({
          label: 'Головне фото новини',
          description: 'Рекомендовано горизонтальне фото 16:9. Можна обрізати та стиснути прямо тут.',
          directory: 'public/images/news',
          publicPath: '/images/news/',
          defaultAspect: '16:9',
          maxWidth: 1200,
          quality: 0.8,
        }),
        description: fields.text({ label: 'Короткий опис', multiline: true }),
        content: fields.markdoc({
          label: 'Основний текст',
          extension: 'md',
        }),
      },
    }),

    // 2. КОЛЕКЦІЯ ПОСАД ПЕРСОНАЛУ (Довідник посад для адмінки та фільтрів на сайті)
    staffRoles: collection({
      label: 'Посади персоналу',
      slugField: 'title',
      path: 'src/content/staff-roles/*',
      format: { data: 'json' },
      columns: ['title', 'group', 'order', 'defaultShowBackCard'],
      schema: {
        title: fields.slug({
          name: {
            label: 'Назва посади',
            validation: { isRequired: true },
          },
          slug: {
            label: 'Системний код (формується автоматично)',
            generate: transliterateUaToSlug,
          },
        }),
        group: fields.select({
          label: 'Група на сайті',
          options: [
            { label: 'Лікарі', value: 'doctors' },
            {
              label: 'Медичні фізики, інженери та середній медперсонал',
              value: 'specialists',
            },
          ],
          defaultValue: 'doctors',
        }),
        order: fields.integer({
          label: 'Порядок відображення',
          defaultValue: 10,
        }),
        defaultShowBackCard: fields.checkbox({
          label: 'Показувати зворотну анкету за замовчуванням',
          defaultValue: true,
        }),
      },
    }),

    // 3. КОЛЕКЦІЯ ПЕРСОНАЛУ (Лікарі, медичні фізики, інженери-радіологи, медсестри)
    staff: collection({
      label: 'Персонал відділення',
      slugField: 'surname',
      path: 'src/content/staff/*',
      format: { data: 'json' },
      columns: ['fullNamePatronymic', 'role', 'isActive', 'order'],
      schema: {
        surname: fields.slug({
          name: {
            label: 'Прізвище',
            validation: { isRequired: true },
          },
          slug: {
            label: 'Імʼя файлу (латиницею)',
            generate: transliterateUaToSlug,
          },
        }),
        name: fields.text({ label: "Ім'я (та по батькові за потреби)" }),
        fullNamePatronymic: fields.text({
          label: 'ПІБ українською',
          description: 'Повне ПІБ (показується у списку персоналу в адмінці та в офіційних блоках).',
          validation: { isRequired: true },
        }),
        role: fields.relationship({
          label: 'Посада',
          description: 'Оберіть посаду зі списку (редагується у розділі «Посади персоналу»).',
          collection: 'staffRoles',
          validation: { isRequired: true },
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
        isActive: fields.checkbox({
          label: 'Показувати на сайті',
          description: 'Вимкніть, щоб приховати картку з сайту та пошуку без видалення працівника.',
          defaultValue: true,
        }),
        order: fields.integer({
          label: 'Порядок у списку',
          description: 'Менше число — вище у списку. За однакового числа діє сортування за алфавітом.',
          defaultValue: 100,
        }),
        showBackCard: fields.select({
          label: 'Зворотна сторона картки',
          description: 'Керує тим, чи перевертається картка для перегляду детальної анкети.',
          options: [
            { label: 'Авто (за посадою і наявністю інформації)', value: 'auto' },
            { label: 'Завжди показувати', value: 'show' },
            { label: 'Не показувати', value: 'hide' },
          ],
          defaultValue: 'auto',
        }),
        badge: fields.text({
          label: 'Особлива відзнака / керівна посада (необовʼязково)',
        }),
        isHead: fields.checkbox({
          label: 'Керівник відділення (відображати у виділеному блоці очільника)',
          defaultValue: false,
        }),
        image: optimizedImageField({
          label: 'Фото працівника',
          description: 'Рекомендовано вертикальний портрет 3:4. Можна обрізати та стиснути прямо тут.',
          directory: 'public/images/staff',
          publicPath: '/images/staff/',
          defaultAspect: '3:4',
          maxWidth: 800,
          quality: 0.8,
        }),
        experience: fields.text({
          label: 'Стаж роботи / кваліфікаційна категорія',
        }),
        specializations: fields.array(fields.text({ label: 'Спеціалізація / методика' }), {
          label: 'Спеціалізації та ключові напрямки',
          itemLabel: (props) => props.value || 'Напрямок',
        }),
        bio: fields.text({
          label: 'Цитата / короткий опис (біографія)',
          multiline: true,
        }),
        education: fields.text({
          label: 'Освіта та кваліфікація',
        }),
        achievements: fields.text({
          label: 'Досягнення та стажування',
        }),
        color: fields.text({
          label: 'Кольоровий градієнт бейджа (Tailwind)',
          defaultValue: 'from-slate-600 to-slate-700',
        }),
      },
    }),

    // 3. КОЛЕКЦІЯ ВІДДІЛЕНЬ / НАПРЯМКІВ ЛІКУВАННЯ (Структуровані блоки + MDX без сирих import)
    services: collection({
      label: 'Відділення та Послуги',
      slugField: 'title',
      path: 'src/content/services/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Назва відділення / послуги' } }),
        navTitle: fields.text({
          label: 'Коротка назва для меню навігації (необовʼязково)',
          description: 'Якщо порожньо, у меню показується основна назва відділення.',
        }),
        subtitle: fields.text({
          label: 'Підзаголовок / бейдж',
          defaultValue: 'Напрямок лікування',
        }),
        heroTitle: fields.text({
          label: 'Заголовок у верхньому блоці (необовʼязково, якщо відрізняється від назви)',
        }),
        description: fields.text({
          label: 'Короткий опис для карток, пошуку та SEO',
          multiline: true,
        }),
        heroText: fields.text({
          label: 'Розгорнутий вступний текст на сторінці відділення',
          multiline: true,
        }),
        gallery: fields.array(
          fields.object({
            image: optimizedImageField({
              label: 'Фотографія',
              description: 'Рекомендований формат 4:3 (підходить і для картки, і для сторінки відділення).',
              directory: 'public/images/services',
              publicPath: '/images/services/',
              defaultAspect: '4:3',
              maxWidth: 1200,
              quality: 0.8,
            }),
            caption: fields.text({
              label: 'Підпис до фото (необовʼязково)',
            }),
          }),
          {
            label: 'Фото відділення (1-ше фото — головне на картці)',
            description:
              'Перше фото показується головним на картці на головній сторінці. Якщо додати 2 і більше фото — зʼявляться стрілочки гортання прямо на картці та всередині сторінки відділення.',
            itemLabel: (props) => props.fields.caption.value || 'Фото відділення',
          }
        ),
        image: fields.text({
          label: 'Старе фото (резервний шлях, можна не змінювати)',
          defaultValue: '/hero/main_page2.jpg',
        }),
        icon: fields.text({
          label: 'Іконка напрямку (емодзі для карток і пошуку)',
          defaultValue: '🏥',
        }),
        searchKeywords: fields.array(fields.text({ label: 'Ключове слово' }), {
          label: 'Ключові слова для розумного пошуку',
          itemLabel: (props) => props.value || 'Ключове слово',
        }),
        order: fields.integer({
          label: 'Порядок відображення (1 — перший)',
          defaultValue: 10,
        }),
        isVisible: fields.checkbox({
          label: 'Відображати відділення на сайті (головна, меню, пошук)',
          defaultValue: true,
        }),
        showScrollProgress: fields.checkbox({
          label: 'Показувати смугу прогресу читання',
          defaultValue: true,
        }),
        sections: fields.blocks(
          {
            accelerators: {
              label: 'Блок лінійних прискорювачів та BrainLAB',
              itemLabel: () => '⚡ Обладнання: Лінійні прискорювачі та BrainLAB',
              schema: fields.object({
                enabled: fields.checkbox({
                  label: 'Показувати блок обладнання',
                  defaultValue: true,
                }),
              }),
            },
            staff: {
              label: 'Персонал відділення (з колекції Персонал)',
              itemLabel: (props) =>
                `👨‍⚕️ ${props.fields.title.value || 'Персонал відділення'} (${props.fields.departmentFilter.value})`,
              schema: fields.object({
                title: fields.text({
                  label: 'Заголовок блоку',
                  defaultValue: 'Персонал відділення',
                }),
                icon: fields.text({ label: 'Іконка', defaultValue: '👨‍⚕️' }),
                introText: fields.text({
                  label: 'Вступний текст про команду (необовʼязково)',
                  multiline: true,
                }),
                departmentFilter: fields.select({
                  label: 'Автоматичний підбір за підрозділом',
                  options: [
                    { label: 'Мегавольтна терапія', value: 'Мегавольтна терапія' },
                    { label: 'Гамма-терапія', value: 'Гамма-терапія' },
                    { label: 'Брахітерапія', value: 'Брахітерапія' },
                    { label: 'Близький фокус', value: 'Близький фокус' },
                    { label: 'КТ-розмітка', value: 'КТ-розмітка' },
                    { label: 'Реабілітація', value: 'Реабілітація' },
                    { label: 'Інженерно-фізична група', value: 'Інженерно-фізична група' },
                    { label: 'Усі відділення', value: 'Усі' },
                    { label: 'Тільки обрані вручну нижче', value: 'manual' },
                  ],
                  defaultValue: 'Мегавольтна терапія',
                }),
                roleFilter: fields.text({
                  label: 'Фільтр за посадою (необовʼязково, напр. Лікар з радіаційної онкології)',
                }),
                selectedStaff: fields.multiRelationship({
                  label: 'Обрати конкретних працівників вручну (додатково або замість фільтра)',
                  collection: 'staff',
                }),
                displayMode: fields.select({
                  label: 'Відображення',
                  options: [
                    { label: 'У розкривному акордеоні', value: 'accordion' },
                    { label: 'Відкритою секцією', value: 'section' },
                  ],
                  defaultValue: 'accordion',
                }),
              }),
            },
            highlight: {
              label: 'Виділений банер / Попередження / Протипоказання',
              itemLabel: (props) =>
                `${props.fields.icon.value || '💡'} ${props.fields.title.value || 'Виділений банер'}`,
              schema: fields.object({
                variant: fields.select({
                  label: 'Стиль блоку',
                  options: [
                    { label: 'Інформаційний (синій)', value: 'info' },
                    { label: 'Успіх / безпека (зелений)', value: 'success' },
                    { label: 'Попередження (жовто-помаранчевий)', value: 'warning' },
                    { label: 'Критичне застереження (червоний)', value: 'danger' },
                  ],
                  defaultValue: 'info',
                }),
                icon: fields.text({ label: 'Іконка (емодзі)', defaultValue: '💡' }),
                title: fields.text({ label: 'Заголовок' }),
                text: fields.text({
                  label: 'Текст (підтримує **жирний**, підзаголовки ### та списки з «- »)',
                  multiline: true,
                }),
                infoBoxes: fields.array(
                  fields.object({
                    icon: fields.text({ label: 'Іконка' }),
                    title: fields.text({ label: 'Заголовок' }),
                    text: fields.text({ label: 'Опис', multiline: true }),
                  }),
                  {
                    label: 'Картки всередині блоку (необовʼязково)',
                    itemLabel: (p) => p.fields.title.value || 'Картка',
                  }
                ),
                checklistTitle: fields.text({ label: 'Заголовок чекліста всередині (необовʼязково)' }),
                checklistItems: fields.array(fields.text({ label: 'Пункт чекліста' }), {
                  label: 'Пункти чекліста (необовʼязково)',
                  itemLabel: (p) => p.value || 'Пункт',
                }),
                warningNote: fields.text({
                  label: 'Нижня акцентна примітка (необовʼязково)',
                  multiline: true,
                }),
              }),
            },
            comparison: {
              label: 'Порівняння (2 колонки)',
              itemLabel: (props) =>
                `⚖️ ${props.fields.leftTitle.value || 'Ліва'} vs ${props.fields.rightTitle.value || 'Права'}`,
              schema: fields.object({
                leftIcon: fields.text({ label: 'Іконка лівої колонки', defaultValue: '⚡' }),
                leftTitle: fields.text({ label: 'Заголовок лівої колонки' }),
                leftText: fields.text({ label: 'Опис лівої колонки', multiline: true }),
                leftItems: fields.array(fields.text({ label: 'Пункт' }), {
                  label: 'Перелік лівої колонки',
                  itemLabel: (p) => p.value || 'Пункт',
                }),
                rightIcon: fields.text({ label: 'Іконка правої колонки', defaultValue: '🌱' }),
                rightTitle: fields.text({ label: 'Заголовок правої колонки' }),
                rightText: fields.text({ label: 'Опис правої колонки', multiline: true }),
                rightItems: fields.array(fields.text({ label: 'Пункт' }), {
                  label: 'Перелік правої колонки',
                  itemLabel: (p) => p.value || 'Пункт',
                }),
              }),
            },
            timeline: {
              label: 'Таймлайн / Етапи процедури',
              itemLabel: (props) =>
                `🕒 ${props.fields.title.value || 'Етапи'} (${props.fields.items.elements.length})`,
              schema: fields.object({
                title: fields.text({ label: 'Заголовок (необовʼязково)' }),
                items: fields.array(
                  fields.object({
                    title: fields.text({ label: 'Назва етапу' }),
                    text: fields.text({ label: 'Опис етапу', multiline: true }),
                  }),
                  {
                    label: 'Етапи',
                    itemLabel: (p) => p.fields.title.value || 'Етап',
                  }
                ),
              }),
            },
            featureGrid: {
              label: 'Сітка переваг / ефектів',
              itemLabel: (props) =>
                `✨ ${props.fields.title.value || 'Переваги'} (${props.fields.items.elements.length})`,
              schema: fields.object({
                title: fields.text({ label: 'Заголовок (необовʼязково)' }),
                items: fields.array(
                  fields.object({
                    icon: fields.text({ label: 'Іконка (емодзі)' }),
                    title: fields.text({ label: 'Заголовок картки' }),
                    text: fields.text({ label: 'Опис', multiline: true }),
                  }),
                  {
                    label: 'Картки',
                    itemLabel: (p) => p.fields.title.value || 'Картка',
                  }
                ),
              }),
            },
            checklist: {
              label: 'Інтерактивний чекліст',
              itemLabel: (props) => `☑️ ${props.fields.title.value || 'Чекліст'}`,
              schema: fields.object({
                title: fields.text({ label: 'Заголовок чекліста' }),
                items: fields.array(fields.text({ label: 'Пункт' }), {
                  label: 'Пункти чекліста',
                  itemLabel: (p) => p.value || 'Пункт',
                }),
              }),
            },
            accordion: {
              label: 'Секція-акордеон (Опис, Показання, Методики, Побічні ефекти)',
              itemLabel: (props) =>
                `${props.fields.icon.value || '📋'} ${props.fields.title.value || 'Секція'}`,
              schema: fields.object({
                title: fields.text({ label: 'Заголовок акордеону' }),
                icon: fields.text({ label: 'Іконка (емодзі)', defaultValue: '📋' }),
                variant: fields.select({
                  label: 'Стиль рамки',
                  options: [
                    { label: 'Звичайний', value: 'default' },
                    { label: 'Акцентний (синій)', value: 'highlight' },
                  ],
                  defaultValue: 'default',
                }),
                openByDefault: fields.checkbox({
                  label: 'Відкрито за замовчуванням',
                  defaultValue: false,
                }),
                introText: fields.text({
                  label: 'Вступний текст (підтримує **жирний** та переноси рядків)',
                  multiline: true,
                }),
                highlights: fields.array(
                  fields.object({
                    variant: fields.select({
                      label: 'Стиль',
                      options: [
                        { label: 'Інформаційний (синій)', value: 'info' },
                        { label: 'Безпека / успіх (зелений)', value: 'success' },
                        { label: 'Попередження (жовтий)', value: 'warning' },
                        { label: 'Застереження (червоний)', value: 'danger' },
                      ],
                      defaultValue: 'info',
                    }),
                    icon: fields.text({ label: 'Іконка' }),
                    title: fields.text({ label: 'Заголовок' }),
                    text: fields.text({ label: 'Текст', multiline: true }),
                  }),
                  {
                    label: 'Виділені блоки (Highlight)',
                    itemLabel: (p) => p.fields.title.value || 'Виділений блок',
                  }
                ),
                cardsStyle: fields.select({
                  label: 'Стиль карток',
                  options: [
                    { label: 'Сітка карток (2 колонки)', value: 'card-grid' },
                    { label: 'Компактні емодзі-картки', value: 'emoji-cards' },
                    { label: 'Інформаційні плашки', value: 'info-boxes' },
                  ],
                  defaultValue: 'card-grid',
                }),
                cardsTitle: fields.text({ label: 'Підзаголовок над картками (необовʼязково)' }),
                cards: fields.array(
                  fields.object({
                    icon: fields.text({ label: 'Іконка (емодзі)' }),
                    title: fields.text({ label: 'Заголовок' }),
                    text: fields.text({ label: 'Опис', multiline: true }),
                  }),
                  {
                    label: 'Картки (показання, технології, переваги)',
                    itemLabel: (p) => p.fields.title.value || 'Картка',
                  }
                ),
                listStyle: fields.select({
                  label: 'Стиль списку',
                  options: [
                    { label: 'Список із галочками', value: 'icon-list' },
                    { label: 'Нумерований список', value: 'numbered-list' },
                  ],
                  defaultValue: 'icon-list',
                }),
                listTitle: fields.text({ label: 'Підзаголовок над списком (необовʼязково)' }),
                listItems: fields.array(fields.text({ label: 'Пункт' }), {
                  label: 'Пункти списку',
                  itemLabel: (p) => p.value || 'Пункт',
                }),
                steps: fields.array(
                  fields.object({
                    title: fields.text({ label: 'Заголовок кроку' }),
                    text: fields.text({ label: 'Опис кроку', multiline: true }),
                  }),
                  {
                    label: 'Покрокова інструкція',
                    itemLabel: (p) => p.fields.title.value || 'Крок',
                  }
                ),
                tabsTitle: fields.text({ label: 'Підзаголовок над вкладками (необовʼязково)' }),
                tabs: fields.array(
                  fields.object({
                    icon: fields.text({ label: 'Іконка вкладки' }),
                    title: fields.text({ label: 'Назва вкладки' }),
                    sections: fields.array(
                      fields.object({
                        heading: fields.text({ label: 'Підзаголовок (необовʼязково)' }),
                        text: fields.text({ label: 'Текст (необовʼязково)', multiline: true }),
                        bullets: fields.array(fields.text({ label: 'Пункт' }), {
                          label: 'Список пунктів',
                          itemLabel: (p) => p.value || 'Пункт',
                        }),
                        note: fields.text({ label: 'Примітка / порада (необовʼязково)', multiline: true }),
                      }),
                      {
                        label: 'Блоки всередині вкладки',
                        itemLabel: (p) => p.fields.heading.value || 'Блок',
                      }
                    ),
                  }),
                  {
                    label: 'Вкладки (локалізації / побічні ефекти / відчуття)',
                    itemLabel: (p) => p.fields.title.value || 'Вкладка',
                  }
                ),
                expandables: fields.array(
                  fields.object({
                    icon: fields.text({ label: 'Іконка (необовʼязково)' }),
                    title: fields.text({ label: 'Заголовок підпункту' }),
                    text: fields.text({ label: 'Текст', multiline: true }),
                    bullets: fields.array(fields.text({ label: 'Пункт' }), {
                      label: 'Пункти списку (необовʼязково)',
                      itemLabel: (p) => p.value || 'Пункт',
                    }),
                    note: fields.text({ label: 'Примітка (необовʼязково)', multiline: true }),
                  }),
                  {
                    label: 'Вкладені розкривні пункти',
                    itemLabel: (p) => p.fields.title.value || 'Пункт',
                  }
                ),
                prosCons: fields.object(
                  {
                    enabled: fields.checkbox({ label: 'Показувати блок «Плюси / Обмеження»', defaultValue: false }),
                    prosTitle: fields.text({ label: 'Заголовок плюсів', defaultValue: 'Що покращує' }),
                    prosItems: fields.array(fields.text({ label: 'Пункт' }), {
                      label: 'Пункти плюсів',
                      itemLabel: (p) => p.value || 'Пункт',
                    }),
                    consTitle: fields.text({ label: 'Заголовок обмежень', defaultValue: 'Що НЕ лікує' }),
                    consItems: fields.array(fields.text({ label: 'Пункт' }), {
                      label: 'Пункти обмежень',
                      itemLabel: (p) => p.value || 'Пункт',
                    }),
                  },
                  { label: 'Блок «Що покращує / Обмеження»' }
                ),
                warningBoxes: fields.array(
                  fields.object({
                    icon: fields.text({ label: 'Іконка' }),
                    title: fields.text({ label: 'Заголовок' }),
                    text: fields.text({ label: 'Опис', multiline: true }),
                  }),
                  {
                    label: 'Картки-застереження',
                    itemLabel: (p) => p.fields.title.value || 'Застереження',
                  }
                ),
                checklistTitle: fields.text({ label: 'Заголовок чекліста всередині (необовʼязково)' }),
                checklistItems: fields.array(fields.text({ label: 'Пункт' }), {
                  label: 'Пункти чекліста (необовʼязково)',
                  itemLabel: (p) => p.value || 'Пункт',
                }),
                bottomHighlight: fields.object(
                  {
                    enabled: fields.checkbox({ label: 'Показати підсумковий акцент внизу секції', defaultValue: false }),
                    variant: fields.select({
                      label: 'Стиль',
                      options: [
                        { label: 'Інформаційний (синій)', value: 'info' },
                        { label: 'Успіх / безпека (зелений)', value: 'success' },
                        { label: 'Попередження (жовтий)', value: 'warning' },
                        { label: 'Небезпека / ризик (червоний)', value: 'danger' },
                      ],
                      defaultValue: 'info',
                    }),
                    icon: fields.text({ label: 'Іконка' }),
                    title: fields.text({ label: 'Заголовок' }),
                    text: fields.text({ label: 'Текст', multiline: true }),
                  },
                  { label: 'Підсумковий акцентний блок' }
                ),
              }),
            },
            faq: {
              label: 'Поширені запитання (FAQ)',
              itemLabel: (props) =>
                `❓ ${props.fields.title.value || 'Поширені запитання'} (${props.fields.items.elements.length})`,
              schema: fields.object({
                title: fields.text({ label: 'Заголовок блоку FAQ', defaultValue: 'Поширені запитання' }),
                icon: fields.text({ label: 'Іконка', defaultValue: '❓' }),
                variant: fields.select({
                  label: 'Стиль рамки',
                  options: [
                    { label: 'Звичайний', value: 'default' },
                    { label: 'Акцентний (синій)', value: 'highlight' },
                  ],
                  defaultValue: 'default',
                }),
                items: fields.array(
                  fields.object({
                    icon: fields.text({ label: 'Іконка (емодзі)', defaultValue: '❓' }),
                    question: fields.text({ label: 'Запитання' }),
                    answer: fields.text({ label: 'Відповідь', multiline: true }),
                    bullets: fields.array(fields.text({ label: 'Пункт' }), {
                      label: 'Пункти списку у відповіді (необовʼязково)',
                      itemLabel: (p) => p.value || 'Пункт',
                    }),
                    alertVariant: fields.select({
                      label: 'Акцентна плашка у відповіді',
                      options: [
                        { label: 'Немає', value: 'none' },
                        { label: 'Інформаційна (синя)', value: 'info' },
                        { label: 'Успіх / можна (зелена)', value: 'success' },
                        { label: 'Попередження (жовта)', value: 'warning' },
                        { label: 'Заборона / важливо (червона)', value: 'danger' },
                      ],
                      defaultValue: 'none',
                    }),
                    alertTitle: fields.text({ label: 'Заголовок плашки (необовʼязково)' }),
                    alertText: fields.text({ label: 'Текст плашки (необовʼязково)', multiline: true }),
                  }),
                  {
                    label: 'Список запитань та відповідей',
                    itemLabel: (p) => p.fields.question.value || 'Запитання',
                  }
                ),
              }),
            },
          },
          {
            label: 'Структуровані блоки сторінки відділення',
            description: 'Гнучко додавайте, редагуйте та впорядковуйте секції сторінки прямо з адмінки.',
          }
        ),
        content: fields.mdx({
          label: 'Додатковий текст сторінки (MDX / Markdown)',
          description: 'Необовʼязковий вільний текст у форматі Markdown, що відображається наприкінці сторінки.',
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
