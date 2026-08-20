import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SelectField } from "./select-field";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("SelectField", () => {
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
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("opens without nesting its button trigger inside a label", async () => {
    await act(async () => {
      root.render(
        <SelectField
          label="Card treatment"
          onValueChange={() => undefined}
          options={[
            { label: "Hide card", value: "hide" },
            { label: "Dim card", value: "dim" }
          ]}
          value="hide"
        />
      );
      await flushEffects();
    });

    const trigger = document.body.querySelector<HTMLButtonElement>('[role="combobox"]');
    if (!trigger) throw new Error("Select trigger not found.");

    expect(trigger.closest("label")).toBeNull();
    expect(trigger.getAttribute("aria-labelledby")).toBeTruthy();

    await act(async () => {
      trigger.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          cancelable: true,
          pointerType: "mouse"
        })
      );
      await flushEffects();
    });

    expect(trigger.dataset.state).toBe("open");
    expect(document.body.querySelector('[role="listbox"]')).not.toBeNull();
  });
});

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
