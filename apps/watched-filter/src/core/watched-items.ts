import { browser } from "wxt/browser";
import type { StoredWatchedItem, WatchedItemsByKey } from "../shared/types";
import { loadWatchedItems, saveWatchedItems } from "./storage";

export const WATCHED_ITEMS_MUTATION_MESSAGE = "HWC_MUTATE_WATCHED_ITEMS";

export type WatchedItemsMutation =
  | { kind: "clear" }
  | { kind: "merge"; items: WatchedItemsByKey }
  | { kind: "remove"; key: string }
  | { kind: "toggle"; item: StoredWatchedItem };

export interface WatchedItemsMutationMessage {
  type: typeof WATCHED_ITEMS_MUTATION_MESSAGE;
  mutation: WatchedItemsMutation;
}

export interface WatchedItemsMutationResult {
  previousWatchedItems: WatchedItemsByKey;
  watchedItems: WatchedItemsByKey;
}

interface WatchedItemsStorage {
  load(): Promise<WatchedItemsByKey>;
  save(items: WatchedItemsByKey): Promise<void>;
}

const DEFAULT_STORAGE: WatchedItemsStorage = {
  load: loadWatchedItems,
  save: saveWatchedItems
};

export function createWatchedItemsMutationQueue(storage: WatchedItemsStorage = DEFAULT_STORAGE) {
  let queue: Promise<void> = Promise.resolve();

  return (mutation: WatchedItemsMutation): Promise<WatchedItemsMutationResult> => {
    const result = queue.then(async () => {
      const previousWatchedItems = await storage.load();
      const watchedItems = applyWatchedItemsMutation(previousWatchedItems, mutation);
      await storage.save(watchedItems);

      return {
        previousWatchedItems,
        watchedItems
      };
    });

    queue = result.then(
      () => undefined,
      () => undefined
    );

    return result;
  };
}

export async function requestWatchedItemsMutation(mutation: WatchedItemsMutation): Promise<WatchedItemsMutationResult> {
  const message: WatchedItemsMutationMessage = {
    type: WATCHED_ITEMS_MUTATION_MESSAGE,
    mutation
  };
  const response = (await browser.runtime.sendMessage(message)) as unknown;

  if (!isWatchedItemsMutationResult(response)) {
    throw new Error("Watched items mutation returned an invalid response.");
  }

  return response;
}

export function isWatchedItemsMutationMessage(value: unknown): value is WatchedItemsMutationMessage {
  if (!isRecord(value) || value.type !== WATCHED_ITEMS_MUTATION_MESSAGE || !isRecord(value.mutation)) {
    return false;
  }

  const mutation = value.mutation;

  if (mutation.kind === "clear") return true;
  if (mutation.kind === "remove") return typeof mutation.key === "string" && mutation.key.length > 0;
  if (mutation.kind === "merge") return isWatchedItemsByKey(mutation.items);
  if (mutation.kind === "toggle") return isStoredWatchedItem(mutation.item);

  return false;
}

function applyWatchedItemsMutation(currentItems: WatchedItemsByKey, mutation: WatchedItemsMutation): WatchedItemsByKey {
  if (mutation.kind === "clear") return {};

  if (mutation.kind === "merge") {
    return {
      ...currentItems,
      ...mutation.items
    };
  }

  const nextItems = { ...currentItems };

  if (mutation.kind === "remove") {
    delete nextItems[mutation.key];
    return nextItems;
  }

  if (Object.prototype.hasOwnProperty.call(nextItems, mutation.item.key)) {
    delete nextItems[mutation.item.key];
  } else {
    nextItems[mutation.item.key] = mutation.item;
  }

  return nextItems;
}

function isWatchedItemsMutationResult(value: unknown): value is WatchedItemsMutationResult {
  return isRecord(value) && isWatchedItemsByKey(value.previousWatchedItems) && isWatchedItemsByKey(value.watchedItems);
}

function isWatchedItemsByKey(value: unknown): value is WatchedItemsByKey {
  return isRecord(value) && Object.values(value).every(isStoredWatchedItem);
}

function isStoredWatchedItem(value: unknown): value is StoredWatchedItem {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    value.key.length > 0 &&
    typeof value.platform === "string" &&
    typeof value.title === "string" &&
    typeof value.markedAt === "string" &&
    (value.source === "manual" || value.source === "auto") &&
    (value.url === undefined || typeof value.url === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
