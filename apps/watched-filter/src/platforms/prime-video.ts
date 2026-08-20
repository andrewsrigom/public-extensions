import { MANAGED_CARD_SELECTOR } from "../core/renderer";
import { t } from "../shared/i18n";
import type {
  AutoDetectionResult,
  ContentItem,
  ExtensionSettings,
  PlatformAdapter,
  SectionHideReason
} from "../shared/types";
import { buildItemKey, normalizeText, normalizeUrl } from "../shared/url";

const PLATFORM_ID = "prime-video";

const WATCHED_PATTERNS = [
  /\bwatched\b/i,
  /\bwatch again\b/i,
  /\bstart over\b/i,
  /\bplay from beginning\b/i,
  /\bassistid[oa]s?\b/i,
  /\bassistir novamente\b/i,
  /\breproduzir novamente\b/i,
  /\bcomeçar do início\b/i,
  /\brecomeçar\b/i,
  /\bvisto[s]?\b/i,
  /\bvista[s]?\b/i,
  /\bver de nuevo\b/i,
  /\bvolver a ver\b/i,
  /\breproducir de nuevo\b/i,
  /\bempezar desde el principio\b/i,
  /\breiniciar\b/i
];

const IN_PROGRESS_PATTERNS = [
  /\bcontinue watching\b/i,
  /\bresume\b/i,
  /\bkeep watching\b/i,
  /\bcontinuar assistindo\b/i,
  /\bretomar\b/i,
  /\bcontinue de onde parou\b/i,
  /\bcontinuar viendo\b/i,
  /\breanudar\b/i,
  /\bseguir viendo\b/i,
  /\bcontinua donde lo dejaste\b/i,
  /\bcontinuar donde lo dejaste\b/i
];

const PROGRESS_CONTEXT_PATTERN =
  /progress|progressbar|watched|watch|resume|continue|progresso|assistid|assistindo|retomar|playback|progreso|visto|viendo|reanudar|reproducci[oó]n/i;
const CARD_SELECTOR = "[data-testid='card']";
const CAROUSEL_SELECTOR = "[data-testid='navigation-carousel-wrapper']";
const EVENT_VALUE = "event";
const PACKSHOT_SELECTOR = "[data-testid='packshot']";
const SUPER_CAROUSEL_CARD_SELECTOR = "[data-testid='super-carousel-card']";
const BUY_RENT_TITLE_PATTERN = /\b(comprar|alugar|buy|rent)\b/i;
const PRIME_CHANNEL_ASSET_PATTERN = /\/digital\/video\/merch\/subs\/benefit-id\/[^/]+\/Prime\/logos\//i;
const SUBSCRIPTION_CHANNEL_ASSET_PATTERN = /\/digital\/video\/merch\/subs\/benefit-id\//i;
const UNENTITLED_VALUE = "unentitled";
const VIRTUALIZED_PLACEHOLDER_SELECTOR = "li[data-hidden='true'][data-hwc-managed='true']";

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

  const styleWidth = getPercentFromText(node.getAttribute("style"));
  if (styleWidth !== null) return styleWidth;

  return null;
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
      "[style*='%']"
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

function findPrimaryLink(root: HTMLElement): HTMLAnchorElement | null {
  if (root.matches("a[href*='/detail/'], a[href*='/tournament/']")) return root as HTMLAnchorElement;
  return root.querySelector<HTMLAnchorElement>(
    "a[href*='/detail/'][aria-label], a[href*='/detail/'], a[href*='/tournament/'][aria-label], a[href*='/tournament/']"
  );
}

function findTitle(root: HTMLElement): string {
  const titleLink = findPrimaryLink(root);
  const heading = root.querySelector("h1, h2, h3, [role='heading']");
  const image = root.querySelector("img[alt]");

  return normalizeText(
    titleLink?.getAttribute("aria-label") ||
      titleLink?.textContent ||
      heading?.textContent ||
      image?.getAttribute("alt") ||
      ""
  );
}

function findCardRootFromAnchor(anchor: HTMLAnchorElement): HTMLElement {
  const article = anchor.closest<HTMLElement>("article");
  const listItem = anchor.closest<HTMLElement>("li, [role='listitem']");
  const cardLike = anchor.closest<HTMLElement>("[data-testid*='card'], [class*='card'], [class*='Card']");
  const candidates = [listItem, article, cardLike, anchor.parentElement].filter(Boolean) as HTMLElement[];

  return candidates.find((candidate) => candidate.tagName !== "A" && !candidate.closest("a[href]")) || anchor;
}

