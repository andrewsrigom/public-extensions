import { browser } from "wxt/browser";
import { loadSettings } from "../src/core/storage";
import { createWatchedItemsMutationQueue, isWatchedItemsMutationMessage } from "../src/core/watched-items";
import { t } from "../src/shared/i18n";

const MENU_ID = "watched-filter-toggle";
const PRIME_VIDEO_PATTERNS = ["https://primevideo.com/*", "https://www.primevideo.com/*", "https://*.primevideo.com/*"];
const NETFLIX_PATTERNS = ["https://netflix.com/*", "https://www.netflix.com/*", "https://*.netflix.com/*"];
const DISNEY_PLUS_PATTERNS = ["https://disneyplus.com/*", "https://www.disneyplus.com/*", "https://*.disneyplus.com/*"];
const MAX_PATTERNS = [
  "https://max.com/*",
  "https://www.max.com/*",
  "https://*.max.com/*",
  "https://hbomax.com/*",
  "https://www.hbomax.com/*",
  "https://*.hbomax.com/*"
];
const YOUTUBE_PATTERNS = [
  "https://youtube.com/*",
  "https://www.youtube.com/*",
  "https://*.youtube.com/*",
  "https://youtu.be/*",
  "https://www.youtu.be/*"
];
const GLOBOPLAY_PATTERNS = ["https://globoplay.globo.com/*", "https://*.globoplay.globo.com/*"];
const PARAMOUNT_PLUS_PATTERNS = [
  "https://paramountplus.com/*",
  "https://www.paramountplus.com/*",
  "https://*.paramountplus.com/*"
];
const APPLE_TV_PATTERNS = ["https://tv.apple.com/*", "https://*.tv.apple.com/*"];
const CRUNCHYROLL_PATTERNS = [
  "https://crunchyroll.com/*",
  "https://www.crunchyroll.com/*",
  "https://*.crunchyroll.com/*"
];
const IQIYI_PATTERNS = ["https://iq.com/*", "https://www.iq.com/*", "https://*.iq.com/*"];
const DOCUMENT_URL_PATTERNS = [
  ...PRIME_VIDEO_PATTERNS,
  ...NETFLIX_PATTERNS,
  ...DISNEY_PLUS_PATTERNS,
  ...MAX_PATTERNS,
  ...YOUTUBE_PATTERNS,
  ...GLOBOPLAY_PATTERNS,
  ...PARAMOUNT_PLUS_PATTERNS,
  ...APPLE_TV_PATTERNS,
  ...CRUNCHYROLL_PATTERNS,
  ...IQIYI_PATTERNS
];

type ContextMenuCreateProperties = Parameters<typeof browser.contextMenus.create>[0];
type ContextMenuUpdateProperties = Parameters<typeof browser.contextMenus.update>[1];

export default defineBackground(() => {
  let contextMenuSync = Promise.resolve();
  const mutateWatchedItems = createWatchedItemsMutationQueue();

  browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (!isWatchedItemsMutationMessage(message)) return undefined;

    void mutateWatchedItems(message.mutation)
      .then(sendResponse)
      .catch(() => sendResponse(undefined));
    return true;
  });

  function scheduleContextMenuSync(): void {
    contextMenuSync = contextMenuSync.then(syncContextMenu).catch(() => undefined);
    void contextMenuSync;
  }

  async function syncContextMenu(): Promise<void> {
    const settings = await loadSettings();
    const menuProperties: ContextMenuUpdateProperties = {
      title: t("contextToggleWatched", settings.language),
      contexts: ["page", "link", "image"],
      documentUrlPatterns: DOCUMENT_URL_PATTERNS
    };

    try {
      await browser.contextMenus.update(MENU_ID, menuProperties);
      return;
    } catch (updateError) {
      if (isExtensionContextInvalidated(updateError)) return;
    }

    try {
      const createProperties: ContextMenuCreateProperties = {
        id: MENU_ID,
        ...menuProperties
      };
      await browser.contextMenus.create(createProperties);
    } catch (createError) {
      if (isDuplicateMenuError(createError)) {
        await browser.contextMenus.update(MENU_ID, menuProperties).catch(() => undefined);
      }
    }
  }

  function isDuplicateMenuError(error: unknown): boolean {
    return error instanceof Error && /duplicate id/i.test(error.message);
  }

  function isExtensionContextInvalidated(error: unknown): boolean {
    return error instanceof Error && /extension context invalidated/i.test(error.message);
  }

  browser.runtime.onInstalled.addListener(() => {
    scheduleContextMenuSync();
  });

  scheduleContextMenuSync();

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" && changes.language) {
      scheduleContextMenuSync();
    }
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== MENU_ID || tab?.id == null) return;

    void browser.tabs.sendMessage(tab.id, { type: "HWC_TOGGLE_CONTEXT_ITEM" }).catch(() => undefined);
  });
});
