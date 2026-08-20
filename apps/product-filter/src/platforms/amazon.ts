import type { ProductCandidate, ProductPlatformAdapter } from "../shared/types";

const PRODUCT_CARD_SELECTOR =
  '[data-testid="product-card"][data-asin], [data-component-type="s-search-result"][data-asin]';
const GRID_ITEM_CLASS_FRAGMENT = "GridItem-module__container";

export const amazonAdapter: ProductPlatformAdapter = {
  id: "amazon",
  label: "Amazon",
  matches(url) {
    return (
      url.hostname === "amazon.com" ||
      url.hostname.endsWith(".amazon.com") ||
      url.hostname === "amazon.com.br" ||
      url.hostname.endsWith(".amazon.com.br")
    );
  },
  collectCandidates
};

export function collectCandidates(): ProductCandidate[] {
  return Array.from(document.querySelectorAll<HTMLElement>(PRODUCT_CARD_SELECTOR))
    .map(createCandidate)
    .filter((candidate): candidate is ProductCandidate => candidate !== null);
}

function createCandidate(card: HTMLElement): ProductCandidate | null {
  const link = getProductLink(card);
  const href = link ? resolveProductUrl(link.getAttribute("href") || "") : undefined;
  const productId = card.dataset.asin || getAsinFromUrl(href || "") || getAsinFromAncestor(card);
  const title = getCardTitle(card);

  if (!productId || !title) return null;

  return {
    productId,
    title,
    url: href,
    element: getCandidateRoot(card, productId),
    visualHost: card
  };
}

function getProductLink(card: HTMLElement): HTMLAnchorElement | null {
  return (
    card.querySelector<HTMLAnchorElement>('a[data-testid="product-card-link"][href]') ||
    card.querySelector<HTMLElement>("h2")?.closest<HTMLAnchorElement>("a[href]") ||
    card.querySelector<HTMLAnchorElement>('a[href*="/dp/"], a[href*="%2Fdp%2F"]')
  );
}

function resolveProductUrl(href: string): string | undefined {
  if (!href) return undefined;

  const url = new URL(href, window.location.href);
  const sponsoredTarget = url.pathname === "/sspa/click" ? url.searchParams.get("url") : null;

  return sponsoredTarget ? new URL(sponsoredTarget, url.origin).href : url.href;
}

function getCandidateRoot(card: HTMLElement, asin: string): HTMLElement {
  return (
    findAncestor(card, (element) => element.dataset.testid === asin && element.hasAttribute("data-test-index")) ||
    findAncestor(card, (element) => element.hasAttribute("data-test-index")) ||
    findAncestor(card, (element) => element.getAttribute("data-component-type") === "s-search-result") ||
    findAncestor(card, (element) => element.className.includes(GRID_ITEM_CLASS_FRAGMENT)) ||
    card
  );
}

function findAncestor(card: HTMLElement, predicate: (element: HTMLElement) => boolean): HTMLElement | null {
  let element = card.parentElement;

  while (element) {
    if (predicate(element)) return element;
    element = element.parentElement;
  }

  return null;
}

function getAsinFromAncestor(card: HTMLElement): string {
  const ancestor = card.closest<HTMLElement>("[data-testid]");
  const value = ancestor?.getAttribute("data-testid") || "";
  return /^[A-Z0-9]{10}$/i.test(value) ? value.toUpperCase() : "";
}

export function getAsinFromUrl(url: string): string {
  const match = /\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?#]|$)/i.exec(url);
  return match?.[1]?.toUpperCase() || "";
}

function getCardTitle(card: HTMLElement): string {
  const title =
    getText(card.querySelector<HTMLElement>(".a-truncate-full.a-offscreen")) ||
    getText(card.querySelector<HTMLElement>('[id^="title-"]')) ||
    card.querySelector<HTMLElement>("h2[aria-label]")?.getAttribute("aria-label") ||
    getText(card.querySelector<HTMLElement>("h2")) ||
    getText(card.querySelector<HTMLElement>("[aria-label]")) ||
    card.querySelector<HTMLImageElement>("img[alt]")?.alt ||
    "";

  return title.trim();
}

function getText(element: HTMLElement | null): string {
  return element?.textContent?.trim() || "";
}
