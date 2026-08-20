import { MANAGED_CARD_SELECTOR } from "../core/renderer";
import type { PlatformAdapter } from "../shared/types";
import { buildItemKey, normalizeText, normalizeUrl } from "../shared/url";

const PLATFORM_ID = "apple-tv";

const LOCKUP_SELECTOR = [
  "a[data-testid='lockup'][href]",
  "a.lockup[href*='tv.apple.com']",
  "a.lockup[href*='/show/']",
  "a.lockup[href*='/movie/']",
  "button[data-testid='epic-showcase-item']"
].join(",");
const CARD_ROOT_SELECTOR =
  "[data-testid='lockup-container'], .lockup-container, [slot='item'], button[data-testid='epic-showcase-item']";
const ARTWORK_HOST_SELECTORS = [
  "[data-testid='artwork-component']",
  ".artwork-component",
  ".artwork-container",
  "[data-testid='artwork']"
];
const CONTENT_PATH_PATTERN = /\/(?:show|movie|episode|sporting-event)\//i;

function isAppleTvHost(hostname: string): boolean {
  return hostname === "tv.apple.com" || hostname.endsWith(".tv.apple.com");
}

function findPrimaryLockup(root: HTMLElement): HTMLElement | null {
  if (root.matches(LOCKUP_SELECTOR)) return root;
  return root.querySelector<HTMLElement>(LOCKUP_SELECTOR);
}

function isContentLockup(lockup: HTMLElement): boolean {
  if (lockup instanceof HTMLButtonElement && lockup.dataset.testid === "epic-showcase-item") return true;

  const href = lockup.getAttribute("href") || "";
  if (!href) return false;

  try {
    const url = new URL(href, "https://tv.apple.com");
    return CONTENT_PATH_PATTERN.test(url.pathname) || Boolean(findContentId(lockup, href));
  } catch {
    return CONTENT_PATH_PATTERN.test(href) || Boolean(findContentId(lockup, href));
  }
}

function findCardRoot(lockup: HTMLElement): HTMLElement {
  if (lockup instanceof HTMLButtonElement) return lockup;

  const card = lockup.closest<HTMLElement>(CARD_ROOT_SELECTOR);
  return card && card.tagName !== "A" ? card : lockup;
}

function findContentId(root: HTMLElement, href = ""): string {
  const candidates = [
    href,
    root.getAttribute("href") || "",
    root.querySelector<HTMLElement>("a[href*='umc.']")?.getAttribute("href") || "",
    root.innerHTML
  ];

  for (const candidate of candidates) {
    const match = candidate.match(/(umc\.[A-Za-z0-9._-]+)/);
    if (match?.[1]) return match[1].replace(/[?&#].*$/, "");
  }

  return "";
}

function findTitle(root: HTMLElement, lockup: HTMLElement | null): string {
  const hiddenTitle = root.querySelector<HTMLElement>(".visually-hidden");
  const image = root.querySelector<HTMLElement>("img[alt]:not([alt=''])");

  return normalizeText(
    hiddenTitle?.textContent ||
      image?.getAttribute("alt") ||
      lockup?.getAttribute("aria-label") ||
      root.getAttribute("aria-label") ||
      ""
  );
}

function findVisualHost(root: HTMLElement, lockup: HTMLElement | null): HTMLElement | null {
  const surfaces = lockup && root.contains(lockup) ? [lockup, root] : [root];

  for (const surface of surfaces) {
    const host = findFirstArtworkHost(surface);

    if (host && root.contains(host)) return host;

    const image = surface.querySelector<HTMLElement>("img.artwork-component__image, img[alt]");
    if (image?.parentElement) return image.parentElement;
  }

  return null;
}

function findFirstArtworkHost(surface: HTMLElement): HTMLElement | null {
  for (const selector of ARTWORK_HOST_SELECTORS) {
    const host = surface.querySelector<HTMLElement>(selector) || surface.closest<HTMLElement>(selector);
    if (host) return host;
  }

  return null;
}

function findVisualElement(root: HTMLElement, host: HTMLElement | null): HTMLElement {
  const surface = host || root;
  const image = surface.querySelector<HTMLElement>("img.artwork-component__image, img[alt]");
  return image || surface;
}

function addVisibleCard(roots: Set<HTMLElement>, root: HTMLElement): void {
  const rect = root.getBoundingClientRect();
  const alreadyManaged = root.matches(MANAGED_CARD_SELECTOR);

  if (!alreadyManaged && (rect.width < 80 || rect.height < 80)) return;
  roots.add(root);
}

export const appleTvAdapter: PlatformAdapter = {
  id: PLATFORM_ID,
  displayName: "Apple TV",
  hosts: ["tv.apple.com", "*.tv.apple.com"],

  matchesLocation(location) {
    return isAppleTvHost(location.hostname);
  },

  getCards() {
    const roots = new Set<HTMLElement>();

    for (const lockup of document.querySelectorAll<HTMLElement>(LOCKUP_SELECTOR)) {
      if (!isContentLockup(lockup)) continue;
      addVisibleCard(roots, findCardRoot(lockup));
    }

    return Array.from(roots);
  },

  getItem(card) {
    const lockup = findPrimaryLockup(card);
    const href = lockup?.getAttribute("href") || "";
    const contentId = findContentId(card, href);
    const title = findTitle(card, lockup);
    const url = normalizeUrl(href);
    const stableValue = contentId ? `content:${contentId}` : url || `title:${title.toLowerCase()}`;

    if (!stableValue) return null;

    const visualHost = findVisualHost(card, lockup);
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
