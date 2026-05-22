#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFile = promisify(execFileCallback);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TARGET_SCRIPT = path.join(SCRIPT_DIR, "fingerprint-content.mjs");

async function readFingerprint(root) {
  const { stdout } = await execFile("node", [TARGET_SCRIPT, "--root", root]);
  return JSON.parse(stdout);
}

async function main() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "blog-site-fingerprint-"));

  try {
    await fs.mkdir(path.join(tempDir, "content", "posts"), { recursive: true });
    await fs.mkdir(path.join(tempDir, "static", "images"), { recursive: true });
    await fs.mkdir(path.join(tempDir, "data", "site"), { recursive: true });

    await fs.writeFile(path.join(tempDir, "content", "posts", "a.md"), "alpha\n", "utf8");
    await fs.writeFile(path.join(tempDir, "static", "images", "logo.txt"), "logo\n", "utf8");

    const first = await readFingerprint(tempDir);
    assert.equal(typeof first.fingerprint, "string");
    assert.ok(first.fingerprint.length > 10);
    assert.equal(first.fileCount, 2);

    await fs.writeFile(path.join(tempDir, "content", "posts", "a.md"), "beta\n", "utf8");
    const second = await readFingerprint(tempDir);

    assert.notEqual(first.fingerprint, second.fingerprint);
    assert.equal(second.fileCount, 2);

    process.stdout.write("OK: fingerprint content script reacts to content changes\n");
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

