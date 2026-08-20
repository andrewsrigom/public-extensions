import { SETTINGS_DEFAULTS } from "../shared/defaults";
import { netflixAdapter } from "./netflix";
import { beforeEach, describe, expect, it } from "vitest";

describe("netflixAdapter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";

    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 90,
        height: 90,
        left: 0,
        right: 160,
        top: 0,
        width: 160,
        x: 0,
        y: 0,
        toJSON: () => ({})
      })
    });
  });

  it("matches Netflix pages", () => {
    expect(netflixAdapter.matchesLocation(new URL("https://www.netflix.com/browse") as unknown as Location)).toBe(true);
    expect(netflixAdapter.matchesLocation(new URL("https://www.primevideo.com/movie") as unknown as Location)).toBe(
      false
    );
  });

  it("extracts a stable item from a Netflix title card", () => {
    document.body.innerHTML = `
      <div class="slider-item slider-item-0 wmParent">
        <div class="title-card-container" data-uia="title-card-container">
          <div id="title-card-2-0" class="title-card">
            <div class="ptrack-content" data-ui-tracking-context="%7B%22video_id%22%3A81714240%2C%22unifiedEntityId%22%3A%22Video%3A81714240%22%7D">
              <a href="/watch/81714240?tctx=2%2C0" role="link" aria-label="Vapor Humano" class="slider-refocus">
                <div class="boxart-container boxart-rounded boxart-size-16x9 imdb">
                  <img class="boxart-image" src="poster.jpg" alt="">
                  <div class="fallback-text-container" aria-hidden="true">
                    <p class="fallback-text">Vapor Humano</p>
                  </div>
                </div>
              </a>
            </div>
            <div class="bob-container"></div>
          </div>
          <a id="rating">7.9</a>
        </div>
        <div class="wmButton wmButtonNF">☐</div>
      </div>
    `;

    const [card] = netflixAdapter.getCards();
    const item = card ? netflixAdapter.getItem(card) : null;

    expect(card).toBeTruthy();
    expect(card?.className).toContain("slider-item");
    expect(item).toMatchObject({
      key: "netflix:video:81714240",
      markerPlacement: "host-bottom-left",
      platform: "netflix",
      title: "Vapor Humano"
    });
    expect(item?.url).toContain("/watch/81714240");
    expect(item?.markerHost?.className).toContain("boxart-container");
  });

  it("detects in-progress Netflix cards from progress signals", () => {
    document.body.innerHTML = `
      <div class="slider-item">
        <a href="/watch/81714240" aria-label="Vapor Humano">
          <div class="boxart-container">
            <img src="poster.jpg" alt="">
            <div role="progressbar" aria-valuenow="45"></div>
          </div>
        </a>
      </div>
    `;

    const [card] = netflixAdapter.getCards();
    const item = card ? netflixAdapter.getItem(card) : null;
    const state = item ? netflixAdapter.getAutoState?.(item, SETTINGS_DEFAULTS) : null;

    expect(state).toMatchObject({
      progress: 45,
      state: "in-progress"
    });
  });
});
