import type { ProductCandidate, ProductPlatformAdapter } from "../shared/types";

const PRODUCT_CONTAINER_SELECTOR = ".productContainer[id]";
const ITEM_LINK_SELECTOR = 'a[href*="/item/"][href*=".html"], a[href*="/i/"][href*=".html"]';
const FALLBACK_TITLE_SELECTOR = ".AIC-ATM-multiLine";

export const aliexpressAdapter: ProductPlatformAdapter = {
  id: "aliexpress",
  label: "AliExpress",
  matches(url) {
    return url.hostname === "aliexpress.com" || url.hostname.endsWith(".aliexpress.com");
  },
  collectCandidates
};

export function collectCandidates(): ProductCandidate[] {
  return dedupeCandidates([
    ...Array.from(document.querySelectorAll<HTMLElement>(PRODUCT_CONTAINER_SELECTOR))
      .map(createProductContainerCandidate)
      .filter((candidate): candidate is ProductCandidate => candidate !== null),
    ...Array.from(document.querySelectorAll<HTMLAnchorElement>(ITEM_LINK_SELECTOR))
      .map(createItemLinkCandidate)
      .filter((candidate): candidate is ProductCandidate => candidate !== null)
  ]);
}

function createProductContainerCandidate(card: HTMLElement): ProductCandidate | null {
  const href = getCardUrl(card);
  const productId = getProductId(card, href);
  const title = getCardTitle(card);

  if (!title) return null;

  return {
    productId,
    title,
    url: href,
    element: getCandidateRoot(card),
    visualHost: card
  };
}

function createItemLinkCandidate(link: HTMLAnchorElement): ProductCandidate | null {
  const href = new URL(link.getAttribute("href") || "", window.location.href).href;
  const productId = getAliExpressProductIdFromUrl(href);
  const visualHost = link.closest<HTMLElement>(".card-out-wrapper") || link;
  const title = getItemLinkTitle(link);

  if (!productId || !title) return null;

  return {
    productId,
    title,
    url: href,
    element: getItemLinkCandidateRoot(visualHost),
    visualHost
  };
}

function dedupeCandidates(candidates: ProductCandidate[]): ProductCandidate[] {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const key = candidate.productId || candidate.url || candidate.title;
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function getCandidateRoot(card: HTMLElement): HTMLElement {
  const parent = card.parentElement;
  return parent?.hasAttribute("data-spm") ? parent : card;
}

function getItemLinkCandidateRoot(visualHost: HTMLElement): HTMLElement {
  return (
    findAncestor(visualHost, (element) => Boolean(element.style.flexBasis && element.style.maxWidth)) || visualHost
  );
}

function findAncestor(element: HTMLElement, predicate: (element: HTMLElement) => boolean): HTMLElement | null {
  let current = element.parentElement;

  while (current && current !== document.body) {
    if (predicate(current)) return current;
    current = current.parentElement;
  }

  return null;
}

function getCardUrl(card: HTMLElement): string | undefined {
  const rawHref =
    card.querySelector<HTMLAnchorElement>('a[href*="/item/"], a[href*="/i/"], a[href]')?.getAttribute("href") ||
    card.getAttribute("href") ||
    "";

  if (!rawHref) return undefined;

  return new URL(rawHref, window.location.href).href;
}

function getProductId(card: HTMLElement, href?: string): string {
  if (/^\d+$/.test(card.id)) return card.id;
  return href ? getAliExpressProductIdFromUrl(href) : "";
}

export function getAliExpressProductIdFromUrl(url: string): string {
  const match = /\/(?:item|i)\/(\d+)\.html/i.exec(url) || /\/(\d+)\.html/i.exec(url);
  return match?.[1] || "";
}

function getCardTitle(card: HTMLElement): string {
  const title =
    card.querySelector<HTMLElement>(".AIC-MI-container[aria-label]")?.getAttribute("aria-label") ||
    getBestFallbackTitle(card) ||
    card.querySelector<HTMLImageElement>("img[alt]")?.alt ||
    "";

  return title.trim();
}

function getItemLinkTitle(link: HTMLAnchorElement): string {
  const title =
    link.querySelector<HTMLElement>('[role="heading"][aria-label]')?.getAttribute("aria-label") ||
    link.querySelector<HTMLElement>("[title]")?.getAttribute("title") ||
    link.querySelector<HTMLImageElement>("img.product-img[alt]")?.alt ||
    link.querySelector<HTMLImageElement>("img[alt]")?.alt ||
    "";

  return title.trim();
}

function getBestFallbackTitle(card: HTMLElement): string {
  const titles = Array.from(card.querySelectorAll<HTMLElement>(FALLBACK_TITLE_SELECTOR))
    .map((element) => element.textContent?.trim() || "")
    .filter((text) => text.length > 12 && !isMetadataText(text));

  return titles.sort((left, right) => right.length - left.length)[0] || "";
}

function isMetadataText(text: string): boolean {
  return /^(?:R\$|US \$)|frete|vendido|sold|reviews?|avalia/i.test(text);
}
