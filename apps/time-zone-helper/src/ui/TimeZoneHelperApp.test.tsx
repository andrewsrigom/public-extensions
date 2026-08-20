import type * as ExtensionUiModule from "@browser-extensions/ui";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SETTINGS_KEY, type Settings } from "../timezones/storage";
import type * as TimeZoneTimeModule from "../timezones/time";
import { formatClockTime, getTimeZoneAbbreviation, wallTimeToInstant } from "../timezones/time";
import { TimeZoneHelperApp } from "./TimeZoneHelperApp";

type TestComboboxProps = {
  "aria-label": string;
  onValueChange: (value: string) => void;
  options: ReadonlyArray<{ label: ReactNode; value: string }>;
  placeholder?: string;
  value: string;
};

const browserStorageMock = vi.hoisted(() => ({
  data: {} as Record<string, unknown>,
  get: vi.fn(),
  set: vi.fn()
}));

vi.mock("wxt/browser", () => ({
  browser: {
    storage: {
      local: {
        get: browserStorageMock.get,
        set: browserStorageMock.set
      }
    }
  }
}));

vi.mock("../timezones/time", async (importOriginal) => {
  const actual = await importOriginal<typeof TimeZoneTimeModule>();
  return {
    ...actual,
    getLocalTimeZone: () => "America/Sao_Paulo"
  };
});

