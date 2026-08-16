#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter } from "./lib/frontmatter.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const CONTRACT_PATH = path.join(SCRIPT_DIR, "fixtures", "sample-migration-contract.json");
const DEFAULT_SOURCE_ROOT = "/Users/wuwenjing/Documents/blog-source";

async function loadContract() {
  const raw = await fs.readFile(CONTRACT_PATH, "utf8");
  return JSON.parse(raw);
}

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

function getValueAtPath(object, propertyPath) {
  return propertyPath.split(".").reduce((value, segment) => value?.[segment], object);
}

function isIso8601WithOffset(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/u.test(value);
}

async function verifySourceFixture(entry, sourceRoot) {
  const sourcePath = path.join(sourceRoot, entry.source);
  const markdown = await fs.readFile(sourcePath, "utf8");
  const { data, body } = parseFrontmatter(markdown);
  const failures = [];

  for (const [propertyPath, expectedValue] of Object.entries(entry.expect)) {
    const actualValue = getValueAtPath(data, propertyPath);
    if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
      failures.push(
        `${entry.source}: ${propertyPath} expected ${JSON.stringify(expectedValue)} got ${JSON.stringify(actualValue)}`,
      );
    }
  }

  for (const snippet of entry.bodyIncludes || []) {
    if (!body.includes(snippet)) {
      failures.push(`${entry.source}: body should include ${JSON.stringify(snippet)}`);
    }
  }

  for (const snippet of entry.bodyExcludes || []) {
    if (body.includes(snippet)) {
      failures.push(`${entry.source}: body should not include ${JSON.stringify(snippet)}`);
    }
  }

  for (const snippet of entry.rawIncludes || []) {
    if (!markdown.includes(snippet)) {
      failures.push(`${entry.source}: raw markdown should include ${JSON.stringify(snippet)}`);
    }
  }

  for (const snippet of entry.rawExcludes || []) {
    if (markdown.includes(snippet)) {
      failures.push(`${entry.source}: raw markdown should not include ${JSON.stringify(snippet)}`);
    }
  }

  return failures;
}

async function verifyEntry(entry, contract) {
  const targetPath = path.join(REPO_ROOT, entry.targetPath);
  let markdown = "";

  try {
    markdown = await fs.readFile(targetPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [`missing generated sample output ${JSON.stringify(entry.targetPath)}`];
    }
    throw error;
  }

  const { data, body } = parseFrontmatter(markdown);
  const failures = [];
  const expectedPrefix = path.join("content", entry.section) + path.sep;

  if (!markdown.startsWith("---\n")) {
    failures.push("missing leading frontmatter delimiter");
  }

  for (const requiredField of contract.requiredFrontmatterFields || []) {
    if (!(requiredField in data)) {
      failures.push(`missing required frontmatter field ${JSON.stringify(requiredField)}`);
    }
  }

  if ("date" in data && !isIso8601WithOffset(data.date)) {
    failures.push(`date must be ISO8601 with timezone, got ${JSON.stringify(data.date)}`);
  }

  if ("lastmod" in data && !isIso8601WithOffset(data.lastmod)) {
    failures.push(`lastmod must be ISO8601 with timezone, got ${JSON.stringify(data.lastmod)}`);
  }

  if (!entry.targetPath.startsWith(expectedPrefix)) {
    failures.push(
      `section expected path under ${JSON.stringify(expectedPrefix)} got ${JSON.stringify(entry.targetPath)}`,
    );
  }

  if (data.slug !== entry.slug) {
    failures.push(`slug expected ${JSON.stringify(entry.slug)} got ${JSON.stringify(data.slug)}`);
  }

  if (data.draft !== entry.draft) {
    failures.push(`draft expected ${JSON.stringify(entry.draft)} got ${JSON.stringify(data.draft)}`);
  }

  if (entry.title && data.title !== entry.title) {
    failures.push(`title expected ${JSON.stringify(entry.title)} got ${JSON.stringify(data.title)}`);
  }

  for (const forbiddenTitle of contract.forbiddenSampleTitles || []) {
    if (data.title === forbiddenTitle) {
      failures.push(`title must not be ${JSON.stringify(forbiddenTitle)}`);
    }
  }

  for (const forbiddenSlug of contract.forbiddenSampleSlugs || []) {
    if (data.slug === forbiddenSlug) {
      failures.push(`slug must not be ${JSON.stringify(forbiddenSlug)}`);
    }
  }

  if (!Array.isArray(data.categories)) {
    failures.push("categories must be an array");
  }

  if (!Array.isArray(data.tags)) {
    failures.push("tags must be an array");
  }

  if (entry.sourcePermalink) {
    const actualPermalink = getValueAtPath(data, "source.permalink");
    if (actualPermalink !== entry.sourcePermalink) {
      failures.push(
        `source.permalink expected ${JSON.stringify(entry.sourcePermalink)} got ${JSON.stringify(actualPermalink)}`,
      );
    }
  }

  for (const forbiddenKey of contract.forbiddenFrontmatterKeys || []) {
    if (forbiddenKey in data) {
      failures.push(`forbidden frontmatter field present: ${JSON.stringify(forbiddenKey)}`);
    }
  }

  for (const marker of contract.forbiddenBodyMarkers || []) {
    if (body.includes(marker)) {
      failures.push(`forbidden body marker present: ${JSON.stringify(marker)}`);
    }
  }

  for (const character of contract.forbiddenBodyCharacters || []) {
    if (body.includes(character)) {
      failures.push(`forbidden body character present: ${JSON.stringify(character)}`);
    }
  }

  for (const snippet of entry.bodyIncludes || []) {
    if (!body.includes(snippet)) {
      failures.push(`body should include ${JSON.stringify(snippet)}`);
    }
  }

  for (const snippet of entry.bodyExcludes || []) {
    if (body.includes(snippet)) {
      failures.push(`body should not include ${JSON.stringify(snippet)}`);
    }
  }

  return failures;
}

async function main() {
  const sourceRoot = resolveSourceRoot(process.argv.slice(2), process.env);
  const contract = await loadContract();
  const failures = [];

  for (const entry of contract.sourceFrontmatterFixtures || []) {
    const entryFailures = await verifySourceFixture(entry, sourceRoot);
    failures.push(...entryFailures);
  }

  for (const entry of contract.samples) {
    const entryFailures = await verifyEntry(entry, contract);
    for (const failure of entryFailures) {
      failures.push(`${entry.source} -> ${entry.targetPath}: ${failure}`);
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(failure);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Verified ${contract.samples.length} migrated samples and ${(contract.sourceFrontmatterFixtures || []).length} source frontmatter fixtures.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
