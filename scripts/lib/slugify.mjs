export function stripOrderingPrefix(value) {
  return value.replace(/^\d+[._-]*/u, "").replace(/\.md$/iu, "").trim();
}

export function slugifySegment(input) {
  const base = stripOrderingPrefix(String(input ?? "").normalize("NFKC"));
  const slug = base
    .replace(/[\\/]+/gu, "-")
    .replace(/\s+/gu, "-")
    .replace(/[()（）[\]【】{}]/gu, "")
    .replace(/[,&，。:：!！?？'"`]+/gu, "")
    .replace(/[^0-9a-zA-Z\p{Script=Han}-]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "")
    .toLowerCase();

  return slug || "untitled";
}

export function slugifySegments(parts) {
  return parts.map((part) => slugifySegment(part)).filter(Boolean);
}
