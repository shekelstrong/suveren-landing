/**
 * Single source of truth for the site origin. Все 13 дублей `SITE_URL` в коде
 * заменены на импорт отсюда, чтобы:
 *
 * 1. **Двойной слэш** (`/blog/...` → `https://site//blog/...`) больше не возникал.
 *    Раньше 6 файлов создавали `SITE_URL` через `process.env.NEXT_PUBLIC_SITE_URL`
 *    БЕЗ `.replace(/\/$/, "")` — и при env со trailing slash canonical
 *    получал `//`. Это ломало индексацию в Google и было одной из причин
 *    «Не удалось обработать Sitemap» в GSC.
 *
 * 2. **Единая точка изменения** при переезде на custom domain или смене env.
 *
 * Использование:
 *   import { siteUrl, getSiteUrl } from "@/lib/site";
 *   canonical: siteUrl("/en/blog/foo")        ← возвращает полный URL без двойных слэшей
 *   canonical: siteUrl()                       ← для корневой: https://site (без trailing)
 *
 * ⚠️ `siteUrl()` без аргумента НЕ добавляет trailing slash! Это by design:
 * `metadataBase` в layout.tsx сам добавляет trailing при рендере, и если
 * передать сюда URL уже с trailing — получится `//`. Передавай `siteUrl("/path")`
 * для путей с leading slash.
 */

const RAW =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sovereign-semantics.vercel.app";

/** Origin без trailing slash. Используй для конкатенации и в metadataBase. */
export const SITE_ORIGIN = RAW.replace(/\/$/, "");

/** Получить origin (без trailing). */
export function getSiteUrl(): string {
  return SITE_ORIGIN;
}

/**
 * Склеить origin с путём. Защита от:
 * - trailing slash в env (SITE_ORIGIN уже без него)
 * - двойного leading slash в path
 * - missing leading slash (добавим)
 *
 * Примеры:
 *   siteUrl()             → "https://sovereign-semantics.vercel.app"
 *   siteUrl("")           → "https://sovereign-semantics.vercel.app"
 *   siteUrl("/")          → "https://sovereign-semantics.vercel.app/"   (для ОГ)
 *   siteUrl("/blog")      → "https://sovereign-semantics.vercel.app/blog"
 *   siteUrl("blog")       → "https://sovereign-semantics.vercel.app/blog"
 *   siteUrl("/en/")       → "https://sovereign-semantics.vercel.app/en"  (трейлинг path стрипается)
 */
export function siteUrl(path: string = ""): string {
  if (!path) return SITE_ORIGIN;
  const normalized = "/" + path.replace(/^\/+/, "").replace(/\/+$/, "");
  // Спец-кейс: siteUrl("/") → корень с trailing
  if (normalized === "/") return SITE_ORIGIN + "/";
  return SITE_ORIGIN + normalized;
}
