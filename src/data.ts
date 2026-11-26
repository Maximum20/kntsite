import type { Doctor, ShowBackCardMode, StaffRole, StaffRoleGroup } from './types';
import rawSettings from './content/singletons/settings.json';
import rawEquipment from './content/singletons/equipment.json';
import rawPatientRoute from './content/singletons/patient-route.json';
import { resolvePhotoUrl } from './utils/photos';

const hideLegacyPhotosFlag = Boolean((rawSettings as any)?.hideLegacyPhotos);

// Читаємо колекцію посад персоналу з src/content/staff-roles/*.json
const staffRoleModules = import.meta.glob<Record<string, any>>(
  './content/staff-roles/*.json',
  { eager: true }
);

// Читаємо всі файли персоналу з Keystatic колекції src/content/staff/*.json
const staffModules = import.meta.glob<Record<string, any>>('./content/staff/*.json', {
  eager: true,
});

export function hasMeaningfulText(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  const cleaned = val.trim();
  if (!cleaned) return false;
  if (/^[-—–_.]+$/.test(cleaned)) return false;
  return true;
}

export function hasBackCardContent(staff: {
  experience?: string;
  education?: string;
  achievements?: string;
  bio?: string;
}): boolean {
  return (
    hasMeaningfulText(staff.experience) ||
    hasMeaningfulText(staff.education) ||
    hasMeaningfulText(staff.achievements) ||
    hasMeaningfulText(staff.bio)
  );
}

export function shouldShowBackCard(
  showBackCard: ShowBackCardMode | undefined,
  roleDefaultShowBackCard: boolean,
  hasContent: boolean
): boolean {
  if (showBackCard === 'show') return true;
  if (showBackCard === 'hide') return false;
  return Boolean(roleDefaultShowBackCard) && Boolean(hasContent);
}

function normalizeShowBackCard(val: unknown): ShowBackCardMode {
  if (val === 'show' || val === 'hide' || val === 'auto') return val;
  return 'auto';
}

function normalizeRoleGroup(val: unknown): StaffRoleGroup {
  return val === 'specialists' ? 'specialists' : 'doctors';
}

function buildStaffRolesList(): StaffRole[] {
  const loaded: StaffRole[] = [];

  for (const [path, mod] of Object.entries(staffRoleModules)) {
    const raw = mod.default || mod;
    if (!raw) continue;
    const slug = path.split('/').pop()?.replace('.json', '') || '';
    if (!slug) continue;

    loaded.push({
      slug,
      title: String(raw.title || slug).trim(),
      group: normalizeRoleGroup(raw.group),
      order: typeof raw.order === 'number' ? raw.order : 10,
      defaultShowBackCard: raw.defaultShowBackCard !== false,
    });
  }

  return loaded.sort(
    (a, b) => a.order - b.order || a.title.localeCompare(b.title, 'uk', { sensitivity: 'base' })
  );
}

export const staffRoles: StaffRole[] = buildStaffRolesList();

const rolesBySlug = new Map<string, StaffRole>(staffRoles.map((r) => [r.slug, r]));
const rolesByLowerTitle = new Map<string, StaffRole>(
  staffRoles.map((r) => [r.title.toLowerCase(), r])
);

function resolveStaffRole(rawRole: unknown): StaffRole {
  const key = typeof rawRole === 'string' ? rawRole.trim() : '';
  if (key) {
    const bySlug = rolesBySlug.get(key);
    if (bySlug) return bySlug;

    const byTitle = rolesByLowerTitle.get(key.toLowerCase());
    if (byTitle) return byTitle;

    return {
      slug: key,
      title: key,
      group: 'doctors',
      order: 999,
      defaultShowBackCard: true,
    };
  }

  return {
    slug: '',
    title: 'Фахівець відділення',
    group: 'doctors',
    order: 999,
    defaultShowBackCard: true,
  };
}

function compareStaff(a: Doctor, b: Doctor): number {
  const orderDiff = (a.order ?? 100) - (b.order ?? 100);
  if (orderDiff !== 0) return orderDiff;

  const nameA = `${a.surname} ${a.name}`.trim();
  const nameB = `${b.surname} ${b.name}`.trim();
  return nameA.localeCompare(nameB, 'uk', { sensitivity: 'base' });
}

