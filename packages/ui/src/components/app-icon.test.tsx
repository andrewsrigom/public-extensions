import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppIcon } from "./app-icon";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("AppIcon", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders the app artwork at the combined title and subtitle height by default", () => {
    act(() => {
      root.render(<AppIcon src="/icons/icon-128.png" />);
    });

    const image = container.querySelector("img");

    expect(image?.getAttribute("alt")).toBe("");
    expect(image?.getAttribute("draggable")).toBe("false");
    expect(image?.classList.contains("size-[52px]")).toBe(true);
    expect(image?.classList.contains("scale-[1.2]")).toBe(true);
  });

  it("supports compact panel and wide-page header sizes", () => {
    act(() => {
      root.render(
        <>
          <AppIcon size="compact" src="/icons/icon-128.png" />
          <AppIcon size="panel" src="/icons/icon-128.png" />
          <AppIcon size="page" src="/icons/icon-128.png" />
        </>
      );
    });

    const images = container.querySelectorAll("img");

    expect(images[0]?.classList.contains("size-9")).toBe(true);
    expect(images[1]?.classList.contains("size-11")).toBe(true);
    expect(images[2]?.classList.contains("size-16")).toBe(true);
  });
});
