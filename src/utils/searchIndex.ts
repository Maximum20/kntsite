import { getCollection } from "astro:content";
import { siteSettings, equipmentData, patientRouteData } from "../data";

export type SearchIconKey =
  | "accelerator"
  | "ct"
  | "brachy"
  | "gamma"
  | "nearfocus"
  | "rehab"
  | "doctor"
  | "team"
  | "phone"
  | "clock"
  | "location"
  | "shield"
  | "route"
  | "news"
  | "briefcase"
  | "spark"
  | "building";

export type SearchCategory =
  | "Відділення"
  | "Обладнання"
  | "Пацієнту"
  | "Лікар"
  | "Контакти"
  | "Новина"
  | "Вакансія";

export interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  category: SearchCategory;
  icon: SearchIconKey;
  tags: string[];
  priority: number;
}

export interface QuickChip {
  id: string;
  label: string;
  query: string;
}

export interface QuickCard {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  href: string;
  icon: SearchIconKey;
}

export interface EmptyStateData {
  phone: string;
  phoneTel: string;
  phoneLabel: string;
  quickLinks: Array<{
    label: string;
    href: string;
    icon: SearchIconKey;
  }>;
}

export interface SiteSearchPayload {
  searchIndex: SearchItem[];
  quickChipsPool: QuickChip[];
  quickCardsPool: QuickCard[];
  emptyState: EmptyStateData;
}

