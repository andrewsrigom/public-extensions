import { browser } from "wxt/browser";
import { RULES_STORAGE_KEY, SETTINGS_DEFAULTS, SETTINGS_STORAGE_KEY } from "../shared/defaults";
import type { ProductFilterSettings } from "../shared/types";

type LegacyProductFilterSettings = Partial<ProductFilterSettings> & {
  blockedAsins?: unknown;
};

type StoredPreferences = Pick<ProductFilterSettings, "enabled" | "language" | "mode">;
type StoredRules = Pick<ProductFilterSettings, "blockedProductIds" | "blockedTerms" | "blockedTermsByPlatform">;

export const SETTINGS_MUTATION_MESSAGE = "product-filter:mutate-settings:v1";
export const MAX_SETTINGS_IMPORT_FILE_BYTES = 1024 * 1024;

export function isSettingsImportFileSizeAllowed(fileSize: number): boolean {
  return Number.isSafeInteger(fileSize) && fileSize >= 0 && fileSize <= MAX_SETTINGS_IMPORT_FILE_BYTES;
}

export type ProductFilterSettingsMutation =
  | { kind: "update-preferences"; preferences: Partial<StoredPreferences> }
  | {
      addedTerms: string[];
      kind: "save-options-draft";
      preferences: Partial<StoredPreferences>;
      removedTerms: string[];
    }
  | { kind: "set-global-terms"; terms: string[] }
  | { kind: "add-global-term"; term: string }
  | { kind: "remove-global-term"; term: string }
  | { kind: "add-platform-term"; platformId: string; term: string }
  | { kind: "remove-platform-term"; platformId: string; term: string }
  | { kind: "add-product-id"; productId: string }
  | { kind: "reset-rules"; preferences?: Partial<StoredPreferences> }
  | { kind: "replace-all"; settings: ProductFilterSettings };

export interface ProductFilterSettingsMutationMessage {
  type: typeof SETTINGS_MUTATION_MESSAGE;
  mutation: ProductFilterSettingsMutation;
}

let settingsMutationQueue: Promise<unknown> = Promise.resolve();

export async function loadSettings(): Promise<ProductFilterSettings> {
  const [syncValues, localValues] = await Promise.all([
    browser.storage.sync.get(SETTINGS_STORAGE_KEY),
    browser.storage.local.get(RULES_STORAGE_KEY)
  ]);
  const legacySettings = (syncValues as Record<string, LegacyProductFilterSettings | undefined>)[SETTINGS_STORAGE_KEY];
  const storedRules = (localValues as Record<string, StoredRules | undefined>)[RULES_STORAGE_KEY];

  if (!isStoredRules(storedRules)) {
    return normalizeSettings(legacySettings);
  }

  return normalizeSettings({
    ...legacySettings,
    ...storedRules
  });
}

export async function saveSettings(settings: ProductFilterSettings): Promise<void> {
  const normalizedSettings = normalizeSettings(settings);

  // Persist the quota-sensitive rule lists first. If the following sync write
  // fails, the rules remain safe locally and the legacy sync value is still a
  // usable fallback on the next load.
  await browser.storage.local.set({
    [RULES_STORAGE_KEY]: getStoredRules(normalizedSettings)
  });
  await browser.storage.sync.set({
    [SETTINGS_STORAGE_KEY]: getStoredPreferences(normalizedSettings)
  });
}

export function applySettingsMutation(mutation: ProductFilterSettingsMutation): Promise<ProductFilterSettings> {
  const operation = settingsMutationQueue.then(async () => {
    const currentSettings = await loadSettings();
    const nextSettings = reduceSettingsMutation(currentSettings, mutation);
    await saveSettings(nextSettings);
    return nextSettings;
  });

  settingsMutationQueue = operation.catch(() => undefined);
  return operation;
}

export async function requestSettingsMutation(mutation: ProductFilterSettingsMutation): Promise<ProductFilterSettings> {
  const response = (await browser.runtime.sendMessage({
    type: SETTINGS_MUTATION_MESSAGE,
    mutation
  } satisfies ProductFilterSettingsMutationMessage)) as unknown;

  if (!isCompleteSettings(response)) {
    throw new Error("Product Filter background returned an invalid settings response.");
  }

  return normalizeSettings(response);
}

export function isSettingsMutationMessage(value: unknown): value is ProductFilterSettingsMutationMessage {
  if (!value || typeof value !== "object") return false;

  const message = value as { mutation?: unknown; type?: unknown };
  if (message.type !== SETTINGS_MUTATION_MESSAGE || !message.mutation || typeof message.mutation !== "object") {
    return false;
  }

  const mutation = message.mutation as Record<string, unknown>;
  switch (mutation.kind) {
    case "update-preferences":
      return Boolean(mutation.preferences && typeof mutation.preferences === "object");
    case "save-options-draft":
      return (
        Boolean(mutation.preferences && typeof mutation.preferences === "object") &&
        Array.isArray(mutation.addedTerms) &&
        mutation.addedTerms.every((term) => typeof term === "string") &&
        Array.isArray(mutation.removedTerms) &&
        mutation.removedTerms.every((term) => typeof term === "string")
      );
    case "set-global-terms":
      return Array.isArray(mutation.terms) && mutation.terms.every((term) => typeof term === "string");
    case "add-global-term":
    case "remove-global-term":
      return typeof mutation.term === "string";
    case "add-platform-term":
    case "remove-platform-term":
      return typeof mutation.platformId === "string" && typeof mutation.term === "string";
    case "add-product-id":
      return typeof mutation.productId === "string";
    case "reset-rules":
      return mutation.preferences === undefined || typeof mutation.preferences === "object";
    case "replace-all":
      return isCompleteSettings(mutation.settings);
    default:
      return false;
  }
}

