import { NextRequest, NextResponse } from "next/server";
import { getAllArticles } from "@/lib/articles";
import { siteUrl } from "@/lib/site";

/**
 * Vercel Cron: раз в сутки (или вручную) — обновляет закреп-сообщение в канале
 * со списком всех статей в виде URL-кнопок (Telegram inline keyboard).
 *
 * При первом запуске создаёт новое сообщение и пинит его.
 * При последующих — редактирует (editMessageText) и перепинивает.
 *
 * ENV:
 *   - TELEGRAM_BOT_TOKEN
 *   - TELEGRAM_CHANNEL
 *   - NEXT_PUBLIC_SITE_URL
 *   - TELEGRAM_CRON_SECRET (опц.)
 *
 * State хранится в /tmp/.telegram-nav-state.json:
 *   { message_id: number, last_updated: ISO }
 */

const STATE_FILE = "/tmp/.telegram-nav-state.json";
const MAX_BUTTONS_PER_ROW = 2;  // 2 кнопки в строке
const MAX_ROWS = 30;  // Telegram лимит 100 кнопок на инлайн-клавиатуру

async function loadState(): Promise<{ message_id?: number; last_updated?: string }> {
  try {
    const fs = await import("node:fs/promises");
    const data = await fs.readFile(STATE_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveState(s: object) {
  const fs = await import("node:fs/promises");
  await fs.writeFile(STATE_FILE, JSON.stringify(s));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get("x-vercel-cron") != null;
  const secret = process.env.TELEGRAM_CRON_SECRET;
  if (secret && req.nextUrl.searchParams.get("secret") !== secret && !isVercelCron) {
    return NextResponse.json({ error: "forbidden" }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channel = process.env.TELEGRAM_CHANNEL || "@suveren_media";

  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 });
  }

  const articles = await getAllArticles();
  const sorted = [...articles].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Текст закрепа
  const text =
    `<b>📚 Архитектура суверенных смыслов</b>\n\n` +
    `Оглавление: ${sorted.length} ${sorted.length === 1 ? "статья" : "статей"}.\n` +
    `Обновляется автоматически.\n\n` +
    `<i>Нажмите кнопку — откроется статья.</i>`;

  // Inline-кнопки: по 2 в ряд
  const rows: any[][] = [];
  for (let i = 0; i < Math.min(sorted.length, MAX_ROWS * MAX_BUTTONS_PER_ROW); i += MAX_BUTTONS_PER_ROW) {
    const row: any[] = [];
    for (let j = 0; j < MAX_BUTTONS_PER_ROW && i + j < sorted.length; j++) {
      const a = sorted[i + j];
      const titleShort = a.title.length > 40 ? a.title.slice(0, 37) + "…" : a.title;
      row.push({
        text: `${titleShort} (${a.locale})`,
        url: siteUrl(
          a.locale === "en"
            ? `/en/blog/${a.slug}`
            : `/blog/${a.slug}`,
        ),
      });
    }
    rows.push(row);
  }

  // Кнопка "Все статьи" в конце
  rows.push([{ text: "📖 Все статьи", url: siteUrl("/blog") }]);
  rows.push([{ text: "🌐 Сайт", url: siteUrl() }]);

  const reply_markup = { inline_keyboard: rows };

  const state = await loadState();

  let result: any;
  if (state.message_id) {
    // Edit existing
    const editRes = await fetch(
      `https://api.telegram.org/bot${token}/editMessageText`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channel,
          message_id: state.message_id,
          text,
          parse_mode: "HTML",
          reply_markup,
          disable_web_page_preview: true,
        }),
      }
    );
    result = await editRes.json();
    // Если message не найден (был удалён) — отправим заново
    if (!result.ok && result.error_code === 400) {
      // Fallback: новый пост
      const sendRes = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: channel,
            text,
            parse_mode: "HTML",
            reply_markup,
            disable_web_page_preview: true,
          }),
        }
      );
      result = await sendRes.json();
    }
  } else {
    // Send new
    const sendRes = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channel,
          text,
          parse_mode: "HTML",
          reply_markup,
          disable_web_page_preview: true,
        }),
      }
    );
    result = await sendRes.json();
  }

  if (!result.ok) {
    return NextResponse.json({ error: "telegram_api_error", details: result }, { status: 500 });
  }

  // Pin message
  if (result.result?.message_id) {
    await fetch(
      `https://api.telegram.org/bot${token}/pinChatMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channel,
          message_id: result.result.message_id,
          disable_notification: true,
        }),
      }
    );

    await saveState({
      message_id: result.result.message_id,
      last_updated: new Date().toISOString(),
      articles_count: sorted.length,
    });
  }

  return NextResponse.json({
    ok: true,
    message_id: result.result?.message_id,
    articles_count: sorted.length,
    channel,
  });
}
