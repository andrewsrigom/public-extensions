export function normalizeText(value: unknown): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeUrl(href: string | null | undefined, baseUrl = location.href): string {
  if (!href) return "";

  try {
    const url = new URL(href, baseUrl);
    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return href;
  }
}

export function normalizeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const candidate = value.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

export function buildItemKey(platform: string, stableValue: string): string {
  return `${platform}:${stableValue}`;
}
