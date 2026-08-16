#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter } from "./lib/frontmatter.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const NOTES_ROOT = path.join(REPO_ROOT, "content", "notes");

async function listMarkdownFiles(rootDir) {
  const result = [];
  const pending = [rootDir];

  while (pending.length) {
    const current = pending.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(absPath);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) result.push(absPath);
    }
  }

  result.sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  return result;
}

function pickWinner(paths) {
  const scored = paths.map((p) => {
    const base = path.basename(p, ".md");
    const suffixMatch = base.match(/-(\d+)$/u);
    const suffix = suffixMatch ? Number(suffixMatch[1]) : 0;
    return { p, suffix, len: base.length };
  });

  scored.sort((a, b) => {
    if (a.suffix !== b.suffix) return a.suffix - b.suffix;
    return a.len - b.len;
  });

  return scored[0].p;
}

async function main() {
  const files = await listMarkdownFiles(NOTES_ROOT);
  const byPermalink = new Map();

  for (const absPath of files) {
    const raw = await fs.readFile(absPath, "utf8");
    const { data } = parseFrontmatter(raw);
    const permalink = String(data?.source?.permalink || "").trim();
    if (!permalink) continue;
    const list = byPermalink.get(permalink) || [];
    list.push(absPath);
    byPermalink.set(permalink, list);
  }

  const duplicates = [...byPermalink.entries()].filter(([, list]) => list.length > 1);
  if (!duplicates.length) {
    process.stdout.write("OK: no duplicate source.permalink in notes\n");
    return;
  }

  let removed = 0;
  for (const [permalink, list] of duplicates) {
    const winner = pickWinner(list);
    for (const candidate of list) {
      if (candidate === winner) continue;
      await fs.unlink(candidate);
      removed += 1;
    }
    process.stdout.write(
      `dedupe ${permalink}: kept ${path.relative(REPO_ROOT, winner)} removed ${list.length - 1}\n`,
    );
  }

  process.stdout.write(`Removed ${removed} duplicate note files\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

