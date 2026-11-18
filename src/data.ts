import type { Doctor } from './types';
import rawSettings from './content/singletons/settings.json';
import rawEquipment from './content/singletons/equipment.json';
import rawPatientRoute from './content/singletons/patient-route.json';

// Читаємо всі файли персоналу з Keystatic колекції src/content/staff/*.json
const staffModules = import.meta.glob<Record<string, any>>('./content/staff/*.json', {
  eager: true,
});

function buildStaffList(): Doctor[] {
  const loaded: Doctor[] = [];

  for (const [path, mod] of Object.entries(staffModules)) {
    const raw = mod.default || mod;
    if (!raw || raw.isVisible === false) continue;

    const id = path.split('/').pop()?.replace('.json', '') || '';
    const name = (raw.name || '').trim() || 'Фахівець';
    const surname = (raw.surname || '').trim() || 'Відділення';
    const initials = `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();

    loaded.push({
      id,
      name,
      surname,
      fullNamePatronymic: raw.fullNamePatronymic || `${surname} ${name}`,
      badge: raw.badge || undefined,
      isHead: Boolean(raw.isHead),
      role: raw.role || 'Лікар з радіаційної онкології',
      department: raw.department || 'Мегавольтна терапія',
      initials,
      bio: raw.bio || 'Висококваліфікований фахівець радіологічного відділення КНП «ДОКОД» ДОР.',
      image: raw.image || '/hero/raddepartment.jpg',
      experience: raw.experience || '10 років',
      specializations: Array.isArray(raw.specializations) && raw.specializations.length > 0
        ? raw.specializations.filter(Boolean)
        : ['Променева терапія'],
      education: raw.education || '-',
      achievements: raw.achievements || '',
      color: raw.color || 'from-slate-600 to-slate-700',
      order: typeof raw.order === 'number' ? raw.order : 99,
      isVisible: raw.isVisible !== false,
    });
  }

  return loaded.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

export const doctors: Doctor[] = buildStaffList();

// Безпечні налаштування сайту та контактів із дефолтними значеннями
export const siteSettings = {
  clinicShortName: rawSettings?.clinicShortName || 'КНП "ДОКОД" ДОР',
  clinicFullName:
    rawSettings?.clinicFullName ||
    'КНП «Дніпровський обласний клінічний онкологічний диспансер» ДОР',
  departmentName:
    rawSettings?.departmentName ||
    'Відділення променевої терапії №1 з блоком реабілітації',
  mainClinicUrl: rawSettings?.mainClinicUrl || 'https://dokod.org.ua/',
  heroTitle: rawSettings?.heroTitle || 'Центр променевої терапії',
  heroSubtitle: rawSettings?.heroSubtitle || 'У місті Дніпро',
  heroDescription:
    rawSettings?.heroDescription ||
    'Ми створили цей простір, щоб зробити складні технології зрозумілими. Тут ви знайдете повну інформацію про наше обладнання, методи лікування та кожен крок вашого шляху до одужання.',
  statsYears: rawSettings?.statsYears || '15+',
  statsPatients: rawSettings?.statsPatients || '1500+',
  schedule: rawSettings?.schedule || 'Пн–Пт: 08:00 – 16:00 • Сб–Нд: вихідний',
  scheduleNote:
    rawSettings?.scheduleNote ||
    'Прийом за електронним направленням від онколога або сімейного лікаря (безоплатно за програмою НСЗУ)',
  email: rawSettings?.email || 'linac_olt1@ukr.net',
  phones:
    Array.isArray(rawSettings?.phones) && rawSettings.phones.length > 0
      ? rawSettings.phones
      : [
          { number: '(056) 720-79-01', label: 'Реєстратура (міський)' },
          { number: '(066) 290-44-91', label: 'Vodafone' },
          { number: '(093) 958-55-67', label: 'Lifecell' },
          { number: '(068) 001-55-15', label: 'Kyivstar' },
        ],
  addresses:
    Array.isArray(rawSettings?.addresses) && rawSettings.addresses.length > 0
      ? rawSettings.addresses
      : [
          {
            address: 'м. Дніпро, вул. Космічна, 21',
            subtitle: 'Корпус променевої терапії • КНП "ДОКОД" ДОР',
            mapUrl: 'https://maps.google.com/?q=Дніпро,+вул.+Космічна,+21',
          },
          {
            address: 'м. Дніпро, вул. Гавриленка (Ребініна), 1',
            subtitle: 'Консультативна поліклініка • КНП "ДОКОД" ДОР',
            mapUrl: 'https://maps.google.com/?q=Дніпро,+вул.+Гавриленка,+1',
          },
        ],
  socials: {
    facebook: rawSettings?.socials?.facebook || 'https://www.facebook.com/kz.kod.dor',
    telegram: rawSettings?.socials?.telegram || 'https://t.me/dokod_dp',
    instagram: rawSettings?.socials?.instagram || 'https://www.instagram.com/dokod.dp/',
    youtube: rawSettings?.socials?.youtube || 'https://www.youtube.com/@dokodlic',
    tiktok: rawSettings?.socials?.tiktok || 'https://www.tiktok.com/@dokod.dp',
  },
};

export const equipmentData = {
  sectionTitle: rawEquipment?.sectionTitle || 'Сучасне обладнання для променевої терапії',
  sectionSubtitle:
    rawEquipment?.sectionSubtitle ||
    'У нашому центрі встановлено три лінійні прискорювачі Elekta останнього покоління для високоточного лікування онкологічних захворювань',
  methods: Array.isArray(rawEquipment?.methods) ? rawEquipment.methods : [],
  accelerators: Array.isArray(rawEquipment?.accelerators) ? rawEquipment.accelerators : [],
  faq: Array.isArray(rawEquipment?.faq) ? rawEquipment.faq : [],
};

export const patientRouteData = {
  title: rawPatientRoute?.title || 'Шлях пацієнта',
  subtitle:
    rawPatientRoute?.subtitle ||
    'Чотири послідовні кроки — персоналізований шлях для кожного пацієнта',
  checklistTitle:
    rawPatientRoute?.checklistTitle || 'Чекліст підготовки до першого візиту',
  checklistSubtitle:
    rawPatientRoute?.checklistSubtitle ||
    'Відмічайте підготовлені документи та етапи — ваш список автоматично зберігається на вашому пристрої',
  checklistItems: Array.isArray(rawPatientRoute?.checklistItems)
    ? rawPatientRoute.checklistItems
    : [],
};
