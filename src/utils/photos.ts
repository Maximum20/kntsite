export interface PhotoSlide {
  src: string;
  alt: string;
  caption?: string;
}

/**
 * Повертає true, якщо шлях належить до старих захардкоджених фото з папки /hero/.
 * Офіційний логотип НСЗУ не вважається фотографією контенту.
 */
export function isLegacyPhotoPath(src?: string | null): boolean {
  if (!src || typeof src !== 'string') return false;
  const normalized = src.trim().replace(/\\/g, '/');
  if (!normalized) return false;
  return normalized.startsWith('/hero/') || normalized.startsWith('hero/');
}

/**
 * Повертає фінальний URL зображення з урахуванням глобального прапорця hideLegacyPhotos.
 * - Якщо задано нове фото з Keystatic (не з /hero/), воно показується завжди.
 * - Якщо hideLegacyPhotos === true, старі фото з /hero/ приховуються (повертається null).
 * - Якщо фото не задане — повертається null для рендеру ImagePlaceholder.
 */
export function resolvePhotoUrl(
  primarySrc?: string | null,
  legacySrc?: string | null,
  hideLegacyPhotos = false
): string | null {
  const cleanPrimary = typeof primarySrc === 'string' ? primarySrc.trim() : '';
  if (cleanPrimary) {
    if (!hideLegacyPhotos || !isLegacyPhotoPath(cleanPrimary)) {
      return cleanPrimary;
    }
  }

  const cleanLegacy = typeof legacySrc === 'string' ? legacySrc.trim() : '';
  if (cleanLegacy) {
    if (!hideLegacyPhotos || !isLegacyPhotoPath(cleanLegacy)) {
      return cleanLegacy;
    }
  }

  return null;
}

/**
 * Формує очищений масив слайдів каруселі з Keystatic-масиву, фільтруючи порожні або приховані legacy-фото.
 */
export function normalizeGallerySlides(
  items: Array<{ image?: string | null; alt?: string; caption?: string }> | undefined | null,
  fallbackAlt: string,
  hideLegacyPhotos = false
): PhotoSlide[] {
  if (!Array.isArray(items)) return [];

  const slides: PhotoSlide[] = [];
  for (const item of items) {
    const resolved = resolvePhotoUrl(item?.image, null, hideLegacyPhotos);
    if (!resolved) continue;

    const caption = typeof item?.caption === 'string' ? item.caption.trim() : '';
    const alt =
      (typeof item?.alt === 'string' && item.alt.trim()) ||
      caption ||
      fallbackAlt;

    slides.push({
      src: resolved,
      alt,
      ...(caption ? { caption } : {}),
    });
  }

  return slides;
}
