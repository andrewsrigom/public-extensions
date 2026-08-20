import { browser } from "wxt/browser";
import type { QuickNote } from "./model";
import { getNoteBlocks, noteBlocksToPlainText, noteContentToPlainText, normalizeNoteBlocks } from "./model";

export const LEGACY_NOTES_STORAGE_KEY = "quick-notes:notes:v1";
export const NOTES_STORAGE_KEY = "quick-notes:storage:v2";
export const NOTE_STORAGE_PREFIX = "quick-notes:note:v2:";
export const NOTE_MUTATION_MESSAGE = "quick-notes:mutate:v2";
export const NOTE_READ_MESSAGE = "quick-notes:read:v2";

const STORAGE_VERSION = 2;

interface LegacyNotesStorageValue {
  notes?: unknown;
}

interface NotesStorageMetadata {
  version?: unknown;
}

export type NoteMutation =
  | {
      action: "upsert";
      expectedRevision: number;
      note: QuickNote;
    }
  | {
      action: "delete";
      expectedRevision: number;
      noteId: string;
    };

export interface NoteMutationMessage {
  type: typeof NOTE_MUTATION_MESSAGE;
  mutation: NoteMutation;
}

export interface NoteReadMessage {
  type: typeof NOTE_READ_MESSAGE;
}

export type NoteMutationResult =
  | {
      outcome: "saved";
      note: QuickNote;
      noteId: string;
    }
  | {
      outcome: "deleted";
      noteId: string;
    }
  | {
      outcome: "conflict-copy";
      note: QuickNote;
      noteId: string;
    }
  | {
      outcome: "delete-conflict";
      note: QuickNote;
      noteId: string;
    };

let storageQueue: Promise<unknown> = Promise.resolve();

export function loadNotes(): Promise<QuickNote[]> {
  return enqueueStorageOperation(loadNotesNow);
}

async function loadNotesNow(): Promise<QuickNote[]> {
  await migrateLegacyNotesNow();
  const values = (await browser.storage.local.get(null)) as Record<string, unknown>;

  return Object.entries(values)
    .filter(([key]) => isNoteStorageKey(key))
    .map(([, value]) => normalizeStoredNote(value))
    .filter((note): note is QuickNote => Boolean(note))
    .filter((note) => note.content.trim().length > 0);
}

export function migrateLegacyNotes(): Promise<void> {
  return enqueueStorageOperation(migrateLegacyNotesNow);
}

async function migrateLegacyNotesNow(): Promise<void> {
  const values = (await browser.storage.local.get([NOTES_STORAGE_KEY, LEGACY_NOTES_STORAGE_KEY])) as Record<
    string,
    NotesStorageMetadata | LegacyNotesStorageValue | undefined
  >;
  const metadata = values[NOTES_STORAGE_KEY] as NotesStorageMetadata | undefined;

  if (metadata?.version === STORAGE_VERSION) return;

  const legacyValue = values[LEGACY_NOTES_STORAGE_KEY] as LegacyNotesStorageValue | undefined;
  const legacyNotes = normalizeStoredNotes(legacyValue?.notes);
  const migratedValues: Record<string, unknown> = {
    [NOTES_STORAGE_KEY]: {
      version: STORAGE_VERSION
    }
  };

  for (const note of legacyNotes) {
    migratedValues[getNoteStorageKey(note.id)] = note;
  }

  // Copy-only migration: keep the v1 snapshot as a recovery fallback.
  await browser.storage.local.set(migratedValues);
}

export function applyNoteMutation(mutation: NoteMutation): Promise<NoteMutationResult> {
  return enqueueStorageOperation(() => applyNoteMutationNow(mutation));
}

export async function requestNotes(): Promise<QuickNote[]> {
  const response = (await browser.runtime.sendMessage({
    type: NOTE_READ_MESSAGE
  } satisfies NoteReadMessage)) as unknown;

  if (!Array.isArray(response)) {
    throw new Error("Quick Notes background returned an invalid read response.");
  }

  return response.map((note) => normalizeStoredNote(note)).filter((note): note is QuickNote => Boolean(note));
}

export async function requestNoteMutation(mutation: NoteMutation): Promise<NoteMutationResult> {
  const response = (await browser.runtime.sendMessage({
    type: NOTE_MUTATION_MESSAGE,
    mutation
  } satisfies NoteMutationMessage)) as unknown;

  if (!isNoteMutationResult(response)) {
    throw new Error("Quick Notes background returned an invalid persistence response.");
  }

  return response;
}

export function isNoteMutationMessage(value: unknown): value is NoteMutationMessage {
  if (!value || typeof value !== "object") return false;

  const message = value as { mutation?: unknown; type?: unknown };
  if (message.type !== NOTE_MUTATION_MESSAGE || !message.mutation || typeof message.mutation !== "object") {
    return false;
  }

  const mutation = message.mutation as {
    action?: unknown;
    expectedRevision?: unknown;
    note?: unknown;
    noteId?: unknown;
  };
  if (!isRevision(mutation.expectedRevision)) return false;

  if (mutation.action === "delete") {
    return typeof mutation.noteId === "string" && mutation.noteId.length > 0;
  }

  return mutation.action === "upsert" && Boolean(normalizeStoredNote(mutation.note));
}

export function isNoteReadMessage(value: unknown): value is NoteReadMessage {
  return Boolean(value && typeof value === "object" && (value as { type?: unknown }).type === NOTE_READ_MESSAGE);
}

export function isNoteStorageKey(key: string): boolean {
  return key.startsWith(NOTE_STORAGE_PREFIX);
}

