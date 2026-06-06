import type { MetadataRoute } from "next";
import { getAllArticles } from "@/lib/articles";
import { routes } from "@/lib/routes";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [ruArticles, enArticles] = await Promise.all([
    getAllArticles({ locale: "ru" }),
    getAllArticles({ locale: "en" }),
  ]);

  // Статические страницы для обеих локалей
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl()}${routes.home("ru")}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: {
        languages: {
          ru: `${siteUrl()}/`,
          en: `${siteUrl()}/en`,
        },
      },
    },
    {
      url: `${siteUrl()}${routes.home("en")}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: {
        languages: {
          ru: `${siteUrl()}/`,
          en: `${siteUrl()}/en`,
        },
      },
    },
    {
      url: `${siteUrl()}${routes.blog("ru")}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
      alternates: {
        languages: {
          ru: `${siteUrl()}/blog`,
          en: `${siteUrl()}/en/blog`,
        },
      },
    },
    {
      url: `${siteUrl()}${routes.blog("en")}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
      alternates: {
        languages: {
          ru: `${siteUrl()}/blog`,
          en: `${siteUrl()}/en/blog`,
        },
      },
    },
    {
      url: `${siteUrl()}${routes.manifesto("ru")}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: {
          ru: `${siteUrl()}/manifesto`,
          en: `${siteUrl()}/en/manifesto`,
        },
      },
    },
    {
      url: `${siteUrl()}${routes.manifesto("en")}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: {
          ru: `${siteUrl()}/manifesto`,
          en: `${siteUrl()}/en/manifesto`,
        },
      },
    },
    {
      url: `${siteUrl()}${routes.contact("ru")}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
      alternates: {
        languages: {
          ru: `${siteUrl()}/contact`,
          en: `${siteUrl()}/en/contact`,
        },
      },
    },
    {
      url: `${siteUrl()}${routes.contact("en")}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
      alternates: {
        languages: {
          ru: `${siteUrl()}/contact`,
          en: `${siteUrl()}/en/contact`,
        },
      },
    },
  ];

  // Статьи обеих локалей + hreflang
  const articlePages: MetadataRoute.Sitemap = [];
  for (const article of ruArticles) {
    const enVersion = enArticles.find(
      (e) => e.slug === article.slug || e.slug.startsWith(article.slug),
    );
    articlePages.push({
      url: `${siteUrl()}${routes.blogPost(article.slug, "ru")}`,
      lastModified: new Date(article.updated || article.date),
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: {
          ru: `${siteUrl()}/blog/${article.slug}`,
          en: `${siteUrl()}/en/blog/${enVersion?.slug || article.slug}`,
        },
      },
    });
  }
  for (const article of enArticles) {
    if (ruArticles.some((r) => r.slug === article.slug)) continue; // already added
    articlePages.push({
      url: `${siteUrl()}${routes.blogPost(article.slug, "en")}`,
      lastModified: new Date(article.updated || article.date),
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: {
          ru: `${siteUrl()}/blog/${article.slug}`,
          en: `${siteUrl()}/en/blog/${article.slug}`,
        },
      },
    });
  }

  return [...staticPages, ...articlePages];
}
