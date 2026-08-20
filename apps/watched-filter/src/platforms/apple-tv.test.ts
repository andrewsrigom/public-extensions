import { appleTvAdapter } from "./apple-tv";
import { beforeEach, describe, expect, it } from "vitest";

describe("appleTvAdapter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";

    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 260,
        height: 260,
        left: 0,
        right: 170,
        top: 0,
        width: 170,
        x: 0,
        y: 0,
        toJSON: () => ({})
      })
    });
  });

  it("matches Apple TV pages", () => {
    expect(appleTvAdapter.matchesLocation(new URL("https://tv.apple.com/br") as unknown as Location)).toBe(true);
    expect(appleTvAdapter.matchesLocation(new URL("https://www.netflix.com/browse") as unknown as Location)).toBe(
      false
    );
  });

  it("extracts a stable item from an Apple TV lockup", () => {
    document.body.innerHTML = `
      <div slot="item" class="svelte-5fmy7e">
        <div class="lockup-container" data-testid="lockup-container">
          <a class="lockup" href="https://tv.apple.com/br/show/diarios-de-um-robo-assassino/umc.cmc.5owrzntj9v1gpg31wshflud03?ctx_agid=3be5f62b" data-testid="lockup">
            <div class="grid" data-testid="lockup-grid">
              <div class="artwork" data-testid="artwork">
                <div data-testid="artwork-component" class="artwork-component">
                  <picture>
                    <img alt="" class="artwork-component__contents artwork-component__image" src="/assets/artwork/1x1.gif">
                  </picture>
                </div>
              </div>
              <span class="visually-hidden">Diários de um Robô-Assassino</span>
            </div>
          </a>
        </div>
      </div>
    `;

    const [card] = appleTvAdapter.getCards();
    const item = card ? appleTvAdapter.getItem(card) : null;

    expect(card?.getAttribute("data-testid")).toBe("lockup-container");
    expect(item).toMatchObject({
      key: "apple-tv:content:umc.cmc.5owrzntj9v1gpg31wshflud03",
      markerPlacement: "cover-top-left",
      platform: "apple-tv",
      title: "Diários de um Robô-Assassino"
    });
    expect(item?.url).toContain("/show/diarios-de-um-robo-assassino/umc.cmc.5owrzntj9v1gpg31wshflud03");
    expect(item?.markerHost?.getAttribute("data-testid")).toBe("lockup-container");
    expect(item?.visualHost?.getAttribute("data-testid")).toBe("artwork-component");
  });

  it("extracts a fallback item from an Apple TV showcase button", () => {
    document.body.innerHTML = `
      <button data-testid="epic-showcase-item" class="epic-showcase-item portrait flavor-1 epic-artwork link">
        <div class="artwork-container">
          <div data-testid="artwork-component" class="artwork-component">
            <picture>
              <img alt="Sugar" class="artwork-component__contents artwork-component__image" src="/assets/artwork/1x1.gif">
            </picture>
          </div>
        </div>
      </button>
    `;

    const [card] = appleTvAdapter.getCards();
    const item = card ? appleTvAdapter.getItem(card) : null;

    expect(card?.getAttribute("data-testid")).toBe("epic-showcase-item");
    expect(item).toMatchObject({
      key: "apple-tv:title:sugar",
      markerPlacement: "cover-top-left",
      platform: "apple-tv",
      title: "Sugar"
    });
    expect(item?.markerHost?.getAttribute("data-testid")).toBe("epic-showcase-item");
    expect(item?.visualHost?.getAttribute("data-testid")).toBe("artwork-component");
  });
});
