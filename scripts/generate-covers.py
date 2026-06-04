#!/usr/bin/env python3
"""
Генерирует обложки для статей Sovereign Semantics через OpenRouter (Gemini 3.1 Flash Image Preview).
- source: OPENROUTER_API_KEY в env (или ~/.env/sovereign.env)
- input: 5 coverPrompt'ов из content/articles/ru/*.md
- output: public/og/articles/{slug}.png
"""
import os
import re
import sys
import json
import base64
import subprocess
import urllib.request
import urllib.error
from pathlib import Path

REPO = Path("/root/Projects/sovereign-semantics")
ARTICLES_DIR = REPO / "content" / "articles" / "ru"
OG_DIR = REPO / "public" / "og" / "articles"

# 1) грузим API key
key = os.environ.get("OPENROUTER_API_KEY")
if not key and Path.home().joinpath(".env/sovereign.env").exists():
    for line in Path.home().joinpath(".env/sovereign.env").read_text().splitlines():
        if line.startswith("OPENROUTER_API_KEY="):
            key = line.split("=", 1)[1].strip().strip('"').strip("'")
            break
if not key:
    print("ERROR: OPENROUTER_API_KEY not found in env or ~/.env/sovereign.env", file=sys.stderr)
    sys.exit(1)

print(f"Key loaded: {key[:12]}...{key[-4:]}")

OG_DIR.mkdir(parents=True, exist_ok=True)

# 2) собираем slug + coverPrompt из 5 ru-статей
tasks = []
for md in sorted(ARTICLES_DIR.glob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True):
    slug = md.stem
    text = md.read_text(encoding="utf-8")
    m = re.search(r"coverPrompt:\s*\"([^\"]+)\"", text)
    if not m:
        m = re.search(r"coverPrompt:\s*'([^']+)'", text)
    if not m:
        print(f"SKIP {slug}: no coverPrompt")
        continue
    prompt = m.group(1).strip()
    tasks.append((slug, prompt))

print(f"Found {len(tasks)} coverPrompt(s)")
for slug, p in tasks:
    print(f"  - {slug}: {p[:80]}...")

# 3) генерируем
def gen(prompt: str) -> bytes:
    body = json.dumps({
        "model": "google/gemini-3.1-flash-image-preview",
        "messages": [{"role": "user", "content": f"Generate image: {prompt}"}],
        "modalities": ["image", "text"],
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        resp = json.loads(r.read().decode("utf-8"))
    if "error" in resp:
        raise RuntimeError(f"API error: {resp['error']}")
    images = resp["choices"][0]["message"].get("images", [])
    if not images:
        raise RuntimeError("no images in response")
    b64 = images[0]["image_url"]["url"].split(",", 1)[1]
    return base64.b64decode(b64)

# 4) генерируем с retry и в 1 worker (чтобы не упереться в rate limit)
import time
results = []
for i, (slug, prompt) in enumerate(tasks, 1):
    out = OG_DIR / f"{slug}.png"
    if out.exists() and out.stat().st_size > 100_000:
        print(f"[{i}/{len(tasks)}] SKIP {slug}: {out.stat().st_size//1024}KB already exists")
        results.append((slug, "skipped", out.stat().st_size))
        continue
    print(f"[{i}/{len(tasks)}] GEN  {slug}...")
    for attempt in range(3):
        try:
            png = gen(prompt)
            out.write_bytes(png)
            print(f"  -> {out.name}: {len(png)//1024}KB")
            results.append((slug, "ok", len(png)))
            break
        except (urllib.error.URLError, urllib.error.HTTPError, RuntimeError, TimeoutError) as e:
            print(f"  attempt {attempt+1}/3 failed: {e}")
            if attempt < 2:
                time.sleep(5 * (attempt + 1))
            else:
                results.append((slug, "failed", 0))
    time.sleep(2)  # polite spacing

# 5) summary
print()
print("=== SUMMARY ===")
for slug, status, size in results:
    icon = "✅" if status == "ok" else ("⏭" if status == "skipped" else "❌")
    print(f"  {icon} {slug}: {status} ({size//1024 if size else 0}KB)")

# 6) verify dimensions
print()
print("=== VERIFY ===")
for f in sorted(OG_DIR.glob("*.png")):
    out = subprocess.check_output(["file", str(f)], text=True).strip()
    print(f"  {f.name}: {out.split(': ', 1)[1]}")
