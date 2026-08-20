import { describe, expect, it, vi } from "vitest";

import { handleNavigation } from "./navigation-runtime";
import { RedirectHopGuard } from "./redirect-guard";
import type { RedirectRule, PathSwitchSettings } from "./types";

describe("pathswitch navigation runtime", () => {
  it("redirects once and blocks a legacy two-rule loop in the same tab", async () => {
    const settings = createSettings([
      createRule("rule-a", "a.example/*", "https://b.example/"),
      createRule("rule-b", "b.example/*", "https://a.example/")
    ]);
    const updateTab = vi.fn(async () => undefined);
    const dependencies = {
      guard: new RedirectHopGuard(),
      isNavigationCurrent: () => true,
      loadSettings: async () => settings,
      updateTab
    };

    await expect(handleNavigation({ frameId: 0, tabId: 7, url: "https://a.example/" }, dependencies)).resolves.toBe(
      "redirected"
    );
    await expect(handleNavigation({ frameId: 0, tabId: 7, url: "https://b.example/" }, dependencies)).resolves.toBe(
      "blocked"
    );
    expect(updateTab).toHaveBeenCalledOnce();
    expect(updateTab).toHaveBeenCalledWith(7, "https://b.example/");
  });

  it("keeps the guard across an unmatched target and blocks a client redirect back to the source", async () => {
    const settings = createSettings([createRule("rule-a", "a.example/*", "https://b.example/")]);
    const updateTab = vi.fn(async () => undefined);
    const dependencies = {
      guard: new RedirectHopGuard(),
      isNavigationCurrent: () => true,
      loadSettings: async () => settings,
      updateTab
    };

    await expect(handleNavigation({ frameId: 0, tabId: 9, url: "https://a.example/" }, dependencies)).resolves.toBe(
      "redirected"
    );
    await expect(handleNavigation({ frameId: 0, tabId: 9, url: "https://b.example/" }, dependencies)).resolves.toBe(
      "no-match"
    );
    await expect(handleNavigation({ frameId: 0, tabId: 9, url: "https://a.example/" }, dependencies)).resolves.toBe(
      "blocked"
    );
    expect(updateTab).toHaveBeenCalledOnce();
  });

  it("ignores subframe navigation without loading settings", async () => {
    const loadSettings = vi.fn(async () => createSettings([]));

    await expect(
      handleNavigation(
        { frameId: 1, tabId: 7, url: "https://a.example/" },
        {
          guard: new RedirectHopGuard(),
          isNavigationCurrent: () => true,
          loadSettings,
          updateTab: async () => undefined
        }
      )
    ).resolves.toBe("ignored");
    expect(loadSettings).not.toHaveBeenCalled();
  });

  it("does not redirect when a newer main-frame navigation supersedes a delayed settings read", async () => {
    const settings = createSettings([createRule("rule-a", "a.example/*", "https://b.example/")]);
    let releaseSettings: (value: PathSwitchSettings) => void = () => {
      throw new Error("settings read was not started");
    };
    const settingsRead = new Promise<PathSwitchSettings>((resolve) => {
      releaseSettings = resolve;
    });
    let isCurrent = true;
    const updateTab = vi.fn(async () => undefined);

    const navigation = handleNavigation(
      { frameId: 0, tabId: 11, url: "https://a.example/" },
      {
        guard: new RedirectHopGuard(),
        isNavigationCurrent: () => isCurrent,
        loadSettings: () => settingsRead,
        updateTab
      }
    );

    isCurrent = false;
    releaseSettings(settings);

    await expect(navigation).resolves.toBe("ignored");
    expect(updateTab).not.toHaveBeenCalled();
  });

  it("resets the redirect chain when Chrome rejects a tab update", async () => {
    const settings = createSettings([createRule("rule-a", "a.example/*", "https://b.example/")]);
    const updateTab = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("tab closed"))
      .mockResolvedValueOnce(undefined);
    const dependencies = {
      guard: new RedirectHopGuard(),
      isNavigationCurrent: () => true,
      loadSettings: async () => settings,
      updateTab
    };

    await expect(handleNavigation({ frameId: 0, tabId: 12, url: "https://a.example/" }, dependencies)).rejects.toThrow(
      "tab closed"
    );
    await expect(handleNavigation({ frameId: 0, tabId: 12, url: "https://a.example/" }, dependencies)).resolves.toBe(
      "redirected"
    );
  });
});

function createSettings(rules: RedirectRule[]): PathSwitchSettings {
  return {
    enabled: true,
    language: "en",
    rules
  };
}

function createRule(id: string, sourcePattern: string, destinationUrl: string): RedirectRule {
  return {
    condition: "none",
    createdAt: 1,
    destinationUrl,
    enabled: true,
    id,
    ignoreIfAtDestination: true,
    name: "",
    sourcePattern,
    updatedAt: 1
  };
}
