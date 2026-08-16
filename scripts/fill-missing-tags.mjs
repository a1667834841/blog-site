#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseFrontmatter,
  stringifyFrontmatter,
} from "./lib/frontmatter.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const CONTENT_ROOT = path.join(REPO_ROOT, "content");

const TARGET_SECTIONS = new Set(["notes", "posts", "monthly", "projects"]);

const GENERIC_SEGMENTS = new Set([
  "notes",
  "posts",
  "monthly",
  "projects",
  "基础知识",
  "基本知识",
  "操作手册",
  "源码分析",
  "玩具",
  "编译与打包",
  "设计模式学习导读 3讲",
  "开源与项目实战开源实战 14讲",
  "开源与项目实战项目实战 9讲",
  "设计模式与范式行为型 18讲",
]);

const KEYWORD_TAGS = [
  [/mysql/iu, "MySQL"],
  [/redis/iu, "Redis"],
  [/springboot/iu, "Spring Boot"],
  [/spring/iu, "Spring"],
  [/mybatis/iu, "MyBatis"],
  [/elasticsearch|elastic/iu, "Elasticsearch"],
  [/rabbitmq/iu, "RabbitMQ"],
  [/\bmq\b|消息队列/u, "消息队列"],
  [/docker/iu, "Docker"],
  [/kubernetes|k8s/iu, "Kubernetes"],
  [/gitlab/iu, "GitLab"],
  [/github actions|githubaction|github-action/iu, "GitHub Actions"],
  [/\bgithub\b/iu, "GitHub"],
  [/\bgit\b/iu, "Git"],
  [/nginx/iu, "Nginx"],
  [/skywalking/iu, "SkyWalking"],
  [/chatgpt/iu, "ChatGPT"],
  [/prompt/iu, "Prompt"],
  [/appium/iu, "Appium"],
  [/mockmvc/iu, "MockMvc"],
  [/tensorflow/iu, "TensorFlow"],
  [/\bgo\b|go学习之旅/u, "Go"],
  [/java8/iu, "Java 8"],
  [/\bjava\b|jvm|jmm|aqs/u, "Java"],
  [/\bjvm\b/iu, "JVM"],
  [/linux|centos/iu, "Linux"],
  [/windows|win10/iu, "Windows"],
  [/esxi/iu, "ESXi"],
  [/vercel/iu, "Vercel"],
  [/cloudreve/iu, "Cloudreve"],
  [/onedrive/iu, "OneDrive"],
  [/ngrok/iu, "Ngrok"],
  [/frp/iu, "FRP"],
  [/easyexcel/iu, "EasyExcel"],
  [/wechat|微信/u, "微信"],
  [/支付|支付宝/u, "支付"],
  [/扫码登录/u, "扫码登录"],
  [/分布式/u, "分布式"],
  [/微服务/u, "微服务"],
  [/事务/u, "事务"],
  [/设计模式/u, "设计模式"],
  [/面试/u, "面试"],
  [/幂等/u, "幂等"],
  [/缓存/u, "缓存"],
  [/并发/u, "并发"],
  [/随笔/u, "随笔"],
  [/项目/u, "项目"],
];

function cleanTag(value) {
  return String(value ?? "")
    .replace(/\.md$/iu, "")
    .replace(/[-_]+/gu, " ")
    .replace(/[()（）[\]【】{}]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function addTag(target, value) {
  const tag = cleanTag(value);
  if (!tag) return;
  if (GENERIC_SEGMENTS.has(tag)) return;
  const exists = target.some((item) => item.toLowerCase() === tag.toLowerCase());
  if (!exists) target.push(tag);
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
      if (entry.isFile() && absPath.endsWith(".md")) result.push(absPath);
    }
  }

  result.sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  return result;
}

function deriveTags(filePath, data) {
  const tags = [];
  const relPath = path.relative(CONTENT_ROOT, filePath);
  const normalized = relPath.split(path.sep);
  const section = normalized[0];
  const directories = normalized.slice(1, -1);
  const fileStem = path.basename(filePath, ".md");
  const title = String(data.title || "").trim();
  const searchText = `${relPath}\n${title}`;

  for (const category of Array.isArray(data.categories) ? data.categories : []) {
    addTag(tags, category);
  }

  if (directories.length > 0) addTag(tags, directories[0]);
  if (directories.length > 1) addTag(tags, directories[1]);

  for (const [pattern, tag] of KEYWORD_TAGS) {
    if (pattern.test(searchText)) addTag(tags, tag);
  }

  if (tags.length < 2) {
    addTag(tags, fileStem.split("-")[0]);
  }

  if (tags.length === 0) {
    if (section === "monthly") addTag(tags, "随笔");
    if (section === "projects") addTag(tags, "项目");
    if (section === "posts") addTag(tags, "工具与部署");
    if (section === "notes") addTag(tags, "知识库");
  }

  return tags.slice(0, 5);
}

async function main() {
  const files = await listMarkdownFiles(CONTENT_ROOT);
  let updated = 0;

  for (const filePath of files) {
    const relPath = path.relative(CONTENT_ROOT, filePath);
    const section = relPath.split(path.sep)[0];
    if (!TARGET_SECTIONS.has(section)) continue;

    const markdown = await fs.readFile(filePath, "utf8");
    const { data, body } = parseFrontmatter(markdown);
    const existingTags = Array.isArray(data.tags) ? data.tags.filter(Boolean) : [];
    if (existingTags.length > 0) continue;

    const nextTags = deriveTags(filePath, data);
    data.tags = nextTags;
    await fs.writeFile(filePath, `${stringifyFrontmatter(data)}${body.trimStart()}\n`, "utf8");
    updated += 1;
  }

  console.log(`Filled tags for ${updated} files`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

