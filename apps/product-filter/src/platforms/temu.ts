import type { ProductCandidate, ProductPlatformAdapter } from "../shared/types";

const CARD_SELECTOR = '[role="group"][aria-label]';
const PRODUCT_LINK_SELECTOR = 'a[href*="-g-"][href$=".html"], a[href*="-g-"][href]';
const TOOLTIP_PRODUCT_ID_PATTERN = /(?:goodContainer|goodsImage|QuickLook)-(\d+)/i;
const MAX_SINGLE_CHILD_WRAPPER_DEPTH = 2;

export const temuAdapter: ProductPlatformAdapter = {
  id: "temu",
  label: "Temu",
  matches(url) {
    return url.hostname === "temu.com" || url.hostname.endsWith(".temu.com");
  },
  collectCandidates
};

export function collectCandidates(): ProductCandidate[] {
  return Array.from(document.querySelectorAll<HTMLElement>(CARD_SELECTOR))
    .map(createCandidate)
    .filter((candidate): candidate is ProductCandidate => candidate !== null);
}

function createCandidate(card: HTMLElement): ProductCandidate | null {
  const link = card.querySelector<HTMLAnchorElement>(PRODUCT_LINK_SELECTOR);
  const href = link ? new URL(link.getAttribute("href") || "", window.location.href).href : undefined;
  const productId = href
    ? getTemuProductIdFromUrl(href) || getProductIdFromTooltip(card)
    : getProductIdFromTooltip(card);
  const title = getCardTitle(card, link);

  if (!title) return null;

  return {
    productId,
    title,
    url: href,
    element: getCandidateRoot(card),
    visualHost: card
  };
}

function getCandidateRoot(card: HTMLElement): HTMLElement {
  let root: HTMLElement = card;
  let current = card.parentElement;
  let depth = 0;

  while (current && current !== document.body && depth < MAX_SINGLE_CHILD_WRAPPER_DEPTH) {
    if (current.childElementCount !== 1) break;

    root = current;
    current = current.parentElement;
    depth += 1;
  }

  return root;
}

export function getTemuProductIdFromUrl(url: string): string {
  const parsed = new URL(url, window.location.href);
  const pathMatch = /-g-(\d+)\.html/i.exec(parsed.pathname);
  const queryValue =
    parsed.searchParams.get("goods_id") ||
    parsed.searchParams.get("_x_goods_id") ||
    parsed.searchParams.get("goodsId") ||
    "";

  return pathMatch?.[1] || queryValue;
}

function getProductIdFromTooltip(card: HTMLElement): string {
  const tooltipHost = card.querySelector<HTMLElement>("[data-tooltip]");
  const tooltip = tooltipHost?.dataset.tooltip || "";
  const match = TOOLTIP_PRODUCT_ID_PATTERN.exec(tooltip);

  return match?.[1] || "";
}

function getCardTitle(card: HTMLElement, link: HTMLAnchorElement | null): string {
  const title =
    card.getAttribute("aria-label") ||
    card.querySelector<HTMLElement>("[data-tooltip-title]")?.dataset.tooltipTitle ||
    link?.textContent ||
    card.querySelector<HTMLImageElement>("img[alt]")?.alt ||
    "";

  return cleanTitle(title);
}

function cleanTitle(title: string): string {
  return title.replace(/\s*Abrir em uma nova aba\.?\s*$/i, "").trim();
}
