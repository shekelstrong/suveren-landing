import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "@/lib/articles-types";
import { getAllArticles, getAllTags } from "@/lib/articles";
import { BlogExplorer } from "@/components/BlogExplorer";
import { isValidLocale } from "@/lib/dict";
import { siteUrl } from "@/lib/site";

export async function generateStaticParams() {
  return [{ lang: "ru" }, { lang: "en" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const isEn = lang === "en";
  const canonical = isEn ? siteUrl("/en/blog") : siteUrl("/blog");
  return {
    title: isEn ? "Blog" : "Блог",
    description: isEn
      ? "Long-form analytics on technological sovereignty, IT, AI, economics and a sober lifestyle."
      : "Аналитические лонгриды о технологическом суверенитете, IT, искусственном интеллекте, экономике и трезвом образе жизни.",
    alternates: {
      canonical,
      languages: {
        ru: siteUrl("/blog"),
        en: siteUrl("/en/blog"),
      },
    },
    openGraph: {
      url: canonical,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function BlogPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();
  const locale = lang as Locale;

  const [articles, tags] = await Promise.all([
    getAllArticles({ locale }),
    Promise.resolve(getAllTags()),
  ]);

  const isEn = locale === "en";
  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-12 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-accent)] mb-3">
            ↓ /{isEn ? "en/blog" : "blog"}
          </p>
          <h1 className="font-mono text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            {isEn ? "Analytics feed" : "Лента аналитики"}
          </h1>
          <p className="text-[var(--color-foreground-muted)] text-pretty">
            {isEn
              ? "Longreads of 2000+ words. No fluff, no clichés. Facts, logic, systemic view. Use tag filters to find the right cut."
              : "Лонгриды объёмом от 2000 слов. Без воды, без клише. Факты, логика, системный взгляд. Используйте фильтры по тегам, чтобы найти нужный разрез."}
          </p>
        </header>

        <BlogExplorer articles={articles} tags={tags} locale={locale} />
      </div>
    </section>
  );
}
