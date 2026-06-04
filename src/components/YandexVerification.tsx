/**
 * Рендерит <meta name="yandex-verification"> для Яндекс.Вебмастера.
 */
export function YandexVerification() {
  const token = process.env.NEXT_PUBLIC_YANDEX_VERIFICATION;
  if (!token) return null;
  return (
    <meta
      name="yandex-verification"
      content={token}
    />
  );
}
