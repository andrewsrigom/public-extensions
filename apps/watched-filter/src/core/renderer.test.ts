import { SETTINGS_DEFAULTS } from "../shared/defaults";
import type { CardAnalysis } from "../shared/types";
import { CardRenderer } from "./renderer";
import { beforeEach, describe, expect, it } from "vitest";

function createAnalysis(): CardAnalysis {
  document.body.innerHTML = `
    <div id="card">
      <div id="visual"></div>
    </div>
  `;

  const element = document.getElementById("card");
  const visualHost = document.getElementById("visual");

  if (!element || !visualHost) {
    throw new Error("Test fixture failed to render.");
  }

  return {
    element,
    key: "paramount-plus:content:test",
    manualWatched: true,
    markerHost: visualHost,
    markerPlacement: "cover-top-left",
    platform: "paramount-plus",
    progress: null,
    reasons: ["manual"],
    state: "watched",
    title: "Test movie",
    visualElement: visualHost,
    visualHost
  };
}

describe("CardRenderer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.getElementById("watched-filter-style")?.remove();
  });

  it("keeps the same overlay layer when an overlaid card is scanned again", () => {
    const renderer = new CardRenderer({ onToggleWatched: () => undefined });
    const analysis = createAnalysis();
    const settings = {
      ...SETTINGS_DEFAULTS,
      mode: "overlay" as const,
      showManualMarker: false
    };

    expect(renderer.apply(analysis, settings)).toBe("overlaid");
    const overlay = analysis.visualHost?.querySelector(".hwc-card-overlay-layer");

    expect(renderer.apply(analysis, settings)).toBe("overlaid");

    expect(analysis.visualHost?.querySelector(".hwc-card-overlay-layer")).toBe(overlay);
  });

  it("removes an existing overlay when the visual mode changes", () => {
    const renderer = new CardRenderer({ onToggleWatched: () => undefined });
    const analysis = createAnalysis();

    renderer.apply(analysis, {
      ...SETTINGS_DEFAULTS,
      mode: "overlay",
      showManualMarker: false
    });

    expect(renderer.apply(analysis, { ...SETTINGS_DEFAULTS, mode: "dim", showManualMarker: false })).toBe("dimmed");
    expect(analysis.visualHost?.querySelector(".hwc-card-overlay-layer")).toBeNull();
  });

  it("uses an overlay fallback for preview-sensitive dimmed cards", () => {
    const renderer = new CardRenderer({ onToggleWatched: () => undefined });
    const analysis = {
      ...createAnalysis(),
      dimModeFallback: "overlay" as const
    };

    expect(renderer.apply(analysis, { ...SETTINGS_DEFAULTS, mode: "dim", showManualMarker: false })).toBe("overlaid");
    expect(analysis.visualHost?.querySelector(".hwc-card-overlay-layer")).toBeTruthy();
  });

  it("hides paid content when the paid content setting is enabled", () => {
    const renderer = new CardRenderer({ onToggleWatched: () => undefined });
    const analysis = {
      ...createAnalysis(),
      manualWatched: false,
      reasons: [],
      requiresAdditionalSubscription: true,
      state: "unwatched" as const
    };

    expect(
      renderer.apply(analysis, {
        ...SETTINGS_DEFAULTS,
        hidePaidContent: true,
        mode: "overlay",
        showManualMarker: false
      })
    ).toBe("hidden");
  });

  it("hides live event cards when the live event setting is enabled", () => {
    const renderer = new CardRenderer({ onToggleWatched: () => undefined });
    const analysis = {
      ...createAnalysis(),
      isLiveEvent: true,
      manualWatched: false,
      reasons: [],
      state: "unwatched" as const
    };

    expect(
      renderer.apply(analysis, {
        ...SETTINGS_DEFAULTS,
        hideLiveEvents: true,
        mode: "overlay",
        showManualMarker: false
      })
    ).toBe("hidden");
  });

  it("hides channel content cards when the channel content setting is enabled", () => {
    const renderer = new CardRenderer({ onToggleWatched: () => undefined });
    const analysis = {
      ...createAnalysis(),
      manualWatched: false,
      reasons: [],
      requiresChannelSubscription: true,
      state: "unwatched" as const
    };

    expect(
      renderer.apply(analysis, {
        ...SETTINGS_DEFAULTS,
        hideChannelContent: true,
        mode: "overlay",
        showManualMarker: false
      })
    ).toBe("hidden");
  });

  it("can hide and clear whole content sections", () => {
    const renderer = new CardRenderer({ onToggleWatched: () => undefined });
    document.body.innerHTML = `<section id="section"></section>`;

    const section = document.getElementById("section");
    if (!section) throw new Error("Test fixture failed to render.");

    renderer.hideSection(section, "paid content");

    expect(section.classList.contains("hwc-section-hidden")).toBe(true);
    expect(section.getAttribute("data-hwc-reason")).toBe("paid content");

    renderer.clearSectionVisibility();

    expect(section.classList.contains("hwc-section-hidden")).toBe(false);
    expect(section.getAttribute("data-hwc-reason")).toBeNull();
  });
});
