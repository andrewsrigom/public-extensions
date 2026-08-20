import { beforeEach, describe, expect, it, vi } from "vitest";

import { SETTINGS_KEY, loadSettings, normalizeStoredSettings, saveSettings } from "./storage";

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

describe("time zone helper storage", () => {
  beforeEach(() => {
    localStorage.clear();
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

  it("normalizes current and legacy settings shapes", () => {
    expect(
      normalizeStoredSettings(
        {
          convertDate: "2026-07-09",
          convertTime: "09:30",
          convertTimeZone: "America/New_York",
          language: "pt-BR",
          monitors: [{ id: "monitor-1", label: "Rio", timeZone: "America/Sao_Paulo" }]
        },
        "America/Sao_Paulo"
      )
    ).toEqual({
      convertDate: "2026-07-09",
      convertTime: "09:30",
      convertTimeZone: "America/New_York",
      language: "pt-BR",
      monitors: [{ id: "monitor-1", label: "Rio", timeZone: "America/Sao_Paulo" }]
    });

    expect(
      normalizeStoredSettings(
        {
          monitorTimeZone: "Europe/London"
        },
        "America/Sao_Paulo"
      )
    ).toMatchObject({
      convertTimeZone: "Europe/London",
      monitors: [{ timeZone: "Europe/London" }]
    });
  });

  it("stores settings in extension-local storage", async () => {
    await saveSettings({
      convertDate: "2026-07-09",
      convertTime: "11:00",
      convertTimeZone: "America/New_York",
      language: "en",
      monitors: []
    });

    await expect(loadSettings("America/Sao_Paulo")).resolves.toMatchObject({
      convertDate: "2026-07-09",
      convertTime: "11:00",
      convertTimeZone: "America/New_York",
      language: "en"
    });
  });

  it("serializes writes so the latest settings cannot be overwritten by a slower request", async () => {
    let releaseFirstWrite = (): void => {
      throw new Error("first write was not scheduled");
    };
    browserStorageMock.set
      .mockImplementationOnce(
        (value: Record<string, unknown>) =>
          new Promise<void>((resolve) => {
            releaseFirstWrite = () => {
              Object.assign(browserStorageMock.data, value);
              resolve();
            };
          })
      )
      .mockImplementationOnce(async (value: Record<string, unknown>) => {
        Object.assign(browserStorageMock.data, value);
      });

    const firstWrite = saveSettings({
      convertDate: "2026-07-09",
      convertTime: "11:00",
      convertTimeZone: "America/New_York",
      language: "en",
      monitors: []
    });
    const secondWrite = saveSettings({
      convertDate: "2026-07-09",
      convertTime: "12:00",
      convertTimeZone: "Europe/London",
      language: "en",
      monitors: []
    });

    await vi.waitFor(() => {
      expect(browserStorageMock.set).toHaveBeenCalledTimes(1);
    });
    releaseFirstWrite();
    await Promise.all([firstWrite, secondWrite]);

    expect(browserStorageMock.data[SETTINGS_KEY]).toMatchObject({
      convertTime: "12:00",
      convertTimeZone: "Europe/London"
    });
  });

  it("continues the write queue after a storage failure", async () => {
    browserStorageMock.set.mockRejectedValueOnce(new Error("storage unavailable"));

    await expect(
      saveSettings({
        convertDate: "2026-07-09",
        convertTime: "11:00",
        convertTimeZone: "America/New_York",
        language: "en",
        monitors: []
      })
    ).rejects.toThrow("storage unavailable");

    await expect(
      saveSettings({
        convertDate: "2026-07-09",
        convertTime: "12:00",
        convertTimeZone: "Europe/London",
        language: "en",
        monitors: []
      })
    ).resolves.toBeUndefined();
    expect(browserStorageMock.data[SETTINGS_KEY]).toMatchObject({
      convertTime: "12:00",
      convertTimeZone: "Europe/London"
    });
  });

  it("imports legacy localStorage settings when extension storage is empty", async () => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        convertDate: "2026-07-09",
        convertTime: "14:15",
        convertTimeZone: "Europe/London",
        language: "es",
        monitors: []
      })
    );

    await expect(loadSettings("America/Sao_Paulo")).resolves.toMatchObject({
      convertDate: "2026-07-09",
      convertTime: "14:15",
      convertTimeZone: "Europe/London",
      language: "es"
    });
    expect(browserStorageMock.data[SETTINGS_KEY]).toMatchObject({
      convertTimeZone: "Europe/London",
      language: "es"
    });
    expect(localStorage.getItem(SETTINGS_KEY)).toBeNull();
  });
});
