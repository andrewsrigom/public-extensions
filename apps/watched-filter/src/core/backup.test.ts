import type { ExtensionSettings, WatchedItemsByKey } from "../shared/types";
import { DEFAULT_PLATFORM_SETTINGS } from "../shared/platforms";
import {
  BACKUP_APP_ID,
  BACKUP_SCHEMA_VERSION,
  BackupImportError,
  MAX_BACKUP_FILE_BYTES,
  MAX_BACKUP_ITEMS,
  assertBackupFileSize,
  createBackupFile,
  getBackupFilename,
  importBackupPayload
} from "./backup";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storageState = vi.hoisted(() => ({
  settings: {
    autoDetectWatched: true,
    completedThreshold: 90,
    debug: false,
    enabled: true,
    hideChannelContent: false,
    hideCompleted: true,
    hideInProgress: false,
    hideLiveEvents: false,
    hidePaidContent: false,
    language: "auto",
    mode: "overlay",
    platforms: {
      "apple-tv": true,
      crunchyroll: true,
      "disney-plus": true,
      globoplay: true,
      iqiyi: true,
      max: true,
      netflix: true,
      "paramount-plus": true,
      "prime-video": true,
      youtube: true
    },
    showManualMarker: true
  } as ExtensionSettings,
  watchedItems: {} as WatchedItemsByKey
}));

vi.mock("./storage", () => ({
  loadSettings: vi.fn(async () => storageState.settings),
  loadWatchedItems: vi.fn(async () => storageState.watchedItems),
  saveSettings: vi.fn(async (settings: ExtensionSettings) => {
    storageState.settings = settings;
  })
}));

vi.mock("./watched-items", () => ({
  requestWatchedItemsMutation: vi.fn(async (mutation: { kind: "merge"; items: WatchedItemsByKey }) => {
    const previousWatchedItems = { ...storageState.watchedItems };
    const watchedItems = {
      ...previousWatchedItems,
      ...mutation.items
    };
    storageState.watchedItems = watchedItems;

    return {
      previousWatchedItems,
      watchedItems
    };
  })
}));

