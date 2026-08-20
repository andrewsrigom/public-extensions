import { browser } from "wxt/browser";
import { SETTINGS_DEFAULTS, WATCHED_STORAGE_KEY } from "../shared/defaults";
import { normalizePlatformSettings } from "../shared/platforms";
import type { ExtensionSettings, WatchedItemsByKey } from "../shared/types";

export async function loadSettings(): Promise<ExtensionSettings> {
  const stored = (await browser.storage.sync.get(
    SETTINGS_DEFAULTS as unknown as Record<string, unknown>
  )) as Partial<ExtensionSettings>;
  return normalizeSettings(stored);
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await browser.storage.sync.set(normalizeSettings(settings) as unknown as Record<string, unknown>);
}

export async function loadWatchedItems(): Promise<WatchedItemsByKey> {
  const stored = (await browser.storage.local.get({
    [WATCHED_STORAGE_KEY]: {}
  })) as Record<typeof WATCHED_STORAGE_KEY, WatchedItemsByKey>;
  return stored[WATCHED_STORAGE_KEY] || {};
}

export async function saveWatchedItems(items: WatchedItemsByKey): Promise<void> {
  await browser.storage.local.set({ [WATCHED_STORAGE_KEY]: items });
}

function normalizeSettings(settings: Partial<ExtensionSettings>): ExtensionSettings {
  return {
    ...SETTINGS_DEFAULTS,
    ...settings,
    platforms: normalizePlatformSettings(settings.platforms)
  };
}
