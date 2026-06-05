"use client";

import { useState, useRef, useEffect } from "react";
import type { Locale } from "@/lib/articles-types";

interface FAQBlockProps {
  faq: { q: string; a: string }[];
  locale: Locale;
}

/**
 * FAQ с плавной анимацией открытия/закрытия.
 * Использует React state + CSS transition вместо нативного <details>.
 * JSON-LD FAQPage генерится отдельным компонентом <ArticleJsonLd />.
 */
export function FAQBlock({ faq, locale }: FAQBlockProps) {
  if (!faq || faq.length === 0) return null;
  const isEn = locale === "en";
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="mt-16 pt-10 border-t border-[var(--color-border)]">
      <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-foreground-muted)] mb-6">
        ↓ {isEn ? "Frequently Asked Questions" : "Часто задаваемые вопросы"}
      </h2>
      <div className="space-y-3">
        {faq.map((item, idx) => (
          <FAQItem
            key={idx}
            item={item}
            isOpen={openIndex === idx}
            onToggle={() => setOpenIndex(openIndex === idx ? null : idx)}
          />
        ))}
      </div>
    </section>
  );
}

function FAQItem({
  item,
  isOpen,
  onToggle,
}: {
  item: { q: string; a: string };
  isOpen: boolean;
  onToggle: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  return (
    <div className="border border-[var(--color-border)] hover:border-[var(--color-accent)]/40 transition-colors overflow-hidden rounded-[var(--radius-sm)]">
      <button
        onClick={onToggle}
        className="w-full cursor-pointer p-4 font-mono text-sm font-semibold flex items-center justify-between gap-3 text-left bg-transparent border-none hover:bg-[var(--color-surface-elevated)]/50 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="flex-1">{item.q}</span>
        <span
          className="text-[var(--color-accent)] text-lg leading-none transition-transform duration-300 ease-out"
          style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
        >
          +
        </span>
      </button>
      <div
        className="transition-all duration-300 ease-out overflow-hidden"
        style={{ maxHeight: height }}
      >
        <div ref={contentRef} className="px-4 pb-4 pt-1 text-sm text-[var(--color-foreground-muted)] leading-relaxed prose-article">
          {item.a}
        </div>
      </div>
    </div>
  );
}
