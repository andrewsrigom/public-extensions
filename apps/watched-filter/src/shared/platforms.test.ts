import { isPlatformEnabled, normalizePlatformSettings } from "./platforms";
import { describe, expect, it } from "vitest";

describe("platform settings", () => {
  it("defaults every supported platform to enabled", () => {
    const settings = normalizePlatformSettings(undefined);

    expect(settings["prime-video"]).toBe(true);
    expect(settings.netflix).toBe(true);
    expect(settings.iqiyi).toBe(true);
  });

  it("preserves explicit disabled platforms and ignores unknown keys", () => {
    const settings = normalizePlatformSettings({
      netflix: false,
      unknown: false
    });

    expect(settings.netflix).toBe(false);
    expect(settings.youtube).toBe(true);
    expect(settings.unknown).toBeUndefined();
  });

  it("treats missing platform values as enabled", () => {
    expect(isPlatformEnabled({ platforms: { netflix: false } }, "netflix")).toBe(false);
    expect(isPlatformEnabled({ platforms: { netflix: false } }, "youtube")).toBe(true);
    expect(isPlatformEnabled({}, "youtube")).toBe(true);
  });
});
