import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDraft: vi.fn(),
  replaceFromStorage: vi.fn(),
  requestNotes: vi.fn(async () => []),
  tabsActivatedAddListener: vi.fn(),
  tabsQuery: vi.fn(async () => [
    {
      id: 7,
      title: "Example page",
      url: "https://www.example.com/articles/1"
    }
  ])
}));

vi.mock("@blocknote/mantine", () => ({
  BlockNoteView: () => null
}));

vi.mock("@blocknote/react", () => ({
  useCreateBlockNote: () => ({
    document: [],
    focus: vi.fn(),
    setTextCursorPosition: vi.fn()
  })
}));

vi.mock("@browser-extensions/ui", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;

  return {
    ...actual,
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
      getURL: (path: string) => `chrome-extension://test${path}`
    },
    storage: {
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn()
      },
      sync: {
        get: vi.fn(async () => ({})),
        set: vi.fn(async () => undefined)
      }
    },
    tabs: {
      create: vi.fn(async () => undefined),
      onActivated: {
        addListener: mocks.tabsActivatedAddListener,
        removeListener: vi.fn()
      },
      onUpdated: {
        addListener: vi.fn(),
        removeListener: vi.fn()
      },
      query: mocks.tabsQuery
    }
  }
}));

vi.mock("../notes/storage", () => ({
  requestNotes: mocks.requestNotes
}));

vi.mock("../notes/use-note-persistence", () => ({
  useNotePersistence: () => ({
    createDraft: mocks.createDraft,
    deleteNote: vi.fn(),
    notes: [],
    replaceFromStorage: mocks.replaceFromStorage,
    updateNote: vi.fn()
  })
}));

import { QuickNotesApp } from "./QuickNotesApp";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("QuickNotesApp note scope controls", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    installDomPrimitives();
    mocks.createDraft.mockReset();
    mocks.replaceFromStorage.mockReset();
    mocks.requestNotes.mockClear();
    mocks.tabsActivatedAddListener.mockReset();
    mocks.tabsQuery.mockReset().mockResolvedValue([
      {
        id: 7,
        title: "Example page",
        url: "https://www.example.com/articles/1"
      }
    ]);
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

  it("labels the all filter and creates global or current-site notes only after an explicit choice", async () => {
    await act(async () => {
      root.render(<QuickNotesApp defaultFilter="all" trackActivePage variant="panel" />);
      await flushEffects();
    });

    expect(getButtonByText("All").getAttribute("aria-pressed")).toBe("true");
    expect(getButtonByText("This site").hasAttribute("disabled")).toBe(false);

    await click(getButtonByLabel("New"));

    expect(document.body.textContent).toContain("Global note");
    expect(document.body.textContent).toContain("Site note · example.com");

    await click(getMenuItemByText("Site note · example.com"));

    expect(mocks.createDraft).toHaveBeenCalledTimes(1);
    expect(mocks.createDraft.mock.calls[0]?.[0]).toMatchObject({
      pageTitle: "Example page",
      scope: "site",
      siteKey: "example.com"
    });
    expect(getButtonByText("This site").getAttribute("aria-pressed")).toBe("true");

    await click(getButtonByLabel("New"));
    await click(getMenuItemByText("Global note"));

    expect(mocks.createDraft).toHaveBeenCalledTimes(2);
    expect(mocks.createDraft.mock.calls[1]?.[0]).toMatchObject({
      pageTitle: "Example page",
      scope: "global",
      siteKey: undefined
    });
    expect(getButtonByText("All").getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps the newest tab context when the initial request resolves last", async () => {
    const initialTab = createDeferred<Array<{ id: number; title: string; url: string }>>();
    const latestTab = createDeferred<Array<{ id: number; title: string; url: string }>>();
    mocks.tabsQuery.mockReset().mockReturnValueOnce(initialTab.promise).mockReturnValueOnce(latestTab.promise);

    await act(async () => {
      root.render(<QuickNotesApp defaultFilter="all" trackActivePage variant="panel" />);
      await flushEffects();
    });

    const refreshContext = mocks.tabsActivatedAddListener.mock.calls[0]?.[0] as (() => void) | undefined;
    if (!refreshContext) throw new Error("Could not find the tab activation listener.");

    await act(async () => {
      refreshContext();
      await flushEffects();
    });

    latestTab.resolve([
      {
        id: 8,
        title: "Latest page",
        url: "https://latest.example/articles/2"
      }
    ]);
    await act(async () => {
      await flushEffects();
    });

    initialTab.resolve([
      {
        id: 7,
        title: "Older page",
        url: "https://older.example/articles/1"
      }
    ]);
    await act(async () => {
      await flushEffects();
    });

    expect(document.body.textContent).toContain("latest.example");
    expect(document.body.textContent).not.toContain("older.example");

    await click(getButtonByLabel("New"));
    await click(getMenuItemByText("Site note · latest.example"));

    expect(mocks.createDraft).toHaveBeenCalledTimes(1);
    expect(mocks.createDraft.mock.calls[0]?.[0]).toMatchObject({
      pageTitle: "Latest page",
      scope: "site",
      siteKey: "latest.example"
    });
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

function getMenuItemByText(text: string): HTMLElement {
  const element = Array.from(document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
    (candidate) => candidate.textContent?.trim() === text
  );
  if (!element) throw new Error(`Could not find menu item with text "${text}".`);
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
