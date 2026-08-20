import { MANAGED_CARD_SELECTOR } from "../core/renderer";
import type { PlatformAdapter } from "../shared/types";
import { buildItemKey, normalizeText, normalizeUrl } from "../shared/url";

const PLATFORM_ID = "paramount-plus";

const CONTENT_LINK_SELECTOR = ["a.link[href][id]", "a[data-impression][href]", "a[aa-link][href]"].join(",");
const HOVER_PREVIEW_SELECTOR = ".ch-expanded-container[id], .ch-expanded-container[data-showid]";
const WATCH_PAGE_MARKER_HOST_CLASS = "hwc-paramount-watch-page-marker-host";
const WATCH_PAGE_ROOT_SELECTOR = ".cta-box";
const WATCHLIST_SELECTOR = ".watchlist_wrapper[data-content_id], .watchlist_wrapper";
const VISUAL_HOST_SELECTOR = ".thumb-wrapper, .image-wrapper, .poster-wrapper, .art-wrapper";
const CONTENT_PATH_PATTERN = /^\/(?:shows|movies|series|video)\//i;

function isParamountPlusHost(hostname: string): boolean {
  return hostname === "paramountplus.com" || hostname.endsWith(".paramountplus.com");
}

function isContentLink(link: HTMLAnchorElement): boolean {
  const href = link.getAttribute("href") || "";

  try {
    const url = new URL(href, "https://www.paramountplus.com");
    return CONTENT_PATH_PATTERN.test(url.pathname) || Boolean(findContentId(link, link));
  } catch {
    return CONTENT_PATH_PATTERN.test(href) || Boolean(findContentId(link, link));
  }
}

function findPrimaryLink(root: HTMLElement): HTMLAnchorElement | null {
  if (root instanceof HTMLAnchorElement && root.matches(CONTENT_LINK_SELECTOR)) return root;

  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>(CONTENT_LINK_SELECTOR));
  return links.find(isContentLink) || null;
}

function findCardRoot(anchor: HTMLAnchorElement): HTMLElement {
  return anchor;
}

function isHoverPreviewNode(node: Node): boolean {
  if (!(node instanceof Element)) return false;
  return node.matches(HOVER_PREVIEW_SELECTOR) || Boolean(node.closest(HOVER_PREVIEW_SELECTOR));
}

function isHoverPreviewMutation(mutation: MutationRecord): boolean {
  if (mutation.type === "attributes" && mutation.attributeName === "style") {
    return isHoverPreviewNode(mutation.target);
  }

  if (mutation.type !== "childList") return false;
  if (isHoverPreviewNode(mutation.target)) return true;

  const changedNodes = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)];
  return changedNodes.length > 0 && changedNodes.every(isHoverPreviewNode);
}

function findContentId(root: HTMLElement, link: HTMLAnchorElement | null): string {
  const urlId = findContentIdFromUrl(link?.getAttribute("href") || root.getAttribute("href") || "");

  if (urlId) return urlId;

  const directId =
    root.getAttribute("data-showid") ||
    link?.getAttribute("data-showid") ||
    getStableElementId(root) ||
    getStableElementId(link);

  if (directId) return directId;

  const impression = root.getAttribute("data-impression") || link?.getAttribute("data-impression") || "";
  const impressionId = impression.match(/^([^|]+)/)?.[1];
  if (impressionId && impressionId !== "undefined") return impressionId;

  return "";
}

function findContentIdFromUrl(href: string): string {
  if (!href) return "";

  try {
    const url = new URL(href, window.location.href);
    const segments = url.pathname.split("/").filter(Boolean);
    const videoIndex = segments.findIndex((segment) => segment.toLowerCase() === "video");
    const videoId = videoIndex >= 0 ? segments[videoIndex + 1] : "";
    const lastId = [...segments].reverse().find((segment) => /^[A-Za-z0-9_]{12,}$/.test(segment)) || "";

    return videoId || lastId;
  } catch {
    return "";
  }
}

function findContentIdFromPath(): string {
  return findContentIdFromUrl(window.location.href);
}

function findCurrentPageContentId(root: HTMLElement | Document = document): string {
  const watchlist = root.querySelector<HTMLElement>(WATCHLIST_SELECTOR);
  const contentId =
    watchlist?.getAttribute("data-content_id") || watchlist?.getAttribute("data-content-id") || findContentIdFromPath();

  return contentId && contentId !== "-1" ? contentId : findContentIdFromPath();
}

function findWatchPageRoot(): HTMLElement | null {
  if (!findCurrentPageContentId()) return null;
  return document.querySelector<HTMLElement>(WATCH_PAGE_ROOT_SELECTOR);
}

function isWatchPageRoot(card: HTMLElement): boolean {
  return Boolean(findCurrentPageContentId(card)) && card.matches(WATCH_PAGE_ROOT_SELECTOR);
}

function getStableElementId(element: Element | null): string {
  const id = element?.id || "";
  return /^[A-Za-z0-9_-]{4,}$/.test(id) && id !== "rating" ? id : "";
}

function findTitle(root: HTMLElement, link: HTMLAnchorElement | null): string {
  const image = root.querySelector<HTMLElement>("img.thumb[alt], img[alt]");
  const trackingTitle = (root.getAttribute("data-tracking") || link?.getAttribute("data-tracking") || "").split("|")[0];
  const expandedTitle = root.querySelector<HTMLElement>("[class*='title'], h1, h2, h3");

  return normalizeText(
    root.getAttribute("title") ||
      link?.getAttribute("title") ||
      link?.getAttribute("aria-label") ||
      image?.getAttribute("alt") ||
      trackingTitle ||
      expandedTitle?.textContent ||
      ""
  );
}

