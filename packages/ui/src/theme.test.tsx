import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { ExtensionThemePreference } from "./components/theme-selector";
import { useExtensionTheme, type ResolvedExtensionTheme } from "./theme";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type ThemeSnapshot = {
  resolvedTheme: ResolvedExtensionTheme;
  setTheme: (theme: ExtensionThemePreference) => void;
  theme: ExtensionThemePreference;
};

describe("useExtensionTheme", () => {
  const storageKey = "test-extension:theme";
  let container: HTMLDivElement;
  let root: Root;
  let snapshots: ThemeSnapshot[];
  let storageData: Record<string, unknown>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    snapshots = [];
    storageData = {};
    localStorage.clear();
    document.documentElement.removeAttribute("data-extension-theme");
    document.documentElement.removeAttribute("data-extension-theme-preference");
    installExtensionStorage();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    delete (globalThis as typeof globalThis & { browser?: unknown }).browser;
  });

  it("loads and applies a theme from extension-local storage", async () => {
    storageData[storageKey] = "dark";

    await renderProbe();

    expect(getLatestSnapshot()).toMatchObject({
      resolvedTheme: "dark",
      theme: "dark"
    });
    expect(document.documentElement.dataset.extensionTheme).toBe("dark");
    expect(document.documentElement.dataset.extensionThemePreference).toBe("dark");
  });

  it("migrates a legacy localStorage theme into extension-local storage", async () => {
    localStorage.setItem(storageKey, "light");

    await renderProbe();

    expect(storageData[storageKey]).toBe("light");
    expect(localStorage.getItem(storageKey)).toBeNull();
    expect(getLatestSnapshot()).toMatchObject({
      resolvedTheme: "light",
      theme: "light"
    });
  });

  it("writes theme changes to extension-local storage", async () => {
    await renderProbe();

    await act(async () => {
      getLatestSnapshot().setTheme("dark");
      await flushEffects();
    });

    expect(storageData[storageKey]).toBe("dark");
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it("applies the theme to an isolated host instead of the page root", async () => {
    const themeHost = document.createElement("aside");
    document.body.append(themeHost);

    await act(async () => {
      root.render(
        <ThemeProbe onSnapshot={(snapshot) => snapshots.push(snapshot)} storageKey={storageKey} target={themeHost} />
      );
      await flushEffects();
    });

    expect(themeHost.dataset.extensionTheme).toBe("light");
    expect(themeHost.dataset.extensionThemePreference).toBe("light");
    expect(document.documentElement.dataset.extensionTheme).toBeUndefined();

    await act(async () => {
      getLatestSnapshot().setTheme("dark");
      await flushEffects();
    });
    expect(themeHost.dataset.extensionTheme).toBe("dark");
    themeHost.remove();
  });

  it("falls back to localStorage when extension storage is unavailable", async () => {
    delete (globalThis as typeof globalThis & { browser?: unknown }).browser;
    await renderProbe();

    await act(async () => {
      getLatestSnapshot().setTheme("dark");
      await flushEffects();
    });

    expect(localStorage.getItem(storageKey)).toBe("dark");
  });

  async function renderProbe(): Promise<void> {
    await act(async () => {
      root.render(<ThemeProbe onSnapshot={(snapshot) => snapshots.push(snapshot)} storageKey={storageKey} />);
      await flushEffects();
    });
  }

  function getLatestSnapshot(): ThemeSnapshot {
    const snapshot = snapshots.at(-1);
    if (!snapshot) throw new Error("Theme snapshot was not captured.");
    return snapshot;
  }

  function installExtensionStorage(): void {
    (globalThis as typeof globalThis & { browser?: unknown }).browser = {
      storage: {
        local: {
          get(key: string, callback: (items: Record<string, unknown>) => void): void {
            callback({ [key]: storageData[key] });
          },
          set(items: Record<string, unknown>, callback: () => void): void {
            Object.assign(storageData, items);
            callback();
          }
        }
      }
    };
  }
});

function ThemeProbe({
  onSnapshot,
  storageKey,
  target
}: {
  onSnapshot: (snapshot: ThemeSnapshot) => void;
  storageKey: string;
  target?: HTMLElement;
}) {
  const snapshot = useExtensionTheme({ defaultTheme: "light", storageKey, target });

  useEffect(() => {
    onSnapshot(snapshot);
  }, [onSnapshot, snapshot]);

  return null;
}

async function flushEffects(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => window.setTimeout(resolve, 0));
}
