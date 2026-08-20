import { useEffect, useRef, useState } from "react";
import { browser } from "wxt/browser";
import type { QuickNote } from "./model";
import {
  getNoteIdFromStorageKey,
  isNoteStorageKey,
  normalizeStoredNote,
  requestNoteMutation,
  requestNotes,
  type NoteMutation,
  type NoteMutationResult
} from "./storage";

const SAVE_DELAY_MS = 250;

interface PersistenceMessages {
  conflictCopySaved: string;
  deleteConflict: string;
  loadFailed: string;
  saveFailed: string;
}

interface UseNotePersistenceOptions {
  messages: PersistenceMessages;
  onStatus: (status: string) => void;
}

interface UpdateNoteOptions {
  immediate?: boolean;
  successStatus: string;
}

interface NotePersistence {
  notes: QuickNote[];
  createDraft: (note: QuickNote) => void;
  deleteNote: (noteId: string, options: UpdateNoteOptions) => void;
  replaceFromStorage: (storedNotes: QuickNote[]) => void;
  updateNote: (noteId: string, update: (note: QuickNote) => QuickNote, options: UpdateNoteOptions) => void;
}

type PendingPersistence =
  | {
      action: "upsert";
      note: QuickNote;
      successStatus: string;
    }
  | {
      action: "delete";
      noteId: string;
      successStatus: string;
    };

