import { MANAGED_CARD_SELECTOR } from "../core/renderer";
import type { PlatformAdapter } from "../shared/types";
import { buildItemKey, normalizeText, normalizeUrl } from "../shared/url";

const PLATFORM_ID = "iqiyi";

const CONTENT_LINK_SELECTOR = [
  "a[href*='/album/']",
  "a[href*='/play/']",
  "a[href*='iq.com/album/']",
  "a[href*='iq.com/play/']",
  "a[gtag-category][href]"
].join(",");
const CARD_ROOT_SELECTORS = [
  ".plist-img-wrap, [class*='plist-img-wrap'], .pull-hover",
  "[data-issendpb]",
  "[class*='slide-item-wrap']"
];
const POSTER_HOST_SELECTOR = ".pic-box, [class*='pic-box']";
const CONTENT_PATH_PATTERN = /\/(?:album|play)\/[^/?#]+/i;

function isIqiyiHost(hostname: string): boolean {
  return hostname === "iq.com" || hostname.endsWith(".iq.com");
}

function isContentLink(link: HTMLAnchorElement): boolean {
  const href = link.getAttribute("href") || "";

  try {
    const url = new URL(href, "https://www.iq.com");
    return CONTENT_PATH_PATTERN.test(url.pathname);
  } catch {
    return CONTENT_PATH_PATTERN.test(href);
  }
}

function findPrimaryLink(root: HTMLElement): HTMLAnchorElement | null {
  if (root instanceof HTMLAnchorElement && root.matches(CONTENT_LINK_SELECTOR) && isContentLink(root)) return root;

  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>(CONTENT_LINK_SELECTOR));
  return links.find(isContentLink) || null;
}

function findCardRoot(anchor: HTMLAnchorElement): HTMLElement {
  const candidates = CARD_ROOT_SELECTORS.flatMap((selector) => {
    const card = anchor.closest<HTMLElement>(selector);
    return card && card.tagName !== "A" ? [card] : [];
  });

  return candidates.find(hasUsableCardBox) || candidates[0] || anchor;
}

function findContentId(link: HTMLAnchorElement | null): string {
  const href = link?.getAttribute("href") || "";

  try {
    const url = new URL(href, "https://www.iq.com");
    return getContentIdFromPath(url.pathname);
  } catch {
    return getContentIdFromPath(href);
  }
}

function getContentIdFromPath(pathname: string): string {
  const match = pathname.match(/\/(album|play)\/([^/?#]+)/i);
  const contentType = match?.[1]?.toLowerCase() || "";
  const segment = match?.[2] || "";
  if (!contentType || !segment) return "";

  const id = segment.match(/-([a-z0-9]{6,})$/i)?.[1] || segment;
  return `${contentType}:${id}`;
}

function findTitle(root: HTMLElement, link: HTMLAnchorElement | null): string {
  const explicitTitle = root.querySelector<HTMLElement>(".title");
  const image = root.querySelector<HTMLElement>("img[alt]:not([alt=''])");

  return normalizeText(
    explicitTitle?.textContent ||
      cleanImageTitle(image?.getAttribute("alt") || "") ||
      link?.getAttribute("aria-label") ||
      ""
  );
}

function cleanImageTitle(title: string): string {
  return title
    .replace(/\s+Legendas?.*$/i, "")
    .replace(/\s+Dublagem.*$/i, "")
    .trim();
}

function findPosterHost(root: HTMLElement, link: HTMLAnchorElement | null): HTMLElement | null {
  const surfaces = link && root.contains(link) ? [link, root] : [root];

  for (const surface of surfaces) {
    const host =
      surface.querySelector<HTMLElement>(POSTER_HOST_SELECTOR) || surface.closest<HTMLElement>(POSTER_HOST_SELECTOR);
    if (host && root.contains(host)) return host;

    const image = surface.querySelector<HTMLElement>("img[alt]");
    if (image?.parentElement) return image.parentElement;
  }

  return null;
}

function findVisualElement(root: HTMLElement, host: HTMLElement | null): HTMLElement {
  const surface = host || root;
  const image = surface.querySelector<HTMLElement>("img[alt]");
  return image || surface;
}

function addVisibleCard(roots: Set<HTMLElement>, root: HTMLElement): void {
  const alreadyManaged = root.matches(MANAGED_CARD_SELECTOR);

  if (!alreadyManaged && !hasUsableCardBox(root)) return;
  roots.add(root);
}

function hasUsableCardBox(root: HTMLElement): boolean {
  const rect = root.getBoundingClientRect();
  return rect.width >= 80 && rect.height >= 80;
}

export const iqiyiAdapter: PlatformAdapter = {
  id: PLATFORM_ID,
  displayName: "iQIYI",
  hosts: ["iq.com", "www.iq.com", "*.iq.com"],

  matchesLocation(location) {
    return isIqiyiHost(location.hostname);
  },

  getCards() {
    const roots = new Set<HTMLElement>();

    for (const anchor of document.querySelectorAll<HTMLAnchorElement>(CONTENT_LINK_SELECTOR)) {
      if (!isContentLink(anchor)) continue;
      addVisibleCard(roots, findCardRoot(anchor));
    }

    return Array.from(roots);
  },

  getItem(card) {
    const link = findPrimaryLink(card);
    const contentId = findContentId(link);
    const title = findTitle(card, link);
    const url = normalizeUrl(link?.getAttribute("href") || "");
    const stableValue = contentId || url || `title:${title.toLowerCase()}`;

    if (!stableValue) return null;

    const visualHost = findPosterHost(card, link);
    const visualElement = findVisualElement(card, visualHost);

    return {
      key: buildItemKey(PLATFORM_ID, stableValue),
      platform: PLATFORM_ID,
      title,
      url,
      element: card,
      visualElement,
      visualHost: visualHost || card,
      markerHost: card,
      markerPlacement: "cover-top-left"
    };
  }
};
