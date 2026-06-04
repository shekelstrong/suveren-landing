import type { Article, Locale } from "./articles-types";

const META: Record<
  Locale,
  { title: string; desc: string; lang: string; editor: string }
> = {
  ru: {
    title: "Архитектура суверенных смыслов",
    desc: "Аналитика · IT · ИИ · Технологический суверенитет. Без воды, с фактами.",
    lang: "ru-ru",
    editor: "Редакция АСС",
  },
  en: {
    title: "Architecture of Sovereign Meaning",
    desc: "Analytics · IT · AI · Technological sovereignty. No fluff, only facts.",
    lang: "en-us",
    editor: "ACC Editorial",
  },
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripMarkdown(md: string): string {
  return md
    .replace(/^---[\s\S]*?---/, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

/**
 * Очистить HTML от атрибутов/тегов, которые Дзен не принимает.
 * Дзен поддерживает только ограниченный набор HTML (p, a, b, i, u, s,
 * h1-h4, blockquote, ul/ol/li, figure/img/figcaption, video/source).
 * Все class/style/data-* атрибуты нужно убрать.
 */
function cleanHtmlForDzen(html: string): string {
  return html
    // Убираем все class, style, id, data-* атрибуты
    .replace(/\s+(class|style|id|data-[a-z-]+|aria-[a-z-]+|role|target|rel)="[^"]*"/g, "")
    .replace(/\s+(class|style|id|data-[a-z-]+|aria-[a-z-]+|role|target|rel)='[^']*'/g, "")
    // Убираем inline scripts и опасные теги
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<input[^>]*>/gi, "")
    .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, "")
    // Заменяем div / section / article на p (Дзен не поддерживает)
    .replace(/<\/?(div|section|article|aside|header|footer|nav|main|span)>/gi, "")
    // Заменяем h5, h6 на h4
    .replace(/<(\/?)h[56]>/gi, "<$1h4>")
    .trim();
}

function absolutizeUrls(html: string, siteUrl: string, basePath: string): string {
  // Превращаем относительные src="/..." в абсолютные
  return html
    .replace(/src="\/([^"]*)"/g, `src="${siteUrl}$1"`)
    .replace(/href="\/([^"#?]*)"/g, (_m, p) => `href="${siteUrl}${p.startsWith('/') ? '' : '/'}${p}"`);
}

export interface BuildRssOptions {
  locale: Locale;
  siteUrl: string;
  articles: Article[];
  /**
   * Абсолютный URL для <atom:link rel="self">. Должен указывать на реальный
   * 200-эндпоинт того же фида, иначе валидаторы (W3C, RSS-ридеры, Дзен) ругаются.
   */
  selfUrl: string;
}

/**
 * Сборка RSS 2.0 XML из статей. Чистая функция — не делает fetch,
 * принимает уже загруженные данные. Используется всеми feed-эндпоинтами.
 */
export function buildRssXml({
  locale,
  siteUrl,
  articles,
  selfUrl,
}: BuildRssOptions): string {
  const meta = META[locale];
  const lastBuild = new Date().toUTCString();

  const items = articles
    .map((a) => {
      const url = `${siteUrl}${a.locale === "en" ? "/en" : ""}/blog/${a.slug}`;
      // pdalink — мобильная версия. У нас адаптивный дизайн, поэтому тот же URL
      const pdalink = url;
      const description = a.description || stripMarkdown(a.content).slice(0, 280);
      // Дзен требует 4 значения <category>: способ публикации, тип, индексация, комментирование
      const dzenCategories = [
        "auto-publish",
        "format-article",
        "index",
        "comment-all",
      ];
      const tagCategories = a.tags.map((t) => escapeXml(t));
      const allCategories = [...dzenCategories, ...tagCategories];
      const coverUrl = a.cover
        ? a.cover.startsWith("http")
          ? a.cover
          : `${siteUrl}${a.cover}`
        : null;
      // content:encoded — обязателен для Дзена. Берём очищенный HTML.
      const cleanedHtml = cleanHtmlForDzen(
        absolutizeUrls(a.html, siteUrl, a.locale === "en" ? "/en" : ""),
      );
      const contentEncoded = `<![CDATA[${cleanedHtml}]]>`;
      const enclosureTag = coverUrl
        ? `\n      <enclosure url="${coverUrl}" type="image/jpeg" length="0" />`
        : "";

      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <pdalink>${pdalink}</pdalink>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(a.date).toUTCString()}</pubDate>
      <author>vasileneopekin@yandex.ru (${escapeXml(a.author || meta.editor)})</author>
      <dc:creator>${escapeXml(a.author || meta.editor)}</dc:creator>${allCategories
        .map((c) => `\n      <category>${c}</category>`)
        .join("")}${enclosureTag}
      <description>${escapeXml(description)}</description>
      <media:rating scheme="urn:simple">nonadult</media:rating>
      <content:encoded>${contentEncoded}</content:encoded>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(meta.title)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(meta.desc)}</description>
    <language>${meta.lang}</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${selfUrl}" rel="self" type="application/rss+xml" />
    <managingEditor>vasileneopekin@yandex.ru (${escapeXml(meta.editor)})</managingEditor>
    <webMaster>vasileneopekin@yandex.ru (${escapeXml(meta.editor)})</webMaster>
    <image>
      <url>${siteUrl}/icon</url>
      <title>${escapeXml(meta.title)}</title>
      <link>${siteUrl}</link>
    </image>
${items}
  </channel>
</rss>`;
}