vi.mock("@browser-extensions/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof ExtensionUiModule>();
  return {
    ...actual,
    Combobox: function TestCombobox({
      "aria-label": ariaLabel,
      onValueChange,
      options,
      placeholder,
      value
    }: TestComboboxProps) {
      return (
        <select
          aria-label={ariaLabel}
          onChange={(event) => {
            onValueChange(event.target.value);
          }}
          value={value}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }
  };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const FIXED_NOW = new Date("2026-07-09T15:30:00.000Z");
const STORED_SETTINGS: Settings = {
  convertDate: "2026-07-09",
  convertTime: "",
  convertTimeZone: "",
  language: "en",
  monitors: []
};

describe("TimeZoneHelperApp", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    localStorage.clear();

    browserStorageMock.data = {
      [SETTINGS_KEY]: structuredClone(STORED_SETTINGS)
    };
    browserStorageMock.get.mockReset();
    browserStorageMock.set.mockReset();
    browserStorageMock.get.mockImplementation(async (key: string) => ({
      [key]: browserStorageMock.data[key]
    }));
    browserStorageMock.set.mockImplementation(async (values: Record<string, unknown>) => {
      Object.assign(browserStorageMock.data, values);
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.replaceChildren();
    document.documentElement.removeAttribute("data-extension-theme");
    document.documentElement.removeAttribute("data-extension-theme-preference");
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders a stable clock and converts a selected source wall time into the local zone", async () => {
    await act(async () => {
      root.render(<TimeZoneHelperApp />);
      await flushEffects();
    });
    await act(flushEffects);

    expect(container.textContent).toContain("Time Zone Helper");
    expect(container.textContent).toContain("Your time zone: America/Sao_Paulo");
    expect(container.textContent).toContain("Now");
    expect(container.textContent).toContain(formatClockTime(FIXED_NOW, "America/Sao_Paulo", true, "en"));

    const sourceTimeZone = container.querySelector<HTMLSelectElement>('select[aria-label="Source time zone"]');
    if (!sourceTimeZone) throw new Error("Source time zone selector was not rendered.");

    await act(async () => {
      sourceTimeZone.value = "America/New_York";
      sourceTimeZone.dispatchEvent(new Event("change", { bubbles: true }));
      await flushEffects();
    });
    await act(flushEffects);

    expect(sourceTimeZone.value).toBe("America/New_York");
    expect(browserStorageMock.set).toHaveBeenCalled();
    expect(browserStorageMock.data[SETTINGS_KEY]).toMatchObject({
      ...STORED_SETTINGS,
      convertTimeZone: "America/New_York"
    });

    const sourceTime = container.querySelector<HTMLInputElement>('input[type="time"]');
    if (!sourceTime) throw new Error("Source time input was not rendered.");

    await setInputValue(sourceTime, "09:00");

    const instant = wallTimeToInstant({
      date: STORED_SETTINGS.convertDate,
      time: "09:00",
      timeZone: "America/New_York"
    });
    const sourceAbbreviation = getTimeZoneAbbreviation(instant, "America/New_York");
    const localAbbreviation = getTimeZoneAbbreviation(instant, "America/Sao_Paulo");

    expect(container.textContent).toContain(`09:00 ${sourceAbbreviation} -> to your local time`);
    expect(container.textContent).toContain(`10:00 ${localAbbreviation}`);
    expect(browserStorageMock.data[SETTINGS_KEY]).toMatchObject({
      convertDate: STORED_SETTINGS.convertDate,
      convertTime: "09:00",
      convertTimeZone: "America/New_York"
    });
  });

  it("ignores settings changes until storage hydration preserves the saved snapshot", async () => {
    const settingsLoad = createDeferred<Record<string, unknown>>();
    const hydratedSettings: Settings = {
      convertDate: "2026-07-10",
      convertTime: "08:15",
      convertTimeZone: "Europe/London",
      language: "es",
      monitors: [{ id: "london", label: "London team", timeZone: "Europe/London" }]
    };
    browserStorageMock.data = {};
    browserStorageMock.get.mockReturnValue(settingsLoad.promise);

    await act(async () => {
      root.render(<TimeZoneHelperApp />);
      await flushEffects();
    });

    const sourceTimeZone = container.querySelector<HTMLSelectElement>('select[aria-label="Source time zone"]');
    if (!sourceTimeZone) throw new Error("Source time zone selector was not rendered before settings loaded.");

    await act(async () => {
      sourceTimeZone.value = "America/New_York";
      sourceTimeZone.dispatchEvent(new Event("change", { bubbles: true }));
      await flushEffects();
    });
    expect(browserStorageMock.set).not.toHaveBeenCalled();

    await act(async () => {
      settingsLoad.resolve({ [SETTINGS_KEY]: hydratedSettings });
      await flushEffects();
    });
    await act(flushEffects);

    expect(sourceTimeZone.value).toBe("Europe/London");
    expect(container.textContent).toContain("London team");
    expect(browserStorageMock.set).toHaveBeenLastCalledWith({ [SETTINGS_KEY]: hydratedSettings });
    expect(browserStorageMock.set).not.toHaveBeenCalledWith({
      [SETTINGS_KEY]: expect.objectContaining({ convertTimeZone: "America/New_York" })
    });
  });

  it("fails closed when saved settings cannot be read", async () => {
    browserStorageMock.data = {};
    browserStorageMock.get.mockRejectedValueOnce(new Error("temporary read failure"));

    await act(async () => {
      root.render(<TimeZoneHelperApp />);
      await flushEffects();
    });
    await act(flushEffects);

    expect(container.textContent).toContain("Your saved settings could not be loaded");
    expect(browserStorageMock.set).not.toHaveBeenCalled();

    const settingsFieldset = container.querySelector<HTMLFieldSetElement>("fieldset");
    const sourceTimeZone = container.querySelector<HTMLSelectElement>('select[aria-label="Source time zone"]');
    const sourceTime = container.querySelector<HTMLInputElement>('input[type="time"]');
    expect(settingsFieldset?.disabled).toBe(true);
    expect(sourceTimeZone?.matches(":disabled")).toBe(true);
    expect(sourceTime?.matches(":disabled")).toBe(true);
  });
});

function createDeferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

async function flushEffects(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function setInputValue(input: HTMLInputElement, value: string): Promise<void> {
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await flushEffects();
  });
  await act(flushEffects);
}
