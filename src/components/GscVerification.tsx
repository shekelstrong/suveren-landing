/**
 * Рендерит <meta name="google-site-verification"> для Google Search Console.
 *
 * Токен берётся из env NEXT_PUBLIC_GSC_VERIFICATION (заполняется в
 * Vercel → Settings → Environment Variables, чтобы можно было сменить
 * без правки кода). Если env не задан — fallback на захардкоженный
 * токен, чтобы верификация работала «из коробки» при локальном dev
 * и до заполнения env на Vercel.
 *
 * Альтернатива — HTML-файл google{TOKEN}.html в public/, но meta-тег
 * быстрее (не требует деплоя после смены токена) и его видит GSC
 * моментально после редеплоя.
 */
export function GscVerification() {
  const token =
    process.env.NEXT_PUBLIC_GSC_VERIFICATION?.trim() ||
    "VlUjOekvfzZ-dO7A7wOXb1nJYzwwxdyTqxYzxmHYHoY";
  return (
    <meta name="google-site-verification" content={token} />
  );
}
