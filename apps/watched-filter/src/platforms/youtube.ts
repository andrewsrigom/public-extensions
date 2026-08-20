import { MANAGED_CARD_SELECTOR } from "../core/renderer";
import { t } from "../shared/i18n";
import type { AutoDetectionResult, ContentItem, ExtensionSettings, PlatformAdapter } from "../shared/types";
import { buildItemKey, normalizeText, normalizeUrl } from "../shared/url";

const PLATFORM_ID = "youtube";

const WATCH_LINK_SELECTOR = "a[href*='/watch?v='], a[href*='youtu.be/']";
const WATCH_PAGE_MARKER_HOST_CLASS = "hwc-youtube-watch-page-marker-host";
const CARD_ROOT_SELECTOR = [
  "ytd-rich-item-renderer",
  "ytd-video-renderer",
  "ytd-grid-video-renderer",
  "yt-lockup-view-model",
  "ytd-compact-video-renderer"
].join(",");
const THUMBNAIL_HOST_SELECTOR = [
  "a.ytLockupViewModelContentImage",
  "a#thumbnail",
  "yt-thumbnail-view-model",
  "ytd-thumbnail"
].join(",");
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

function isYouTubeHost(hostname: string): boolean {
  return (
    hostname === "youtube.com" ||
    hostname.endsWith(".youtube.com") ||
    hostname === "youtu.be" ||
    hostname.endsWith(".youtu.be")
  );
}

function findPrimaryLink(root: HTMLElement): HTMLAnchorElement | null {
  if (root.matches(WATCH_LINK_SELECTOR)) return root as HTMLAnchorElement;

  const titleLink = root.querySelector<HTMLAnchorElement>("a[aria-label][href*='/watch?v=']");
  return titleLink || root.querySelector<HTMLAnchorElement>(WATCH_LINK_SELECTOR);
}

function findCardRoot(anchor: HTMLAnchorElement): HTMLElement {
  const card = anchor.closest<HTMLElement>(CARD_ROOT_SELECTOR);
  return card && card.tagName !== "A" ? card : anchor;
}

function findVideoId(link: HTMLAnchorElement | null): string {
  const href = link?.getAttribute("href") || "";

  try {
    const url = new URL(href, "https://www.youtube.com");
    const videoId = url.searchParams.get("v");
    if (videoId) return videoId;

    const shortMatch = url.pathname.match(/^\/([A-Za-z0-9_-]{6,})$/);
    return shortMatch?.[1] || "";
  } catch {
    return "";
  }
}

function findCurrentWatchVideoId(): string {
  try {
    const url = new URL(window.location.href);

    if (url.pathname === "/watch") {
      return url.searchParams.get("v") || "";
    }

    if (url.hostname === "youtu.be" || url.hostname.endsWith(".youtu.be")) {
      return url.pathname.replace("/", "");
    }
  } catch {
    return "";
  }

  return "";
}

function findWatchPageRoot(): HTMLElement | null {
  if (!findCurrentWatchVideoId()) return null;

  return (
    document.querySelector<HTMLElement>("ytd-watch-metadata") ||
    document.querySelector<HTMLElement>("#above-the-fold.ytd-watch-metadata, #above-the-fold")
  );
}

function isWatchPageRoot(card: HTMLElement): boolean {
  return Boolean(findCurrentWatchVideoId()) && card.matches("ytd-watch-metadata, #above-the-fold");
}

function findTitle(root: HTMLElement, link: HTMLAnchorElement | null): string {
  const heading = root.querySelector<HTMLElement>("h3[title], h3");
  const titleLink = root.querySelector<HTMLElement>("a[aria-label][href*='/watch?v=']");
  const text = root.querySelector<HTMLElement>(".ytLockupMetadataViewModelTitle span, #video-title");

  return normalizeText(
    heading?.getAttribute("title") ||
      text?.textContent ||
      titleLink?.getAttribute("aria-label") ||
      link?.getAttribute("aria-label") ||
      root.getAttribute("aria-label") ||
      ""
  ).replace(/\s+\d+\s+(?:hora|horas|hour|hours|minuto|minutos|minute|minutes).*$/i, "");
}

