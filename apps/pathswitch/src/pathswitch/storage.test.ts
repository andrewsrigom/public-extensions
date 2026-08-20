import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PATHSWITCH_QUICK_TIP_DISMISSED_KEY,
  loadQuickTipDismissed,
  loadSettings,
  saveQuickTipDismissed,
  saveSettings
} from "./storage";

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

describe("pathswitch storage", () => {
  beforeEach(() => {
    browserStorageMock.data = {};
    browserStorageMock.get.mockReset();
    browserStorageMock.set.mockReset();

    browserStorageMock.get.mockImplementation(async (key: string) => ({
      [key]: browserStorageMock.data[key]
    }));
    browserStorageMock.set.mockImplementation(async (value: Record<string, unknown>) => {
      Object.assign(browserStorageMock.data, value);
    });
  });

  it("stores quick-tip dismissal in extension-local storage", async () => {
    await expect(loadQuickTipDismissed()).resolves.toBe(false);

    await saveQuickTipDismissed(true);

    await expect(loadQuickTipDismissed()).resolves.toBe(true);
    expect(browserStorageMock.data[PATHSWITCH_QUICK_TIP_DISMISSED_KEY]).toBe(true);
  });

  it("round-trips normalized settings", async () => {
    await saveSettings({
      enabled: true,
      language: "en",
      rules: []
    });

    await expect(loadSettings()).resolves.toEqual({
      enabled: true,
      language: "en",
      rules: []
    });
  });
});
