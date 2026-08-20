import { browser } from "wxt/browser";
import { resolveNoteLanguage, type NoteLanguage } from "./i18n";

export const SETTINGS_STORAGE_KEY = "quick-notes:settings:v1";

interface QuickNotesSettings {
  language?: unknown;
}

export async function loadNoteLanguage(): Promise<NoteLanguage | null> {
  const value = (await browser.storage.sync.get(SETTINGS_STORAGE_KEY)) as Record<
    string,
    QuickNotesSettings | undefined
  >;
  const language = value[SETTINGS_STORAGE_KEY]?.language;

  return typeof language === "string" ? resolveNoteLanguage(language) : null;
}

export async function saveNoteLanguage(language: NoteLanguage): Promise<void> {
  await browser.storage.sync.set({
    [SETTINGS_STORAGE_KEY]: {
      language
    }
  });
}
