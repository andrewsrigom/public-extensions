import { browser } from "wxt/browser";
import type { QuickNote } from "./model";
import {
  applyNoteMutation,
  LEGACY_NOTES_STORAGE_KEY,
  loadNotes,
  NOTES_STORAGE_KEY,
  NOTE_STORAGE_PREFIX,
  normalizeStoredNotes
} from "./storage";

const storageState = vi.hoisted(() => ({
  values: {} as Record<string, unknown>
}));

vi.mock("wxt/browser", () => ({
  browser: {
    runtime: {
      sendMessage: vi.fn()
    },
    storage: {
      local: {
        get: vi.fn(async (keys: unknown) => {
          if (keys === null) return { ...storageState.values };

          const requestedKeys = Array.isArray(keys) ? keys : [keys];
          return Object.fromEntries(
            requestedKeys
              .filter((key): key is string => typeof key === "string")
              .filter((key) => Object.hasOwn(storageState.values, key))
              .map((key) => [key, storageState.values[key]])
          );
        }),
        remove: vi.fn(async (keys: string | string[]) => {
          for (const key of Array.isArray(keys) ? keys : [keys]) {
            delete storageState.values[key];
          }
        }),
        set: vi.fn(async (values: Record<string, unknown>) => {
          Object.assign(storageState.values, values);
        })
      }
    }
  }
}));

