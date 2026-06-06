import { getAllArticles } from "@/lib/articles";
import { buildRssXml } from "@/lib/rss";
import { siteUrl } from "@/lib/site";

/**
 * /rss.xml — алиас для основного фида (стандартное место, которое ищут
 * LLM-краулеры, Дзен, валидаторы). Отдаёт тот же ru-фид что и /feed.xml,
 * но без редиректа — сразу RSS 2.0 (200, application/rss+xml).
 *
 * Раньше был 307 → /ru/feed.xml, из-за чего валидаторы ругались.
 */
export const dynamic = "force-static";

export async function GET() {
  const articles = await getAllArticles({ locale: "ru", includeDrafts: false });
  const xml = buildRssXml({
    locale: "ru",
    siteUrl: siteUrl(),
    articles,
    selfUrl: siteUrl("/rss.xml"),
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