function getNodeText(node: HTMLElement): string {
  return normalizeText(node.innerText || node.textContent || "");
}

function findLargestImage(root: HTMLElement): HTMLElement | null {
  const images = Array.from(root.querySelectorAll<HTMLElement>("img"));
  let bestImage: HTMLElement | null = null;
  let bestArea = 0;

  for (const image of images) {
    const rect = image.getBoundingClientRect();
    const area = rect.width * rect.height;

    if (area > bestArea) {
      bestImage = image;
      bestArea = area;
    }
  }

  return bestImage;
}

function coversImage(host: HTMLElement, imageRect: DOMRect): boolean {
  const hostRect = host.getBoundingClientRect();
  return hostRect.width >= imageRect.width * 0.85 && hostRect.height >= imageRect.height * 0.85;
}

function findVisualHost(root: HTMLElement, visualElement: HTMLElement): HTMLElement {
  const imageRect = visualElement.getBoundingClientRect();
  let current = visualElement.parentElement;

  while (current && current !== root.parentElement) {
    if (current.tagName !== "PICTURE" && coversImage(current, imageRect)) {
      return current;
    }

    current = current.parentElement;
  }

  return root;
}

function findPackshotHost(root: HTMLElement, link: HTMLAnchorElement | null): HTMLElement | null {
  const linkPackshot = link?.closest<HTMLElement>(PACKSHOT_SELECTOR);

  if (linkPackshot && root.contains(linkPackshot)) {
    return linkPackshot;
  }

  const superCarouselCard = link?.closest<HTMLElement>(SUPER_CAROUSEL_CARD_SELECTOR);

  if (superCarouselCard && root.contains(superCarouselCard)) {
    return superCarouselCard;
  }

  return root.matches(PACKSHOT_SELECTOR) ? root : root.querySelector<HTMLElement>(PACKSHOT_SELECTOR);
}

function findPrimeCardMetadata(root: HTMLElement): HTMLElement[] {
  const matches = root.matches(CARD_SELECTOR) ? [root] : [];
  return [...matches, ...Array.from(root.querySelectorAll<HTMLElement>(CARD_SELECTOR))];
}

function findPrimaryCardMetadata(root: HTMLElement): HTMLElement | null {
  return findPrimeCardMetadata(root)[0] || null;
}

function getCardEntitlement(root: HTMLElement): string {
  return findPrimaryCardMetadata(root)?.getAttribute("data-card-entitlement")?.toLowerCase() || "";
}

function getCardEntityType(root: HTMLElement): string {
  return findPrimaryCardMetadata(root)?.getAttribute("data-card-entity-type")?.toLowerCase() || "";
}

function isLiveEvent(root: HTMLElement): boolean {
  return getCardEntityType(root) === EVENT_VALUE;
}

function requiresAdditionalSubscription(root: HTMLElement): boolean {
  return findPrimeCardMetadata(root).some(
    (metadata) => metadata.getAttribute("data-card-entitlement")?.toLowerCase() === UNENTITLED_VALUE
  );
}

function getMediaAssetText(root: HTMLElement): string {
  const mediaNodes = root.querySelectorAll<HTMLImageElement | HTMLSourceElement>("img[src], source[srcset]");

  return Array.from(mediaNodes)
    .map((node) => node.getAttribute("src") || node.getAttribute("srcset") || "")
    .join(" ");
}

function hasPaidChannelAsset(root: HTMLElement): boolean {
  const assetText = getMediaAssetText(root);
  return SUBSCRIPTION_CHANNEL_ASSET_PATTERN.test(assetText) && !PRIME_CHANNEL_ASSET_PATTERN.test(assetText);
}

function requiresChannelSubscription(root: HTMLElement): boolean {
  return !getCardEntitlement(root) && hasPaidChannelAsset(root);
}

function findCarouselRoot(root: HTMLElement): HTMLElement | null {
  return root.closest<HTMLElement>(CAROUSEL_SELECTOR);
}

function getCarouselTitle(root: HTMLElement): string {
  return normalizeText(root.querySelector<HTMLElement>("[data-testid='carousel-title']")?.textContent || "");
}

function isPaidStoreCarousel(root: HTMLElement): boolean {
  return BUY_RENT_TITLE_PATTERN.test(getCarouselTitle(root));
}

