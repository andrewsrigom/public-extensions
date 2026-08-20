import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const site = {
    hostname: "example.com",
    origin: "https://www.example.com",
    tabId: 19,
    title: "Example",
    url: "https://www.example.com/account"
  };

  return {
    getActiveSite: vi.fn(async () => site),
    resetSite: vi.fn(async () => undefined),
    storageGet: vi.fn(async () => ({})),
    storageSet: vi.fn(async () => undefined),
    site
  };
});

vi.mock("@browser-extensions/ui", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;

  return {
    ...actual,
    PreferencesMenu: ({ onChangeLanguage }: { onChangeLanguage?: (language: "pt-BR") => void }) => (
      <button
        onClick={() => {
          onChangeLanguage?.("pt-BR");
        }}
        type="button"
      >
        Choose Portuguese
      </button>
    ),
    useExtensionTheme: () => ({
      resolvedTheme: "light",
      setTheme: vi.fn(),
      theme: "system"
    })
  };
});

vi.mock("wxt/browser", () => ({
  browser: {
    runtime: {
      getManifest: () => ({ version: "0.1.0" })
    },
    storage: {
      sync: {
        get: mocks.storageGet,
        set: mocks.storageSet
      }
    }
  }
}));

vi.mock("../reset/browser-api", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;

  return {
    ...actual,
    getActiveSite: mocks.getActiveSite,
    resetSite: mocks.resetSite
  };
});

import { SiteResetApp } from "./SiteResetApp";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("SiteResetApp supported categories", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    installDomPrimitives();
    mocks.getActiveSite.mockClear();
    mocks.resetSite.mockClear();
    mocks.storageGet.mockReset().mockResolvedValue({});
    mocks.storageSet.mockReset().mockResolvedValue(undefined);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("shows only supported categories and confirms only those categories", async () => {
    await act(async () => {
      root.render(<SiteResetApp />);
      await flushEffects();
    });

    expect(document.body.textContent).toContain("Cookies");
    expect(document.body.textContent).toContain("Browser cache");
    expect(document.body.textContent).toContain("localStorage & sessionStorage");
    expect(document.body.textContent).toContain("Cache Storage, IndexedDB & service workers");
    expect(document.body.textContent).not.toContain("Permissions");
    expect(document.body.textContent).not.toContain("Site settings");
    expect(document.body.textContent).not.toContain("Not available safely yet");

    await click(getButtonByText("Select all"));
    await click(getButtonByLabel("Clear selected data"));

    expect(document.body.textContent).toContain("Cookies");
    expect(document.body.textContent).toContain("Browser cache");
    expect(document.body.textContent).toContain("localStorage & sessionStorage");
    expect(document.body.textContent).toContain("Cache Storage, IndexedDB & service workers");
    expect(document.body.textContent).not.toContain("Permissions");
    expect(document.body.textContent).not.toContain("Site settings");

    await click(getLastButtonByText("Clear selected data"));

    expect(mocks.resetSite).toHaveBeenCalledTimes(1);
    expect(mocks.resetSite).toHaveBeenCalledWith(mocks.site, ["cookies", "cache", "localStorage", "offlineData"]);
  });

  it("does not let a pending stored language replace the user's choice", async () => {
    const storedLanguage = createDeferred<Record<string, unknown>>();
    mocks.storageGet.mockReset().mockReturnValue(storedLanguage.promise);

    await act(async () => {
      root.render(<SiteResetApp />);
      await flushEffects();
    });

    await click(getButtonByText("Choose Portuguese"));

    expect(document.documentElement.lang).toBe("pt-BR");
    expect(document.body.textContent).toContain("Selecionar tudo");

    storedLanguage.resolve({ "site-reset:language": "en" });
    await act(async () => {
      await flushEffects();
    });

    expect(document.documentElement.lang).toBe("pt-BR");
    expect(document.body.textContent).toContain("Selecionar tudo");
    expect(document.body.textContent).not.toContain("Select all");
    expect(mocks.storageSet).toHaveBeenCalledWith({ "site-reset:language": "pt-BR" });
  });
});

function createDeferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

async function click(element: Element): Promise<void> {
  await act(async () => {
    element.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        cancelable: true,
        pointerType: "mouse"
      })
    );
    element.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        button: 0,
        cancelable: true,
        pointerType: "mouse"
      })
    );
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0, cancelable: true }));
    await flushEffects();
  });
}

function getButtonByLabel(label: string): HTMLButtonElement {
  const button = document.body.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!button) throw new Error(`Could not find button with label "${label}".`);
  return button;
}

function getButtonByText(text: string): HTMLButtonElement {
  const button = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
    (candidate) => candidate.textContent?.trim() === text
  );
  if (!button) throw new Error(`Could not find button with text "${text}".`);
  return button;
}

function getLastButtonByText(text: string): HTMLButtonElement {
  const button = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button"))
    .filter((candidate) => candidate.textContent?.trim() === text)
    .at(-1);
  if (!button) throw new Error(`Could not find button with text "${text}".`);
  return button;
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