export function getNoteIdFromStorageKey(key: string): string | null {
  if (!isNoteStorageKey(key)) return null;

  try {
    return decodeURIComponent(key.slice(NOTE_STORAGE_PREFIX.length));
  } catch {
    return null;
  }
}

export function normalizeStoredNotes(value: unknown): QuickNote[] {
  if (!Array.isArray(value)) return [];

  return value.map((note) => normalizeStoredNote(note)).filter((note): note is QuickNote => Boolean(note));
}

export function normalizeStoredNote(value: unknown): QuickNote | null {
  if (!isQuickNote(value)) return null;

  const blocks = value.blocks ? normalizeNoteBlocks(value.blocks) : getStorageNoteBlocks(value);
  const normalizedNote: QuickNote = {
    ...value,
    blocks,
    revision: normalizeRevision(value.revision),
    scope: value.siteKey ? "site" : "global",
    content: noteBlocksToPlainText(blocks) || noteContentFallback(value.content)
  };

  if (value.pinned === true) {
    normalizedNote.pinned = true;
  } else {
    delete normalizedNote.pinned;
  }

  if (value.archived === true) {
    normalizedNote.archived = true;
  } else {
    delete normalizedNote.archived;
  }

  return normalizedNote;
}

async function applyNoteMutationNow(mutation: NoteMutation): Promise<NoteMutationResult> {
  await migrateLegacyNotesNow();

  if (mutation.action === "delete") {
    return deleteNote(mutation.noteId, mutation.expectedRevision);
  }

  const note = normalizeStoredNote(mutation.note);
  if (!note) {
    throw new Error("Cannot persist an invalid note.");
  }

  if (!note.content.trim()) {
    return deleteNote(note.id, mutation.expectedRevision);
  }

  const storageKey = getNoteStorageKey(note.id);
  const currentValue = (await browser.storage.local.get(storageKey)) as Record<string, unknown>;
  const currentNote = normalizeStoredNote(currentValue[storageKey]);
  const expectedRevision = normalizeRevision(mutation.expectedRevision);

  if (!revisionMatches(currentNote, expectedRevision)) {
    const conflictCopy = createConflictCopy(note);
    await browser.storage.local.set({
      [getNoteStorageKey(conflictCopy.id)]: conflictCopy
    });
    return {
      outcome: "conflict-copy",
      note: conflictCopy,
      noteId: note.id
    };
  }

  const savedNote: QuickNote = {
    ...note,
    revision: expectedRevision + 1
  };
  await browser.storage.local.set({
    [storageKey]: savedNote
  });

  return {
    outcome: "saved",
    note: savedNote,
    noteId: note.id
  };
}

function enqueueStorageOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageQueue.then(operation);
  storageQueue = result.catch(() => undefined);
  return result;
}

async function deleteNote(noteId: string, expectedRevisionValue: number): Promise<NoteMutationResult> {
  const storageKey = getNoteStorageKey(noteId);
  const currentValue = (await browser.storage.local.get(storageKey)) as Record<string, unknown>;
  const currentNote = normalizeStoredNote(currentValue[storageKey]);
  const expectedRevision = normalizeRevision(expectedRevisionValue);

  if (!currentNote) {
    return {
      outcome: "deleted",
      noteId
    };
  }

  if (normalizeRevision(currentNote.revision) !== expectedRevision) {
    return {
      outcome: "delete-conflict",
      note: currentNote,
      noteId
    };
  }

  await browser.storage.local.remove(storageKey);
  return {
    outcome: "deleted",
    noteId
  };
}

function revisionMatches(currentNote: QuickNote | null, expectedRevision: number): boolean {
  if (!currentNote) return expectedRevision === 0;
  return normalizeRevision(currentNote.revision) === expectedRevision;
}

function createConflictCopy(note: QuickNote): QuickNote {
  const now = new Date().toISOString();

  return {
    ...note,
    id: crypto.randomUUID(),
    revision: 1,
    createdAt: now,
    updatedAt: now
  };
}

function getNoteStorageKey(noteId: string): string {
  return `${NOTE_STORAGE_PREFIX}${encodeURIComponent(noteId)}`;
}

function normalizeRevision(value: unknown): number {
  return isRevision(value) ? value : 0;
}

function isRevision(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isNoteMutationResult(value: unknown): value is NoteMutationResult {
  if (!value || typeof value !== "object") return false;

  const result = value as { note?: unknown; noteId?: unknown; outcome?: unknown };
  if (typeof result.noteId !== "string") return false;

  if (result.outcome === "saved" || result.outcome === "conflict-copy" || result.outcome === "delete-conflict") {
    return Boolean(normalizeStoredNote(result.note));
  }

  return result.outcome === "deleted";
}

function noteContentFallback(content: string): string {
  return canUseDom() ? noteContentToPlainText(content) : legacyContentToPlainText(content);
}

function getStorageNoteBlocks(note: QuickNote): ReturnType<typeof getNoteBlocks> {
  if (canUseDom()) return getNoteBlocks(note);

  return [
    {
      type: "paragraph",
      content: legacyContentToPlainText(note.content)
    }
  ];
}

function legacyContentToPlainText(content: string): string {
  return content
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<\/\s*(?:div|li|p)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function canUseDom(): boolean {
  return typeof document !== "undefined";
}

function isQuickNote(value: unknown): value is QuickNote {
  if (!value || typeof value !== "object") return false;

  const note = value as Partial<QuickNote>;
  const hasValidScope = note.scope === "global" || note.scope === "site";

  return (
    typeof note.id === "string" &&
    note.id.length > 0 &&
    typeof note.content === "string" &&
    hasValidScope &&
    typeof note.createdAt === "string" &&
    typeof note.updatedAt === "string"
  );
}
