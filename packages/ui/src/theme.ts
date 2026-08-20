import { useCallback, useEffect, useRef, useState } from "react";

import type { ExtensionThemePreference } from "./components/theme-selector";

export type ResolvedExtensionTheme = "dark" | "light";

const DEFAULT_STORAGE_KEY = "browser-extensions:theme";

export type UseExtensionThemeOptions = {
  defaultTheme?: ExtensionThemePreference;
  storageKey?: string;
  target?: HTMLElement | null;
};

type StoredValues = Record<string, unknown>;
type StorageCallback = (items: StoredValues) => void;
type ExtensionStorageArea = {
  get: (key: string, callback?: StorageCallback) => Promise<StoredValues> | void;
  remove?: (key: string, callback?: () => void) => Promise<void> | void;
  set: (items: StoredValues, callback?: () => void) => Promise<void> | void;
};
type ExtensionRuntime = {
  storage?: {
    local?: Partial<ExtensionStorageArea>;
  };
};

export function useExtensionTheme({
  defaultTheme = "dark",
  storageKey = DEFAULT_STORAGE_KEY,
  target
}: UseExtensionThemeOptions = {}) {
  const loadVersionRef = useRef(0);
  const [theme, setThemeState] = useState<ExtensionThemePreference>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedExtensionTheme>(() => resolveTheme(theme));

  useEffect(() => {
    const loadVersion = ++loadVersionRef.current;

    void readStoredTheme(storageKey, defaultTheme).then((storedTheme) => {
      if (loadVersionRef.current === loadVersion) {
        setThemeState(storedTheme);
      }
    });
  }, [defaultTheme, storageKey]);

  useEffect(() => {
    const applyTheme = (): void => {
      const nextResolvedTheme = resolveTheme(theme);
      const themeTarget = target ?? document.documentElement;
      themeTarget.dataset.extensionTheme = nextResolvedTheme;
      themeTarget.dataset.extensionThemePreference = theme;
      setResolvedTheme(nextResolvedTheme);
    };

    applyTheme();

    if (theme !== "system") return undefined;

    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
    mediaQuery?.addEventListener("change", applyTheme);

    return () => {
      mediaQuery?.removeEventListener("change", applyTheme);
    };
  }, [target, theme]);

  const setTheme = useCallback(
    (nextTheme: ExtensionThemePreference): void => {
      loadVersionRef.current += 1;
      setThemeState(nextTheme);
      void writeStoredTheme(storageKey, nextTheme);
    },
    [storageKey]
  );

  return {
    resolvedTheme,
    setTheme,
    theme
  };
}

async function readStoredTheme(
  storageKey: string,
  fallback: ExtensionThemePreference
): Promise<ExtensionThemePreference> {
  const extensionTheme = await readExtensionStoredTheme(storageKey);
  if (extensionTheme) return extensionTheme;

  const legacyTheme = readLegacyStoredTheme(storageKey);
  if (legacyTheme) {
    await writeStoredTheme(storageKey, legacyTheme);
    return legacyTheme;
  }

  return fallback;
}

async function writeStoredTheme(storageKey: string, theme: ExtensionThemePreference): Promise<void> {
  const didWriteExtensionStorage = await writeExtensionStoredTheme(storageKey, theme);

  if (didWriteExtensionStorage) {
    removeLegacyStoredTheme(storageKey);
  } else {
    writeLegacyStoredTheme(storageKey, theme);
  }
}

async function readExtensionStoredTheme(storageKey: string): Promise<ExtensionThemePreference | null> {
  const storageArea = getExtensionStorageArea();
  if (!storageArea) return null;

  try {
    const stored = await callStorageGet(storageArea, storageKey);
    return isThemePreference(stored[storageKey]) ? stored[storageKey] : null;
  } catch {
    return null;
  }
}

async function writeExtensionStoredTheme(storageKey: string, theme: ExtensionThemePreference): Promise<boolean> {
  const storageArea = getExtensionStorageArea();
  if (!storageArea) return false;

  try {
    await callStorageSet(storageArea, { [storageKey]: theme });
    return true;
  } catch {
    return false;
  }
}

function readLegacyStoredTheme(storageKey: string): ExtensionThemePreference | null {
  try {
    const stored = localStorage.getItem(storageKey);
    return isThemePreference(stored) ? stored : null;
  } catch {
    return null;
  }
}

function writeLegacyStoredTheme(storageKey: string, theme: ExtensionThemePreference): void {
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    // localStorage can be unavailable in restricted contexts.
  }
}

function removeLegacyStoredTheme(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // localStorage can be unavailable in restricted contexts.
  }
}

function getExtensionStorageArea(): ExtensionStorageArea | null {
  const runtime =
    (globalThis as typeof globalThis & { browser?: ExtensionRuntime; chrome?: ExtensionRuntime }).browser ??
    (globalThis as typeof globalThis & { browser?: ExtensionRuntime; chrome?: ExtensionRuntime }).chrome;
  const storageArea = runtime?.storage?.local;

  if (typeof storageArea?.get !== "function" || typeof storageArea.set !== "function") return null;

  return storageArea as ExtensionStorageArea;
}

function callStorageGet(storageArea: ExtensionStorageArea, storageKey: string): Promise<StoredValues> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const resolveOnce = (items: StoredValues | undefined): void => {
      if (settled) return;
      settled = true;
      resolve(items ?? {});
    };
    const rejectOnce = (error: unknown): void => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    try {
      const result = storageArea.get(storageKey, resolveOnce);
      if (isPromiseLike<StoredValues>(result)) {
        void result.then(resolveOnce, rejectOnce);
      }
    } catch (error) {
      rejectOnce(error);
    }
  });
}

function callStorageSet(storageArea: ExtensionStorageArea, items: StoredValues): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const resolveOnce = (): void => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const rejectOnce = (error: unknown): void => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    try {
      const result = storageArea.set(items, resolveOnce);
      if (isPromiseLike<void>(result)) {
        void result.then(resolveOnce, rejectOnce);
      }
    } catch (error) {
      rejectOnce(error);
    }
  });
}

function resolveTheme(theme: ExtensionThemePreference): ResolvedExtensionTheme {
  if (theme === "light" || theme === "dark") return theme;

  try {
    return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function isThemePreference(value: unknown): value is ExtensionThemePreference {
  return value === "dark" || value === "light" || value === "system";
}

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return Boolean(
    value && typeof value === "object" && "then" in value && typeof (value as { then?: unknown }).then === "function"
  );
}
