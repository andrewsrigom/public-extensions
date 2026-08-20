import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applySettingsMutation,
  isSettingsMutationMessage,
  isSettingsImportFileSizeAllowed,
  loadSettings,
  MAX_SETTINGS_IMPORT_FILE_BYTES,
  SETTINGS_MUTATION_MESSAGE,
  saveSettings
} from "./storage";
import { RULES_STORAGE_KEY, SETTINGS_STORAGE_KEY } from "../shared/defaults";
import type { ProductFilterSettings } from "../shared/types";

const browserApiMock = vi.hoisted(() => ({
  localGet: vi.fn(),
  localSet: vi.fn(),
  syncGet: vi.fn(),
  syncSet: vi.fn()
}));

vi.mock("wxt/browser", () => ({
  browser: {
    storage: {
      local: {
        get: browserApiMock.localGet,
        set: browserApiMock.localSet
      },
      sync: {
        get: browserApiMock.syncGet,
        set: browserApiMock.syncSet
      }
    }
  }
}));

const SETTINGS: ProductFilterSettings = {
  enabled: false,
  mode: "dim",
  language: "pt-BR",
  blockedTerms: ["fone"],
  blockedTermsByPlatform: {
    amazon: ["cabo"]
  },
  blockedProductIds: ["ABC123"]
};