function findWatchPageTitle(root: HTMLElement): string {
  const title = root.querySelector<HTMLElement>(
    "#title h1 yt-formatted-string, h1 yt-formatted-string[title], h1 yt-formatted-string, h1"
  );

  return (
    normalizeText(title?.getAttribute("title") || title?.textContent || document.title).replace(
      /\s+-\s+YouTube$/i,
      ""
    ) || "YouTube video"
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

  const reference = root.querySelector<HTMLElement>(".wmButton.wmButtonYtPageFix");
  if (reference?.parentElement) {
    reference.insertAdjacentElement("afterend", markerHost);
    return markerHost;
  }

  const topRow = root.querySelector<HTMLElement>("#top-row") || root;
  const subscribeButton = topRow.querySelector<HTMLElement>("#subscribe-button");

  if (subscribeButton) {
    subscribeButton.insertAdjacentElement("afterend", markerHost);
  } else {
    topRow.appendChild(markerHost);
  }

  return markerHost;
}

function findThumbnailHost(root: HTMLElement, link: HTMLAnchorElement | null): HTMLElement | null {
  const linkThumbnail =
    link?.closest<HTMLElement>(THUMBNAIL_HOST_SELECTOR) || link?.querySelector<HTMLElement>(THUMBNAIL_HOST_SELECTOR);

  if (linkThumbnail && root.contains(linkThumbnail)) {
    return linkThumbnail;
  }

  return root.matches(THUMBNAIL_HOST_SELECTOR) ? root : root.querySelector<HTMLElement>(THUMBNAIL_HOST_SELECTOR);
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

  const style = node.getAttribute("style") || "";
  const widthMatch = style.match(/width:\s*(\d{1,3}(?:[.,]\d+)?)%/i);
  if (widthMatch?.[1]) {
    const width = Number(widthMatch[1].replace(",", "."));
    if (Number.isFinite(width)) return Math.max(0, Math.min(100, width));
  }

  return getPercentFromText(style);
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
      "ytd-thumbnail-overlay-resume-playback-renderer",
      ".ytd-thumbnail-overlay-resume-playback-renderer",
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
      node.tagName.toLowerCase().includes("resume-playback") ||
      PROGRESS_CONTEXT_PATTERN.test(context);

    if (progress === null) continue;
    if (!hasStrongProgressSignal) continue;

    maxProgress = maxProgress === null ? progress : Math.max(maxProgress, progress);
  }

  return maxProgress;
}

export const youtubeAdapter: PlatformAdapter = {
  id: PLATFORM_ID,
  displayName: "YouTube",
  hosts: ["youtube.com", "www.youtube.com", "*.youtube.com", "youtu.be"],

  matchesLocation(location) {
    return isYouTubeHost(location.hostname);
  },

  getCards() {
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>(WATCH_LINK_SELECTOR));
    const roots = new Set<HTMLElement>();
    const watchPageRoot = findWatchPageRoot();

    if (watchPageRoot) {
      roots.add(watchPageRoot);
    }

    for (const anchor of anchors) {
      const root = findCardRoot(anchor);
      const rect = root.getBoundingClientRect();
      const alreadyManaged = root.matches(MANAGED_CARD_SELECTOR);

      if (!alreadyManaged && (rect.width < 100 || rect.height < 70)) continue;
      roots.add(root);
    }

    return Array.from(roots);
  },

  getItem(card) {
    if (isWatchPageRoot(card)) {
      const videoId = findCurrentWatchVideoId();
      const markerHost = ensureWatchPageMarkerHost(card);

      if (!videoId) return null;

      return {
        element: card,
        key: buildItemKey(PLATFORM_ID, `video:${videoId}`),
        markerHost,
        markerPlacement: "page-action",
        platform: PLATFORM_ID,
        title: findWatchPageTitle(card),
        url: `https://www.youtube.com/watch?v=${videoId}`,
        visualElement: markerHost,
        visualHost: markerHost
      };
    }

    const link = findPrimaryLink(card);
    const videoId = findVideoId(link);
    const title = findTitle(card, link);
    const url = normalizeUrl(link?.getAttribute("href") || "");
    const stableValue = videoId ? `video:${videoId}` : url || `title:${title.toLowerCase()}`;

    if (!stableValue) return null;

    const visualHost = findThumbnailHost(card, link);
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