describe("backup", () => {
  beforeEach(() => {
    storageState.settings = {
      autoDetectWatched: true,
      completedThreshold: 90,
      debug: false,
      enabled: true,
      hideChannelContent: false,
      hideCompleted: true,
      hideInProgress: false,
      hideLiveEvents: false,
      hidePaidContent: false,
      language: "auto",
      mode: "overlay",
      platforms: DEFAULT_PLATFORM_SETTINGS,
      showManualMarker: true
    };
    storageState.watchedItems = {};
  });

  it("creates a versioned backup sorted by newest marked item first", async () => {
    storageState.watchedItems = {
      "prime-video:older": {
        key: "prime-video:older",
        markedAt: "2026-01-01T00:00:00.000Z",
        platform: "prime-video",
        source: "manual",
        title: "Older"
      },
      "prime-video:newer": {
        key: "prime-video:newer",
        markedAt: "2026-02-01T00:00:00.000Z",
        platform: "prime-video",
        source: "manual",
        title: "Newer"
      }
    };

    const backup = await createBackupFile();

    expect(backup.app).toBe(BACKUP_APP_ID);
    expect(backup.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(backup.watchedItems.map((item) => item.title)).toEqual(["Newer", "Older"]);
  });

  it("imports the current backup format and normalizes settings", async () => {
    const result = await importBackupPayload({
      app: BACKUP_APP_ID,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      settings: {
        completedThreshold: 250,
        enabled: false,
        language: "es",
        mode: "invalid",
        platforms: {
          netflix: false
        }
      },
      watchedItems: [
        {
          key: "prime-video:movie",
          markedAt: "2026-03-01T10:00:00.000Z",
          platform: "prime-video",
          source: "auto",
          title: "Movie"
        }
      ]
    });

    expect(result).toMatchObject({
      addedItems: 1,
      importedItems: 1,
      restoredSettings: true,
      unchangedItems: 0,
      updatedItems: 0
    });
    expect(storageState.settings).toMatchObject({
      completedThreshold: 100,
      enabled: false,
      language: "es",
      mode: "overlay",
      platforms: {
        ...DEFAULT_PLATFORM_SETTINGS,
        netflix: false
      }
    });
    expect(storageState.watchedItems["prime-video:movie"]?.title).toBe("Movie");
  });

  it("imports legacy watched-item maps and reports merge counts", async () => {
    storageState.watchedItems = {
      "prime-video:existing": {
        key: "prime-video:existing",
        markedAt: "2026-01-01T00:00:00.000Z",
        platform: "prime-video",
        source: "manual",
        title: "Existing"
      }
    };

    const result = await importBackupPayload({
      "prime-video:existing": {
        key: "prime-video:existing",
        markedAt: "2026-01-01T00:00:00.000Z",
        platform: "prime-video",
        source: "manual",
        title: "Existing"
      },
      "prime-video:new": {
        markedAt: "invalid date",
        platform: "prime-video",
        title: "New"
      }
    });

    expect(result.addedItems).toBe(1);
    expect(result.unchangedItems).toBe(1);
    expect(result.updatedItems).toBe(0);
    expect(storageState.watchedItems["prime-video:new"]?.key).toBe("prime-video:new");
    expect(new Date(storageState.watchedItems["prime-video:new"]?.markedAt || "").toString()).not.toBe("Invalid Date");
  });

  it("keeps the legacy unversioned envelope compatible", async () => {
    await expect(
      importBackupPayload({
        settings: { enabled: false },
        watchedItems: {
          "netflix:legacy": {
            markedAt: "2026-01-01T00:00:00.000Z",
            platform: "netflix",
            title: "Legacy"
          }
        }
      })
    ).resolves.toMatchObject({
      importedItems: 1,
      restoredSettings: true
    });
  });

  it("rejects versioned envelopes from another app or a future schema", async () => {
    await expect(
      importBackupPayload({
        app: "another-extension",
        schemaVersion: BACKUP_SCHEMA_VERSION,
        watchedItems: []
      })
    ).rejects.toMatchObject({ code: "invalid-envelope" });

    await expect(
      importBackupPayload({
        app: BACKUP_APP_ID,
        schemaVersion: BACKUP_SCHEMA_VERSION + 1,
        watchedItems: []
      })
    ).rejects.toMatchObject({ code: "unsupported-version" });
  });

  it("requires the current versioned envelope to contain its item array", async () => {
    await expect(
      importBackupPayload({
        app: BACKUP_APP_ID,
        schemaVersion: BACKUP_SCHEMA_VERSION,
        settings: {}
      })
    ).rejects.toMatchObject({ code: "missing-items" });
  });

  it("limits backup file size, item count, and oversized fields before persistence", async () => {
    expect(() => assertBackupFileSize(MAX_BACKUP_FILE_BYTES)).not.toThrow();
    expect(() => assertBackupFileSize(MAX_BACKUP_FILE_BYTES + 1)).toThrow(BackupImportError);

    await expect(
      importBackupPayload({
        app: BACKUP_APP_ID,
        schemaVersion: BACKUP_SCHEMA_VERSION,
        watchedItems: new Array(MAX_BACKUP_ITEMS + 1).fill(null)
      })
    ).rejects.toMatchObject({ code: "too-many-items" });

    await expect(
      importBackupPayload({
        app: BACKUP_APP_ID,
        schemaVersion: BACKUP_SCHEMA_VERSION,
        watchedItems: [
          {
            key: `netflix:${"x".repeat(2_048)}`,
            markedAt: "2026-01-01T00:00:00.000Z",
            platform: "netflix",
            title: "Oversized"
          }
        ]
      })
    ).rejects.toMatchObject({ code: "invalid-item" });
  });

  it("drops non-HTTP URLs from imported watched items", async () => {
    await importBackupPayload({
      app: BACKUP_APP_ID,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      watchedItems: [
        {
          key: "youtube:unsafe",
          markedAt: "2026-01-01T00:00:00.000Z",
          platform: "youtube",
          source: "manual",
          title: "Unsafe",
          url: "javascript:alert(1)"
        }
      ]
    });

    expect(storageState.watchedItems["youtube:unsafe"]?.url).toBeUndefined();
  });

  it("uses a dated backup filename", () => {
    expect(getBackupFilename(new Date("2026-07-08T12:00:00.000Z"))).toBe("watched-filter-backup-2026-07-08.json");
  });
});
