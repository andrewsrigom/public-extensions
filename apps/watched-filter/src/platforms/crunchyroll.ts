import { MANAGED_CARD_SELECTOR } from "../core/renderer";
import type { PlatformAdapter } from "../shared/types";
import { buildItemKey, normalizeText, normalizeUrl } from "../shared/url";

const PLATFORM_ID = "crunchyroll";

const CONTENT_LINK_SELECTOR = [
  "a[href*='/series/']",
  "a[href*='/watch/']",
  "a[data-t='hover-link'][href]",
  "a[class*='browse-card__title-link'][href]",
  "a[class*='browse-card__poster-wrapper'][href]"
].join(",");
const CARD_ROOT_SELECTOR = "[data-t*='series-card'], [class*='browse-card--'], [data-t*='episode-card']";
const POSTER_HOST_SELECTOR = [
  "[class*='browse-card__poster--']",
  "[class*='browse-card-hover__poster-wrapper']",
  "[class*='content-image--']",
  "[class*='content-image__figure-wrapper']"
].join(",");
const CONTENT_PATH_PATTERN = /\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:series|watch)\//i;

function isCrunchyrollHost(hostname: string): boolean {
  return hostname === "crunchyroll.com" || hostname.endsWith(".crunchyroll.com");
}

function isContentLink(link: HTMLAnchorElement): boolean {
  const href = link.getAttribute("href") || "";

  try {
    const url = new URL(href, "https://www.crunchyroll.com");
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
  const card = anchor.closest<HTMLElement>(CARD_ROOT_SELECTOR);
  return card && card.tagName !== "A" ? card : anchor;
}

function findContentId(link: HTMLAnchorElement | null): string {
  const href = link?.getAttribute("href") || "";

  try {
    const url = new URL(href, "https://www.crunchyroll.com");
    return getContentIdFromPath(url.pathname);
  } catch {
    return getContentIdFromPath(href);
  }
}

function getContentIdFromPath(pathname: string): string {
  const match = pathname.match(/\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(series|watch)\/([^/?#]+)/i);
  return match?.[1] && match?.[2] ? `${match[1].toLowerCase()}:${match[2]}` : "";
}

function findTitle(root: HTMLElement, link: HTMLAnchorElement | null): string {
  const title = root.querySelector<HTMLElement>("[data-t='title'] a, [data-t='title']");
  const originalImage = root.querySelector<HTMLElement>("img[data-t='original-image'][alt]:not([alt=''])");
  const image = root.querySelector<HTMLElement>("img[alt]:not([alt=''])");

  return normalizeText(
    link?.getAttribute("aria-label") ||
      title?.textContent ||
      originalImage?.getAttribute("alt") ||
      image?.getAttribute("alt") ||
      ""
  );
}

function findPosterHost(root: HTMLElement, link: HTMLAnchorElement | null): HTMLElement | null {
  const surfaces = link && root.contains(link) ? [link, root] : [root];

  for (const surface of surfaces) {
    const host =
      surface.querySelector<HTMLElement>(POSTER_HOST_SELECTOR) || surface.closest<HTMLElement>(POSTER_HOST_SELECTOR);
    if (host && root.contains(host)) return host;

    const image = surface.querySelector<HTMLElement>("img[data-t='original-image'], img[alt]");
    if (image?.parentElement) return image.parentElement;
  }

  return null;
}

function findVisualElement(root: HTMLElement, host: HTMLElement | null): HTMLElement {
  const surface = host || root;
  const image = surface.querySelector<HTMLElement>("img[data-t='original-image'], img[alt]");
  return image || surface;
}

function addVisibleCard(roots: Set<HTMLElement>, root: HTMLElement): void {
  const rect = root.getBoundingClientRect();
  const alreadyManaged = root.matches(MANAGED_CARD_SELECTOR);

  if (!alreadyManaged && (rect.width < 80 || rect.height < 80)) return;
  roots.add(root);
}

export const crunchyrollAdapter: PlatformAdapter = {
  id: PLATFORM_ID,
  displayName: "Crunchyroll",
  hosts: ["crunchyroll.com", "www.crunchyroll.com", "*.crunchyroll.com"],

  matchesLocation(location) {
    return isCrunchyrollHost(location.hostname);
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
