import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as PathSwitchStorageModule from "../pathswitch/storage";
import type { PathSwitchSettings } from "../pathswitch/types";
import { PathSwitchApp } from "./PathSwitchApp";

const pathSwitchUiMocks = vi.hoisted(() => ({
  loadQuickTipDismissed: vi.fn(),
  loadSettings: vi.fn(),
  saveQuickTipDismissed: vi.fn(),
  saveSettings: vi.fn(),
  tabsQuery: vi.fn()
}));

vi.mock("wxt/browser", () => ({
  browser: {
    runtime: {
      getManifest: () => ({ version: "0.1.0" })
    },
    tabs: {
      query: pathSwitchUiMocks.tabsQuery
    }
  }
}));

vi.mock("../pathswitch/storage", async () => {
  const actual = await vi.importActual<typeof PathSwitchStorageModule>("../pathswitch/storage");
  return {
    ...actual,
    loadQuickTipDismissed: pathSwitchUiMocks.loadQuickTipDismissed,
    loadSettings: pathSwitchUiMocks.loadSettings,
    saveQuickTipDismissed: pathSwitchUiMocks.saveQuickTipDismissed,
    saveSettings: pathSwitchUiMocks.saveSettings
  };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("PathSwitchApp", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    installDomPrimitives();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    pathSwitchUiMocks.loadQuickTipDismissed.mockReset().mockResolvedValue(true);
    pathSwitchUiMocks.loadSettings.mockReset().mockResolvedValue({ enabled: true, language: "en", rules: [] });
    pathSwitchUiMocks.saveQuickTipDismissed.mockReset().mockResolvedValue(undefined);
    pathSwitchUiMocks.saveSettings.mockReset().mockResolvedValue(undefined);
    pathSwitchUiMocks.tabsQuery
      .mockReset()
      .mockResolvedValue([{ id: 11, url: "https://shop.example:8443/products/42?token=secret#resume" }]);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.replaceChildren();
    localStorage.clear();
  });

  it("blocks settings writes until stored rules finish loading", async () => {
    let resolveSettings: (settings: PathSwitchSettings) => void = () => undefined;
    const pendingSettings = new Promise<PathSwitchSettings>((resolve) => {
      resolveSettings = resolve;
    });
    pathSwitchUiMocks.loadSettings.mockReturnValueOnce(pendingSettings);

    await render(<PathSwitchApp />);

    const app = container.querySelector("main");
    const newRuleButton = getButtonByText("New Rule");
    expect(app?.getAttribute("aria-busy")).toBe("true");
    expect(newRuleButton.disabled).toBe(true);
    expect(document.body.querySelector('button[aria-label="Menu"]')).toBeNull();

    await click(newRuleButton);

    expect(pathSwitchUiMocks.tabsQuery).not.toHaveBeenCalled();
    expect(pathSwitchUiMocks.saveSettings).not.toHaveBeenCalled();

    await act(async () => {
      resolveSettings({
        enabled: true,
        language: "en",
        rules: [
          {
            condition: "none",
            createdAt: 1,
            destinationUrl: "https://fixed.example/path",
            enabled: true,
            id: "stored-rule",
            ignoreIfAtDestination: true,
            name: "",
            sourcePattern: "https://legacy.example/*",
            updatedAt: 1
          }
        ]
      });
      await flushEffects();
    });

    expect(app?.getAttribute("aria-busy")).toBe("false");
    expect(newRuleButton.disabled).toBe(false);
    expect(document.body.textContent).toContain("https://legacy.example/*");
    expect(pathSwitchUiMocks.saveSettings).not.toHaveBeenCalled();
  });

  it("prefills the active tab and previews the fixed destination", async () => {
    await render(<PathSwitchApp />);
    await click(getButtonByText("New Rule"));

    const sourceInput = document.body.querySelector<HTMLInputElement>('input[placeholder="amazon.com/*"]');
    const destinationInput = document.body.querySelector<HTMLInputElement>(
      'input[placeholder="https://www.amazon.com.br/"]'
    );
    if (!sourceInput || !destinationInput) throw new Error("Could not find the redirect rule inputs.");

    expect(pathSwitchUiMocks.tabsQuery).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(sourceInput.value).toBe("https://shop.example:8443/products/42*");

    await setInputValue(destinationInput, "preferred.example/fixed");

    const preview = document.body.querySelector("code");
    expect(preview?.textContent).toBe("https://shop.example:8443/products/42* → https://preferred.example/fixed");
    expect(preview?.textContent).not.toContain("token");
    expect(preview?.textContent).not.toContain("secret");
    expect(document.body.textContent).toContain("This is a fixed destination");
    expect(document.body.textContent).toContain("source path, query, and fragment are not preserved");
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

async function setInputValue(input: HTMLInputElement, value: string): Promise<void> {
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
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