export function normalizeSettings(settings: LegacyProductFilterSettings = {}): ProductFilterSettings {
  return {
    enabled: typeof settings.enabled === "boolean" ? settings.enabled : SETTINGS_DEFAULTS.enabled,
    mode: settings.mode === "dim" || settings.mode === "overlay" || settings.mode === "hide" ? settings.mode : "hide",
    language: getLanguage(settings.language),
    blockedTerms: normalizeRuleList(settings.blockedTerms),
    blockedTermsByPlatform: normalizeRuleMap(settings.blockedTermsByPlatform),
    blockedProductIds: normalizeRuleList(settings.blockedProductIds ?? settings.blockedAsins).map((productId) =>
      productId.toUpperCase()
    )
  };
}

function getLanguage(value: unknown): ProductFilterSettings["language"] {
  return value === "auto" || value === "pt-BR" || value === "en" || value === "es" ? value : SETTINGS_DEFAULTS.language;
}

function normalizeRuleList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function normalizeRuleMap(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .map(([platformId, rules]) => [platformId.trim(), normalizeRuleList(rules)] as const)
      .filter(([platformId, rules]) => platformId.length > 0 && rules.length > 0)
  );
}

function getStoredPreferences(settings: ProductFilterSettings): StoredPreferences {
  return {
    enabled: settings.enabled,
    language: settings.language,
    mode: settings.mode
  };
}

function getStoredRules(settings: ProductFilterSettings): StoredRules {
  return {
    blockedProductIds: settings.blockedProductIds,
    blockedTerms: settings.blockedTerms,
    blockedTermsByPlatform: settings.blockedTermsByPlatform
  };
}

function isStoredRules(value: unknown): value is StoredRules {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const rules = value as Partial<StoredRules>;
  return (
    Array.isArray(rules.blockedTerms) &&
    Array.isArray(rules.blockedProductIds) &&
    Boolean(rules.blockedTermsByPlatform) &&
    typeof rules.blockedTermsByPlatform === "object" &&
    !Array.isArray(rules.blockedTermsByPlatform)
  );
}

function reduceSettingsMutation(
  current: ProductFilterSettings,
  mutation: ProductFilterSettingsMutation
): ProductFilterSettings {
  switch (mutation.kind) {
    case "update-preferences":
      return normalizeSettings({ ...current, ...mutation.preferences });
    case "save-options-draft":
      return normalizeSettings({
        ...current,
        ...mutation.preferences,
        blockedTerms: [
          ...current.blockedTerms.filter((term) => !mutation.removedTerms.includes(term)),
          ...mutation.addedTerms
        ]
      });
    case "set-global-terms":
      return normalizeSettings({ ...current, blockedTerms: mutation.terms });
    case "add-global-term":
      return normalizeSettings({ ...current, blockedTerms: [...current.blockedTerms, mutation.term] });
    case "remove-global-term":
      return normalizeSettings({
        ...current,
        blockedTerms: current.blockedTerms.filter((term) => term !== mutation.term)
      });
    case "add-platform-term":
      return updatePlatformTerms(current, mutation.platformId, (terms) => [...terms, mutation.term]);
    case "remove-platform-term":
      return updatePlatformTerms(current, mutation.platformId, (terms) =>
        terms.filter((term) => term !== mutation.term)
      );
    case "add-product-id":
      return normalizeSettings({
        ...current,
        blockedProductIds: [...current.blockedProductIds, mutation.productId]
      });
    case "reset-rules":
      return normalizeSettings({
        ...current,
        ...mutation.preferences,
        blockedProductIds: [],
        blockedTerms: [],
        blockedTermsByPlatform: {}
      });
    case "replace-all":
      return normalizeSettings(mutation.settings);
  }
}

function updatePlatformTerms(
  current: ProductFilterSettings,
  platformIdValue: string,
  update: (terms: string[]) => string[]
): ProductFilterSettings {
  const platformId = platformIdValue.trim();
  if (!platformId) return current;

  const nextTerms = update(current.blockedTermsByPlatform[platformId] ?? []);
  const blockedTermsByPlatform = {
    ...current.blockedTermsByPlatform,
    [platformId]: nextTerms
  };

  if (nextTerms.length === 0) delete blockedTermsByPlatform[platformId];
  return normalizeSettings({ ...current, blockedTermsByPlatform });
}

function isCompleteSettings(value: unknown): value is ProductFilterSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const settings = value as Partial<ProductFilterSettings>;
  return (
    typeof settings.enabled === "boolean" &&
    typeof settings.language === "string" &&
    typeof settings.mode === "string" &&
    Array.isArray(settings.blockedTerms) &&
    Array.isArray(settings.blockedProductIds) &&
    Boolean(settings.blockedTermsByPlatform) &&
    typeof settings.blockedTermsByPlatform === "object" &&
    !Array.isArray(settings.blockedTermsByPlatform)
  );
}
