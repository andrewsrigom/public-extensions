import { browser } from "wxt/browser";

import { getDefaultTimeZoneLanguage, isTimeZoneLanguage, type TimeZoneLanguage } from "./i18n";
import { formatDateForInput, isSupportedTimeZone, isValidDateInput, isValidTimeInput } from "./time";

export type Monitor = {
  id: string;
  label: string;
  timeZone: string;
};

export type Settings = {
  convertDate: string;
  convertTime: string;
  convertTimeZone: string;
  language: TimeZoneLanguage;
  monitors: Monitor[];
};

export const SETTINGS_KEY = "time-zone-helper:settings";

let settingsWriteQueue: Promise<void> = Promise.resolve();

export async function loadSettings(localTimeZone: string): Promise<Settings> {
  let stored: Record<string, unknown>;
  try {
    stored = await browser.storage.local.get(SETTINGS_KEY);
  } catch (error) {
    throw new Error("Could not read time-zone-helper settings.", { cause: error });
  }

  if (stored[SETTINGS_KEY] !== undefined) {
    return normalizeStoredSettings(stored[SETTINGS_KEY], localTimeZone);
  }

  const legacySettings = readLegacyLocalStorageSettings(localTimeZone);
  if (legacySettings) {
    try {
      await saveSettings(legacySettings);
      removeLegacyLocalStorageSettings();
    } catch {
      // Keep the legacy copy so a later popup session can retry the migration.
    }
    return legacySettings;
  }

  return getFallbackSettings(localTimeZone);
}

export async function saveSettings(settings: Settings): Promise<void> {
  const snapshot = cloneSettings(settings);
  const operation = settingsWriteQueue
    .catch(() => undefined)
    .then(() => browser.storage.local.set({ [SETTINGS_KEY]: snapshot }));
  settingsWriteQueue = operation;
  await operation;
}

export function normalizeStoredSettings(value: unknown, localTimeZone: string): Settings {
  const fallback = getFallbackSettings(localTimeZone);
  if (!isRecord(value)) return fallback;

  const legacyMonitorTimeZone = isValidTimeZoneSetting(value.monitorTimeZone) ? value.monitorTimeZone : "";
  const monitors = parseMonitors(value.monitors, legacyMonitorTimeZone);
  const convertTimeZone = isValidTimeZoneSetting(value.convertTimeZone) ? value.convertTimeZone : legacyMonitorTimeZone;
  const convertDate =
    typeof value.convertDate === "string" && isValidDateInput(value.convertDate)
      ? value.convertDate
      : fallback.convertDate;
  const convertTime =
    typeof value.convertTime === "string" && (value.convertTime === "" || isValidTimeInput(value.convertTime))
      ? value.convertTime
      : "";
  const language = isTimeZoneLanguage(value.language) ? value.language : fallback.language;

  return {
    convertDate,
    convertTime,
    convertTimeZone,
    language,
    monitors
  };
}

export function getFallbackSettings(localTimeZone: string): Settings {
  return {
    convertDate: formatDateForInput(new Date(), localTimeZone),
    convertTime: "",
    convertTimeZone: "",
    language: getDefaultTimeZoneLanguage(),
    monitors: []
  };
}

export function createMonitor(input: { label?: string; timeZone: string }): Monitor {
  return {
    id: createId(),
    label: input.label?.trim() ?? "",
    timeZone: input.timeZone
  };
}

export function isValidTimeZoneSetting(value: unknown): value is string {
  return typeof value === "string" && isSupportedTimeZone(value);
}

function readLegacyLocalStorageSettings(localTimeZone: string): Settings | null {
  try {
    const rawSettings = localStorage.getItem(SETTINGS_KEY);
    return rawSettings ? normalizeStoredSettings(JSON.parse(rawSettings) as unknown, localTimeZone) : null;
  } catch {
    return null;
  }
}
function removeLegacyLocalStorageSettings(): void {
  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch {
    // Restricted contexts can make localStorage unavailable.
  }
}

function cloneSettings(settings: Settings): Settings {
  return {
    ...settings,
    monitors: settings.monitors.map((monitor) => ({ ...monitor }))
  };
}

function parseMonitors(value: unknown, legacyMonitorTimeZone: string): Monitor[] {
  if (!Array.isArray(value)) {
    return legacyMonitorTimeZone ? [createMonitor({ timeZone: legacyMonitorTimeZone })] : [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item) || !isValidTimeZoneSetting(item.timeZone)) {
      return [];
    }

    return [
      {
        id: typeof item.id === "string" && item.id ? item.id : createId(),
        label: typeof item.label === "string" ? item.label : "",
        timeZone: item.timeZone
      }
    ];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
