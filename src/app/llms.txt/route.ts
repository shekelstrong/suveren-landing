import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * /llms.txt — конвенция для AI-краулеров (https://llmstxt.org/).
 * Обслуживается как app route, чтобы избежать перехвата middleware-ом
 * с catch-all [lang] параметром.
 */
export const dynamic = "force-static";
export const revalidate = 3600; // обновлять раз в час

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "llms.txt");
  const content = await fs.readFile(filePath, "utf-8");
  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