const BLOCKED_ROUTE_PATTERNS = [
  /^\/keystatic(\/|$|\?|#)/i,
  /^\/api\/keystatic(\/|$|\?|#)/i,
  /^\/tools(\/|$|\?|#)/i,
];

export function isPublicSearchUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  const trimmed = String(url).trim();
  if (!trimmed) return false;
  return !BLOCKED_ROUTE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function dedupeTags(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const val of values) {
    if (!val) continue;
    const cleaned = String(val).replace(/\s+/g, " ").trim().toLowerCase();
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    result.push(cleaned);
  }
  return result;
}

function serviceIconById(id: string): SearchIconKey {
  switch (id) {
    case "linac":
      return "accelerator";
    case "ct":
      return "ct";
    case "brachy":
      return "brachy";
    case "gamma":
      return "gamma";
    case "nearfocus":
      return "nearfocus";
    case "mlt":
      return "rehab";
    default:
      return "building";
  }
}

const SERVICE_EXTRA_KEYWORDS: Record<string, string[]> = {
  linac: [
    "лінак",
    "лінійник",
    "прискорювач",
    "лінійний прискорювач",
    "ускоритель",
    "линейный ускоритель",
    "линейник",
    "elekta",
    "електа",
    "versa",
    "versa hd",
    "synergy",
    "сінерджі",
    "brainlab",
    "брейнлаб",
    "exactrac",
    "опромінення",
    "облучение",
    "лучевая",
    "лучевая терапия",
    "промені",
    "лучи",
    "радіотерапія",
    "радиотерапия",
    "мегавольтна",
    "мегавольтная",
    "стереотаксис",
    "радіохірургія",
    "радиохирургия",
    "imrt",
    "vmat",
    "igrt",
    "sbrt",
    "srs",
    "dibh",
    "raystation",
    "monaco",
    "космічна",
    "космическая",
    "докод",
  ],
  ct: [
    "кт",
    "кт-симуляція",
    "кт-розмітка",
    "кт симуляция",
    "кт разметка",
    "томограф",
    "томографія",
    "томография",
    "маска",
    "термопластична маска",
    "термопластическая маска",
    "розмітка",
    "разметка",
    "фіксація",
    "фиксация",
    "симуляція",
    "симуляция",
    "топометрія",
    "топометрия",
    "підготовка",
    "подготовка",
    "планування",
    "планирование",
    "матрац",
    "матрас",
    "мітки",
    "метки",
    "тату",
    "контраст",
    "toshiba",
    "aquilion",
    "raystation",
    "monaco",
    "космічна",
    "космическая",
  ],
  brachy: [
    "брахітерапія",
    "брахитерапия",
    "брахі",
    "брахи",
    "контактна",
    "контактная",
    "внутрішньопорожнинна",
    "внутриполостная",
    "hdr",
    "bebig",
    "multisource",
    "аплікатор",
    "аппликатор",
    "іридій",
    "иридий",
    "гінекологія",
    "гинекология",
    "онкогінекологія",
    "матка",
    "шийка матки",
    "шейка матки",
    "ендометрій",
    "эндометрий",
    "простата",
    "пряма кишка",
    "стравохід",
    "опромінення",
    "облучение",
    "космічна",
    "космическая",
  ],
  gamma: [
    "гамма",
    "гамма-терапія",
    "гамма-терапия",
    "телегамматерапія",
    "кобальт",
    "кобальт-60",
    "co-60",
    "тератрон",
    "theratron",
    "агат",
    "агат-р1",
    "опромінення",
    "облучение",
    "лучевая",
    "промені",
    "радіотерапія",
    "радиотерапия",
    "паліатив",
    "паллиатив",
    "метастази",
    "метастазы",
    "кістки",
    "кости",
    "знеболення",
    "обезболивание",
    "ребініна",
    "ребинина",
    "гавриленка",
    "гавриленко",
  ],
  nearfocus: [
    "близький фокус",
    "близькофокусна",
    "близкофокусная",
    "рентгенотерапія",
    "рентгенотерапия",
    "рентгентерапія",
    "рентген",
    "поверхнева",
    "поверхностная",
    "шкіра",
    "кожа",
    "рак шкіри",
    "рак кожи",
    "базаліома",
    "базалиома",
    "меланома",
    "родимка",
    "родинка",
    "рубець",
    "рубец",
    "келоїд",
    "келоид",
    "шпора",
    "п'яткова шпора",
    "пяточная шпора",
    "wolf",
    "wolf t-160",
  ],
  mlt: [
    "реабілітація",
    "реабилитация",
    "відновлення",
    "восстановление",
    "магнітотерапія",
    "магнитотерапия",
    "магніт",
    "магнит",
    "лімфостаз",
    "лимфостаз",
    "набряк",
    "отек",
    "отёк",
    "фіброз",
    "фиброз",
    "дерматит",
    "пресотерапія",
    "прессотерапия",
    "лімфодренаж",
    "лимфодренаж",
    "мультимаг",
    "мілта",
    "милта",
    "dimap",
    "green press",
    "фізіотерапія",
    "физиотерапия",
  ],
};

function extractSectionTitles(sections: any): string[] {
  if (!Array.isArray(sections)) return [];
  const titles: string[] = [];
  for (const block of sections) {
    const val = block?.value;
    if (!val || typeof val !== "object") continue;
    if (typeof val.title === "string" && val.title.trim()) {
      titles.push(val.title.trim());
    }
    if (Array.isArray(val.items)) {
      for (const it of val.items) {
        if (typeof it?.title === "string") titles.push(it.title);
        if (typeof it?.question === "string") titles.push(it.question);
      }
    }
    if (Array.isArray(val.expandables)) {
      for (const exp of val.expandables) {
        if (typeof exp?.title === "string") titles.push(exp.title);
      }
    }
  }
  return titles.slice(0, 12);
}

function normalizePhoneDigits(phone: string): string[] {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return [];
  const variants = [digits];
  if (digits.length >= 7) variants.push(digits.slice(-7));
  if (digits.length >= 10) variants.push(digits.slice(-10));
  return variants;
}

export async function buildSiteSearchData(): Promise<SiteSearchPayload> {
  const [rawServices, rawStaff, rawNews, rawVacancies] = await Promise.all([
    getCollection("services").catch(() => []),
    getCollection("staff").catch(() => []),
    getCollection("news").catch(() => []),
    getCollection("vacancies").catch(() => []),
  ]);

  const visibleServices = [...rawServices]
    .filter((s) => s.data?.isVisible !== false)
    .sort((a, b) => (a.data?.order ?? 99) - (b.data?.order ?? 99));
  const visibleServiceIds = new Set(visibleServices.map((s) => s.id));

  const visibleStaff = [...rawStaff]
    .filter((s) => s.data?.isVisible !== false)
    .sort((a, b) => (a.data?.order ?? 99) - (b.data?.order ?? 99));

  const sortedNews = [...rawNews].sort((a, b) => {
    const da = a.data?.date ? new Date(a.data.date).getTime() : 0;
    const db = b.data?.date ? new Date(b.data.date).getTime() : 0;
    return db - da;
  });

  const activeVacancies = [...rawVacancies]
    .filter((v) => v.data?.isActive !== false)
    .sort((a, b) => {
      const da = a.data?.date ? new Date(a.data.date).getTime() : 0;
      const db = b.data?.date ? new Date(b.data.date).getTime() : 0;
      return db - da;
    });

  const isLinacVisible = visibleServiceIds.has("linac");
  const isCtVisible = visibleServiceIds.has("ct");
  const isBrachyVisible = visibleServiceIds.has("brachy");
  const isGammaVisible = visibleServiceIds.has("gamma");
  const isNearfocusVisible = visibleServiceIds.has("nearfocus");
  const isMltVisible = visibleServiceIds.has("mlt");

  const nszuHref = siteSettings.homeSections.showFaq
    ? "/#faq-section"
    : "/#patient-journey";
  const methodsHref = siteSettings.homeSections.showEquipment
    ? "/#methods-section"
    : isLinacVisible
      ? "/services/linac#accelerators"
      : "/#patient-journey";

  const items: SearchItem[] = [];

  // 1. Динамічні відділення з Keystatic (services)
  for (const svc of visibleServices) {
    const url = `/services/${svc.id}`;
    if (!isPublicSearchUrl(url)) continue;

    const sectionTitles = extractSectionTitles(svc.data.sections);
    const extraKw = SERVICE_EXTRA_KEYWORDS[svc.id] || [];

    items.push({
      id: `svc-${svc.id}`,
      title: svc.data.heroTitle || svc.data.title,
      subtitle: svc.data.description || svc.data.heroText || "",
      url,
      category: "Відділення",
      icon: serviceIconById(svc.id),
      priority: 6,
      tags: dedupeTags([
        svc.id,
        svc.data.title,
        svc.data.navTitle,
        svc.data.heroTitle,
        svc.data.subtitle,
        ...(Array.isArray(svc.data.searchKeywords) ? svc.data.searchKeywords : []),
        ...extraKw,
        ...sectionTitles,
        "відділення",
        "отделение",
        "послуга",
        "услуга",
        "лікування",
        "лечение",
        "променева терапія",
        "лучевая терапия",
        "радіотерапія",
        "радиотерапия",
        "докод",
      ]),
    });
  }

  // 2. Лінійні прискорювачі з Keystatic (equipment.json)
  if (isLinacVisible && Array.isArray(equipmentData.accelerators)) {
    equipmentData.accelerators.forEach((acc: any, idx: number) => {
      const name = String(acc?.name || "").trim();
      if (!name) return;
      const control = String(acc?.controlSystem || "").trim();
      const imaging = String(acc?.imaging || "").trim();
      const hasBrainlab = control.toLowerCase().includes("brainlab");
      const title = hasBrainlab
        ? `Лінійний прискорювач ${name} + BrainLAB ExacTrac Dynamic`
        : `Лінійний прискорювач ${name}`;

      items.push({
        id: `acc-${idx}-${name.toLowerCase().replace(/\s+/g, "-")}`,
        title,
        subtitle:
          acc?.description ||
          [imaging, control].filter(Boolean).join(" • ") ||
          "Сучасний лінійний прискорювач Elekta",
        url: "/services/linac#accelerators",
        category: "Обладнання",
        icon: "accelerator",
        priority: 5,
        tags: dedupeTags([
          name,
          imaging,
          control,
          "лінак",
          "linac",
          "лінійник",
          "линейник",
          "прискорювач",
          "лінійний прискорювач",
          "ускоритель",
          "линейный ускоритель",
          "elekta",
          "електа",
          "опромінення",
          "облучение",
          "лучевая",
          "промені",
          "радіотерапія",
          "радиотерапия",
          "апарат",
          "аппарат",
          "обладнання",
          "оборудование",
          "космічна",
          "космическая",
          ...(hasBrainlab
            ? [
                "brainlab",
                "брейнлаб",
                "exactrac",
                "стереотаксис",
                "радіохірургія",
                "радиохирургия",
                "кіберніж",
                "кибернож",
                "контроль дихання",
                "затримка дихання",
                "dibh",
                "sgrt",
                "sbrt",
                "srs",
                "versa",
                "versahd",
              ]
            : ["synergy", "сінерджі", "platform", "xvi", "iview", "vmat", "imrt", "3d-crt"]),
        ]),
      });
    });
  }

  // 3. Методики опромінення з Keystatic (equipment.json)
  if (Array.isArray(equipmentData.methods)) {
    equipmentData.methods.forEach((m: any, idx: number) => {
      if (!m?.code && !m?.title) return;
      items.push({
        id: `method-${idx}-${String(m.code || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        title: `Метод ${m.code}: ${m.title}`,
        subtitle: m.description || m.badge || "",
        url: methodsHref,
        category: "Обладнання",
        icon: "spark",
        priority: 3,
        tags: dedupeTags([
          m.code,
          m.title,
          m.badge,
          "метод",
          "методика",
          "технологія",
          "технология",
          "опромінення",
          "облучение",
          "лучевая",
          "промені",
          "радіотерапія",
          "радиотерапия",
          "лінак",
          "прискорювач",
          "ускоритель",
          "elekta",
        ]),
      });
    });
  }

  // 4. Ключові сторінки та розділи (динамічно наповнені з settings.json та patient-route.json)
  const allPhonesFormatted = siteSettings.phones.map((p) => p.number).join(", ");
  const allPhoneTags = siteSettings.phones.flatMap((p) => [
    p.number,
    p.label,
    ...normalizePhoneDigits(p.number),
  ]);
  const primaryAddressShort = siteSettings.addresses[0]?.address || "м. Дніпро, вул. Космічна, 21";

  items.push(
    {
      id: "core-nszu",
      title: "Направлення та безоплатне лікування за програмою НСЗУ",
      subtitle:
        siteSettings.scheduleNote ||
        "Повний курс променевої терапії та КТ-симуляція безоплатно за 16-значним електронним направленням",
      url: nszuHref,
      category: "Пацієнту",
      icon: "shield",
      priority: 6,
      tags: dedupeTags([
        "нсзу",
        "направлення",
        "направление",
        "електронне направлення",
        "электронное направление",
        "е-направлення",
        "ehealth",
        "безкоштовно",
        "безоплатно",
        "бесплатно",
        "ціна",
        "цена",
        "вартість",
        "стоимость",
        "сколько стоит",
        "скільки коштує",
        "оплата",
        "платно",
        "гроші",
        "деньги",
        "гарантії",
        "гарантии",
        "програма медичних гарантій",
        "пакет",
        "сімейний лікар",
        "семейный врач",
        "онколог",
        "докод",
        "променева терапія",
        "лучевая терапия",
      ]),
    },
    {
      id: "core-patient-route",
      title: "Шлях пацієнта та підготовка до променевої терапії",
      subtitle: `${patientRouteData.checklistTitle} — 4 кроки, аналізи, документи та диски КТ/МРТ`,
      url: "/#patient-journey",
      category: "Пацієнту",
      icon: "route",
      priority: 5,
      tags: dedupeTags([
        patientRouteData.title,
        patientRouteData.checklistTitle,
        ...(patientRouteData.checklistItems || []).flatMap((ci: any) => [
          ci?.title,
          ci?.stepBadge,
        ]),
        "підготовка",
        "подготовка",
        "маршрут",
        "маршрут пацієнта",
        "шлях пацієнта",
        "путь пациента",
        "чекліст",
        "чеклист",
        "документи",
        "документы",
        "аналізи",
        "анализы",
        "кров",
        "кровь",
        "креатинін",
        "креатинин",
        "паспорт",
        "іпн",
        "инн",
        "гістологія",
        "гистология",
        "біопсія",
        "биопсия",
        "диск",
        "флешка",
        "dicom",
        "мрт",
        "пет-кт",
        "пэт-кт",
        "перший візит",
        "первый визит",
        "що брати",
        "что брать",
        "консиліум",
        "консилиум",
        "одяг",
        "одежда",
        "вода",
        "направлення",
        "направление",
        "нсзу",
      ]),
    },
    {
      id: "core-contacts-schedule",
      title: "Графік роботи, телефони реєстратури та контакти",
      subtitle: `${siteSettings.schedule} • ${allPhonesFormatted}`,
      url: "/#contacts",
      category: "Контакти",
      icon: "phone",
      priority: 6,
      tags: dedupeTags([
        siteSettings.schedule,
        siteSettings.email,
        primaryAddressShort,
        ...allPhoneTags,
        "графік",
        "график",
        "графік роботи",
        "график работы",
        "розклад",
        "расписание",
        "години роботи",
        "часы работы",
        "режим роботи",
        "режим работы",
        "телефон",
        "телефони",
        "телефоны",
        "номер",
        "подзвонити",
        "позвонить",
        "реєстратура",
        "регистратура",
        "call-центр",
        "кол-центр",
        "колл-центр",
        "запис",
        "запись",
        "записатися",
        "записаться",
        "прийом",
        "прием",
        "контакти",
        "контакты",
        "зв'язок",
        "связь",
        "пошта",
        "почта",
        "email",
        "адреса",
        "адрес",
        "докод",
        "дніпро",
        "днепр",
      ]),
    },
    {
      id: "core-departments",
      title: "Усі відділення та напрямки променевої терапії",
      subtitle: visibleServices
        .map((s) => s.data.navTitle || s.data.title)
        .filter(Boolean)
        .join(" • "),
      url: "/#departments",
      category: "Відділення",
      icon: "building",
      priority: 4,
      tags: dedupeTags([
        "відділення",
        "отделения",
        "напрямки",
        "направления",
        "послуги",
        "услуги",
        "променева терапія",
        "лучевая терапия",
        "радіотерапія",
        "радиотерапия",
        "опромінення",
        "облучение",
        "промені",
        "лучи",
        "лікування",
        "лечение",
        "докод",
        "онкодиспансер",
      ]),
    },
    {
      id: "core-staff",
      title: "Персонал відділення: лікарі, фізики та медсестри",
      subtitle: `Команда центру (${visibleStaff.length} фахівців): радіаційні онкологи, рентгенологи, медичні фізики`,
      url: "/doctors",
      category: "Лікар",
      icon: "team",
      priority: 6,
      tags: dedupeTags([
        "персонал",
        "команда",
        "лікар",
        "лікарі",
        "врач",
        "врачи",
        "доктор",
        "онколог",
        "радіолог",
        "радиолог",
        "радіаційний онколог",
        "радиационный онколог",
        "медичний фізик",
        "медицинский физик",
        "фізик",
        "фізики",
        "физик",
        "физики",
        "інженер",
        "инженер",
        "лаборант",
        "рентгенлаборант",
        "рентгенолог",
        "медсестра",
        "завідувачка",
        "заведующая",
        "спеціаліст",
        "специалист",
        "фахівці",
        "консультація",
        "консультация",
        "докод",
      ]),
    },
    {
      id: "core-news",
      title: "Новини, події та публікації відділення",
      subtitle: "Оновлення технологій, міжнародні стажування, поради пацієнтам та життя центру",
      url: "/all-news",
      category: "Новина",
      icon: "news",
      priority: 5,
      tags: dedupeTags([
        "новини",
        "новина",
        "новости",
        "новость",
        "публікації",
        "публикации",
        "статті",
        "статьи",
        "події",
        "события",
        "архів",
        "архив",
        "блог",
        "стажування",
        "стажировка",
        "докод",
      ]),
    },
    {
      id: "core-vacancies",
      title: "Актуальні вакансії та робота у відділенні",
      subtitle: `Запрошуємо в команду ${siteSettings.clinicShortName}: медичних фізиків, інженерів та рентгенлаборантів`,
      url: "/vacancies",
      category: "Вакансія",
      icon: "briefcase",
      priority: 5,
      tags: dedupeTags([
        "вакансії",
        "вакансія",
        "вакансии",
        "вакансия",
        "робота",
        "работа",
        "працевлаштування",
        "трудоустройство",
        "кар'єра",
        "карьера",
        "медичний фізик",
        "фізик",
        "физик",
        "інженер",
        "инженер",
        "лаборант",
        "рентгенлаборант",
        "рентгенолаборант",
        "команда",
        "персонал",
        "докод",
      ]),
    }
  );

  // 5. Окремі записи для кожної адреси корпусу з settings.json (Космічна, 21 / Ребініна, 1)
  siteSettings.addresses.forEach((loc, idx) => {
    const addrLower = (loc.address || "").toLowerCase();
    const isKosmichna = addrLower.includes("косміч");
    const isRebinina = addrLower.includes("ребінін") || addrLower.includes("гавриленк");

    items.push({
      id: `loc-${idx}`,
      title: `Корпус: ${loc.address}`,
      subtitle: loc.subtitle || `Локація відділення • ${siteSettings.clinicShortName}`,
      url: "/#contacts",
      category: "Контакти",
      icon: "location",
      priority: 5,
      tags: dedupeTags([
        loc.address,
        loc.subtitle,
        "адреса",
        "адрес",
        "локація",
        "локация",
        "корпус",
        "стаціонар",
        "стационар",
        "карта",
        "маршрут",
        "як доїхати",
        "как доехать",
        "де знаходиться",
        "где находится",
        "дніпро",
        "днепр",
        "докод",
        "контакти",
        "контакты",
        ...(isKosmichna
          ? [
              "космічна",
              "космічна 21",
              "космическая",
              "космическая 21",
              "космічній",
              "космической",
              "лінійний прискорювач",
              "ускоритель",
              "elekta",
              "кт",
              "брахітерапія",
              "брахитерапия",
            ]
          : []),
        ...(isRebinina
          ? [
              "ребініна",
              "ребініна 1",
              "ребинина",
              "ребинина 1",
              "лікаря ребініна",
              "гавриленка",
              "гавриленка 1",
              "гавриленко",
              "поліклініка",
              "поликлиника",
              "гамма-терапія",
              "гамма-терапия",
              "кобальт",
              "тератрон",
            ]
          : []),
      ]),
    });
  });

  // 6. Кожен співробітник із Keystatic колекції staff
  for (const entry of visibleStaff) {
    const d = entry.data;
    const surname = (d.surname || "").trim();
    const name = (d.name || "").trim();
    if (!surname && !name) continue;
    const role = (d.role || "Лікар з радіаційної онкології").trim();
    const department = (d.department || "").trim();
    const roleLower = role.toLowerCase();
    const url = `/doctors?doctor=${encodeURIComponent(surname || name)}`;

    items.push({
      id: `staff-${entry.id}`,
      title: `${surname} ${name}`.trim(),
      subtitle: `${d.badge ? d.badge + " • " : ""}${role}${department ? ` (${department}${d.experience ? `, досвід: ${d.experience}` : ""})` : ""}`,
      url,
      category: "Лікар",
      icon: "doctor",
      priority: 4,
      tags: dedupeTags([
        surname,
        name,
        d.fullNamePatronymic,
        role,
        department,
        d.badge,
        ...(Array.isArray(d.specializations) ? d.specializations : []),
        "лікар",
        "лікарі",
        "врач",
        "врачи",
        "доктор",
        "онколог",
        "радіолог",
        "радиолог",
        "персонал",
        "команда",
        "спеціаліст",
        "специалист",
        "фахівець",
        "консультація",
        "консультация",
        ...(d.isHead ? ["завідувачка", "заведующая", "керівник", "руководитель"] : []),
        ...(roleLower.includes("фізик") ? ["фізик", "физик", "інженер", "инженер"] : []),
        ...(roleLower.includes("рентгенолог") ? ["рентгенолог", "кт", "томограф"] : []),
        ...(roleLower.includes("сестр") ? ["медсестра", "старша медсестра", "лаборант"] : []),
      ]),
    });
  }

  // 7. Динамічні новини з Keystatic (news)
  for (const entry of sortedNews) {
    const url = `/news/${entry.id}`;
    if (!isPublicSearchUrl(url)) continue;
    const dateStr = entry.data.date
      ? new Date(entry.data.date).toLocaleDateString("uk-UA")
      : "";
    const category = entry.data.category || "Новина";
    const desc = (entry.data.description || "").trim();

    items.push({
      id: `news-${entry.id}`,
      title: entry.data.title,
      subtitle: [category, dateStr, desc].filter(Boolean).join(" • "),
      url,
      category: "Новина",
      icon: "news",
      priority: 2,
      tags: dedupeTags([
        entry.data.title,
        desc,
        category,
        ...(Array.isArray(entry.data.tags) ? entry.data.tags : []),
        "новина",
        "новини",
        "новости",
        "новость",
        "стаття",
        "статья",
        "публікація",
        "подія",
      ]),
    });
  }

  // 8. Актуальні вакансії з Keystatic (vacancies)
  for (const entry of activeVacancies) {
    const url = `/vacancies/${entry.id}`;
    if (!isPublicSearchUrl(url)) continue;
    const title = (entry.data.title || "Вакансія").trim();
    const rawDesc = (entry.data.description || "").trim();
    const subtitle =
      rawDesc.length >= 12
        ? rawDesc
        : `Відкрита позиція у радіологічному центрі ${siteSettings.clinicShortName}`;
    const benefitTitles = Array.isArray(entry.data.benefits)
      ? entry.data.benefits.map((b: any) => b?.title).filter(Boolean)
      : [];

    items.push({
      id: `vac-${entry.id}`,
      title: `Вакансія: ${title}`,
      subtitle,
      url,
      category: "Вакансія",
      icon: "briefcase",
      priority: 3,
      tags: dedupeTags([
        title,
        rawDesc,
        ...benefitTitles,
        "вакансія",
        "вакансії",
        "вакансии",
        "вакансия",
        "робота",
        "работа",
        "працевлаштування",
        "трудоустройство",
        "кар'єра",
        "карьера",
        "команда",
        "персонал",
        ...(title.toLowerCase().includes("фізик")
          ? ["фізик", "физик", "інженер", "инженер", "медичний фізик"]
          : []),
        ...(title.toLowerCase().includes("лаборант") ||
        title.toLowerCase().includes("technologist")
          ? ["лаборант", "рентгенлаборант", "рентгенолаборант"]
          : []),
      ]),
    });
  }

  // Фільтруємо будь-які технічні/службові маршрути (/keystatic, /tools/*)
  const searchIndex = items.filter((it) => isPublicSearchUrl(it.url));

  // === РОЗШИРЕНИЙ ПУЛ ПОШУКОВИХ ЧІПІВ (24 варіанти — мінімум 20) ===
  const quickChipsPool: QuickChip[] = [
    ...(isLinacVisible
      ? [{ id: "chip-elekta", label: "Прискорювачі Elekta", query: "Elekta" }]
      : []),
    { id: "chip-nszu", label: "Направлення НСЗУ", query: "НСЗУ" },
    ...(isCtVisible
      ? [{ id: "chip-ct", label: "КТ-симуляція", query: "КТ-симуляція" }]
      : []),
    { id: "chip-phones", label: "Телефони реєстратури", query: "реєстратура" },
    ...(isBrachyVisible
      ? [{ id: "chip-brachy", label: "Брахітерапія", query: "Брахітерапія" }]
      : []),
    ...(isGammaVisible
      ? [{ id: "chip-gamma", label: "Гамма-терапія", query: "Гамма-терапія" }]
      : []),
    ...(isNearfocusVisible
      ? [{ id: "chip-nearfocus", label: "Рентгентерапія", query: "Рентгентерапія" }]
      : []),
    ...(isMltVisible
      ? [{ id: "chip-rehab", label: "Реабілітація", query: "Реабілітація" }]
      : []),
    ...(isLinacVisible
      ? [
          { id: "chip-versa", label: "Elekta Versa HD", query: "Versa HD" },
          { id: "chip-brainlab", label: "Система BrainLAB", query: "BrainLAB" },
        ]
      : []),
    ...(isCtVisible
      ? [{ id: "chip-mask", label: "Маска та розмітка", query: "маска" }]
      : []),
    { id: "chip-schedule", label: "Графік роботи", query: "графік" },
    { id: "chip-kosmichna", label: "Вул. Космічна, 21", query: "Космічна" },
    { id: "chip-rebinina", label: "Вул. Ребініна, 1", query: "Ребініна" },
    { id: "chip-free", label: "Безоплатне лікування", query: "безоплатно" },
    { id: "chip-doctors", label: "Лікарі-радіологи", query: "лікар" },
    { id: "chip-physicists", label: "Медичні фізики", query: "фізик" },
    { id: "chip-analyses", label: "Підготовка та аналізи", query: "аналізи" },
    { id: "chip-route", label: "Маршрут пацієнта", query: "маршрут" },
    { id: "chip-raystation", label: "Планування RayStation", query: "RayStation" },
    { id: "chip-methods", label: "Методи IMRT / VMAT", query: "VMAT" },
    { id: "chip-vacancies", label: "Вакансії центру", query: "вакансії" },
    { id: "chip-news", label: "Новини відділення", query: "новини" },
    { id: "chip-therapy", label: "Променева терапія", query: "променева" },
  ];

  // === РОЗШИРЕНИЙ ПУЛ ШВИДКИХ КАРТОК-ПОСИЛАНЬ (18 варіантів — мінімум 16) ===
  const hasRaystationNews = sortedNews.some((n) =>
    n.id.toLowerCase().includes("raystation")
  );
  const raystationNewsEntry = sortedNews.find((n) =>
    n.id.toLowerCase().includes("raystation")
  );
  const firstTwoPhones = siteSettings.phones
    .slice(0, 2)
    .map((p) => p.number)
    .join(" • ");
  const kosmichnaAddr =
    siteSettings.addresses.find((a) =>
      (a.address || "").toLowerCase().includes("косміч")
    ) || siteSettings.addresses[0];
  const rebininaAddr =
    siteSettings.addresses.find(
      (a) =>
        (a.address || "").toLowerCase().includes("ребінін") ||
        (a.address || "").toLowerCase().includes("гавриленк")
    ) || siteSettings.addresses[1];

  const rawQuickCardsPool: QuickCard[] = [
    ...(isLinacVisible
      ? [
          {
            id: "card-elekta",
            title: "Лінійні прискорювачі Elekta",
            subtitle: "Versa HD, Synergy та навігація BrainLAB",
            badge: "Обладнання",
            href: "/services/linac#accelerators",
            icon: "accelerator" as SearchIconKey,
          },
        ]
      : []),
    ...(isCtVisible
      ? [
          {
            id: "card-ct",
            title: "КТ-симуляція та розмітка",
            subtitle: "Томограф Toshiba Aquilion LB, маски, 3D-план",
            badge: "Планування",
            href: "/services/ct",
            icon: "ct" as SearchIconKey,
          },
        ]
      : []),
    {
      id: "card-nszu",
      title: "НСЗУ та електронне направлення",
      subtitle: "Безоплатне лікування за Програмою медгарантій",
      badge: "Пацієнту",
      href: nszuHref,
      icon: "shield",
    },
    {
      id: "card-doctors",
      title: "Персонал та лікарі відділення",
      subtitle: "Радіаційні онкологи, рентгенологи, фізики",
      badge: "Команда",
      href: "/doctors",
      icon: "team",
    },
    {
      id: "card-phones",
      title: "Телефони реєстратури",
      subtitle: firstTwoPhones || "(056) 720-79-01",
      badge: "Зв'язок",
      href: "/#contacts",
      icon: "phone",
    },
    {
      id: "card-kosmichna",
      title: "Корпус на вул. Космічній, 21",
      subtitle: "Прискорювачі Elekta, КТ-симуляція, брахітерапія",
      badge: "Адреса",
      href: "/#contacts",
      icon: "location",
    },
    ...(isLinacVisible
      ? [
          {
            id: "card-linac-dept",
            title: "Мегавольтна терапія",
            subtitle: "Дистанційне високоточне опромінення IMRT / VMAT",
            badge: "Відділення",
            href: "/services/linac",
            icon: "spark" as SearchIconKey,
          },
        ]
      : []),
    ...(isBrachyVisible
      ? [
          {
            id: "card-brachy",
            title: "Брахітерапія (HDR)",
            subtitle: "Контактна терапія на апаратах MultiSource BEBIG",
            badge: "Відділення",
            href: "/services/brachy",
            icon: "brachy" as SearchIconKey,
          },
        ]
      : []),
    ...(isGammaVisible
      ? [
          {
            id: "card-gamma",
            title: "Дистанційна гамма-терапія",
            subtitle: "Комплекси Theratron Elite 80 та АГАТ-Р1 (Co-60)",
            badge: "Відділення",
            href: "/services/gamma",
            icon: "gamma" as SearchIconKey,
          },
        ]
      : []),
    ...(isNearfocusVisible
      ? [
          {
            id: "card-nearfocus",
            title: "Близькофокусна рентгентерапія",
            subtitle: "Щадне лікування пухлин шкіри на Wolf T-160",
            badge: "Відділення",
            href: "/services/nearfocus",
            icon: "nearfocus" as SearchIconKey,
          },
        ]
      : []),
    ...(isMltVisible
      ? [
          {
            id: "card-mlt",
            title: "Реабілітація та магнітотерапія",
            subtitle: "Відновлення тканин, лімфодренаж та фізіотерапія",
            badge: "Відновлення",
            href: "/services/mlt",
            icon: "rehab" as SearchIconKey,
          },
        ]
      : []),
    {
      id: "card-schedule",
      title: "Графік роботи відділення",
      subtitle: siteSettings.schedule || "Пн–Пт 08:00–16:00",
      badge: "Розклад",
      href: "/#contacts",
      icon: "clock",
    },
    {
      id: "card-rebinina",
      title: rebininaAddr
        ? "Корпус на вул. Ребініна, 1"
        : kosmichnaAddr?.address || "Адреси корпусів ДОКОД",
      subtitle: "Поліклініка, гамма-терапія, КТ та стаціонар",
      badge: "Адреса",
      href: "/#contacts",
      icon: "location",
    },
    {
      id: "card-route",
      title: "Шлях пацієнта та підготовка",
      subtitle: "4 кроки лікування, аналізи та документи",
      badge: "Пацієнту",
      href: "/#patient-journey",
      icon: "route",
    },
    {
      id: "card-departments",
      title: "Усі відділення центру",
      subtitle: "Повний перелік напрямків променевої терапії",
      badge: "Напрямки",
      href: "/#departments",
      icon: "building",
    },
    {
      id: "card-vacancies",
      title: "Актуальні вакансії центру",
      subtitle: "Відкриті позиції для фізиків та лаборантів",
      badge: "Кар'єра",
      href: "/vacancies",
      icon: "briefcase",
    },
    {
      id: "card-news",
      title: "Новини та події відділення",
      subtitle: "Нові технології, стажування та поради",
      badge: "Новини",
      href: "/all-news",
      icon: "news",
    },
    {
      id: "card-raystation",
      title: "3D-планування RayStation і Monaco",
      subtitle: "Точний розрахунок дози із захистом органів",
      badge: "Технології",
      href:
        hasRaystationNews && raystationNewsEntry
          ? `/news/${raystationNewsEntry.id}`
          : isCtVisible
            ? "/services/ct"
            : "/#patient-journey",
      icon: "spark",
    },
  ];

  const quickCardsPool = rawQuickCardsPool.filter((c) => isPublicSearchUrl(c.href));

  // Дані для порожнього стану (3 швидкі посилання + телефон реєстратури з settings.json)
  const primaryPhoneObj = siteSettings.phones[0] || {
    number: "(056) 720-79-01",
    label: "Реєстратура",
  };
  const phoneDigitsOnly = String(primaryPhoneObj.number || "").replace(/[^\d+]/g, "");

  const emptyStateQuickLinks = [
    isLinacVisible
      ? {
          label: "Лінійні прискорювачі",
          href: "/services/linac",
          icon: "accelerator" as SearchIconKey,
        }
      : {
          label: "Усі відділення",
          href: "/#departments",
          icon: "building" as SearchIconKey,
        },
    {
      label: "Лікарі та персонал",
      href: "/doctors",
      icon: "team" as SearchIconKey,
    },
    {
      label: "Контакти та адреси",
      href: "/#contacts",
      icon: "location" as SearchIconKey,
    },
  ].filter((link) => isPublicSearchUrl(link.href));

  return {
    searchIndex,
    quickChipsPool,
    quickCardsPool,
    emptyState: {
      phone: primaryPhoneObj.number,
      phoneTel: phoneDigitsOnly ? `tel:${phoneDigitsOnly}` : "/#contacts",
      phoneLabel: primaryPhoneObj.label || "Реєстратура",
      quickLinks: emptyStateQuickLinks.slice(0, 3),
    },
  };
}