function findWatchPageTitle(root: HTMLElement): string {
  const metadata = root.querySelector<HTMLElement>(WATCHLIST_SELECTOR);
  const heading = root.querySelector<HTMLElement>("[class*='title'], h1, h2");

  return (
    normalizeText(
      metadata?.getAttribute("data-title") ||
        metadata?.getAttribute("data-series_title") ||
        heading?.textContent ||
        document.title
    ).replace(/\s+\|\s+Paramount\+.*$/i, "") || "Paramount+ video"
  );
}

function styleWatchPageMarkerHost(markerHost: HTMLElement): HTMLElement {
  markerHost.style.alignItems = "center";
  markerHost.style.display = "inline-flex";
  markerHost.style.justifyContent = "center";
  markerHost.style.verticalAlign = "middle";
  return markerHost;
}

function ensureWatchPageMarkerHost(root: HTMLElement): HTMLElement {
  const existing = root.querySelector<HTMLElement>(`.${WATCH_PAGE_MARKER_HOST_CLASS}`);

  if (existing) return styleWatchPageMarkerHost(existing);

  const markerHost = document.createElement("div");
  markerHost.className = WATCH_PAGE_MARKER_HOST_CLASS;
  styleWatchPageMarkerHost(markerHost);

  const reference = root.querySelector<HTMLElement>(".watchlist_wrapper.in_movie_page, .watchlist_wrapper");
  if (reference?.parentElement) {
    reference.insertAdjacentElement("afterend", markerHost);
    return markerHost;
  }

  const ctaProgress = root.querySelector<HTMLElement>(".cta-progress-wrapper");
  if (ctaProgress) {
    ctaProgress.insertAdjacentElement("afterend", markerHost);
  } else {
    root.appendChild(markerHost);
  }

  return markerHost;
}

function findVisualHost(root: HTMLElement, link: HTMLAnchorElement | null): HTMLElement | null {
  const surfaces = link && root.contains(link) ? [link, root] : [root];

  for (const surface of surfaces) {
    const host =
      surface.querySelector<HTMLElement>(VISUAL_HOST_SELECTOR) || surface.closest<HTMLElement>(VISUAL_HOST_SELECTOR);

    if (host && root.contains(host)) return host;

    const image = surface.querySelector<HTMLElement>("img.thumb, img[alt]");
    if (image?.parentElement) return image.parentElement;
  }

  return null;
}

function findVisualElement(root: HTMLElement, host: HTMLElement | null): HTMLElement {
  const surface = host || root;
  const image = surface.querySelector<HTMLElement>("img.thumb, img[alt]");
  return image || surface;
}

function addVisibleCard(roots: Set<HTMLElement>, root: HTMLElement): void {
  const rect = root.getBoundingClientRect();
  const alreadyManaged = root.matches(MANAGED_CARD_SELECTOR);

  if (!alreadyManaged && (rect.width < 80 || rect.height < 50)) return;
  roots.add(root);
}

export const paramountPlusAdapter: PlatformAdapter = {
  id: PLATFORM_ID,
  displayName: "Paramount+",
  hosts: ["paramountplus.com", "www.paramountplus.com", "*.paramountplus.com"],

  matchesLocation(location) {
    return isParamountPlusHost(location.hostname);
  },

  getCards() {
    const roots = new Set<HTMLElement>();
    const watchPageRoot = findWatchPageRoot();

    if (watchPageRoot) {
      roots.add(watchPageRoot);
    }

    for (const anchor of document.querySelectorAll<HTMLAnchorElement>(CONTENT_LINK_SELECTOR)) {
      if (anchor.closest(HOVER_PREVIEW_SELECTOR)) continue;
      if (!isContentLink(anchor)) continue;
      addVisibleCard(roots, findCardRoot(anchor));
    }

    return Array.from(roots);
  },

  getItem(card) {
    if (isWatchPageRoot(card)) {
      const contentId = findCurrentPageContentId(card);
      const markerHost = ensureWatchPageMarkerHost(card);

      if (!contentId) return null;

      return {
        key: buildItemKey(PLATFORM_ID, `content:${contentId}`),
        platform: PLATFORM_ID,
        title: findWatchPageTitle(card),
        url: normalizeUrl(window.location.href),
        element: card,
        visualElement: markerHost,
        visualHost: markerHost,
        markerHost,
        markerPlacement: "page-action"
      };
    }

    const link = findPrimaryLink(card);
    const contentId = findContentId(card, link);
    const title = findTitle(card, link);
    const url = normalizeUrl(link?.getAttribute("href") || "");
    const stableValue = contentId ? `content:${contentId}` : url || `title:${title.toLowerCase()}`;

    if (!stableValue) return null;

    const visualHost = findVisualHost(card, link);
    const visualElement = findVisualElement(card, visualHost);

    return {
      key: buildItemKey(PLATFORM_ID, stableValue),
      platform: PLATFORM_ID,
      title,
      url,
      // Paramount+ hover previews flicker with dim mode, so use overlay until that site behavior is stable.
      dimModeFallback: "overlay",
      element: card,
      visualElement,
      visualHost: visualHost || card,
      markerHost: card,
      markerPlacement: "cover-top-left"
    };
  },

  shouldIgnoreMutation(mutation) {
    return isHoverPreviewMutation(mutation);
  }
};
