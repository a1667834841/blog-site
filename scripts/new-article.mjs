#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stringifyFrontmatter, toIso8601Shanghai } from "./lib/frontmatter.mjs";
import { slugifySegment } from "./lib/slugify.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, "..");

const SECTION_DEFAULTS = {
  posts: {
    category: "工具与部署",
  },
  notes: {
    category: "知识库",
  },
  monthly: {
    category: "每月随笔",
  },
  projects: {
    category: "项目",
  },
};

function parseArgs(argv) {
  const args = {
    root: DEFAULT_ROOT,
    section: "",
    title: "",
    path: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1] || "";

    if (current === "--root") {
      args.root = next;
      index += 1;
      continue;
    }
    if (current.startsWith("--root=")) {
      args.root = current.slice("--root=".length);
      continue;
    }

    if (current === "--section") {
      args.section = next;
      index += 1;
      continue;
    }
    if (current.startsWith("--section=")) {
      args.section = current.slice("--section=".length);
      continue;
    }

    if (current === "--title") {
      args.title = next;
      index += 1;
      continue;
    }
    if (current.startsWith("--title=")) {
      args.title = current.slice("--title=".length);
      continue;
    }

    if (current === "--path") {
      args.path = next;
      index += 1;
      continue;
    }
    if (current.startsWith("--path=")) {
      args.path = current.slice("--path=".length);
    }
  }

  return {
    root: path.resolve(args.root),
    section: args.section.trim(),
    title: args.title.trim(),
    path: args.path.trim(),
  };
}

function buildFrontmatter(section, title) {
  const now = toIso8601Shanghai(new Date());
  const category = SECTION_DEFAULTS[section]?.category || "";

  return {
    title,
    slug: slugifySegment(title),
    date: now,
    lastmod: now,
    draft: false,
    summary: "",
    description: "",
    categories: category ? [category] : [],
    tags: [],
    showToc: true,
    TocOpen: false,
  };
}

async function ensureFileDoesNotExist(filePath) {
  try {
    await fs.access(filePath);
    throw new Error(`Target file already exists: ${filePath}`);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.section || !SECTION_DEFAULTS[args.section]) {
    throw new Error("Missing or invalid --section. Use one of: posts, notes, monthly, projects");
  }

  if (!args.title) {
    throw new Error("Missing --title");
  }

  const slug = slugifySegment(args.title);
  const relativePath = args.path || path.join("content", args.section, `${slug}.md`);
  const targetPath = path.resolve(args.root, relativePath);

  await ensureFileDoesNotExist(targetPath);

  const frontmatter = buildFrontmatter(args.section, args.title);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${stringifyFrontmatter(frontmatter)}\n`, "utf8");

  process.stdout.write(`${path.relative(args.root, targetPath)}\n`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});

