import { MANAGED_CARD_SELECTOR } from "../core/renderer";
import { t } from "../shared/i18n";
import type { AutoDetectionResult, ContentItem, ExtensionSettings, PlatformAdapter } from "../shared/types";
import { buildItemKey, normalizeText, normalizeUrl } from "../shared/url";

const PLATFORM_ID = "netflix";

const WATCH_LINK_SELECTOR = "a[href*='/watch/'], a[href*='/title/']";
const BOXART_SELECTOR = ".boxart-container, [class*='boxart-container'], [data-uia='boxart-container']";
const PROGRESS_CONTEXT_PATTERN =
  /progress|watched|watch|resume|continue|progresso|assistid|assistindo|retomar|playback|progreso|visto|viendo|reanudar|reproducci[oó]n/i;

const IN_PROGRESS_PATTERNS = [
  /\bcontinue watching\b/i,
  /\bresume\b/i,
  /\bcontinuar assistindo\b/i,
  /\bretomar\b/i,
  /\bcontinuar vendo\b/i,
  /\bcontinuar viendo\b/i,
  /\breanudar\b/i,
  /\bseguir viendo\b/i
];

interface NetflixTrackingContext {
  unifiedEntityId?: unknown;
  video_id?: unknown;
}

function findPrimaryLink(root: HTMLElement): HTMLAnchorElement | null {
  if (root.matches(WATCH_LINK_SELECTOR)) return root as HTMLAnchorElement;

  const labelledLink = root.querySelector<HTMLAnchorElement>(
    "a[href*='/watch/'][aria-label], a[href*='/title/'][aria-label]"
  );
  return labelledLink || root.querySelector<HTMLAnchorElement>(WATCH_LINK_SELECTOR);
}

function findCardRoot(anchor: HTMLAnchorElement): HTMLElement {
  const card =
    anchor.closest<HTMLElement>(".slider-item") ||
    anchor.closest<HTMLElement>("[data-uia='title-card-container']") ||
    anchor.closest<HTMLElement>(".title-card");

  return card && card.tagName !== "A" ? card : anchor;
}

function findTitle(root: HTMLElement, link: HTMLAnchorElement | null): string {
  const image = root.querySelector("img[alt]");
  const fallback = root.querySelector(".fallback-text, [class*='fallback-text']");

  return normalizeText(
    link?.getAttribute("aria-label") ||
      image?.getAttribute("alt") ||
      fallback?.textContent ||
      root.getAttribute("aria-label") ||
      ""
  );
}

function findVideoId(root: HTMLElement, link: HTMLAnchorElement | null): string {
  const hrefId = getVideoIdFromHref(link?.getAttribute("href") || "");
  if (hrefId) return hrefId;

  for (const node of root.querySelectorAll<HTMLElement>("[data-ui-tracking-context]")) {
    const context = parseTrackingContext(node.getAttribute("data-ui-tracking-context"));
    const videoId = getStringId(context?.video_id) || getStringId(context?.unifiedEntityId);

    if (videoId) return videoId.replace(/^Video:/i, "");
  }

  return "";
}

function getVideoIdFromHref(href: string): string {
  const match = href.match(/\/(?:watch|title)\/(\d+)/);
  return match?.[1] || "";
}

function parseTrackingContext(value: string | null): NetflixTrackingContext | null {
  if (!value) return null;

  try {
    return JSON.parse(decodeURIComponent(value)) as NetflixTrackingContext;
  } catch {
    return null;
  }
}

function getStringId(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" ? value.trim() : "";
}

function findBoxartHost(root: HTMLElement, link: HTMLAnchorElement | null): HTMLElement | null {
  const linkBoxart = link?.querySelector<HTMLElement>(BOXART_SELECTOR) || link?.closest<HTMLElement>(BOXART_SELECTOR);

  if (linkBoxart && root.contains(linkBoxart)) {
    return linkBoxart;
  }

  return root.matches(BOXART_SELECTOR) ? root : root.querySelector<HTMLElement>(BOXART_SELECTOR);
}

function findVisualElement(root: HTMLElement, host: HTMLElement | null): HTMLElement {
  const surface = host || root;
  const image = surface.querySelector<HTMLElement>("img");
  return image || surface;
}

function getNodeText(node: HTMLElement): string {
  return normalizeText(node.innerText || node.textContent || "");
}

