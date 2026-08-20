import type { ProductCandidate, ProductPlatformAdapter } from "../shared/types";

const CARD_SELECTOR = ".poly-card";
const TITLE_LINK_SELECTOR = "a.poly-component__title[href]";

export const mercadoLivreAdapter: ProductPlatformAdapter = {
  id: "mercado-livre",
  label: "Mercado Livre",
  matches(url) {
    return url.hostname === "mercadolivre.com.br" || url.hostname.endsWith(".mercadolivre.com.br");
  },
  collectCandidates
};

export function collectCandidates(): ProductCandidate[] {
  return Array.from(document.querySelectorAll<HTMLElement>(CARD_SELECTOR))
    .map(createCandidate)
    .filter((candidate): candidate is ProductCandidate => candidate !== null);
}

function createCandidate(card: HTMLElement): ProductCandidate | null {
  const link = card.querySelector<HTMLAnchorElement>(TITLE_LINK_SELECTOR);
  const href = link ? new URL(link.getAttribute("href") || "", window.location.href).href : undefined;
  const productId = href ? getMercadoLivreProductIdFromUrl(href) : "";
  const title = getCardTitle(card, link);

  if (!title) return null;

  return {
    productId,
    title,
    url: href,
    element: card,
    visualHost: card
  };
}

export function getMercadoLivreProductIdFromUrl(url: string): string {
  const parsed = new URL(url, window.location.href);
  const productPathMatch = /\/p\/(MLB\d+)/i.exec(parsed.pathname);
  const searchWid = parsed.searchParams.get("wid");
  const pathMatch = /\/(MLB\d+)/i.exec(parsed.pathname);

  return (productPathMatch?.[1] || searchWid || pathMatch?.[1] || "").toUpperCase();
}

function getCardTitle(card: HTMLElement, link: HTMLAnchorElement | null): string {
  const title =
    getText(link) ||
    card.querySelector<HTMLImageElement>('img[data-testid="picture"][alt]')?.alt ||
    card.querySelector<HTMLImageElement>("img[alt]")?.alt ||
    "";

  return title.trim();
}

function getText(element: HTMLElement | null): string {
  return element?.textContent?.trim() || "";
}
