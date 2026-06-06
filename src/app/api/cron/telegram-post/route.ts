import { NextRequest, NextResponse } from "next/server";
import { getAllArticles } from "@/lib/articles";
import { siteUrl } from "@/lib/site";

/**
 * Vercel Cron: раз в 30 мин fetch RSS → публикация новых статей в Telegram-канал.
 *
 * Защита: header x-vercel-cron или ?secret=... (если задан TELEGRAM_CRON_SECRET)
 * State: в KV не сохраняем (Vercel KV не используется), сравниваем по дате + slug в "memory.json" в Git.
 * Простой workaround: ведём лог "уже отправленных" в `content/.telegram-sent.json` (не в git, runtime file).
 *
 * ENV:
 *   - TELEGRAM_BOT_TOKEN      (обязательно)
 *   - TELEGRAM_CHANNEL        (например, "@suveren_media")
 *   - NEXT_PUBLIC_SITE_URL    (для ссылок в кнопках)
 *   - TELEGRAM_CRON_SECRET    (опц., защита эндпоинта)
 */

const POSTED_FILE = "/tmp/.telegram-posted.json";

async function loadPosted(): Promise<Set<string>> {
  try {
    const fs = await import("node:fs/promises");
    const data = await fs.readFile(POSTED_FILE, "utf-8");
    return new Set(JSON.parse(data));
  } catch {
    return new Set();
  }
}

async function savePosted(s: Set<string>) {
  const fs = await import("node:fs/promises");
  await fs.writeFile(POSTED_FILE, JSON.stringify([...s]));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface Article {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  cover?: string;
  locale: "ru" | "en";
}

export async function GET(req: NextRequest) {
  // Защита
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

  // Берём все статьи
  const articles: Article[] = await getAllArticles();
  if (articles.length === 0) {
    return NextResponse.json({ posted: 0, message: "no articles" });
  }

  const posted = await loadPosted();
  const newPosts: string[] = [];
  const errors: any[] = [];

  // Сортируем по дате (новые первые)
  const sorted = [...articles].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const article of sorted) {
    const key = `${article.locale}:${article.slug}`;
    if (posted.has(key)) continue;

    const url = siteUrl(
      article.locale === "en"
        ? `/en/blog/${article.slug}`
        : `/blog/${article.slug}`,
    );

    // Telegram message
    const tags = article.tags.map((t) => `#${t.replace(/\s+/g, "_")}`).join(" ");
    const text =
      `<b>${escapeHtml(article.title)}</b>\n\n` +
      `${escapeHtml(article.description)}\n\n` +
      `${tags}\n\n` +
      `<i>${new Date(article.date).toLocaleDateString("ru-RU")}</i>`;

    // Inline-кнопка «Читать»
    const reply_markup = {
      inline_keyboard: [[{ text: "📖 Читать на сайте →", url }]],
    };

    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channel,
          text,
          parse_mode: "HTML",
          reply_markup,
          disable_web_page_preview: false,
        }),
      });
      const tgData = await tgRes.json();
      if (tgData.ok) {
        posted.add(key);
        newPosts.push(key);
      } else {
        errors.push({ key, error: tgData.description });
      }
    } catch (e: any) {
      errors.push({ key, error: e.message });
    }
  }

  await savePosted(posted);

  return NextResponse.json({
    posted: newPosts.length,
    keys: newPosts,
    errors: errors.length > 0 ? errors : undefined,
    channel,
    total: articles.length,
  });
}
