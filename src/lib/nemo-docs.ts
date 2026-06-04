/**
 * Репликация опубликованной статьи в Obsidian vault nemo-team-docs.
 * Используется GitHub Contents API.
 *
 * Требует env:
 *   - NEMO_DOCS_REPO (например, "shekelstrong/nemo-team-docs")
 *   - NEMO_DOCS_TOKEN (PAT с правами repo)
 *   - NEMO_DOCS_BRANCH (main)
 *   - NEMO_DOCS_PATH (например, "Sovereign-Semantics/Articles")
 */

interface NemoDocsArticle {
  title: string;
  description: string;
  date: string;
  tags: string[];
  content: string;
  slug: string;
  locale: "ru" | "en";
  author?: string;
}

function yamlEscape(s: string): string {
  if (/[":\n#]/.test(s) || s.startsWith("-") || s.startsWith("'")) {
    return `"${s.replace(/"/g, "\\\"").replace(/\n/g, " ")}"`;
  }
  return s;
}

export function articleToObsidian(a: NemoDocsArticle): string {
  const tags = a.tags.map((t) => `  - ${yamlEscape(t)}`).join("\n");
  return `---
title: ${yamlEscape(a.title)}
description: ${yamlEscape(a.description)}
date: ${a.date}
author: ${yamlEscape(a.author || "Редакция АСС")}
slug: ${a.slug}
locale: ${a.locale}
source: https://sovereign-semantics.vercel.app${a.locale === "en" ? "/en" : ""}/blog/${a.slug}
tags:
${tags}
---

# [[Sovereign-Semantics/Index|Sovereign Semantics]] · ${a.title}

> ${a.description}

${a.content}

---

**Связанные материалы:**
- [[Sovereign-Semantics/Index|Оглавление]]
- [[Sovereign-Semantics/Methodology|Методология]]
- [[Sovereign-Semantics/Editorial|Редакция]]
`;
}

export async function replicateToNemoDocs(
  article: NemoDocsArticle
): Promise<{ ok: boolean; path?: string; error?: string }> {
  const repo = process.env.NEMO_DOCS_REPO;
  const token = process.env.NEMO_DOCS_TOKEN;
  const branch = process.env.NEMO_DOCS_BRANCH || "main";
  const basePath = process.env.NEMO_DOCS_PATH || "Sovereign-Semantics/Articles";

  if (!repo || !token) {
    return { ok: false, error: "NEMO_DOCS_REPO or NEMO_DOCS_TOKEN not set" };
  }

  const filename = `${article.slug}.${article.locale}.md`;
  const path = `${basePath}/${filename}`;
  const content = articleToObsidian(article);
  const contentBase64 = Buffer.from(content, "utf-8").toString("base64");

  // Check if file exists (for sha)
  const headUrl = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`;
  const headRes = await fetch(headUrl, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "sovereign-semantics-bot",
    },
  });
  let sha: string | undefined;
  if (headRes.ok) {
    const data = await headRes.json();
    sha = data.sha;
  }

  // PUT file
  const putUrl = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}`;
  const putRes = await fetch(putUrl, {
    method: "PUT",
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "sovereign-semantics-bot",
    },
    body: JSON.stringify({
      message: `sync: ${article.title} (${article.locale}) from sovereign-semantics`,
      content: contentBase64,
      branch,
      sha,
    }),
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    return { ok: false, error: `GitHub API ${putRes.status}: ${errText.slice(0, 200)}` };
  }

  return { ok: true, path };
}
