function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function stripInlineComment(value) {
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const previous = value[index - 1];

    if (character === "'" && !inDoubleQuote && previous !== "\\") {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (character === '"' && !inSingleQuote && previous !== "\\") {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && character === "#") {
      if (index === 0 || /\s/u.test(previous)) {
        return value.slice(0, index).trimEnd();
      }
    }
  }

  return value.trimEnd();
}

function getIndentation(line) {
  const match = line.match(/^ */u);
  return match ? match[0].length : 0;
}

function isBlankLine(line) {
  return stripInlineComment(line).trim() === "";
}

function parseScalar(value) {
  const trimmed = stripInlineComment(value).trim();

  if (trimmed === "") {
    return "";
  }

  if (trimmed === "true") {
    return true;
  }

  if (trimmed === "false") {
    return false;
  }

  if (trimmed === "[]") {
    return [];
  }

  if (trimmed === "{}") {
    return {};
  }

  return unquote(trimmed);
}

function quoteYamlString(value) {
  return JSON.stringify(String(value ?? ""));
}

function parseArray(lines, startIndex, indentation) {
  const values = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];

    if (isBlankLine(line)) {
      index += 1;
      continue;
    }

    const lineIndentation = getIndentation(line);

    if (lineIndentation < indentation) {
      break;
    }

    if (lineIndentation !== indentation) {
      break;
    }

    const match = line.slice(indentation).match(/^- ?(.*)$/u);

    if (!match) {
      break;
    }

    const [, rawValue] = match;
    const value = parseScalar(rawValue);

    if (value !== "") {
      values.push(value);
    }

    index += 1;
  }

  return { value: values, nextIndex: index };
}

function parseObject(lines, startIndex, indentation) {
  const data = {};
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];

    if (isBlankLine(line)) {
      index += 1;
      continue;
    }

    const lineIndentation = getIndentation(line);

    if (lineIndentation < indentation) {
      break;
    }

    if (lineIndentation !== indentation) {
      break;
    }

    const keyMatch = line
      .slice(indentation)
      .match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/u);

    if (!keyMatch) {
      index += 1;
      continue;
    }

    const [, key, rawValue = ""] = keyMatch;
    const parsedScalar = parseScalar(rawValue);

    if (parsedScalar !== "") {
      data[key] = parsedScalar;
      index += 1;
      continue;
    }

    let lookaheadIndex = index + 1;

    while (lookaheadIndex < lines.length && isBlankLine(lines[lookaheadIndex])) {
      lookaheadIndex += 1;
    }

    if (lookaheadIndex >= lines.length) {
      data[key] = "";
      index += 1;
      continue;
    }

    const nextIndentation = getIndentation(lines[lookaheadIndex]);

    if (nextIndentation <= lineIndentation) {
      data[key] = "";
      index += 1;
      continue;
    }

    const nextTrimmed = lines[lookaheadIndex].slice(nextIndentation);
    const parsedChild = nextTrimmed.startsWith("-")
      ? parseArray(lines, lookaheadIndex, nextIndentation)
      : parseObject(lines, lookaheadIndex, nextIndentation);

    data[key] = parsedChild.value;
    index = parsedChild.nextIndex;
  }

  return { value: data, nextIndex: index };
}

export function parseFrontmatter(markdown) {
  const normalized = markdown
    .replace(/^\uFEFF/u, "")
    .replace(/\r\n/gu, "\n")
    .replace(/\r/gu, "\n");
  const match = normalized.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*\n?([\s\S]*)$/u);

  if (!match) {
    return { data: {}, body: normalized };
  }

  const lines = match[1].split("\n");
  const { value } = parseObject(lines, 0, 0);
  return { data: value, body: match[2] };
}

