/**
 * Рендерит <meta name="google-site-verification"> для GSC.
 * Активируется только если env NEXT_PUBLIC_GSC_VERIFICATION задана.
 * Альтернатива HTML-файлу: работает без деплоя файла в public/.
 */
export function GscVerification() {
  const token = process.env.NEXT_PUBLIC_GSC_VERIFICATION;
  if (!token) return null;
  return (
    <meta
      name="google-site-verification"
      content={token}
    />
  );
}
