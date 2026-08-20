import { MANAGED_CARD_SELECTOR } from "../core/renderer";
import type { PlatformAdapter } from "../shared/types";
import { buildItemKey, normalizeText, normalizeUrl } from "../shared/url";

const PLATFORM_ID = "max";

const TILE_LINK_SELECTOR = [
  "a[data-sonic-id][href]",
  "a[data-testid$='_tile'][href]",
  "a[href^='/show/']",
  "a[href^='/movie/']",
  "a[href^='/feature/']",
  "a[href^='/series/']"
].join(",");
const TILE_ROOT_SELECTOR = "[class*='StyledTileWrapper'], [data-testid*='_tileWrapper']";
const TILE_IMAGE_SELECTOR = "[data-testid$='_tileImage'], [class*='StyledTileImageContainer']";

function isMaxHost(hostname: string): boolean {
  return (
    hostname === "max.com" ||
    hostname.endsWith(".max.com") ||
    hostname === "hbomax.com" ||
    hostname.endsWith(".hbomax.com")
  );
}

function findPrimaryLink(root: HTMLElement): HTMLAnchorElement | null {
  if (root.matches(TILE_LINK_SELECTOR)) return root as HTMLAnchorElement;
  return root.querySelector<HTMLAnchorElement>(TILE_LINK_SELECTOR);
}

function findTileRoot(anchor: HTMLAnchorElement): HTMLElement {
  const tile = anchor.closest<HTMLElement>(TILE_ROOT_SELECTOR);
  return tile && tile.tagName !== "A" ? tile : anchor;
}

function findSonicId(root: HTMLElement, link: HTMLAnchorElement | null): string {
  const sonicId =
    link?.getAttribute("data-sonic-id") || root.querySelector<HTMLElement>("[data-sonic-id]")?.dataset.sonicId;
  if (sonicId) return sonicId;

  const href = link?.getAttribute("href") || "";
  const match = href.match(/\/(?:show|movie|feature|series)\/([a-z0-9-]+)/i);
  return match?.[1] || "";
}

function findTitle(root: HTMLElement, link: HTMLAnchorElement | null): string {
  const backupText = root.querySelector("[class*='StyledTileBackupImageText']");
  const image = root.querySelector("img[alt]");

  return normalizeText(
    backupText?.textContent ||
      image?.getAttribute("alt") ||
      cleanAriaTitle(link?.getAttribute("aria-label") || root.getAttribute("aria-label") || "")
  );
}

function cleanAriaTitle(value: string): string {
  return normalizeText(
    value
      .replace(/[\u2066-\u2069]/g, "")
      .replace(/\s*\.\s*\d+\s+(?:de|of)\s+\d+.*$/i, "")
      .replace(/\s*\.\s*$/g, "")
  );
}

function findImageHost(root: HTMLElement, link: HTMLAnchorElement | null): HTMLElement | null {
  const linkImageHost =
    link?.querySelector<HTMLElement>(TILE_IMAGE_SELECTOR) || link?.closest<HTMLElement>(TILE_IMAGE_SELECTOR);

  if (linkImageHost && root.contains(linkImageHost)) {
    return linkImageHost;
  }

  return root.matches(TILE_IMAGE_SELECTOR) ? root : root.querySelector<HTMLElement>(TILE_IMAGE_SELECTOR);
}

function findVisualElement(root: HTMLElement, host: HTMLElement | null): HTMLElement {
  const surface = host || root;
  const image = surface.querySelector<HTMLElement>("img");
  return image || surface;
}

export const maxAdapter: PlatformAdapter = {
  id: PLATFORM_ID,
  displayName: "Max",
  hosts: ["max.com", "*.max.com", "hbomax.com", "*.hbomax.com", "play.hbomax.com"],

  matchesLocation(location) {
    return isMaxHost(location.hostname);
  },

  getCards() {
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>(TILE_LINK_SELECTOR));
    const roots = new Set<HTMLElement>();

    for (const anchor of anchors) {
      const root = findTileRoot(anchor);
      const rect = root.getBoundingClientRect();
      const alreadyManaged = root.matches(MANAGED_CARD_SELECTOR);

      if (!alreadyManaged && (rect.width < 80 || rect.height < 50)) continue;
      roots.add(root);
    }

    return Array.from(roots);
  },

  getItem(card) {
    const link = findPrimaryLink(card);
    const sonicId = findSonicId(card, link);
    const title = findTitle(card, link);
    const url = normalizeUrl(link?.getAttribute("href") || "");
    const stableValue = sonicId ? `sonic:${sonicId}` : url || `title:${title.toLowerCase()}`;

    if (!stableValue) return null;

    const markerHost = findImageHost(card, link);
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
