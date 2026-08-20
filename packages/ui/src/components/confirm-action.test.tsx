import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConfirmAction } from "./confirm-action";
import { DropdownMenu, DropdownMenuConfirmItem } from "./dropdown-menu";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("ConfirmAction", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    installDomPrimitives();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("opens, cancels, and confirms destructive actions", async () => {
    const onConfirm = vi.fn();

    await renderConfirmAction({ onConfirm });
    await click(getButtonByLabel("Delete note"));

    expect(document.body.textContent).toContain("Delete this note?");
    expect(document.body.textContent).toContain("This cannot be undone.");

    await click(getButtonByText("Keep"));

    expect(document.body.textContent).not.toContain("Delete this note?");

    await click(getButtonByLabel("Delete note"));
    await click(getButtonByText("Delete"));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).not.toContain("Delete this note?");
  });

  it("keeps the confirmation popover open when confirmation fails", async () => {
    const error = new Error("Unable to delete");
    const onConfirm = vi.fn(() => {
      throw error;
    });
    const onConfirmError = vi.fn();

    await renderConfirmAction({ onConfirm, onConfirmError });
    await click(getButtonByLabel("Delete note"));
    await click(getButtonByText("Delete"));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirmError).toHaveBeenCalledWith(error);
    expect(document.body.textContent).toContain("Delete this note?");
  });

  async function renderConfirmAction({
    onConfirm,
    onConfirmError
  }: {
    onConfirm: () => Promise<void> | void;
    onConfirmError?: (error: unknown) => void;
  }): Promise<void> {
    await act(async () => {
      root.render(
        <ConfirmAction
          aria-label="Delete note"
          cancelLabel="Keep"
          confirmLabel="Delete"
          description="This cannot be undone."
          title="Delete this note?"
          onConfirm={onConfirm}
          onConfirmError={onConfirmError}
        >
          Delete
        </ConfirmAction>
      );
      await flushEffects();
    });
  }
});

describe("DropdownMenuConfirmItem", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    installDomPrimitives();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("requires a second click before running a destructive menu action", async () => {
    const onConfirm = vi.fn();

    await renderDropdownConfirmItem({ onConfirm });
    await click(getButtonByLabel("Note actions"));

    const menu = document.body.querySelector<HTMLElement>('[role="menu"]');

    expect(menu?.classList.contains("overflow-y-auto")).toBe(true);
    expect(menu?.classList.contains("max-h-[var(--radix-dropdown-menu-content-available-height)]")).toBe(true);
    expect(document.body.textContent).toContain("Delete note");

    await click(getMenuItemByText("Delete note"));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Confirm delete");

    await click(getMenuItemByText("Confirm delete"));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("reports confirmation failures from menu actions", async () => {
    const error = new Error("Unable to archive");
    const onConfirm = vi.fn(async () => {
      throw error;
    });
    const onConfirmError = vi.fn();

    await renderDropdownConfirmItem({ onConfirm, onConfirmError });
    await click(getButtonByLabel("Note actions"));
    await click(getMenuItemByText("Delete note"));
    await click(getMenuItemByText("Confirm delete"));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirmError).toHaveBeenCalledWith(error);
  });

  async function renderDropdownConfirmItem({
    onConfirm,
    onConfirmError
  }: {
    onConfirm: () => Promise<void> | void;
    onConfirmError?: (error: unknown) => void;
  }): Promise<void> {
    await act(async () => {
      root.render(
        <DropdownMenu aria-label="Note actions" trigger={<span>Actions</span>}>
          <DropdownMenuConfirmItem confirmLabel="Confirm delete" onConfirm={onConfirm} onConfirmError={onConfirmError}>
            Delete note
          </DropdownMenuConfirmItem>
        </DropdownMenu>
      );
      await flushEffects();
    });
  }
});

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
  const buttons = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).filter(
    (candidate) => candidate.textContent?.trim() === text
  );
  const button = buttons.at(-1);
  if (!button) throw new Error(`Could not find button with text "${text}".`);
  return button;
}

function getMenuItemByText(text: string): HTMLElement {
  const textElement = getElementByText(text);
  const menuItem = textElement.closest<HTMLElement>('[role="menuitem"]');
  if (!menuItem) throw new Error(`Could not find menu item with text "${text}".`);
  return menuItem;
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
  HTMLElement.prototype.setPointerCapture ??= () => {};
}
