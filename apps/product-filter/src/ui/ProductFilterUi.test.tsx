import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as ProductFilterStorageModule from "../core/storage";
import type { ProductFilterSettings } from "../shared/types";
import { ProductFilterOptions } from "./ProductFilterOptions";
import { ProductFilterPopup } from "./ProductFilterPopup";

const productFilterUiMocks = vi.hoisted(() => ({
  loadSettings: vi.fn(),
  openOptionsPage: vi.fn(),
  requestSettingsMutation: vi.fn(),
  tabsQuery: vi.fn()
}));

vi.mock("wxt/browser", () => ({
  browser: {
    runtime: {
      getManifest: () => ({ version: "0.1.0" }),
      openOptionsPage: productFilterUiMocks.openOptionsPage
    },
    tabs: {
      query: productFilterUiMocks.tabsQuery,
      sendMessage: vi.fn()
    }
  }
}));

vi.mock("../core/storage", async () => {
  const actual = await vi.importActual<typeof ProductFilterStorageModule>("../core/storage");
  return {
    ...actual,
    loadSettings: productFilterUiMocks.loadSettings,
    requestSettingsMutation: productFilterUiMocks.requestSettingsMutation
  };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SETTINGS: ProductFilterSettings = {
  blockedProductIds: ["OLD-ID"],
  blockedTerms: ["headphones"],
  blockedTermsByPlatform: {},
  enabled: true,
  language: "en",
  mode: "hide"
};

describe("Product Filter UI", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    installDomPrimitives();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    productFilterUiMocks.loadSettings.mockReset().mockResolvedValue(SETTINGS);
    productFilterUiMocks.openOptionsPage.mockReset().mockResolvedValue(undefined);
    productFilterUiMocks.requestSettingsMutation.mockReset().mockResolvedValue(SETTINGS);
    productFilterUiMocks.tabsQuery.mockReset().mockResolvedValue([{ id: 7, url: "https://unsupported.example/" }]);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.replaceChildren();
    localStorage.clear();
  });

  it("opens the full options page from the popup", async () => {
    await render(<ProductFilterPopup />);

    await click(getButtonByText("Manage all rules"));

    expect(productFilterUiMocks.openOptionsPage).toHaveBeenCalledOnce();
  });

  it("loads and saves product IDs alongside global terms", async () => {
    productFilterUiMocks.requestSettingsMutation.mockResolvedValue({
      ...SETTINGS,
      blockedProductIds: ["NEW-ID"]
    });

    await render(<ProductFilterOptions />);

    const productIds = document.body.querySelector<HTMLTextAreaElement>('textarea[placeholder="B0ABC12345"]');
    if (!productIds) throw new Error("Could not find the Product IDs textarea.");

    expect(productIds.value).toBe("OLD-ID");
    await setTextareaValue(productIds, "new-id");
    await click(getButtonByText("Save rules"));

    expect(productFilterUiMocks.requestSettingsMutation).toHaveBeenCalledWith({
      addedProductIds: ["NEW-ID"],
      addedTerms: [],
      kind: "save-options-draft",
      preferences: {},
      removedProductIds: ["OLD-ID"],
      removedTerms: []
    });
  });

  it("keeps rule drafts disabled until stored settings finish loading", async () => {
    let resolveSettings: (settings: ProductFilterSettings) => void = () => undefined;
    const pendingSettings = new Promise<ProductFilterSettings>((resolve) => {
      resolveSettings = resolve;
    });
    productFilterUiMocks.loadSettings.mockReturnValueOnce(pendingSettings);

    await render(<ProductFilterOptions />);

    const app = container.querySelector("main");
    const productIds = document.body.querySelector<HTMLTextAreaElement>('textarea[placeholder="B0ABC12345"]');
    const terms = document.body.querySelector<HTMLTextAreaElement>('textarea[placeholder="vaporizer, smart tv..."]');
    const saveButton = getButtonByText("Save rules");
    if (!productIds || !terms) throw new Error("Could not find the rule textareas.");

    expect(app?.getAttribute("aria-busy")).toBe("true");
    expect(productIds.disabled).toBe(true);
    expect(terms.disabled).toBe(true);
    expect(saveButton.disabled).toBe(true);
    expect(productFilterUiMocks.requestSettingsMutation).not.toHaveBeenCalled();

    await act(async () => {
      resolveSettings(SETTINGS);
      await flushEffects();
    });

    expect(app?.getAttribute("aria-busy")).toBe("false");
    expect(productIds.disabled).toBe(false);
    expect(terms.disabled).toBe(false);
    expect(saveButton.disabled).toBe(false);
    expect(productIds.value).toBe("OLD-ID");
    expect(terms.value).toBe("headphones");

    await setTextareaValue(productIds, "draft-id");
    await flushEffects();

    expect(productIds.value).toBe("draft-id");
    expect(productFilterUiMocks.requestSettingsMutation).not.toHaveBeenCalled();
  });

  it("preserves edits made while a save request is in flight", async () => {
    let resolveFirstSave: (settings: ProductFilterSettings) => void = () => undefined;
    const firstSave = new Promise<ProductFilterSettings>((resolve) => {
      resolveFirstSave = resolve;
    });
    productFilterUiMocks.requestSettingsMutation.mockReturnValueOnce(firstSave);

    await render(<ProductFilterOptions />);

    const productIds = document.body.querySelector<HTMLTextAreaElement>('textarea[placeholder="B0ABC12345"]');
    if (!productIds) throw new Error("Could not find the Product IDs textarea.");

    await setTextareaValue(productIds, "new-id");
    await click(getButtonByText("Save rules"));
    await setTextareaValue(productIds, "latest-id");

    await act(async () => {
      resolveFirstSave({ ...SETTINGS, blockedProductIds: ["NEW-ID"] });
      await flushEffects();
    });

    expect(productIds.value).toBe("latest-id");

    productFilterUiMocks.requestSettingsMutation.mockResolvedValue({
      ...SETTINGS,
      blockedProductIds: ["LATEST-ID"]
    });
    await click(getButtonByText("Save rules"));

    expect(productFilterUiMocks.requestSettingsMutation).toHaveBeenLastCalledWith({
      addedProductIds: ["LATEST-ID"],
      addedTerms: [],
      kind: "save-options-draft",
      preferences: {},
      removedProductIds: ["NEW-ID"],
      removedTerms: []
    });
  });

  async function render(element: ReactNode): Promise<void> {
    await act(async () => {
      root.render(element);
      await flushEffects();
    });
  }
});

async function click(element: HTMLElement): Promise<void> {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0, cancelable: true }));
    await flushEffects();
  });
}

async function setTextareaValue(textarea: HTMLTextAreaElement, value: string): Promise<void> {
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    valueSetter?.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    await flushEffects();
  });
}

function getButtonByText(text: string): HTMLButtonElement {
  const button = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
    (candidate) => candidate.textContent?.trim() === text
  );
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
}
