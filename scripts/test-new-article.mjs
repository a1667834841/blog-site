#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { parseFrontmatter } from "./lib/frontmatter.mjs";

const execFile = promisify(execFileCallback);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const TARGET_SCRIPT = path.join(SCRIPT_DIR, "new-article.mjs");

async function main() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "blog-content-new-article-"));
  const articlePath = path.join(tempDir, "content", "posts", "Redis缓存实践.md");

  try {
    await execFile("node", [
      TARGET_SCRIPT,
      "--root",
      tempDir,
      "--section",
      "posts",
      "--title",
      "Redis缓存实践",
    ]);

    const raw = await fs.readFile(articlePath, "utf8");
    const { data, body } = parseFrontmatter(raw);

    assert.equal(data.title, "Redis缓存实践");
    assert.equal(data.slug, "redis缓存实践");
    assert.equal(data.draft, false);
    assert.equal(data.summary, "");
    assert.equal(data.description, "");
    assert.deepEqual(data.categories, ["工具与部署"]);
    assert.deepEqual(data.tags, []);
    assert.equal(data.showToc, true);
    assert.equal(data.TocOpen, false);
    assert.match(data.date, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/u);
    assert.equal(data.lastmod, data.date);
    assert.equal(body.trim(), "");

    process.stdout.write("OK: new article script generated expected frontmatter\n");
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