function getAttributeText(node: Element): string {
  return Array.from(node.attributes || [])
    .map((attribute) => `${attribute.name}=${attribute.value}`)
    .join(" ");
}

function getElementContext(node: Element): string {
  const parts: string[] = [];
  let current: Element | null = node;
  let depth = 0;

  while (current && depth < 4) {
    parts.push(current.tagName || "");
    parts.push(String((current as HTMLElement).className || ""));
    parts.push(current.id || "");
    parts.push(current.getAttribute("role") || "");
    parts.push(current.getAttribute("aria-label") || "");
    parts.push(getAttributeText(current));
    current = current.parentElement;
    depth += 1;
  }

  return parts.join(" ");
}

function getPercentFromText(text: string | null | undefined): number | null {
  const match = String(text || "").match(/(\d{1,3})(?:[.,]\d+)?\s*%/);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function getProgressFromNode(node: Element): number | null {
  const directValues = [
    node.getAttribute("aria-valuenow"),
    node.getAttribute("aria-valuetext"),
    node.getAttribute("aria-label"),
    node.getAttribute("title"),
    node.getAttribute("data-progress"),
    node.getAttribute("data-percent"),
    node.getAttribute("value")
  ].filter(Boolean);

  for (const value of directValues) {
    const numeric = Number(String(value).replace(",", "."));
    if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 100) return numeric;

    const percent = getPercentFromText(value);
    if (percent !== null) return percent;
  }

  return getPercentFromText(node.getAttribute("style"));
}

function findMaxProgress(root: HTMLElement): number | null {
  const nodes = root.querySelectorAll(
    [
      "[role='progressbar']",
      "[aria-valuenow]",
      "[aria-valuetext]",
      "[aria-label*='%']",
      "[title*='%']",
      "[data-progress]",
      "[data-percent]",
      "[style*='%']",
      "[class*='progress']",
      "[class*='Progress']"
    ].join(",")
  );

  let maxProgress: number | null = null;

  for (const node of nodes) {
    const context = getElementContext(node);
    const progress = getProgressFromNode(node);
    const hasStrongProgressSignal =
      node.matches("[role='progressbar'], [aria-valuenow], [aria-valuetext], [data-progress], [data-percent]") ||
      PROGRESS_CONTEXT_PATTERN.test(context);

    if (progress === null) continue;
    if (!hasStrongProgressSignal) continue;

    maxProgress = maxProgress === null ? progress : Math.max(maxProgress, progress);
  }

  return maxProgress;
}

export const netflixAdapter: PlatformAdapter = {
  id: PLATFORM_ID,
  displayName: "Netflix",
  hosts: ["netflix.com", "www.netflix.com", "*.netflix.com"],

  matchesLocation(location) {
    return location.hostname.includes("netflix.com");
  },

  getCards() {
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>(WATCH_LINK_SELECTOR));
    const roots = new Set<HTMLElement>();

    for (const anchor of anchors) {
      const root = findCardRoot(anchor);
      const rect = root.getBoundingClientRect();
      const alreadyManaged = root.matches(MANAGED_CARD_SELECTOR);

      if (!alreadyManaged && (rect.width < 80 || rect.height < 50)) continue;
      roots.add(root);
    }

    return Array.from(roots);
  },

  getItem(card) {
    const link = findPrimaryLink(card);
    const videoId = findVideoId(card, link);
    const title = findTitle(card, link);
    const url = normalizeUrl(link?.getAttribute("href") || "");
    const stableValue = videoId ? `video:${videoId}` : url || `title:${title.toLowerCase()}`;

    if (!stableValue) return null;

    const markerHost = findBoxartHost(card, link);
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
  },

  getAutoState(item: ContentItem, settings: ExtensionSettings): AutoDetectionResult {
    const text = getNodeText(item.element).slice(0, 3000);
    const progress = findMaxProgress(item.element);
    const reasons: string[] = [];
    let state: AutoDetectionResult["state"] = "unwatched";

    if (progress !== null) {
      reasons.push(t("reasonProgress", settings.language, { progress: Math.round(progress) }));

      if (progress >= settings.completedThreshold) {
        state = "watched";
      } else if (progress > 0) {
        state = "in-progress";
      }
    }

    if (state === "unwatched" && IN_PROGRESS_PATTERNS.some((pattern) => pattern.test(text))) {
      state = "in-progress";
      reasons.push(t("reasonPartialText", settings.language));
    }

    return { state, progress, reasons };
  }
};
