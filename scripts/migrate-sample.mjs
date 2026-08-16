#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  extractFirstHeading,
  normalizeFrontmatter,
  normalizeMarkdownBody,
  parseFrontmatter,
  stringifyFrontmatter,
  toIso8601Shanghai,
} from "./lib/frontmatter.mjs";
import {
  slugifySegment,
  slugifySegments,
  stripOrderingPrefix,
} from "./lib/slugify.mjs";

const DEFAULT_SOURCE_ROOT = "/Users/wuwenjing/Documents/blog-source";
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const CONTENT_ROOT = path.join(REPO_ROOT, "content");

const SECTION_ROOTS = {
  notes: "docs/01.知识库",
  posts: "docs/02.工具与部署",
  monthly: "docs/04.每月随笔",
  projects: "docs/03.项目.md",
};

const SAMPLE_ITEMS = [
  { source: "docs/01.知识库/06.基础组件/08.elasticsearch/00.index.md", section: "notes" },
  {
    source:
      "docs/01.知识库/13.极客时间/146.Redis核心技术与实战/39. Redis 6.0的新特性：多线程、客户端缓存与安全.md",
    section: "notes",
  },
  { source: "docs/01.知识库/01.index.md", section: "notes" },
  { source: "docs/01.知识库/03.linux/02.linux操作命令.md", section: "notes" },
  { source: "docs/01.知识库/11.疑难杂症/02.幂等性解决方案.md", section: "notes" },
  { source: "docs/02.工具与部署/04.git/04.github action学习总结.md", section: "posts" },
  { source: "docs/02.工具与部署/01.操作手册/25.个人网站实现微信扫码登录.md", section: "posts" },
  { source: "docs/02.工具与部署/07.docker/02.docker相关软件安装.md", section: "posts" },
  { source: "docs/04.每月随笔/01.2023-12.md", section: "monthly" },
  { source: "docs/03.项目.md/01.项目计划.md", section: "projects" },
];

function resolveSourceRoot(argv, env) {
  let cliSourceRoot = "";

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--source-root") {
      cliSourceRoot = argv[index + 1] || "";
      index += 1;
      continue;
    }

    if (argument.startsWith("--source-root=")) {
      cliSourceRoot = argument.slice("--source-root=".length);
    }
  }

  const configuredRoot = (cliSourceRoot || env.BLOG_SOURCE_ROOT || DEFAULT_SOURCE_ROOT).trim();
  return path.resolve(configuredRoot);
}

function derivePathFallbackTitle(item) {
  const sourceStem = stripOrderingPrefix(path.basename(item.source, ".md"));

  if (sourceStem && sourceStem.toLowerCase() !== "index") {
    return sourceStem;
  }

  const parentDirectory = stripOrderingPrefix(path.basename(path.dirname(item.source)));

  if (parentDirectory && parentDirectory.toLowerCase() !== "index") {
    return parentDirectory;
  }

  return "";
}

function deriveTitle(item, frontmatter, body) {
  const heading = extractFirstHeading(body);
  const title = String(frontmatter.title || "").trim();

  if (!title || title.toLowerCase() === "index") {
    return heading || derivePathFallbackTitle(item) || "Untitled";
  }

  return title;
}

function buildTargetPath(item, title) {
  const sectionRoot = SECTION_ROOTS[item.section];
  const sourceDir = path.dirname(item.source);
  const relativeDir = path.relative(sectionRoot, sourceDir);
  const directoryParts =
    !relativeDir || relativeDir === "."
      ? []
      : slugifySegments(relativeDir.split(path.sep).filter(Boolean));
  const sourceStem = path.basename(item.source, ".md");
  const cleanedStem = stripOrderingPrefix(sourceStem);
  const slugSource = cleanedStem.toLowerCase() === "index" ? title : sourceStem;
  const slug = slugifySegment(slugSource);

  return {
    slug,
    targetPath: path.join(CONTENT_ROOT, item.section, ...directoryParts, `${slug}.md`),
  };
}

async function migrateItem(item, sourceRoot) {
  const sourcePath = path.join(sourceRoot, item.source);
  const sourceText = await fs.readFile(sourcePath, "utf8");
  const sourceStat = await fs.stat(sourcePath);
  const { data, body } = parseFrontmatter(sourceText);
  const cleanedBody = normalizeMarkdownBody(body);
  const title = deriveTitle(item, data, cleanedBody);
  const { slug, targetPath } = buildTargetPath(item, title);

  const derivedDate = data.date ? data.date : toIso8601Shanghai(sourceStat.mtime);
  const frontmatter = normalizeFrontmatter({
    ...data,
    title,
    slug,
    date: derivedDate,
    lastmod: data.lastmod || derivedDate,
  });

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(
    targetPath,
    `${stringifyFrontmatter(frontmatter)}${cleanedBody.trimStart()}\n`,
    "utf8",
  );

  return {
    section: item.section,
    sourcePath,
    targetPath,
    slug,
  };
}

async function main() {
  const sourceRoot = resolveSourceRoot(process.argv.slice(2), process.env);
  const results = [];

  for (const item of SAMPLE_ITEMS) {
    results.push(await migrateItem(item, sourceRoot));
  }

  console.log(`Migrated ${results.length} representative sample files from ${sourceRoot}`);
  for (const result of results) {
    console.log(`${result.section}: ${path.relative(REPO_ROOT, result.targetPath)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
