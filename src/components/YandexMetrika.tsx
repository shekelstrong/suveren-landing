import Script from "next/script";

/**
 * Yandex.Metrica counter.
 *
 * ID берётся из env `NEXT_PUBLIC_YANDEX_METRIKA_ID` (если задан в Vercel).
 * Если env не задан — fallback на захардкоженный 109644337, чтобы счётчик
 * работал «из коробки» при локальной разработке и до заполнения env.
 *
 * Стратегия `beforeInteractive` гарантирует, что скрипт встанет в <head>
 * как можно раньше — ДО hydration. Это критично: если посетитель почти
 * сразу закроет страницу, hit всё равно уйдёт.
 *
 * `noscript` рендерится обычным HTML — для тех, у кого отключён JS,
 * и для агрессивного CDN-кеша Vercel.
 *
 * Подробнее про параметры:
 *   ssr: true                 — учитывать Client-Side Rendering (App Router)
 *   webvisor: true            — запись сессий (аналог GA4 Session Replay)
 *   clickmap: true            — кликабельная карта (heatmap кликов)
 *   ecommerce: "dataLayer"    — готово к DataLayer для будущей e-commerce
 *   referrer + url            — реальный referrer и URL после SPA-навигации
 *   accurateTrackBounce: true — не считать отказом «уход за <15с неактив.»
 *   trackLinks: true          — трекать outbound-клики по внешним ссылкам
 */
export function YandexMetrika() {
  const id =
    process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID?.trim() || "109644337";

  return (
    <>
      <Script id="yandex-metrika-counter" strategy="beforeInteractive">
        {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
})(window, document, "script", "https://mc.yandex.ru/metrika/tag.js?id=${id}", "ym");

ym(${JSON.stringify(id)}, "init", {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});`}
      </Script>
      <noscript>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://mc.yandex.ru/watch/${id}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
            width={1}
            height={1}
          />
        </div>
      </noscript>
    </>
  );
}
