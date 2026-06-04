/**
 * IndexNow — мгновенный пинг Bing, Яндекс, Naver (и других) при публикации.
 * Документация: https://www.indexnow.org/documentation
 *
 * Использование: await pingIndexNow([url1, url2, ...])
 *
 * Требует:
 *   - env INDEXNOW_KEY — hex-ключ, должен также лежать в public/indexnow-<key>.txt
 *   - доступность env NEXT_PUBLIC_SITE_URL (источник домена)
 */

const INDEXNOW_ENDPOINTS = [
  "https://api.indexnow.org/indexnow",  // primary
  "https://www.bing.com/indexnow",
  "https://yandex.com/indexnow",
];

export async function pingIndexNow(urls: string[]): Promise<{
  submitted: number;
  results: { endpoint: string; status: number; ok: boolean }[];
}> {
  const key = process.env.INDEXNOW_KEY;
  const host = process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname
    : "sovereign-semantics.vercel.app";

  if (!key) {
    return {
      submitted: 0,
      results: [{ endpoint: "skipped", status: 0, ok: false }],
    };
  }
  if (!urls || urls.length === 0) {
    return { submitted: 0, results: [] };
  }

  const body = {
    host,
    key,
    keyLocation: `https://${host}/indexnow-${key}.txt`,
    urlList: urls,
  };

  const results = await Promise.all(
    INDEXNOW_ENDPOINTS.map(async (endpoint) => {
      try {
        const r = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify(body),
        });
        return { endpoint, status: r.status, ok: r.ok || r.status === 200 || r.status === 202 };
      } catch (e) {
        return { endpoint, status: 0, ok: false };
      }
    })
  );

  return {
    submitted: urls.length,
    results,
  };
}