export function useNotePersistence(options: UseNotePersistenceOptions): NotePersistence {
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const notesRef = useRef<QuickNote[]>([]);
  const noteRevisions = useRef(new Map<string, number>());
  const pendingPersistence = useRef(new Map<string, PendingPersistence>());
  const persistenceTimers = useRef(new Map<string, number>());
  const inFlightNoteIds = useRef(new Set<string>());
  const optionsRef = useRef(options);

  optionsRef.current = options;

  useEffect(() => {
    const handleStorageChanged = (changes: Record<string, unknown>, areaName: string): void => {
      if (areaName !== "local") return;

      for (const [key, rawChange] of Object.entries(changes)) {
        if (!isNoteStorageKey(key)) continue;

        const noteId = getNoteIdFromStorageKey(key);
        if (!noteId || pendingPersistence.current.has(noteId) || inFlightNoteIds.current.has(noteId)) {
          continue;
        }

        const change = rawChange as { newValue?: unknown };
        applyExternalStoredNote(noteId, normalizeStoredNote(change.newValue));
      }
    };

    browser.storage.onChanged.addListener(handleStorageChanged);

    return () => {
      browser.storage.onChanged.removeListener(handleStorageChanged);
    };
  }, []);

  useEffect(() => {
    const handlePageHide = (): void => {
      flushAllPendingPersistence();
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      flushAllPendingPersistence();
    };
  }, []);

  function setCurrentNotes(nextNotes: QuickNote[]): void {
    notesRef.current = nextNotes;
    setNotes(nextNotes);
  }

  function replaceFromStorage(storedNotes: QuickNote[]): void {
    const protectedIds = new Set([...pendingPersistence.current.keys(), ...inFlightNoteIds.current.values()]);
    const storedIds = new Set(storedNotes.map((note) => note.id));

    for (const note of notesRef.current) {
      if (getNoteRevision(note) === 0 && !storedIds.has(note.id)) {
        protectedIds.add(note.id);
      }
    }

    const protectedNotes = notesRef.current.filter((note) => protectedIds.has(note.id));
    const nextStoredNotes = storedNotes.filter((note) => !protectedIds.has(note.id));

    for (const note of nextStoredNotes) {
      noteRevisions.current.set(note.id, getNoteRevision(note));
    }

    setCurrentNotes([...protectedNotes, ...nextStoredNotes]);
  }

  function applyExternalStoredNote(noteId: string, storedNote: QuickNote | null): void {
    if (storedNote && storedNote.id !== noteId) return;

    if (storedNote) {
      noteRevisions.current.set(noteId, getNoteRevision(storedNote));
      setCurrentNotes([storedNote, ...notesRef.current.filter((note) => note.id !== noteId)]);
      return;
    }

    noteRevisions.current.delete(noteId);
    setCurrentNotes(notesRef.current.filter((note) => note.id !== noteId));
  }

  function queuePersistence(nextPersistence: PendingPersistence, immediate = false): void {
    const noteId = getPendingNoteId(nextPersistence);
    pendingPersistence.current.set(noteId, nextPersistence);
    clearPersistenceTimer(noteId);

    if (immediate) {
      flushPendingPersistence(noteId);
      return;
    }

    const timer = window.setTimeout(() => {
      persistenceTimers.current.delete(noteId);
      flushPendingPersistence(noteId);
    }, SAVE_DELAY_MS);
    persistenceTimers.current.set(noteId, timer);
  }

  function flushPendingPersistence(noteId: string): void {
    if (inFlightNoteIds.current.has(noteId)) return;

    const pending = pendingPersistence.current.get(noteId);
    if (!pending) return;

    pendingPersistence.current.delete(noteId);
    clearPersistenceTimer(noteId);
    inFlightNoteIds.current.add(noteId);
    let refreshAfterPersistence = false;
    let failed = false;

    void requestNoteMutation(toNoteMutation(pending))
      .then((result) => {
        refreshAfterPersistence = handleMutationResult(result, pending);
      })
      .catch(() => {
        failed = true;
        if (!pendingPersistence.current.has(noteId)) {
          pendingPersistence.current.set(noteId, pending);
        }
        optionsRef.current.onStatus(optionsRef.current.messages.saveFailed);
      })
      .finally(() => {
        inFlightNoteIds.current.delete(noteId);

        if (refreshAfterPersistence) {
          refreshFromStorage();
        }

        const queued = pendingPersistence.current.get(noteId);
        if (queued && (!failed || queued !== pending)) {
          flushPendingPersistence(noteId);
        }
      });
  }

  function flushAllPendingPersistence(): void {
    for (const timer of persistenceTimers.current.values()) {
      window.clearTimeout(timer);
    }
    persistenceTimers.current.clear();

    const pendingEntries = [...pendingPersistence.current.values()];
    pendingPersistence.current.clear();

    for (const pending of pendingEntries) {
      void requestNoteMutation(toNoteMutation(pending)).catch(() => undefined);
    }
  }

  function handleMutationResult(result: NoteMutationResult, pending: PendingPersistence): boolean {
    if (result.outcome === "saved") {
      noteRevisions.current.set(result.noteId, getNoteRevision(result.note));
      const hasNewerPendingValue = pendingPersistence.current.has(result.noteId);
      const nextNotes = notesRef.current.map((note) => {
        if (note.id !== result.noteId) return note;
        return hasNewerPendingValue ? { ...note, revision: result.note.revision } : result.note;
      });
      setCurrentNotes(nextNotes);
      optionsRef.current.onStatus(pending.successStatus);
      return true;
    }

    if (result.outcome === "deleted") {
      noteRevisions.current.delete(result.noteId);
      optionsRef.current.onStatus(pending.successStatus);
      return true;
    }

    if (result.outcome === "conflict-copy") {
      optionsRef.current.onStatus(optionsRef.current.messages.conflictCopySaved);
      return true;
    }

    optionsRef.current.onStatus(optionsRef.current.messages.deleteConflict);
    return true;
  }

  function refreshFromStorage(): void {
    void requestNotes()
      .then(replaceFromStorage)
      .catch(() => {
        optionsRef.current.onStatus(optionsRef.current.messages.loadFailed);
      });
  }

  function toNoteMutation(pending: PendingPersistence): NoteMutation {
    const noteId = getPendingNoteId(pending);
    const expectedRevision =
      noteRevisions.current.get(noteId) ?? (pending.action === "upsert" ? getNoteRevision(pending.note) : 0);

    if (pending.action === "delete") {
      return {
        action: "delete",
        expectedRevision,
        noteId
      };
    }

    return {
      action: "upsert",
      expectedRevision,
      note: pending.note
    };
  }

  function clearPersistenceTimer(noteId: string): void {
    const timer = persistenceTimers.current.get(noteId);
    if (timer === undefined) return;

    window.clearTimeout(timer);
    persistenceTimers.current.delete(noteId);
  }

  function createDraft(note: QuickNote): void {
    noteRevisions.current.set(note.id, 0);
    setCurrentNotes([note, ...notesRef.current]);
  }

  function updateNote(noteId: string, update: (note: QuickNote) => QuickNote, updateOptions: UpdateNoteOptions): void {
    const currentNote = notesRef.current.find((note) => note.id === noteId);
    if (!currentNote) return;

    const updatedNote = update(currentNote);
    setCurrentNotes(notesRef.current.map((note) => (note.id === noteId ? updatedNote : note)));
    queuePersistence(
      updatedNote.content.trim()
        ? {
            action: "upsert",
            note: updatedNote,
            successStatus: updateOptions.successStatus
          }
        : {
            action: "delete",
            noteId,
            successStatus: updateOptions.successStatus
          },
      updateOptions.immediate
    );
  }

  function deleteNote(noteId: string, updateOptions: UpdateNoteOptions): void {
    setCurrentNotes(notesRef.current.filter((note) => note.id !== noteId));
    queuePersistence(
      {
        action: "delete",
        noteId,
        successStatus: updateOptions.successStatus
      },
      updateOptions.immediate
    );
  }

  return {
    notes,
    createDraft,
    deleteNote,
    replaceFromStorage,
    updateNote
  };
}

function getPendingNoteId(pending: PendingPersistence): string {
  return pending.action === "upsert" ? pending.note.id : pending.noteId;
}

function getNoteRevision(note: QuickNote): number {
  return typeof note.revision === "number" && Number.isSafeInteger(note.revision) && note.revision >= 0
    ? note.revision
    : 0;
}
