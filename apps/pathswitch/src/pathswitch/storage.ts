import { browser } from "wxt/browser";

import { getDefaultPathSwitchLanguage } from "./i18n";
import type { RedirectCondition, RedirectRule, PathSwitchLanguage, PathSwitchSettings } from "./types";

export const PATHSWITCH_SETTINGS_KEY = "pathswitch:settings";
export const PATHSWITCH_QUICK_TIP_DISMISSED_KEY = "pathswitch:quick-tip-dismissed";

export function getDefaultPathSwitchSettings(): PathSwitchSettings {
  return {
    enabled: true,
    language: getDefaultPathSwitchLanguage(),
    rules: []
  };
}

export async function loadSettings(): Promise<PathSwitchSettings> {
  const stored = await browser.storage.local.get(PATHSWITCH_SETTINGS_KEY);
  return normalizeSettings(stored[PATHSWITCH_SETTINGS_KEY]);
}

export async function saveSettings(settings: PathSwitchSettings): Promise<void> {
  await browser.storage.local.set({
    [PATHSWITCH_SETTINGS_KEY]: normalizeSettings(settings)
  });
}

export async function loadQuickTipDismissed(): Promise<boolean> {
  const stored = await browser.storage.local.get(PATHSWITCH_QUICK_TIP_DISMISSED_KEY);
  return stored[PATHSWITCH_QUICK_TIP_DISMISSED_KEY] === true;
}

export async function saveQuickTipDismissed(dismissed: boolean): Promise<void> {
  await browser.storage.local.set({
    [PATHSWITCH_QUICK_TIP_DISMISSED_KEY]: dismissed
  });
}

export function normalizeSettings(value: unknown): PathSwitchSettings {
  const defaults = getDefaultPathSwitchSettings();
  if (!isRecord(value)) return defaults;

  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : defaults.enabled,
    language: normalizeLanguage(value.language, defaults.language),
    rules: Array.isArray(value.rules) ? value.rules.map(normalizeRule).filter(isRedirectRule) : defaults.rules
  };
}

export function createRedirectRule(input: {
  condition?: RedirectCondition;
  destinationUrl: string;
  enabled?: boolean;
  ignoreIfAtDestination?: boolean;
  name?: string;
  sourcePattern: string;
}): RedirectRule {
  const now = Date.now();

  return {
    condition: input.condition || "none",
    createdAt: now,
    destinationUrl: input.destinationUrl.trim(),
    enabled: input.enabled ?? true,
    id: createId(),
    ignoreIfAtDestination: input.ignoreIfAtDestination ?? true,
    name: input.name?.trim() || "",
    sourcePattern: input.sourcePattern.trim(),
    updatedAt: now
  };
}

function normalizeRule(value: unknown): RedirectRule | null {
  if (!isRecord(value)) return null;
  if (typeof value.sourcePattern !== "string" || typeof value.destinationUrl !== "string") return null;

  const now = Date.now();
  const rule: RedirectRule = {
    condition: normalizeCondition(value.condition),
    createdAt: typeof value.createdAt === "number" ? value.createdAt : now,
    destinationUrl: value.destinationUrl.trim(),
    enabled: typeof value.enabled === "boolean" ? value.enabled : true,
    id: typeof value.id === "string" && value.id.trim() ? value.id : createId(),
    ignoreIfAtDestination: typeof value.ignoreIfAtDestination === "boolean" ? value.ignoreIfAtDestination : true,
    name: typeof value.name === "string" ? value.name.trim() : "",
    sourcePattern: value.sourcePattern.trim(),
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : now
  };

  return rule.sourcePattern && rule.destinationUrl ? rule : null;
}

function normalizeCondition(value: unknown): RedirectCondition {
  return value === "exact-source-host" ? "exact-source-host" : "none";
}

function normalizeLanguage(value: unknown, fallback: PathSwitchLanguage): PathSwitchLanguage {
  return value === "pt-BR" || value === "en" || value === "es" ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function isRedirectRule(value: RedirectRule | null): value is RedirectRule {
  return Boolean(value);
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