describe("quick notes storage", () => {
  beforeEach(() => {
    storageState.values = {};
    vi.clearAllMocks();
  });

  it("keeps only valid stored notes and initializes legacy revisions", () => {
    expect(
      normalizeStoredNotes([
        {
          id: "one",
          content: "Keep me   ",
          scope: "global",
          pinned: true,
          archived: true,
          createdAt: "2026-07-08T12:00:00.000Z",
          updatedAt: "2026-07-08T12:00:00.000Z"
        },
        {
          id: "bad",
          content: "No scope",
          createdAt: "2026-07-08T12:00:00.000Z",
          updatedAt: "2026-07-08T12:00:00.000Z"
        }
      ])
    ).toEqual([
      {
        id: "one",
        blocks: [
          {
            content: "Keep me",
            type: "paragraph"
          }
        ],
        content: "Keep me",
        scope: "global",
        pinned: true,
        archived: true,
        revision: 0,
        createdAt: "2026-07-08T12:00:00.000Z",
        updatedAt: "2026-07-08T12:00:00.000Z"
      }
    ]);
  });

  it("copies v1 notes into isolated v2 keys while retaining the legacy fallback", async () => {
    const legacyNote = note("legacy", "Legacy content");
    delete legacyNote.revision;
    storageState.values[LEGACY_NOTES_STORAGE_KEY] = {
      notes: [legacyNote]
    };

    await expect(loadNotes()).resolves.toMatchObject([
      {
        id: "legacy",
        content: "Legacy content",
        revision: 0
      }
    ]);

    expect(storageState.values[LEGACY_NOTES_STORAGE_KEY]).toEqual({
      notes: [legacyNote]
    });
    expect(storageState.values[NOTES_STORAGE_KEY]).toEqual({
      version: 2
    });
    expect(storageState.values[`${NOTE_STORAGE_PREFIX}legacy`]).toMatchObject({
      id: "legacy",
      revision: 0
    });
  });

  it("migrates legacy notes in the MV3 service worker without a DOM", async () => {
    const browserDocument = globalThis.document;
    storageState.values[LEGACY_NOTES_STORAGE_KEY] = {
      notes: [note("legacy-worker", "<strong>Legacy</strong><br>worker")]
    };
    vi.stubGlobal("document", undefined);

    try {
      await expect(loadNotes()).resolves.toEqual([
        expect.objectContaining({
          id: "legacy-worker",
          content: "Legacy worker",
          revision: 0
        })
      ]);
    } finally {
      vi.stubGlobal("document", browserDocument);
    }
  });

  it("serializes first-run migration with a concurrent edit so legacy data cannot overwrite the edit", async () => {
    storageState.values[LEGACY_NOTES_STORAGE_KEY] = {
      notes: [note("legacy-race", "Legacy value")]
    };

    const [, mutationResult] = await Promise.all([
      loadNotes(),
      applyNoteMutation({
        action: "upsert",
        expectedRevision: 0,
        note: note("legacy-race", "Edited value")
      })
    ]);

    expect(mutationResult).toMatchObject({ outcome: "saved", note: { content: "Edited value", revision: 1 } });
    await expect(loadNotes()).resolves.toEqual([
      expect.objectContaining({ id: "legacy-race", content: "Edited value", revision: 1 })
    ]);
  });

  it("serializes concurrent mutations so changes to different notes cannot overwrite each other", async () => {
    storageState.values[NOTES_STORAGE_KEY] = {
      version: 2
    };

    const [firstResult, secondResult] = await Promise.all([
      applyNoteMutation({
        action: "upsert",
        expectedRevision: 0,
        note: note("first", "First note")
      }),
      applyNoteMutation({
        action: "upsert",
        expectedRevision: 0,
        note: note("second", "Second note")
      })
    ]);

    expect(firstResult.outcome).toBe("saved");
    expect(secondResult.outcome).toBe("saved");
    await expect(loadNotes()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "first", content: "First note", revision: 1 }),
        expect.objectContaining({ id: "second", content: "Second note", revision: 1 })
      ])
    );
  });

  it("preserves both edits as separate notes when two views update the same revision", async () => {
    storageState.values[NOTES_STORAGE_KEY] = {
      version: 2
    };
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000001");

    await applyNoteMutation({
      action: "upsert",
      expectedRevision: 0,
      note: note("shared", "Initial")
    });

    const [firstResult, secondResult] = await Promise.all([
      applyNoteMutation({
        action: "upsert",
        expectedRevision: 1,
        note: {
          ...note("shared", "Side panel edit"),
          revision: 1
        }
      }),
      applyNoteMutation({
        action: "upsert",
        expectedRevision: 1,
        note: {
          ...note("shared", "Full page edit"),
          revision: 1
        }
      })
    ]);

    expect(firstResult).toMatchObject({
      outcome: "saved",
      note: {
        id: "shared",
        revision: 2
      }
    });
    expect(secondResult).toMatchObject({
      outcome: "conflict-copy",
      note: {
        id: "00000000-0000-4000-8000-000000000001",
        revision: 1
      }
    });

    const notes = await loadNotes();
    expect(notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "shared", content: "Side panel edit" }),
        expect.objectContaining({ id: "00000000-0000-4000-8000-000000000001", content: "Full page edit" })
      ])
    );
  });

  it("refuses a stale delete and leaves the newer note intact", async () => {
    storageState.values[NOTES_STORAGE_KEY] = {
      version: 2
    };
    storageState.values[`${NOTE_STORAGE_PREFIX}shared`] = {
      ...note("shared", "Newer content"),
      revision: 3
    };

    await expect(
      applyNoteMutation({
        action: "delete",
        expectedRevision: 2,
        noteId: "shared"
      })
    ).resolves.toMatchObject({
      outcome: "delete-conflict",
      note: {
        id: "shared",
        revision: 3
      }
    });
    expect(storageState.values[`${NOTE_STORAGE_PREFIX}shared`]).toMatchObject({
      content: "Newer content",
      revision: 3
    });
    expect(browser.storage.local.remove).not.toHaveBeenCalled();
  });

  it("handles missing storage values", () => {
    expect(normalizeStoredNotes(null)).toEqual([]);
    expect(normalizeStoredNotes({ notes: [] })).toEqual([]);
  });
});

function note(id: string, content: string): QuickNote {
  return {
    id,
    content,
    scope: "global",
    revision: 0,
    createdAt: "2026-07-08T12:00:00.000Z",
    updatedAt: "2026-07-08T12:00:00.000Z"
  };
}
