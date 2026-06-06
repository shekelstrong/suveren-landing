import { NextResponse } from "next/server";
import { getAllArticles } from "@/lib/articles";

/**
 * GET /api/articles-list
 * Список всех статей (включая draft) — для админки.
 * Авторизация: Bearer CMS_API_TOKEN
 */
export async function GET(req: Request) {
  const token = process.env.CMS_API_TOKEN;
  // В production токен обязателен. В dev — пропускаем.
  if (!token && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "API disabled: CMS_API_TOKEN not configured" },
      { status: 503 },
    );
  }
  if (token) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${token}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const articles = await getAllArticles({ includeDrafts: true });
    return NextResponse.json({
      count: articles.length,
      articles: articles.map((a) => ({
        slug: a.slug,
        title: a.title,
        description: a.description,
        date: a.date,
        tags: a.tags,
        draft: a.draft,
        readingTime: a.readingTime,
      })),
    });
  } catch (err) {
    // 2026-06-06: до этого блока не было — Vercel отдавал пустой 500, в
    // админке был неотлаживаемый «HTTP 500». Теперь логируем и возвращаем
    // внятное сообщение, чтобы было видно, что именно упало.
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[articles-list] unhandled error:", message, stack);
    return NextResponse.json(
      {
        error: "Internal error in /api/articles-list",
        detail: message,
        stack: process.env.NODE_ENV === "production" ? undefined : stack,
      },
      { status: 500 },
    );
  }
}
