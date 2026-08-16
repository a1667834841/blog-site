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
import { slugifySegment, slugifySegments, stripOrderingPrefix } from "./lib/slugify.mjs";

const DEFAULT_SOURCE_ROOT = "/Users/wuwenjing/Documents/blog-source";
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const CONTENT_ROOT = path.join(REPO_ROOT, "content");
const PROJECTS_SOURCE_ROOT = "docs/03.项目.md";

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

function derivePathFallbackTitle(sourceRelPath) {
  const sourceStem = stripOrderingPrefix(path.basename(sourceRelPath, ".md"));
  if (sourceStem && sourceStem.toLowerCase() !== "index") return sourceStem;
  const parentDirectory = stripOrderingPrefix(path.basename(path.dirname(sourceRelPath)));
  if (parentDirectory && parentDirectory.toLowerCase() !== "index") return parentDirectory;
  return "";
}

function deriveTitle(sourceRelPath, frontmatter, body) {
  const heading = extractFirstHeading(body);
  const title = String(frontmatter.title || "").trim();
  if (!title || title.toLowerCase() === "index") {
    return heading || derivePathFallbackTitle(sourceRelPath) || "Untitled";
  }
  return title;
}

function buildTargetPath(sourceRelPath, title) {
  const sourceDir = path.dirname(sourceRelPath);
  const relativeDir = path.relative(PROJECTS_SOURCE_ROOT, sourceDir);
  const directoryParts =
    !relativeDir || relativeDir === "."
      ? []
      : slugifySegments(relativeDir.split(path.sep).filter(Boolean));
  const sourceStem = path.basename(sourceRelPath, ".md");
  const cleanedStem = stripOrderingPrefix(sourceStem);
  const slugSource = cleanedStem.toLowerCase() === "index" ? title : sourceStem;
  const slug = slugifySegment(slugSource);

  return {
    slug,
    targetAbsPath: path.join(CONTENT_ROOT, "projects", ...directoryParts, `${slug}.md`),
  };
}

async function indexExistingByPermalink() {
  const projectsRoot = path.join(CONTENT_ROOT, "projects");
  const result = new Map();
  try {
    const files = await listMarkdownFiles(projectsRoot);
    for (const absPath of files) {
      const raw = await fs.readFile(absPath, "utf8");
      const { data } = parseFrontmatter(raw);
      const permalink = String(data?.source?.permalink || "").trim();
      if (permalink) result.set(permalink, absPath);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return result;
}

async function migrateOne(sourceAbsPath, sourceRoot, existingByPermalink, pathCollisionGuard) {
  const sourceRelPath = path.relative(sourceRoot, sourceAbsPath);
  const sourceText = await fs.readFile(sourceAbsPath, "utf8");
  const sourceStat = await fs.stat(sourceAbsPath);
  const { data, body } = parseFrontmatter(sourceText);
  const cleanedBody = normalizeMarkdownBody(body);
  const title = deriveTitle(sourceRelPath, data, cleanedBody);
  const { slug, targetAbsPath } = buildTargetPath(sourceRelPath, title);
  const sourcePermalink = String(data?.permalink || "").trim();
  const derivedDate = data.date ? data.date : toIso8601Shanghai(sourceStat.mtime);
  const frontmatter = normalizeFrontmatter({
    ...data,
    title,
    slug,
    date: derivedDate,
    lastmod: data.lastmod || derivedDate,
    ...(sourcePermalink ? { source: { permalink: sourcePermalink } } : {}),
  });

  let finalTargetAbsPath = targetAbsPath;
  let isPermalinkOverwrite = false;
  if (sourcePermalink && existingByPermalink.has(sourcePermalink)) {
    finalTargetAbsPath = existingByPermalink.get(sourcePermalink);
    isPermalinkOverwrite = true;
  }

  if (!isPermalinkOverwrite) {
    let collisionKey = path.relative(CONTENT_ROOT, finalTargetAbsPath);
    if (pathCollisionGuard.has(collisionKey)) {
      const parsed = path.parse(finalTargetAbsPath);
      let attempt = 2;
      while (true) {
        const candidate = path.join(parsed.dir, `${parsed.name}-${attempt}${parsed.ext}`);
        const candidateKey = path.relative(CONTENT_ROOT, candidate);
        if (!pathCollisionGuard.has(candidateKey)) {
          finalTargetAbsPath = candidate;
          collisionKey = candidateKey;
          break;
        }
        attempt += 1;
      }
    }
    pathCollisionGuard.add(collisionKey);
  }

  await fs.mkdir(path.dirname(finalTargetAbsPath), { recursive: true });
  await fs.writeFile(
    finalTargetAbsPath,
    `${stringifyFrontmatter(frontmatter)}${cleanedBody.trimStart()}\n`,
    "utf8",
  );

  if (sourcePermalink) existingByPermalink.set(sourcePermalink, finalTargetAbsPath);
}

async function main() {
  const sourceRoot = resolveSourceRoot(process.argv.slice(2), process.env);
  const projectsAbsRoot = path.join(sourceRoot, PROJECTS_SOURCE_ROOT);
  const existingByPermalink = await indexExistingByPermalink();
  const pathCollisionGuard = new Set([...existingByPermalink.values()].map((absPath) => path.relative(CONTENT_ROOT, absPath)));
  const sourceFiles = await listMarkdownFiles(projectsAbsRoot);
  for (const sourceAbsPath of sourceFiles) {
    await migrateOne(sourceAbsPath, sourceRoot, existingByPermalink, pathCollisionGuard);
  }
  console.log(`Migrated ${sourceFiles.length} project files from ${projectsAbsRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