function buildStaffList(): Doctor[] {
  const loaded: Doctor[] = [];

  for (const [path, mod] of Object.entries(staffModules)) {
    const raw = mod.default || mod;
    if (!raw || raw.isActive !== true) continue;

    const id = path.split('/').pop()?.replace('.json', '') || '';
    const name = String(raw.name || '').trim() || 'Фахівець';
    const surname = String(raw.surname || '').trim() || 'Відділення';
    const initials = `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
    const resolvedImage = resolvePhotoUrl(raw.image, null, hideLegacyPhotosFlag) || '';
    const resolvedRole = resolveStaffRole(raw.role);
    const showBackCard = normalizeShowBackCard(raw.showBackCard);

    const bio = typeof raw.bio === 'string' ? raw.bio.trim() : '';
    const experience = typeof raw.experience === 'string' ? raw.experience.trim() : '';
    const education = typeof raw.education === 'string' ? raw.education.trim() : '';
    const achievements = typeof raw.achievements === 'string' ? raw.achievements.trim() : '';
    const specializations = Array.isArray(raw.specializations)
      ? raw.specializations.map((s: unknown) => String(s || '').trim()).filter(Boolean)
      : [];

    const canFlip = shouldShowBackCard(
      showBackCard,
      resolvedRole.defaultShowBackCard,
      hasBackCardContent({ experience, education, achievements, bio })
    );

    loaded.push({
      id,
      name,
      surname,
      fullNamePatronymic:
        (typeof raw.fullNamePatronymic === 'string' && raw.fullNamePatronymic.trim()) ||
        `${surname} ${name}`.trim(),
      badge: (typeof raw.badge === 'string' && raw.badge.trim()) || undefined,
      isHead: Boolean(raw.isHead),
      role: resolvedRole.title,
      roleSlug: resolvedRole.slug,
      roleGroup: resolvedRole.group,
      roleOrder: resolvedRole.order,
      roleDefaultShowBackCard: resolvedRole.defaultShowBackCard,
      department:
        (typeof raw.department === 'string' && raw.department.trim()) ||
        'Мегавольтна терапія',
      initials,
      bio,
      image: resolvedImage,
      experience,
      specializations,
      education,
      achievements,
      color:
        (typeof raw.color === 'string' && raw.color.trim()) ||
        'from-slate-600 to-slate-700',
      order: typeof raw.order === 'number' ? raw.order : 100,
      isActive: true,
      showBackCard,
      canFlip,
    });
  }

  return loaded.sort(compareStaff);
}

export const doctors: Doctor[] = buildStaffList();

// Посади, у яких зараз є хоча б 1 активний працівник (у порядку staffRoles)
function buildActiveStaffRoles(): StaffRole[] {
  const activeCounts = new Map<string, number>();
  for (const doc of doctors) {
    const key = doc.roleSlug || doc.role;
    if (!key) continue;
    activeCounts.set(key, (activeCounts.get(key) || 0) + 1);
  }

  const knownActive = staffRoles.filter((role) => (activeCounts.get(role.slug) || 0) > 0);
  const knownSlugs = new Set(knownActive.map((r) => r.slug));

  const extra: StaffRole[] = [];
  for (const doc of doctors) {
    const key = doc.roleSlug || doc.role;
    if (!key || knownSlugs.has(key)) continue;
    knownSlugs.add(key);
    extra.push({
      slug: key,
      title: doc.role,
      group: doc.roleGroup,
      order: doc.roleOrder,
      defaultShowBackCard: doc.roleDefaultShowBackCard,
    });
  }

  return [...knownActive, ...extra];
}

export const activeStaffRoles: StaffRole[] = buildActiveStaffRoles();

const rawHomeSections = (rawSettings as any)?.homeSections || {};
const rawAnnouncement = (rawSettings as any)?.announcement || {};
const rawHeroGallery = Array.isArray((rawSettings as any)?.heroGallery)
  ? (rawSettings as any).heroGallery
  : [];

// Безпечні налаштування сайту, головної сторінки, оголошень та контактів із дефолтними значеннями
export const siteSettings = {
  clinicShortName: rawSettings?.clinicShortName || 'КНТ "ДОКОД" ДОР',
  clinicFullName:
    rawSettings?.clinicFullName ||
    'КНТ «Дніпровський обласний клінічний онкологічний диспансер» ДОР',
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
  heroGallery: rawHeroGallery as Array<{ image?: string | null; alt?: string }>,
  hideLegacyPhotos: hideLegacyPhotosFlag,
  homeSections: {
    showDepartments: rawHomeSections.showDepartments !== false,
    showAdvantages: rawHomeSections.showAdvantages !== false,
    showPatientJourney: rawHomeSections.showPatientJourney !== false,
    showEquipment: rawHomeSections.showEquipment !== false,
    showFaq: rawHomeSections.showFaq !== false,
    showTeam: rawHomeSections.showTeam !== false,
    showFeedback: rawHomeSections.showFeedback !== false,
    showContacts: rawHomeSections.showContacts !== false,
    showNews: rawHomeSections.showNews !== false,
  },
  announcement: {
    isActive: Boolean(rawAnnouncement.isActive),
    type: (rawAnnouncement.type === 'warning' || rawAnnouncement.type === 'urgent'
      ? rawAnnouncement.type
      : 'info') as 'info' | 'warning' | 'urgent',
    title: rawAnnouncement.title || '',
    text: rawAnnouncement.text || '',
    buttonText: rawAnnouncement.buttonText || '',
    buttonUrl: rawAnnouncement.buttonUrl || '',
  },
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
            subtitle: 'Корпус променевої терапії • КНТ "ДОКОД" ДОР',
            mapUrl: 'https://maps.google.com/?q=Дніпро,+вул.+Космічна,+21',
          },
          {
            address: 'м. Дніпро, вул. Гавриленка (Ребініна), 1',
            subtitle: 'Консультативна поліклініка • КНТ "ДОКОД" ДОР',
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
