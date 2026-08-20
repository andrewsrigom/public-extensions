import { t } from "../shared/i18n";
import type { ProductCandidate, ProductFilterSettings, ProductMatch } from "../shared/types";

export function matchProduct(
  candidate: Pick<ProductCandidate, "productId" | "title">,
  settings: ProductFilterSettings,
  platformId?: string
): ProductMatch {
  if (!settings.enabled) {
    return {
      blocked: false,
      reasons: []
    };
  }

  const reasons = [
    ...matchProductId(candidate.productId, settings),
    ...matchTerms(candidate.title, settings.blockedTerms, "reasonTerm", settings),
    ...matchTerms(candidate.title, getPlatformTerms(settings, platformId), "reasonPlatformTerm", settings)
  ];

  return {
    blocked: reasons.length > 0,
    reasons
  };
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchProductId(productId: string, settings: ProductFilterSettings): string[] {
  if (!productId) return [];

  const normalizedProductId = productId.toUpperCase();
  return settings.blockedProductIds
    .filter((blockedProductId) => blockedProductId.toUpperCase() === normalizedProductId)
    .map((blockedProductId) => t("reasonId", settings.language, { id: blockedProductId.toUpperCase() }));
}

function getPlatformTerms(settings: ProductFilterSettings, platformId?: string): string[] {
  if (!platformId) return [];
  return settings.blockedTermsByPlatform[platformId] || [];
}

function matchTerms(
  title: string,
  blockedTerms: string[],
  label: "reasonTerm" | "reasonPlatformTerm",
  settings: ProductFilterSettings
): string[] {
  const normalizedTitle = normalizeSearchText(title);

  return blockedTerms
    .filter((term) => normalizedTitle.includes(normalizeSearchText(term)))
    .map((term) => t(label, settings.language, { term }));
}
