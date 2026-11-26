#!/usr/bin/env node
/**
 * Автоматичний оптимізатор зображень для public/images/ (на базі sharp).
 * Конвертує нові JPG/JPEG/PNG файли у WebP, пропускаючи вже оптимізовані .webp файли,
 * та автоматично оновлює посилання на них у src/content/.
 *
 * Правила за підпапками public/images/:
 *   - staff/    -> max ширина 800px,  quality 80
 *   - services/ -> max ширина 1200px, quality 80
 *   - news/     -> max ширина 1200px, quality 80
 *   - hero/     -> max ширина 1600px, quality 82
 *
 * Опції CLI:
 *   --dry-run          Тільки показати, що буде оптимізовано, без запису на диск
 *   --keep-originals   Зберегти вихідні JPG/PNG поруч із .webp (пропускає, якщо .webp вже існує)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT_DIR, 'public', 'images');
const CONTENT_DIR = path.join(ROOT_DIR, 'src', 'content');

const FOLDER_RULES = {
  staff: { maxWidth: 800, quality: 80 },
  services: { maxWidth: 1200, quality: 80 },
  news: { maxWidth: 1200, quality: 80 },
  hero: { maxWidth: 1600, quality: 82 },
};

const DEFAULT_RULE = { maxWidth: 1200, quality: 80 };
const RASTER_EXTS = new Set(['.jpg', '.jpeg', '.png']);
const CONTENT_EXTS = new Set(['.json', '.md', '.mdx', '.mdoc', '.yaml', '.yml']);

const args = new Set(process.argv.slice(2));
const isDryRun = args.has('--dry-run');
const keepOriginals = args.has('--keep-originals');

function formatKB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function toPosixPath(p) {
  return p.split(path.sep).join('/');
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(dir) {
  const results = [];
  if (!(await pathExists(dir))) return results;

  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

function getRuleForFile(filePath) {
  const rel = toPosixPath(path.relative(IMAGES_DIR, filePath));
  const topFolder = rel.split('/')[0]?.toLowerCase() || '';
  return {
    folder: topFolder || '(root)',
    ...(FOLDER_RULES[topFolder] || DEFAULT_RULE),
  };
}

async function updateContentReferences(replacements) {
  if (replacements.size === 0) return 0;

  const contentFiles = await walkFiles(CONTENT_DIR);
  let updatedFilesCount = 0;

  for (const filePath of contentFiles) {
    const ext = path.extname(filePath).toLowerCase();
    if (!CONTENT_EXTS.has(ext)) continue;

    const originalText = await fs.readFile(filePath, 'utf8');
    let nextText = originalText;

    for (const [oldPublicPath, newPublicPath] of replacements.entries()) {
      if (nextText.includes(oldPublicPath)) {
        nextText = nextText.split(oldPublicPath).join(newPublicPath);
      }
    }

    if (nextText !== originalText) {
      updatedFilesCount++;
      if (!isDryRun) {
        await fs.writeFile(filePath, nextText, 'utf8');
      }
      const rel = toPosixPath(path.relative(ROOT_DIR, filePath));
      console.log(`  ↳ Updated image references in ${rel}`);
    }
  }

  return updatedFilesCount;
}

async function main() {
  if (!(await pathExists(IMAGES_DIR))) {
    console.log('Directory public/images/ does not exist yet. Nothing to optimize.');
    return;
  }

  const allFiles = await walkFiles(IMAGES_DIR);
  if (allFiles.length === 0) {
    console.log('No files found in public/images/. Nothing to optimize.');
    return;
  }

  let convertedCount = 0;
  let skippedWebpCount = 0;
  let skippedExistingCount = 0;
  let totalOrigBytes = 0;
  let totalWebpBytes = 0;
  const pathReplacements = new Map();

  for (const filePath of allFiles) {
    const ext = path.extname(filePath).toLowerCase();
    const relFromImages = toPosixPath(path.relative(IMAGES_DIR, filePath));

    // Пропускаємо вже оптимізовані WebP та службові файли (.gitkeep тощо)
    if (ext === '.webp') {
      skippedWebpCount++;
      continue;
    }
    if (!RASTER_EXTS.has(ext)) {
      continue;
    }

    const rule = getRuleForFile(filePath);
    const parsed = path.parse(filePath);
    const targetWebpPath = path.join(parsed.dir, `${parsed.name}.webp`);

    // Якщо --keep-originals і актуальний .webp вже є — пропускаємо
    if (keepOriginals && (await pathExists(targetWebpPath))) {
      const [srcStat, dstStat] = await Promise.all([
        fs.stat(filePath),
        fs.stat(targetWebpPath),
      ]);
      if (dstStat.mtimeMs >= srcStat.mtimeMs) {
        skippedExistingCount++;
        continue;
      }
    }

    const origBuffer = await fs.readFile(filePath);
    const origSize = origBuffer.length;

    const pipeline = sharp(origBuffer)
      .rotate()
      .resize({
        width: rule.maxWidth,
        withoutEnlargement: true,
      })
      .webp({
        quality: rule.quality,
        effort: 5,
      });

    const { data: webpBuffer, info } = await pipeline.toBuffer({
      resolveWithObject: true,
    });

    if (!webpBuffer || webpBuffer.length === 0) {
      console.warn(`⚠️ Skipped empty output for ${relFromImages}`);
      continue;
    }

    const webpSize = webpBuffer.length;
    const savingsPct = origSize > 0 ? ((origSize - webpSize) / origSize) * 100 : 0;

    const relWebp = toPosixPath(path.relative(IMAGES_DIR, targetWebpPath));
    const oldPublicUrl = `/images/${relFromImages}`;
    const newPublicUrl = `/images/${relWebp}`;

    if (!isDryRun) {
      await fs.writeFile(targetWebpPath, webpBuffer);
      if (!keepOriginals && targetWebpPath !== filePath) {
        await fs.unlink(filePath);
      }
    }

    pathReplacements.set(oldPublicUrl, newPublicUrl);
    convertedCount++;
    totalOrigBytes += origSize;
    totalWebpBytes += webpSize;

    console.log(
      `✅ [${rule.folder}] ${relFromImages} -> ${relWebp} | ${info.width}x${info.height} | ${formatKB(origSize)} -> ${formatKB(webpSize)} (${savingsPct >= 0 ? '-' : '+'}${Math.abs(savingsPct).toFixed(1)}%)`
    );
  }

  const updatedRefs = await updateContentReferences(pathReplacements);

  console.log('\n--- Image Optimization Summary ---');
  console.log(`Mode:              ${isDryRun ? 'DRY RUN (no files written)' : 'APPLY'}`);
  console.log(`Converted:         ${convertedCount}`);
  console.log(`Skipped (.webp):   ${skippedWebpCount}`);
  if (skippedExistingCount > 0) {
    console.log(`Skipped (cached):  ${skippedExistingCount}`);
  }
  if (convertedCount > 0) {
    const totalSaved = totalOrigBytes - totalWebpBytes;
    const totalPct = totalOrigBytes > 0 ? (totalSaved / totalOrigBytes) * 100 : 0;
    console.log(
      `Total size:        ${formatKB(totalOrigBytes)} -> ${formatKB(totalWebpBytes)} (saved ${formatKB(totalSaved)}, ${totalPct.toFixed(1)}%)`
    );
    console.log(`Content refs upd.: ${updatedRefs} file(s)`);
  } else {
    console.log('All images in public/images/ are already optimized.');
  }
}

main().catch((err) => {
  console.error('❌ Image optimization failed:', err);
  process.exit(1);
});