export function extractFirstHeading(body) {
  const match = body.match(/^\s*#\s+(.+?)\s*$/mu);
  return match ? match[1].trim() : "";
}

export function normalizeMarkdownBody(body) {
  const normalized = body
    .replace(/\r\n/gu, "\n")
    .replace(/\r/gu, "\n")
    .replace(/^\[toc\]\n*/gimu, "")
    .replace(
      /\[!\[([^\]]*)\]\((?:[A-Za-z]:\\[^)]*)\)\]\((https?:\/\/[^)]+)\)/gu,
      "![$1]($2)",
    )
    // Some sources include Slate editor <a data-slate-...> wrappers.
    // Drop the extra attributes while keeping link text.
    .replace(/<a\b[^>]*data-slate-[^>]*>/giu, "<a>")
    .trimStart();

  // Some imported notes contain Slate editor wrappers like:
  // <span data-slate-...><span ...>text</span></span>
  // Strip spans to keep the Markdown body readable.
  if (normalized.includes("data-slate-")) {
    return normalized
      .replace(/<\/span>/giu, "")
      .replace(/<span\b[^>]*>/giu, "")
      .trimStart();
  }

  return normalized;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

export function toIso8601Shanghai(date) {
  // Format as YYYY-MM-DDTHH:mm:ss+08:00 using UTC components shifted by +08:00.
  const offsetMinutes = 8 * 60;
  const shifted = new Date(date.getTime() + offsetMinutes * 60 * 1000);
  return (
    `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}` +
    `T${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}:${pad2(shifted.getUTCSeconds())}+08:00`
  );
}

function normalizeDateString(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  // Already ISO-ish with timezone.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/u.test(raw)) {
    return raw;
  }

  // Common VuePress frontmatter: YYYY-MM-DD HH:mm:ss
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})$/u);
  if (match) {
    return `${match[1]}T${match[2]}+08:00`;
  }

  return raw;
}

export function normalizeFrontmatter(input) {
  const title = String(input.title || "Untitled").trim() || "Untitled";
  const date = normalizeDateString(input.date);
  const description = String(input.description || "").trim();
  const summary = String(input.summary || description || "").trim();
  const rawSlug = input.slug;
  const slug = rawSlug == null ? undefined : String(rawSlug).trim();
  const tags = Array.isArray(input.tags)
    ? input.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];
  const categories = Array.isArray(input.categories)
    ? input.categories.map((category) => String(category).trim()).filter(Boolean)
    : [];
  const sourcePermalink = String(
    input.source?.permalink || input.permalink || "",
  ).trim();

  return {
    title,
    ...(slug ? { slug } : {}),
    ...(date ? { date } : {}),
    ...(date ? { lastmod: normalizeDateString(input.lastmod || date) || date } : {}),
    draft: false,
    summary,
    description,
    ...(sourcePermalink ? { source: { permalink: sourcePermalink } } : {}),
    categories,
    tags,
    showToc: input.showToc ?? true,
    TocOpen: input.TocOpen ?? false,
  };
}

function appendYaml(lines, key, value, indentation = 0) {
  const prefix = " ".repeat(indentation);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      lines.push(`${prefix}${key}: []`);
      return;
    }

    lines.push(`${prefix}${key}:`);
    for (const item of value) {
      lines.push(`${prefix}  - ${quoteYamlString(item)}`);
    }
    return;
  }

  if (value && typeof value === "object") {
    lines.push(`${prefix}${key}:`);
    for (const [childKey, childValue] of Object.entries(value)) {
      appendYaml(lines, childKey, childValue, indentation + 2);
    }
    return;
  }

  if (typeof value === "boolean") {
    lines.push(`${prefix}${key}: ${value}`);
    return;
  }

  lines.push(`${prefix}${key}: ${quoteYamlString(value)}`);
}

export function stringifyFrontmatter(data) {
  const lines = ["---"];

  for (const [key, value] of Object.entries(data)) {
    appendYaml(lines, key, value);
  }

  lines.push("---");
  return `${lines.join("\n")}\n`;
}
