import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", "/admin/*"],
      },
      // LLM-краулеры — не блокируем, наоборот приглашаем
      {
        userAgent: "GPTBot",
        allow: "/",
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
      },
      {
        userAgent: "anthropic-ai",
        allow: "/",
      },
    ],
    // sitemap: достаточно. `host` убран — Google deprecated в 2023, оставление
    // может вызывать warning в Search Console.
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
