import { MANAGED_CARD_SELECTOR } from "../core/renderer";
import type { PlatformAdapter } from "../shared/types";
import { buildItemKey, normalizeText, normalizeUrl } from "../shared/url";

const PLATFORM_ID = "disney-plus";

const ITEM_LINK_SELECTOR = [
  "a[data-testid='set-item'][href]",
  "a[data-item-id][href]",
  "a[href*='/browse/entity-']",
  "a[href*='/play/']"
].join(",");
const CARD_ROOT_SELECTOR = "[data-testid='set-shelf-item'], [role='group'][aria-roledescription='slide']";
const POSTER_HOST_SELECTOR = [
  "[data-testid='poster-set-item-background']",
  "[data-testid='poster-vertical-title-art']",
  "a[data-testid='set-item']"
].join(",");

function isDisneyPlusHost(hostname: string): boolean {
  return hostname === "disneyplus.com" || hostname.endsWith(".disneyplus.com");
}

function findPrimaryLink(root: HTMLElement): HTMLAnchorElement | null {
  if (root.matches(ITEM_LINK_SELECTOR)) return root as HTMLAnchorElement;
  return root.querySelector<HTMLAnchorElement>(ITEM_LINK_SELECTOR);
}

function findCardRoot(anchor: HTMLAnchorElement): HTMLElement {
  const card = anchor.closest<HTMLElement>(CARD_ROOT_SELECTOR);
  return card && card.tagName !== "A" ? card : anchor;
}

function findEntityId(root: HTMLElement, link: HTMLAnchorElement | null): string {
  const dataItemId =
    link?.getAttribute("data-item-id") || root.querySelector<HTMLElement>("[data-item-id]")?.dataset.itemId;
  if (dataItemId) return dataItemId;

  const href = link?.getAttribute("href") || "";
  const match = href.match(/entity-([a-z0-9-]+)/i);
  return match?.[1] || "";
}

function findTitle(root: HTMLElement, link: HTMLAnchorElement | null): string {
  const titleArt = root.querySelector("[data-testid='poster-vertical-title-art'] img[alt]");
  const image = root.querySelector("img[alt]");
  const ariaLabel = link?.getAttribute("aria-label") || root.getAttribute("aria-label") || "";

  return normalizeText(titleArt?.getAttribute("alt") || image?.getAttribute("alt") || cleanAriaTitle(ariaLabel));
}

function cleanAriaTitle(value: string): string {
  return normalizeText(
    value
      .replace(/\s+Lançamento em .*/i, "")
      .replace(/\s+Released in .*/i, "")
      .replace(/\s+Estreno en .*/i, "")
      .replace(/\s+Selecione para .*/i, "")
      .replace(/\s+Select to .*/i, "")
      .replace(/\s+Selecciona para .*/i, "")
  );
}

function findPosterHost(root: HTMLElement, link: HTMLAnchorElement | null): HTMLElement | null {
  const linkPoster =
    link?.querySelector<HTMLElement>(POSTER_HOST_SELECTOR) || link?.closest<HTMLElement>(POSTER_HOST_SELECTOR);

  if (linkPoster && root.contains(linkPoster)) {
    return linkPoster;
  }

  return root.matches(POSTER_HOST_SELECTOR) ? root : root.querySelector<HTMLElement>(POSTER_HOST_SELECTOR);
}

function findVisualElement(root: HTMLElement, host: HTMLElement | null): HTMLElement {
  const surface = host || root;
  const titleArtImage = surface.querySelector<HTMLElement>("[data-testid='poster-vertical-title-art'] img");
  const image = surface.querySelector<HTMLElement>("img");
  return titleArtImage || image || surface;
}

export const disneyPlusAdapter: PlatformAdapter = {
  id: PLATFORM_ID,
  displayName: "Disney+",
  hosts: ["disneyplus.com", "www.disneyplus.com", "*.disneyplus.com"],

  matchesLocation(location) {
    return isDisneyPlusHost(location.hostname);
  },

  getCards() {
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>(ITEM_LINK_SELECTOR));
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
    const entityId = findEntityId(card, link);
    const title = findTitle(card, link);
    const url = normalizeUrl(link?.getAttribute("href") || "");
    const stableValue = entityId ? `entity:${entityId}` : url || `title:${title.toLowerCase()}`;

    if (!stableValue) return null;

    const markerHost = findPosterHost(card, link);
    const visualElement = findVisualElement(card, markerHost);

    return {
      key: buildItemKey(PLATFORM_ID, stableValue),
      platform: PLATFORM_ID,
      title,
      url,
      element: card,
      visualElement,
      visualHost: markerHost || card,
      markerHost: markerHost || undefined,
      markerPlacement: markerHost ? "host-bottom-left" : "cover-top-left"
    };
  }
};
