/**
 * Рендерит <meta name="yandex-verification"> для Яндекс.Вебмастера.
 *
 * Токен берётся из env NEXT_PUBLIC_YANDEX_VERIFICATION (заполняется в
 * Vercel → Settings → Environment Variables, чтобы можно было сменить
 * без правки кода). Если env не задан — fallback на код из HTML-файла
 * подтверждения (public/yandex_*.html), чтобы верификация работала
 * «из коробки» при локальном dev и до заполнения env на Vercel.
 *
 * Зачем нужен meta-тег, если есть HTML-файл?
 *   • HTML-файл требует редеплоя после смены кода
 *   • meta-тег — моментально после редеплоя
 *   • Оба метода валидны, Яндекс принимает любой
 *   • Имея оба — повышается шанс, что Яндекс найдёт подтверждение
 */
export function YandexVerification() {
  const token =
    process.env.NEXT_PUBLIC_YANDEX_VERIFICATION?.trim() ||
    "b2ab6b26556964c6";
  return <meta name="yandex-verification" content={token} />;
}
