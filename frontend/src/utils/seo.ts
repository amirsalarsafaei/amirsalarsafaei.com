// Shared helpers for the SEO surfaces (metadata, sitemap, robots, JSON-LD).
// Keeping the site URL and the markdown-to-description logic in one place
// stops the canonical URL, sitemap and structured data from drifting apart.

const FALLBACK_SITE_URL = "https://amirsalarsafaei.com";
const DESCRIPTION_LIMIT = 155;

/** Canonical origin for the site, without a trailing slash. */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL;
  return raw.replace(/\/+$/, "");
}

/** Resolve an image/path to an absolute URL, or undefined if it is unusable. */
export function absoluteUrl(
  url: string | undefined | null,
  siteUrl: string = getSiteUrl(),
): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url, siteUrl).toString();
  } catch {
    return undefined;
  }
}

/**
 * Strip the markdown syntax that would otherwise leak into a meta description:
 * fenced/inline code, images, link targets, HTML tags, headings, quotes, list
 * markers and emphasis. Collapses all whitespace to single spaces.
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/`[^`\n]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_~]{1,3}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build a search-snippet-friendly description from a blog's markdown body.
 * Falls back to a title-based sentence when the post has no prose (e.g. it is
 * only code).
 */
export function blogDescription(title: string, content: string): string {
  const text = markdownToPlainText(content ?? "");

  if (!text) {
    return `Read "${title}" on Amirsalar Safaei's blog: notes on software engineering, systems and programming languages.`;
  }

  if (text.length <= DESCRIPTION_LIMIT) {
    return text;
  }

  const cut = text.slice(0, DESCRIPTION_LIMIT);
  // Prefer cutting on a word boundary, but never return a fragmentary stub.
  const lastSpace = cut.lastIndexOf(" ");
  const end = lastSpace > 80 ? lastSpace : DESCRIPTION_LIMIT;

  return `${cut.slice(0, end).trimEnd()}…`;
}