function isEventCarousel(root: HTMLElement): boolean {
  return Boolean(
    root.querySelector(
      `${CARD_SELECTOR}[data-card-entity-type='EVENT'], ${CARD_SELECTOR}[data-card-entity-type='event'], a[href^='/tournament/']`
    )
  );
}

function getSectionHideReason(root: HTMLElement, isEvent: boolean): SectionHideReason | undefined {
  const carousel = findCarouselRoot(root);
  if (!carousel) return undefined;
  if (isPaidStoreCarousel(carousel)) return "paid-content";
  if (isEvent && isEventCarousel(carousel)) return "live-event";
  return undefined;
}

function findVisualSurface(
  root: HTMLElement,
  surfaceRoot: HTMLElement = root
): { visualElement: HTMLElement; visualHost: HTMLElement } {
  const visualElement = findLargestImage(surfaceRoot) || surfaceRoot;
  return {
    visualElement,
    visualHost: findVisualHost(root, visualElement)
  };
}

function cleanupVirtualizedPlaceholders(): void {
  for (const placeholder of document.querySelectorAll<HTMLElement>(VIRTUALIZED_PLACEHOLDER_SELECTOR)) {
    if (placeholder.querySelector("a[href*='/detail/']")) continue;

    placeholder.querySelectorAll(".hwc-watch-marker, .hwc-card-overlay-layer").forEach((element) => element.remove());
    placeholder.classList.remove(
      "hwc-card-instrumented",
      "hwc-card-surface",
      "hwc-card-marker-host",
      "hwc-card-hidden",
      "hwc-card-dimmed",
      "hwc-debug-card"
    );
    placeholder.removeAttribute("data-hwc-managed");
    placeholder.removeAttribute("data-hwc-reason");
  }
}

export const primeVideoAdapter: PlatformAdapter = {
  id: PLATFORM_ID,
  displayName: "Prime Video",
  hosts: ["primevideo.com", "www.primevideo.com", "*.primevideo.com"],

  matchesLocation(location) {
    return location.hostname.includes("primevideo.com");
  },

  getCards() {
    cleanupVirtualizedPlaceholders();

    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href*='/detail/']"));
    const roots = new Set<HTMLElement>();

    for (const anchor of anchors) {
      const root = findCardRootFromAnchor(anchor);
      const rect = root.getBoundingClientRect();
      const alreadyManaged = root.matches(MANAGED_CARD_SELECTOR);

      if (!alreadyManaged && (rect.width < 120 || rect.height < 80)) continue;
      roots.add(root);
    }

    return Array.from(roots);
  },

  getItem(card) {
    const link = findPrimaryLink(card);
    const url = normalizeUrl(link?.getAttribute("href") || "");
    const title = findTitle(card);
    const stableValue = url || `title:${title.toLowerCase()}`;

    if (!stableValue) return null;

    const markerHost = findPackshotHost(card, link);
    const visualSurface = findVisualSurface(card, markerHost || card);
    const carousel = findCarouselRoot(card);
    const liveEvent = isLiveEvent(card);
    const sectionHideReason = getSectionHideReason(card, liveEvent);

    return {
      key: buildItemKey(PLATFORM_ID, stableValue),
      platform: PLATFORM_ID,
      title,
      url,
      element: card,
      ...visualSurface,
      markerHost: markerHost || undefined,
      markerPlacement: markerHost ? "host-bottom-left" : "cover-top-left",
      isLiveEvent: liveEvent,
      requiresAdditionalSubscription: requiresAdditionalSubscription(card),
      requiresChannelSubscription: requiresChannelSubscription(card),
      ...(sectionHideReason && carousel
        ? {
            sectionElement: carousel,
            sectionHideReason
          }
        : {})
    };
  },

  getAutoState(item: ContentItem, settings: ExtensionSettings): AutoDetectionResult {
    const text = getNodeText(item.element).slice(0, 3000);
    const progress = findMaxProgress(item.element);
    const reasons: string[] = [];
    let state: AutoDetectionResult["state"] = "unwatched";

    if (WATCHED_PATTERNS.some((pattern) => pattern.test(text))) {
      state = "watched";
      reasons.push(t("reasonWatchedText", settings.language));
    }

    if (progress !== null) {
      reasons.push(t("reasonProgress", settings.language, { progress: Math.round(progress) }));

      if (progress >= settings.completedThreshold) {
        state = "watched";
      } else if (state !== "watched" && progress > 0) {
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
