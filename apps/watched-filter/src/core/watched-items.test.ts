import type { StoredWatchedItem, WatchedItemsByKey } from "../shared/types";
import {
  createWatchedItemsMutationQueue,
  isWatchedItemsMutationMessage,
  WATCHED_ITEMS_MUTATION_MESSAGE
} from "./watched-items";
import { describe, expect, it, vi } from "vitest";

vi.mock("wxt/browser", () => ({
  browser: {
    runtime: {
      sendMessage: vi.fn()
    }
  }
}));

describe("watched item mutations", () => {
  it("serializes concurrent toggles without losing either update", async () => {
    let persistedItems: WatchedItemsByKey = {};
    const loadedSnapshots: WatchedItemsByKey[] = [];
    const mutate = createWatchedItemsMutationQueue({
      async load() {
        const snapshot = { ...persistedItems };
        loadedSnapshots.push(snapshot);
        return snapshot;
      },
      async save(items) {
        await Promise.resolve();
        persistedItems = { ...items };
      }
    });

    const [firstResult, secondResult] = await Promise.all([
      mutate({ kind: "toggle", item: createItem("prime-video:first") }),
      mutate({ kind: "toggle", item: createItem("netflix:second") })
    ]);

    expect(Object.keys(firstResult.watchedItems)).toEqual(["prime-video:first"]);
    expect(Object.keys(secondResult.watchedItems)).toEqual(["prime-video:first", "netflix:second"]);
    expect(Object.keys(persistedItems)).toEqual(["prime-video:first", "netflix:second"]);
    expect(loadedSnapshots).toEqual([{}, { "prime-video:first": createItem("prime-video:first") }]);
  });

  it("merges a backup against the latest queued state", async () => {
    let persistedItems: WatchedItemsByKey = {};
    const mutate = createWatchedItemsMutationQueue({
      async load() {
        return { ...persistedItems };
      },
      async save(items) {
        persistedItems = { ...items };
      }
    });

    await Promise.all([
      mutate({ kind: "toggle", item: createItem("youtube:from-tab") }),
      mutate({
        kind: "merge",
        items: { "netflix:from-backup": createItem("netflix:from-backup") }
      })
    ]);

    expect(Object.keys(persistedItems)).toEqual(["youtube:from-tab", "netflix:from-backup"]);
  });

  it("keeps accepting later mutations when a previous write fails", async () => {
    let persistedItems: WatchedItemsByKey = {};
    let writeCount = 0;
    const mutate = createWatchedItemsMutationQueue({
      async load() {
        return { ...persistedItems };
      },
      async save(items) {
        writeCount += 1;
        if (writeCount === 1) throw new Error("storage unavailable");
        persistedItems = { ...items };
      }
    });

    const failedMutation = mutate({ kind: "toggle", item: createItem("prime-video:failed") });
    const successfulMutation = mutate({ kind: "toggle", item: createItem("netflix:saved") });

    await expect(failedMutation).rejects.toThrow("storage unavailable");
    await expect(successfulMutation).resolves.toMatchObject({
      watchedItems: { "netflix:saved": createItem("netflix:saved") }
    });
  });

  it("validates messages before they reach the mutation queue", () => {
    expect(
      isWatchedItemsMutationMessage({
        type: WATCHED_ITEMS_MUTATION_MESSAGE,
        mutation: { kind: "toggle", item: createItem("max:valid") }
      })
    ).toBe(true);
    expect(
      isWatchedItemsMutationMessage({
        type: WATCHED_ITEMS_MUTATION_MESSAGE,
        mutation: { kind: "toggle", item: { key: "max:invalid" } }
      })
    ).toBe(false);
    expect(isWatchedItemsMutationMessage({ type: "HWC_GET_STATE" })).toBe(false);
  });
});

function createItem(key: string): StoredWatchedItem {
  return {
    key,
    markedAt: "2026-08-04T12:00:00.000Z",
    platform: key.split(":")[0] || "unknown",
    source: "manual",
    title: key
  };
}
