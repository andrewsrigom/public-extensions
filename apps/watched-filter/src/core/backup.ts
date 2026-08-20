import { SETTINGS_DEFAULTS } from "../shared/defaults";
import { normalizePlatformSettings } from "../shared/platforms";
import type {
  ExtensionSettings,
  LanguagePreference,
  StoredWatchedItem,
  VisualMode,
  WatchedItemsByKey
} from "../shared/types";
import { normalizeHttpUrl } from "../shared/url";
import { loadSettings, loadWatchedItems, saveSettings } from "./storage";
import { requestWatchedItemsMutation } from "./watched-items";

export const BACKUP_APP_ID = "watched-filter";
export const BACKUP_SCHEMA_VERSION = 1;
export const MAX_BACKUP_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_BACKUP_ITEMS = 10_000;

const MAX_BACKUP_KEY_LENGTH = 2_048;
const MAX_BACKUP_PLATFORM_LENGTH = 128;
const MAX_BACKUP_TITLE_LENGTH = 2_048;
const MAX_BACKUP_URL_LENGTH = 8_192;
const MAX_BACKUP_DATE_LENGTH = 128;
const UNSAFE_ITEM_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export type BackupImportErrorCode =
  "file-too-large" | "invalid-envelope" | "invalid-item" | "missing-items" | "too-many-items" | "unsupported-version";

export class BackupImportError extends Error {
  constructor(readonly code: BackupImportErrorCode) {
    super(code);
    this.name = "BackupImportError";
  }
}

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  settings: ExtensionSettings;
  watchedItems: StoredWatchedItem[];
}

export interface BackupImportResult {
  importedItems: number;
  addedItems: number;
  updatedItems: number;
  unchangedItems: number;
  restoredSettings: boolean;
  watchedItems: WatchedItemsByKey;
}

interface NormalizedBackupPayload {
  items: WatchedItemsByKey;
  settings?: ExtensionSettings;
}

export async function createBackupFile(): Promise<BackupFile> {
  const [settings, watchedItems] = await Promise.all([loadSettings(), loadWatchedItems()]);

  return {
    app: BACKUP_APP_ID,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    watchedItems: sortWatchedItems(Object.values(watchedItems))
  };
}

export async function importBackupPayload(payload: unknown): Promise<BackupImportResult> {
  const normalized = normalizeBackupPayload(payload);
  const mutationResult = await requestWatchedItemsMutation({
    kind: "merge",
    items: normalized.items
  });
  const currentItems = mutationResult.previousWatchedItems;
  const nextItems = mutationResult.watchedItems;
  let addedItems = 0;
  let updatedItems = 0;
  let unchangedItems = 0;

  for (const [key, item] of Object.entries(normalized.items)) {
    const currentItem = currentItems[key];

    if (!currentItem) {
      addedItems += 1;
    } else if (areWatchedItemsEqual(currentItem, item)) {
      unchangedItems += 1;
    } else {
      updatedItems += 1;
    }
  }

  if (normalized.settings) {
    await saveSettings(normalized.settings);
  }

  return {
    importedItems: Object.keys(normalized.items).length,
    addedItems,
    updatedItems,
    unchangedItems,
    restoredSettings: Boolean(normalized.settings),
    watchedItems: nextItems
  };
}

export function assertBackupFileSize(fileSize: number): void {
  if (!Number.isSafeInteger(fileSize) || fileSize < 0 || fileSize > MAX_BACKUP_FILE_BYTES) {
    throw new BackupImportError("file-too-large");
  }
}

export function getBackupFilename(date = new Date()): string {
  return `watched-filter-backup-${date.toISOString().slice(0, 10)}.json`;
}

function normalizeBackupPayload(payload: unknown): NormalizedBackupPayload {
  if (isRecord(payload) && ("app" in payload || "schemaVersion" in payload)) {
    if (payload.app !== BACKUP_APP_ID) {
      throw new BackupImportError("invalid-envelope");
    }
    if (payload.schemaVersion !== BACKUP_SCHEMA_VERSION) {
      throw new BackupImportError("unsupported-version");
    }
    if (!Array.isArray(payload.watchedItems)) {
      throw new BackupImportError("missing-items");
    }

    return {
      items: normalizeWatchedItems(payload.watchedItems),
      settings: normalizeSettings(payload.settings)
    };
  }

  if (isRecord(payload) && ("watchedItems" in payload || "settings" in payload)) {
    return {
      items: normalizeWatchedItems(payload.watchedItems ?? {}),
      settings: normalizeSettings(payload.settings)
    };
  }

  return {
    items: normalizeWatchedItems(payload)
  };
}

