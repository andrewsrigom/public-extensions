import { SETTINGS_DEFAULTS, WATCHED_STORAGE_KEY } from "../shared/defaults";
import type { ContentRuntimeState, ExtensionSettings, PlatformAdapter, WatchedItemsByKey } from "../shared/types";
import { ContentApp } from "./content-app";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MessageListener = (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => unknown;
type StorageChangeListener = (changes: Record<string, unknown>, areaName: string) => void;

const browserState = vi.hoisted(() => ({
  messageListeners: [] as MessageListener[],
  storageChangeListeners: [] as StorageChangeListener[]
}));

const storageState = vi.hoisted(() => ({
  settings: null as ExtensionSettings | null,
  watchedItems: {} as WatchedItemsByKey
}));

const mutationState = vi.hoisted(() => ({
  requests: [] as unknown[]
}));

vi.mock("wxt/browser", () => ({
  browser: {
    runtime: {
      onMessage: {
        addListener: vi.fn((listener: MessageListener) => {
          browserState.messageListeners.push(listener);
        })
      }
    },
    storage: {
      onChanged: {
        addListener: vi.fn((listener: StorageChangeListener) => {
          browserState.storageChangeListeners.push(listener);
        })
      }
    }
  }
}));

vi.mock("../core/storage", () => ({
  loadSettings: vi.fn(async () => {
    if (!storageState.settings) throw new Error("Test settings were not initialized.");
    return storageState.settings;
  }),
  loadWatchedItems: vi.fn(async () => storageState.watchedItems),
  saveSettings: vi.fn(async (settings: ExtensionSettings) => {
    storageState.settings = settings;
  }),
  saveWatchedItems: vi.fn(async (items: WatchedItemsByKey) => {
    storageState.watchedItems = items;
  })
}));

vi.mock("../core/watched-items", () => ({
  requestWatchedItemsMutation: vi.fn(async (mutation: { kind: "toggle"; item: WatchedItemsByKey[string] }) => {
    mutationState.requests.push(mutation);
    const previousWatchedItems = { ...storageState.watchedItems };
    const watchedItems = { ...previousWatchedItems };

    if (watchedItems[mutation.item.key]) {
      delete watchedItems[mutation.item.key];
    } else {
      watchedItems[mutation.item.key] = mutation.item;
    }

    storageState.watchedItems = watchedItems;
    return {
      previousWatchedItems,
      watchedItems
    };
  })
}));

describe("ContentApp", () => {
  beforeEach(() => {
    browserState.messageListeners = [];
    browserState.storageChangeListeners = [];
    document.body.innerHTML = "";
    document.getElementById("watched-filter-style")?.remove();
    storageState.settings = { ...SETTINGS_DEFAULTS };
    storageState.watchedItems = {};
    mutationState.requests = [];
  });

  it("continues scanning when an adapter auto-detection throws", async () => {
    document.body.innerHTML = `<article id="card"><div id="visual"></div></article>`;

    const card = document.getElementById("card");
    const visual = document.getElementById("visual");

    if (!card || !visual) {
      throw new Error("Test fixture failed to render.");
    }

    const adapter: PlatformAdapter = {
      displayName: "YouTube",
      getAutoState() {
        throw new Error("Partial YouTube DOM.");
      },
      getCards() {
        return [card];
      },
      getItem(element) {
        return {
          element,
          key: "youtube:video:test",
          markerHost: element,
          platform: "youtube",
          title: "Test video",
          visualElement: visual,
          visualHost: visual
        };
      },
      hosts: ["youtube.com"],
      id: "youtube",
      matchesLocation() {
        return true;
      }
    };

    const app = new ContentApp(adapter);

    await expect(app.start()).resolves.toBeUndefined();

    const [listener] = browserState.messageListeners;
    const state = (await dispatchMessage(listener, { type: "HWC_GET_STATE" })) as ContentRuntimeState | undefined;

    expect(state?.stats).toMatchObject({
      candidates: 1,
      completed: 0,
      hidden: 0,
      inProgress: 0
    });

    const runtime = app as unknown as { observer: MutationObserver | null; scanTimer: number };
    runtime.observer?.disconnect();
    window.clearTimeout(runtime.scanTimer);
  });

  it("routes manual toggles through the background mutation boundary", async () => {
    const app = new ContentApp(createEmptyAdapter());
    await app.start();

    const runtime = app as unknown as {
      observer: MutationObserver | null;
      scanTimer: number;
      toggleManualWatched(key: string): Promise<void>;
    };
    await runtime.toggleManualWatched("youtube:queued");

    expect(mutationState.requests).toMatchObject([
      {
        kind: "toggle",
        item: {
          key: "youtube:queued",
          platform: "youtube",
          source: "manual"
        }
      }
    ]);

    const [listener] = browserState.messageListeners;
    const state = (await dispatchMessage(listener, { type: "HWC_GET_STATE" })) as ContentRuntimeState | undefined;
    expect(state?.watchedCount).toBe(1);
    cleanupApp(runtime);
  });

  it("synchronizes storage.local updates across running content contexts", async () => {
    const firstApp = new ContentApp(createEmptyAdapter());
    const secondApp = new ContentApp(createEmptyAdapter());
    await Promise.all([firstApp.start(), secondApp.start()]);

    const watchedItems: WatchedItemsByKey = {
      "netflix:cross-tab": {
        key: "netflix:cross-tab",
        markedAt: "2026-08-04T12:00:00.000Z",
        platform: "netflix",
        source: "manual",
        title: "Cross-tab item"
      }
    };

    for (const listener of browserState.storageChangeListeners) {
      listener(
        {
          [WATCHED_STORAGE_KEY]: {
            newValue: watchedItems,
            oldValue: {}
          }
        },
        "local"
      );
    }

    const synchronizedStates = (await Promise.all(
      browserState.messageListeners.map((listener) => dispatchMessage(listener, { type: "HWC_GET_STATE" }))
    )) as ContentRuntimeState[];
    expect(synchronizedStates.map((state) => state.watchedCount)).toEqual([1, 1]);

    for (const listener of browserState.storageChangeListeners) {
      listener({ [WATCHED_STORAGE_KEY]: { oldValue: watchedItems } }, "local");
    }

    const clearedStates = (await Promise.all(
      browserState.messageListeners.map((listener) => dispatchMessage(listener, { type: "HWC_GET_STATE" }))
    )) as ContentRuntimeState[];
    expect(clearedStates.map((state) => state.watchedCount)).toEqual([0, 0]);

    cleanupApp(firstApp as unknown as { observer: MutationObserver | null; scanTimer: number });
    cleanupApp(secondApp as unknown as { observer: MutationObserver | null; scanTimer: number });
  });
});

function dispatchMessage(listener: MessageListener | undefined, message: unknown): Promise<unknown> {
  if (!listener) return Promise.resolve(undefined);

  return new Promise((resolve) => {
    const keepsChannelOpen = listener(message, {}, resolve);
    if (keepsChannelOpen !== true) resolve(undefined);
  });
}

function createEmptyAdapter(): PlatformAdapter {
  return {
    displayName: "YouTube",
    getCards() {
      return [];
    },
    getItem() {
      return null;
    },
    hosts: ["youtube.com"],
    id: "youtube",
    matchesLocation() {
      return true;
    }
  };
}

function cleanupApp(runtime: { observer: MutationObserver | null; scanTimer: number }): void {
  runtime.observer?.disconnect();
  window.clearTimeout(runtime.scanTimer);
}
