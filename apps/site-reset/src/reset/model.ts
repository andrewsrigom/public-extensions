export type ResetCategoryId = "cookies" | "cache" | "localStorage" | "offlineData" | "permissions" | "siteSettings";

export type ResetCategory = {
  defaultSelected: boolean;
  id: ResetCategoryId;
  supported: boolean;
};

export type ActiveSite = {
  favIconUrl?: string;
  hostname: string;
  origin: string;
  tabId: number;
  title: string;
  url: string;
};

export const RESET_CATEGORIES: ResetCategory[] = [
  {
    defaultSelected: true,
    id: "cookies",
    supported: true
  },
  {
    defaultSelected: true,
    id: "cache",
    supported: true
  },
  {
    defaultSelected: false,
    id: "localStorage",
    supported: true
  },
  {
    defaultSelected: false,
    id: "offlineData",
    supported: true
  },
  {
    defaultSelected: false,
    id: "permissions",
    supported: false
  },
  {
    defaultSelected: false,
    id: "siteSettings",
    supported: false
  }
];

export function getDefaultSelectedCategories(): ResetCategoryId[] {
  return RESET_CATEGORIES.filter((category) => category.defaultSelected && category.supported).map(({ id }) => id);
}

export function getSupportedSelectedCategories(selected: readonly ResetCategoryId[]): ResetCategoryId[] {
  const supported = new Set(RESET_CATEGORIES.filter((category) => category.supported).map(({ id }) => id));
  return selected.filter((id) => supported.has(id));
}

export function parseActiveSite(input: {
  favIconUrl?: string;
  id?: number;
  title?: string;
  url?: string;
}): ActiveSite | null {
  if (!input.id || !input.url) return null;

  try {
    const url = new URL(input.url);
    if (!["http:", "https:"].includes(url.protocol)) return null;

    return {
      favIconUrl: input.favIconUrl,
      hostname: normalizeHostname(url.hostname),
      origin: url.origin,
      tabId: input.id,
      title: input.title?.trim() || normalizeHostname(url.hostname),
      url: url.href
    };
  } catch {
    return null;
  }
}

export function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

export function getCookieRemovalUrl(cookie: { domain: string; path: string; secure: boolean }): string {
  const protocol = cookie.secure ? "https:" : "http:";
  const hostname = cookie.domain.replace(/^\./, "");
  const path = cookie.path.startsWith("/") ? cookie.path : `/${cookie.path}`;
  return `${protocol}//${hostname}${path}`;
}
