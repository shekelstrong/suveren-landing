import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * /llms-full.txt — расширенная версия с рубрикатором и API-примерами.
 */
export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "llms-full.txt");
  const content = await fs.readFile(filePath, "utf-8");
  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
