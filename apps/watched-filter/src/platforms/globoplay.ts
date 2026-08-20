import { MANAGED_CARD_SELECTOR } from "../core/renderer";
import type { PlatformAdapter } from "../shared/types";
import { buildItemKey, normalizeText, normalizeUrl } from "../shared/url";

const PLATFORM_ID = "globoplay";

const CONTENT_LINK_SELECTOR = ["a.item-preview__link-wrapper[href*='/t/']", "a[aria-label][href*='/t/']"].join(",");
const CARD_ROOT_SELECTOR = "[data-testid='item-with-preview'], .item-with-preview, li.gplay-slider__slide";
const POSTER_HOST_SELECTORS = [".poster__image-container", "[data-testid='poster']", ".poster"];

function isGloboplayHost(hostname: string): boolean {
  return hostname === "globoplay.globo.com" || hostname.endsWith(".globoplay.globo.com");
}

function findPrimaryLink(root: HTMLElement): HTMLAnchorElement | null {
  if (root.matches(CONTENT_LINK_SELECTOR)) return root as HTMLAnchorElement;
  return root.querySelector<HTMLAnchorElement>(CONTENT_LINK_SELECTOR);
}

function findCardRoot(anchor: HTMLAnchorElement): HTMLElement {
  const item = anchor.closest<HTMLElement>(CARD_ROOT_SELECTOR);
  return item && item.tagName !== "A" ? item : anchor;
}

function findContentId(link: HTMLAnchorElement | null): string {
  const href = link?.getAttribute("href") || "";

  try {
    const url = new URL(href, "https://globoplay.globo.com");
    const match = url.pathname.match(/\/t\/([^/?#]+)/i);
    return match?.[1] || "";
  } catch {
    const match = href.match(/\/t\/([^/?#]+)/i);
    return match?.[1] || "";
  }
}

function findTitle(root: HTMLElement, link: HTMLAnchorElement | null): string {
  const headline = root.querySelector<HTMLElement>(".item-preview__headline");
  const posterImage = root.querySelector<HTMLElement>("img.poster__image[alt]");
  const image = root.querySelector<HTMLElement>("img[alt]");

  return normalizeText(
    headline?.textContent ||
      posterImage?.getAttribute("alt") ||
      image?.getAttribute("alt") ||
      link?.getAttribute("aria-label") ||
      ""
  );
}

function findPosterHost(root: HTMLElement): HTMLElement | null {
  for (const selector of POSTER_HOST_SELECTORS) {
    if (root.matches(selector)) return root;

    const host = root.querySelector<HTMLElement>(selector);
    if (host) return host;
  }

  return null;
}

function findVisualElement(root: HTMLElement, host: HTMLElement | null): HTMLElement {
  const surface = host || root;
  const image = surface.querySelector<HTMLElement>("img");
  return image || surface;
}

export const globoplayAdapter: PlatformAdapter = {
  id: PLATFORM_ID,
  displayName: "Globoplay",
  hosts: ["globoplay.globo.com", "*.globoplay.globo.com"],

  matchesLocation(location) {
    return isGloboplayHost(location.hostname);
  },

  getCards() {
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>(CONTENT_LINK_SELECTOR));
    const roots = new Set<HTMLElement>();

    for (const anchor of anchors) {
      const root = findCardRoot(anchor);
      const rect = root.getBoundingClientRect();
      const alreadyManaged = root.matches(MANAGED_CARD_SELECTOR);

      if (!alreadyManaged && (rect.width < 80 || rect.height < 80)) continue;
      roots.add(root);
    }

    return Array.from(roots);
  },

  getItem(card) {
    const link = findPrimaryLink(card);
    const contentId = findContentId(link);
    const title = findTitle(card, link);
    const url = normalizeUrl(link?.getAttribute("href") || "");
    const stableValue = contentId ? `content:${contentId}` : url || `title:${title.toLowerCase()}`;

    if (!stableValue) return null;

    const visualHost = findPosterHost(card);
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
