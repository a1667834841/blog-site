#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter } from "./lib/frontmatter.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const CONTENT_ROOT = path.join(REPO_ROOT, "content");

function isIso8601WithOffset(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/u.test(value);
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

function validate({ data, body }) {
  const failures = [];
  const required = [
    "title",
    "slug",
    "date",
    "lastmod",
    "draft",
    "summary",
    "description",
    "categories",
    "tags",
    "showToc",
    "TocOpen",
  ];

  for (const key of required) if (!(key in data)) failures.push(`missing required field: ${key}`);

  if ("date" in data && !isIso8601WithOffset(data.date)) failures.push(`date not ISO8601-with-offset: ${JSON.stringify(data.date)}`);
  if ("lastmod" in data && !isIso8601WithOffset(data.lastmod)) failures.push(`lastmod not ISO8601-with-offset: ${JSON.stringify(data.lastmod)}`);

  if ("categories" in data && !Array.isArray(data.categories)) failures.push("categories must be an array");
  if ("tags" in data && !Array.isArray(data.tags)) failures.push("tags must be an array");

  for (const forbidden of ["permalink", "article"]) if (forbidden in data) failures.push(`forbidden key present: ${forbidden}`);

  if (body.includes("\r")) failures.push("body contains CR (\\r)");
  for (const marker of ["DeepSeek-R1满血版", "思考完成", "好的，用户现在需要介绍CI/CD工具", "data-slate-"]) {
    if (body.includes(marker)) failures.push(`forbidden marker in body: ${marker}`);
  }

  if (!data.title || String(data.title).trim() === "") failures.push("title empty");
  if (!data.slug || String(data.slug).trim() === "") failures.push("slug empty");

  return failures;
}

async function main() {
  const files = await listMarkdownFiles(CONTENT_ROOT);
  const report = [];

  for (const absPath of files) {
    const relPath = path.relative(REPO_ROOT, absPath);
    const raw = await fs.readFile(absPath, "utf8");
    const parsed = parseFrontmatter(raw);
    const failures = validate(parsed);
    if (failures.length) report.push({ file: relPath, failures });
  }

  if (!report.length) {
    process.stdout.write("OK: all content frontmatter satisfy required contract\n");
    return;
  }

  process.stdout.write(`Found ${report.length} content files with frontmatter issues:\n`);
  for (const entry of report) {
    process.stdout.write(`- ${entry.file}\n`);
    for (const failure of entry.failures) process.stdout.write(`  - ${failure}\n`);
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

