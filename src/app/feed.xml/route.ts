import { getAllArticles } from "@/lib/articles";
import { buildRssXml } from "@/lib/rss";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sovereign-semantics.vercel.app";

/**
 * /feed.xml — алиас основного ru-фида.
 *
 * Канонический путь для ru-фида = /rss.xml (см. src/app/rss.xml/route.ts).
 * Этот endpoint существует для обратной совместимости со ссылками,
 * которые могли быть опубликованы до фикса 04.06.2026.
 *
 * ВАЖНО: в vercel.json НЕТ редиректа /feed.xml → /rss.xml, чтобы
 * валидаторы (W3C, Дзен, ридеры) видели 200 напрямую с правильным
 * Content-Type, а не цепочку 301/307.
 *
 * atom:link rel="self" указывает на /rss.xml — валидный 200-эндпоинт
 * канонического фида.
 */
export const dynamic = "force-static";

export async function GET() {
  const articles = await getAllArticles({ locale: "ru", includeDrafts: false });
  const xml = buildRssXml({
    locale: "ru",
    siteUrl: SITE_URL,
    articles,
    selfUrl: `${SITE_URL}/rss.xml`,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
