#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter } from "./lib/frontmatter.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_ROOT = path.resolve(SCRIPT_DIR, "..", "content");
const DEFAULT_SOURCE_ROOT = "/Users/wuwenjing/Documents/blog-source";

function resolveSourceRoot(argv, env) {
  let cliSourceRoot = "";
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--source-root") {
      cliSourceRoot = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg.startsWith("--source-root=")) cliSourceRoot = arg.slice("--source-root=".length);
  }
  return path.resolve((cliSourceRoot || env.BLOG_SOURCE_ROOT || DEFAULT_SOURCE_ROOT).trim());
}

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

function classifySource(relPath) {
  const normalized = relPath.split(path.sep).join("/");
  if (normalized.startsWith("docs/01.知识库/")) return "notes";
  if (normalized.startsWith("docs/02.工具与部署/")) return "posts";
  if (normalized.startsWith("docs/03.项目.md/")) return "projects";
  if (normalized.startsWith("docs/04.每月随笔/")) return "monthly";
  if (normalized.startsWith("docs/@pages/")) return "pages";
  if (normalized.startsWith("docs/00.目录页/")) return "catalogue";
  return "other";
}

function classifyContent(relPath) {
  const normalized = relPath.split(path.sep).join("/");
  if (normalized.startsWith("notes/")) return "notes";
  if (normalized.startsWith("posts/")) return "posts";
  if (normalized.startsWith("projects/")) return "projects";
  if (normalized.startsWith("monthly/")) return "monthly";
  return "pages";
}

async function main() {
  const sourceRoot = resolveSourceRoot(process.argv.slice(2), process.env);
  const sourceDocsRoot = path.join(sourceRoot, "docs");

  const sourceFiles = await listMarkdownFiles(sourceDocsRoot);
  const contentFiles = await listMarkdownFiles(CONTENT_ROOT);

  const sourceCounts = new Map();
  const sourcePermalinks = new Map(); // permalink -> source rel path
  const sourceNoPermalink = [];

  for (const absPath of sourceFiles) {
    const relPath = path.relative(sourceRoot, absPath);
    const section = classifySource(relPath);
    sourceCounts.set(section, (sourceCounts.get(section) || 0) + 1);

    if (!["notes", "posts", "projects", "monthly"].includes(section)) continue;

    const raw = await fs.readFile(absPath, "utf8");
    const { data } = parseFrontmatter(raw);
    const permalink = typeof data?.permalink === "string" ? data.permalink.trim() : "";

    if (permalink) {
      // If duplicates exist, keep first and treat the rest as "no permalink" for reporting.
      if (!sourcePermalinks.has(permalink)) sourcePermalinks.set(permalink, relPath);
    } else {
      sourceNoPermalink.push(relPath);
    }
  }

  const contentCounts = new Map();
  const contentSourcePermalinks = new Map(); // source.permalink -> content rel path
  const contentNoSourcePermalink = [];

  for (const absPath of contentFiles) {
    const relPath = path.relative(CONTENT_ROOT, absPath);
    const section = classifyContent(relPath);
    contentCounts.set(section, (contentCounts.get(section) || 0) + 1);

    const raw = await fs.readFile(absPath, "utf8");
    const { data } = parseFrontmatter(raw);
    const sourcePermalink = typeof data?.source?.permalink === "string" ? data.source.permalink.trim() : "";

    if (sourcePermalink) {
      if (!contentSourcePermalinks.has(sourcePermalink)) contentSourcePermalinks.set(sourcePermalink, relPath);
    } else {
      // exclude utility pages where source.permalink isn't expected
      contentNoSourcePermalink.push(relPath);
    }
  }

  const missingPermalinks = [];
  for (const [permalink, relPath] of sourcePermalinks.entries()) {
    if (!contentSourcePermalinks.has(permalink)) missingPermalinks.push({ permalink, source: relPath });
  }
  missingPermalinks.sort((a, b) => a.source.localeCompare(b.source, "zh-Hans-CN"));

  const extraPermalinks = [];
  for (const [permalink, relPath] of contentSourcePermalinks.entries()) {
    if (!sourcePermalinks.has(permalink)) extraPermalinks.push({ permalink, content: relPath });
  }
  extraPermalinks.sort((a, b) => a.content.localeCompare(b.content, "zh-Hans-CN"));

  const summary = {
    sourceRoot,
    totals: {
      sourceMarkdown: sourceFiles.length,
      contentMarkdown: contentFiles.length,
      sourcePermalinks: sourcePermalinks.size,
      contentSourcePermalinks: contentSourcePermalinks.size,
      missingPermalinks: missingPermalinks.length,
      extraPermalinks: extraPermalinks.length,
      sourceNoPermalink: sourceNoPermalink.length,
      contentNoSourcePermalink: contentNoSourcePermalink.length,
    },
    counts: {
      source: Object.fromEntries([...sourceCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
      content: Object.fromEntries([...contentCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
    },
    samples: {
      missingPermalinks: missingPermalinks.slice(0, 50),
      extraPermalinks: extraPermalinks.slice(0, 20),
      sourceNoPermalink: sourceNoPermalink.slice(0, 20),
      contentNoSourcePermalink: contentNoSourcePermalink.slice(0, 20),
    },
  };

  const reportPath = path.join(path.resolve(SCRIPT_DIR, ".."), "data", "site", "migration-compare.json");
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify({ summary, missingPermalinks, extraPermalinks }, null, 2) + "\n", "utf8");

  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  process.stdout.write(`\nWrote full report to ${reportPath}\n`);

  if (missingPermalinks.length) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

