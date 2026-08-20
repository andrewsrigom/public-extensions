import type * as ExtensionUiModule from "@browser-extensions/ui";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SETTINGS_DEFAULTS } from "../shared/defaults";
import { WatchedFilterPopup } from "./WatchedFilterPopup";

const browserMock = vi.hoisted(() => ({
  queryActiveTab: vi.fn(),
  sendMessage: vi.fn(),
  storageSyncGet: vi.fn(),
  storageSyncSet: vi.fn()
}));

vi.mock("@browser-extensions/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof ExtensionUiModule>();
  return {
    ...actual,
    PreferencesMenu: ({
      "aria-label": ariaLabel,
      onChangeLanguage
    }: {
      "aria-label": string;
      onChangeLanguage?: (language: "pt-BR") => void;
    }) => (
      <button
        aria-label={ariaLabel}
        onClick={() => {
          onChangeLanguage?.("pt-BR");
        }}
        type="button"
      >
        Test preferences
      </button>
    )
  };
});

vi.mock("wxt/browser", () => ({
  browser: {
    runtime: {
      getManifest: () => ({ version: "0.1.0" }),
      getURL: (path: string) => `chrome-extension://watched-filter${path}`
    },
    storage: {
      local: {
        get: vi.fn(),
        set: vi.fn()
      },
      sync: {
        get: browserMock.storageSyncGet,
        set: browserMock.storageSyncSet
      }
    },
    tabs: {
      query: browserMock.queryActiveTab,
      sendMessage: browserMock.sendMessage
    }
  }
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("WatchedFilterPopup", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    installDomPrimitives();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    localStorage.clear();

    browserMock.queryActiveTab.mockReset();
    browserMock.sendMessage.mockReset();
    browserMock.storageSyncGet.mockReset();
    browserMock.storageSyncSet.mockReset();
    browserMock.queryActiveTab.mockResolvedValue([{ id: 1, url: "chrome://extensions/" }]);
    browserMock.storageSyncGet.mockImplementation(async () => ({
      ...SETTINGS_DEFAULTS,
      language: "en"
    }));
    browserMock.storageSyncSet.mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.replaceChildren();
    document.documentElement.removeAttribute("data-extension-theme");
    document.documentElement.removeAttribute("data-extension-theme-preference");
    vi.restoreAllMocks();
  });

  it("keeps secondary filters collapsed until the user opens Advanced", async () => {
    await act(async () => {
      root.render(<WatchedFilterPopup />);
      await flushEffects();
    });

    const mainSettings = getElementByText("Main settings").closest("section");
    const advanced = container.querySelector<HTMLDetailsElement>("details");
    const summary = advanced?.querySelector<HTMLElement>("summary");

    expect(mainSettings?.querySelectorAll('[role="switch"]')).toHaveLength(5);
    expect(advanced?.open).toBe(false);
    expect(summary?.textContent).toContain("Advanced");
    expect(advanced?.textContent).toContain("Hide paid content");
    expect(advanced?.textContent).toContain("Hide live events");
    expect(advanced?.textContent).toContain("Hide paid channels");
    expect(advanced?.querySelectorAll('[role="switch"]')).toHaveLength(3);

    if (!advanced || !summary) throw new Error("Advanced settings disclosure was not rendered.");

    await act(async () => {
      summary.click();
      await flushEffects();
    });

    expect(advanced.open).toBe(true);

    const paidContentSwitch = advanced.querySelector<HTMLButtonElement>('[role="switch"]');
    if (!paidContentSwitch) throw new Error("Paid content switch was not rendered.");

    await act(async () => {
      paidContentSwitch.click();
      await flushEffects();
    });

    expect(browserMock.storageSyncSet).toHaveBeenCalledWith(
      expect.objectContaining({
        hidePaidContent: true,
        hideLiveEvents: false,
        hideChannelContent: false
      })
    );
  });

  it("does not overwrite stored settings when language is selected before hydration completes", async () => {
    const settingsLoad = createDeferred<Record<string, unknown>>();
    browserMock.storageSyncGet.mockReturnValue(settingsLoad.promise);

    await act(async () => {
      root.render(<WatchedFilterPopup />);
      await flushEffects();
    });

    const preferences = container.querySelector<HTMLButtonElement>('button[aria-label="Language"]');
    if (!preferences) throw new Error("Preferences trigger was not rendered before settings loaded.");

    await act(async () => {
      preferences.click();
      await flushEffects();
    });
    expect(browserMock.storageSyncSet).not.toHaveBeenCalled();

    await act(async () => {
      settingsLoad.resolve({
        ...SETTINGS_DEFAULTS,
        hidePaidContent: true,
        language: "es"
      });
      await flushEffects();
    });
    await act(flushEffects);

    const advanced = container.querySelector<HTMLDetailsElement>("details");
    const paidContentSwitch = advanced?.querySelector<HTMLElement>('[role="switch"]');
    expect(advanced?.querySelector("summary")?.textContent).toContain("Avanzado");
    expect(paidContentSwitch?.getAttribute("aria-checked")).toBe("true");
    expect(browserMock.storageSyncSet).not.toHaveBeenCalled();
  });
});

function createDeferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

function getElementByText(text: string): HTMLElement {
  const element = Array.from(document.body.querySelectorAll<HTMLElement>("*")).find((candidate) => {
    if (candidate.textContent?.trim() !== text) return false;
    return Array.from(candidate.children).every((child) => child.textContent?.trim() !== text);
  });
  if (!element) throw new Error(`Could not find element with text "${text}".`);
  return element;
}

async function flushEffects(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => window.setTimeout(resolve, 0));
}

function installDomPrimitives(): void {
  const mutableGlobal = globalThis as typeof globalThis & {
    PointerEvent?: typeof PointerEvent;
    ResizeObserver?: typeof ResizeObserver;
  };

  mutableGlobal.PointerEvent ??= MouseEvent as unknown as typeof PointerEvent;
  mutableGlobal.ResizeObserver ??= class ResizeObserver {
    disconnect(): void {}
    observe(): void {}
    unobserve(): void {}
  };

  HTMLElement.prototype.hasPointerCapture ??= () => false;
  HTMLElement.prototype.releasePointerCapture ??= () => {};
  HTMLElement.prototype.scrollIntoView ??= () => {};
  HTMLElement.prototype.setPointerCapture ??= () => {};
}
