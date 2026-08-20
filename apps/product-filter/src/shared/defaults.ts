import type { ProductFilterSettings, RuntimeStats } from "./types";

export const SETTINGS_STORAGE_KEY = "hideUnwantedProductsSettings";
export const RULES_STORAGE_KEY = "hideUnwantedProductsRules:v1";

export const SETTINGS_DEFAULTS: ProductFilterSettings = {
  enabled: true,
  mode: "hide",
  language: "auto",
  blockedTerms: [],
  blockedTermsByPlatform: {},
  blockedProductIds: []
};

export const EMPTY_STATS: RuntimeStats = {
  candidates: 0,
  hidden: 0,
  lastScanAt: null
};
