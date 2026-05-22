#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, "..");

function parseArgs(argv) {
  let root = DEFAULT_ROOT;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1] || "";

    if (arg === "--root") {
      root = next;
      index += 1;
      continue;
    }

    if (arg.startsWith("--root=")) {
      root = arg.slice("--root=".length);
    }
  }

  return { root: path.resolve(root) };
}

async function listFiles(rootDir) {
  const result = [];
  const pending = [rootDir];

  while (pending.length) {
    const current = pending.pop();
    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }

    for (const entry of entries) {
      const absPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(absPath);
        continue;
      }
      if (entry.isFile()) result.push(absPath);
    }
  }

  result.sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  return result;
}

async function main() {
  const { root } = parseArgs(process.argv.slice(2));
  const trackedDirs = ["content", "static", "data"];
  const hash = crypto.createHash("sha256");
  const manifest = [];
  let fileCount = 0;

  for (const dirName of trackedDirs) {
    const dirRoot = path.join(root, dirName);
    const files = await listFiles(dirRoot);

    for (const filePath of files) {
      const relativePath = path.relative(root, filePath).split(path.sep).join("/");
      const content = await fs.readFile(filePath);
      const fileHash = crypto.createHash("sha256").update(content).digest("hex");

      hash.update(relativePath);
      hash.update("\0");
      hash.update(fileHash);
      hash.update("\0");

      manifest.push({ path: relativePath, sha256: fileHash });
      fileCount += 1;
    }
  }

  process.stdout.write(
    JSON.stringify(
      {
        root,
        algorithm: "sha256",
        fingerprint: hash.digest("hex"),
        fileCount,
        manifest,
      },
      null,
      2,
    ) + "\n",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