describe("product filter storage", () => {
  beforeEach(() => {
    browserApiMock.localGet.mockReset();
    browserApiMock.localSet.mockReset();
    browserApiMock.syncGet.mockReset();
    browserApiMock.syncSet.mockReset();
  });

  it("bounds JSON imports before the UI reads the whole file", () => {
    expect(isSettingsImportFileSizeAllowed(MAX_SETTINGS_IMPORT_FILE_BYTES)).toBe(true);
    expect(isSettingsImportFileSizeAllowed(MAX_SETTINGS_IMPORT_FILE_BYTES + 1)).toBe(false);
    expect(isSettingsImportFileSizeAllowed(Number.NaN)).toBe(false);
  });

  it("accepts complete options mutations and rejects drafts missing product ID changes", () => {
    const mutation = {
      addedProductIds: ["NEW-ID"],
      addedTerms: [],
      kind: "save-options-draft",
      preferences: {},
      removedProductIds: ["OLD-ID"],
      removedTerms: []
    };

    expect(isSettingsMutationMessage({ mutation, type: SETTINGS_MUTATION_MESSAGE })).toBe(true);
    expect(
      isSettingsMutationMessage({
        mutation: {
          addedTerms: [],
          kind: "save-options-draft",
          preferences: {},
          removedTerms: []
        },
        type: SETTINGS_MUTATION_MESSAGE
      })
    ).toBe(false);
  });

  it("loads preferences from sync and quota-sensitive rules from local storage", async () => {
    browserApiMock.syncGet.mockResolvedValue({
      [SETTINGS_STORAGE_KEY]: {
        enabled: SETTINGS.enabled,
        language: SETTINGS.language,
        mode: SETTINGS.mode
      }
    });
    browserApiMock.localGet.mockResolvedValue({
      [RULES_STORAGE_KEY]: {
        blockedProductIds: SETTINGS.blockedProductIds,
        blockedTerms: SETTINGS.blockedTerms,
        blockedTermsByPlatform: SETTINGS.blockedTermsByPlatform
      }
    });

    await expect(loadSettings()).resolves.toEqual(SETTINGS);
    expect(browserApiMock.localSet).not.toHaveBeenCalled();
    expect(browserApiMock.syncSet).not.toHaveBeenCalled();
  });

  it("reads the legacy all-in-sync value without allowing UI contexts to migrate it", async () => {
    browserApiMock.syncGet.mockResolvedValue({
      [SETTINGS_STORAGE_KEY]: {
        enabled: false,
        language: "es",
        mode: "overlay",
        blockedTerms: ["  teclado  ", "teclado"],
        blockedTermsByPlatform: {
          amazon: [" suporte "]
        },
        blockedAsins: ["abc123"]
      }
    });
    browserApiMock.localGet.mockResolvedValue({});
    browserApiMock.localSet.mockResolvedValue(undefined);
    browserApiMock.syncSet.mockResolvedValue(undefined);

    await expect(loadSettings()).resolves.toEqual({
      enabled: false,
      language: "es",
      mode: "overlay",
      blockedTerms: ["teclado"],
      blockedTermsByPlatform: {
        amazon: ["suporte"]
      },
      blockedProductIds: ["ABC123"]
    });

    expect(browserApiMock.localSet).not.toHaveBeenCalled();
    expect(browserApiMock.syncSet).not.toHaveBeenCalled();
  });

  it("writes local rules before the small synchronized preferences", async () => {
    browserApiMock.localSet.mockResolvedValue(undefined);
    browserApiMock.syncSet.mockResolvedValue(undefined);

    await saveSettings(SETTINGS);

    expect(browserApiMock.localSet).toHaveBeenCalledWith({
      [RULES_STORAGE_KEY]: {
        blockedProductIds: ["ABC123"],
        blockedTerms: ["fone"],
        blockedTermsByPlatform: {
          amazon: ["cabo"]
        }
      }
    });
    expect(browserApiMock.syncSet).toHaveBeenCalledWith({
      [SETTINGS_STORAGE_KEY]: {
        enabled: false,
        language: "pt-BR",
        mode: "dim"
      }
    });
    expect(browserApiMock.localSet.mock.invocationCallOrder[0]).toBeLessThan(
      browserApiMock.syncSet.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY
    );
  });

  it("does not erase the legacy sync fallback when the local rules write fails", async () => {
    const error = new Error("local quota unavailable");
    browserApiMock.syncGet.mockResolvedValue({
      [SETTINGS_STORAGE_KEY]: SETTINGS
    });
    browserApiMock.localGet.mockResolvedValue({});
    browserApiMock.localSet.mockRejectedValue(error);

    await expect(applySettingsMutation({ kind: "add-global-term", term: "mouse" })).rejects.toThrow(error);
    expect(browserApiMock.syncSet).not.toHaveBeenCalled();
  });

  it("serializes concurrent rule additions so neither context loses the other update", async () => {
    let preferences = {
      enabled: true,
      language: "en" as const,
      mode: "hide" as const
    };
    let rules = {
      blockedProductIds: [] as string[],
      blockedTerms: [] as string[],
      blockedTermsByPlatform: {} as Record<string, string[]>
    };

    browserApiMock.syncGet.mockImplementation(async () => ({
      [SETTINGS_STORAGE_KEY]: preferences
    }));
    browserApiMock.localGet.mockImplementation(async () => ({
      [RULES_STORAGE_KEY]: rules
    }));
    browserApiMock.localSet.mockImplementation(async (values) => {
      rules = (values as Record<string, typeof rules>)[RULES_STORAGE_KEY] ?? rules;
    });
    browserApiMock.syncSet.mockImplementation(async (values) => {
      preferences = (values as Record<string, typeof preferences>)[SETTINGS_STORAGE_KEY] ?? preferences;
    });

    await Promise.all([
      applySettingsMutation({ kind: "add-global-term", term: "fone" }),
      applySettingsMutation({ kind: "add-global-term", term: "cabo" })
    ]);

    expect(rules.blockedTerms).toEqual(["fone", "cabo"]);
  });

  it("merges a stale options draft without deleting terms added by another context", async () => {
    let preferences = {
      enabled: true,
      language: "en" as const,
      mode: "hide" as const
    };
    let rules = {
      blockedProductIds: ["EXISTING-ID", "CONCURRENT-ID"],
      blockedTerms: ["existing", "concurrent"],
      blockedTermsByPlatform: {} as Record<string, string[]>
    };

    browserApiMock.syncGet.mockImplementation(async () => ({
      [SETTINGS_STORAGE_KEY]: preferences
    }));
    browserApiMock.localGet.mockImplementation(async () => ({
      [RULES_STORAGE_KEY]: rules
    }));
    browserApiMock.localSet.mockImplementation(async (values) => {
      rules = (values as Record<string, typeof rules>)[RULES_STORAGE_KEY] ?? rules;
    });
    browserApiMock.syncSet.mockImplementation(async (values) => {
      preferences = (values as Record<string, typeof preferences>)[SETTINGS_STORAGE_KEY] ?? preferences;
    });

    await applySettingsMutation({
      addedProductIds: ["NEW-ID"],
      addedTerms: ["draft addition"],
      kind: "save-options-draft",
      preferences: {},
      removedProductIds: ["EXISTING-ID"],
      removedTerms: ["existing"]
    });

    expect(rules.blockedTerms).toEqual(["concurrent", "draft addition"]);
    expect(rules.blockedProductIds).toEqual(["CONCURRENT-ID", "NEW-ID"]);
  });
});