function normalizeWatchedItems(payload: unknown): WatchedItemsByKey {
  if (Array.isArray(payload)) {
    assertBackupItemCount(payload.length);
    return Object.fromEntries(
      payload
        .map((item) => normalizeWatchedItem(item))
        .filter((item): item is StoredWatchedItem => Boolean(item))
        .map((item) => [item.key, item])
    );
  }

  if (isRecord(payload)) {
    const entries = Object.entries(payload);
    assertBackupItemCount(entries.length);
    return Object.fromEntries(
      entries
        .map(([key, item]) => normalizeWatchedItem(item, key))
        .filter((item): item is StoredWatchedItem => Boolean(item))
        .map((item) => [item.key, item])
    );
  }

  throw new BackupImportError("missing-items");
}

function containsControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const characterCode = value.charCodeAt(index);
    if (characterCode <= 0x1f || characterCode === 0x7f) {
      return true;
    }
  }

  return false;
}

function normalizeWatchedItem(value: unknown, fallbackKey?: string): StoredWatchedItem | null {
  if (!isRecord(value)) return null;

  const key =
    getLimitedString(value.key, MAX_BACKUP_KEY_LENGTH) || getLimitedString(fallbackKey, MAX_BACKUP_KEY_LENGTH);
  if (!key) return null;
  if (UNSAFE_ITEM_KEYS.has(key) || containsControlCharacter(key)) {
    throw new BackupImportError("invalid-item");
  }

  const platform = getLimitedString(value.platform, MAX_BACKUP_PLATFORM_LENGTH) || key.split(":")[0] || "unknown";
  if (platform.length > MAX_BACKUP_PLATFORM_LENGTH) {
    throw new BackupImportError("invalid-item");
  }
  const title = getLimitedString(value.title, MAX_BACKUP_TITLE_LENGTH) || "Sem titulo";
  const markedAt = normalizeDate(getLimitedString(value.markedAt, MAX_BACKUP_DATE_LENGTH));
  const source = value.source === "auto" ? "auto" : "manual";
  const url = normalizeHttpUrl(getLimitedString(value.url, MAX_BACKUP_URL_LENGTH));

  return {
    key,
    platform,
    title,
    ...(url ? { url } : {}),
    markedAt,
    source
  };
}

function normalizeSettings(value: unknown): ExtensionSettings | undefined {
  if (!isRecord(value)) return undefined;

  return {
    enabled: getBoolean(value.enabled, SETTINGS_DEFAULTS.enabled),
    showManualMarker: getBoolean(value.showManualMarker, SETTINGS_DEFAULTS.showManualMarker),
    autoDetectWatched: getBoolean(value.autoDetectWatched, SETTINGS_DEFAULTS.autoDetectWatched),
    hideCompleted: getBoolean(value.hideCompleted, SETTINGS_DEFAULTS.hideCompleted),
    hideChannelContent: getBoolean(value.hideChannelContent, SETTINGS_DEFAULTS.hideChannelContent),
    hideInProgress: getBoolean(value.hideInProgress, SETTINGS_DEFAULTS.hideInProgress),
    hideLiveEvents: getBoolean(value.hideLiveEvents, SETTINGS_DEFAULTS.hideLiveEvents),
    hidePaidContent: getBoolean(value.hidePaidContent, SETTINGS_DEFAULTS.hidePaidContent),
    completedThreshold: getThreshold(value.completedThreshold),
    mode: getMode(value.mode),
    language: getLanguage(value.language),
    platforms: normalizePlatformSettings(value.platforms),
    debug: getBoolean(value.debug, SETTINGS_DEFAULTS.debug)
  };
}

function sortWatchedItems(items: StoredWatchedItem[]): StoredWatchedItem[] {
  return [...items].sort((left, right) => right.markedAt.localeCompare(left.markedAt));
}

function areWatchedItemsEqual(left: StoredWatchedItem, right: StoredWatchedItem): boolean {
  return (
    left.key === right.key &&
    left.platform === right.platform &&
    left.title === right.title &&
    (left.url || "") === (right.url || "") &&
    left.markedAt === right.markedAt &&
    left.source === right.source
  );
}

function normalizeDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function getLimitedString(value: unknown, maxLength: number): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized.length > maxLength) {
    throw new BackupImportError("invalid-item");
  }
  return normalized;
}

function assertBackupItemCount(itemCount: number): void {
  if (itemCount > MAX_BACKUP_ITEMS) {
    throw new BackupImportError("too-many-items");
  }
}

function getBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function getThreshold(value: unknown): number {
  const threshold = Number(value);
  if (!Number.isFinite(threshold)) return SETTINGS_DEFAULTS.completedThreshold;
  return Math.max(1, Math.min(100, Math.round(threshold)));
}

function getMode(value: unknown): VisualMode {
  return value === "overlay" || value === "dim" || value === "hide" ? value : SETTINGS_DEFAULTS.mode;
}

function getLanguage(value: unknown): LanguagePreference {
  return value === "auto" || value === "pt-BR" || value === "en" || value === "es" ? value : SETTINGS_DEFAULTS.language;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
