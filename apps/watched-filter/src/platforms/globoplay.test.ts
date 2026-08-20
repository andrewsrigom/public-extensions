import { globoplayAdapter } from "./globoplay";
import { beforeEach, describe, expect, it } from "vitest";

describe("globoplayAdapter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";

    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 220,
        height: 220,
        left: 0,
        right: 150,
        top: 0,
        width: 150,
        x: 0,
        y: 0,
        toJSON: () => ({})
      })
    });
  });

  it("matches Globoplay pages", () => {
    expect(
      globoplayAdapter.matchesLocation(new URL("https://globoplay.globo.com/categorias/filmes/") as unknown as Location)
    ).toBe(true);
    expect(globoplayAdapter.matchesLocation(new URL("https://www.youtube.com/") as unknown as Location)).toBe(false);
  });

  it("extracts a stable item from a Globoplay slider card", () => {
    document.body.innerHTML = `
      <li class="splide__slide gplay-slider__slide is-visible">
        <div class="item-with-preview" data-testid="item-with-preview">
          <div class="poster" data-testid="poster">
            <div class="poster__image-container">
              <img class="poster__image" src="poster.jpg" alt="Cantando na Chuva">
            </div>
          </div>
          <div class="item-preview">
            <a class="item-preview__link-wrapper" aria-label="Cantando na Chuva  " href="/cantando-na-chuva/t/xJJmDhrgX6/">&nbsp;</a>
            <div class="item-preview__text-container">
              <h3 class="item-preview__headline">Cantando na Chuva</h3>
            </div>
          </div>
        </div>
      </li>
    `;

    const [card] = globoplayAdapter.getCards();
    const item = card ? globoplayAdapter.getItem(card) : null;

    expect(card?.getAttribute("data-testid")).toBe("item-with-preview");
    expect(item).toMatchObject({
      key: "globoplay:content:xJJmDhrgX6",
      markerPlacement: "cover-top-left",
      platform: "globoplay",
      title: "Cantando na Chuva"
    });
    expect(item?.url).toContain("/cantando-na-chuva/t/xJJmDhrgX6/");
    expect(item?.markerHost?.getAttribute("data-testid")).toBe("item-with-preview");
    expect(item?.visualHost?.className).toContain("poster__image-container");
  });

  it("ignores navigation cards without content links", () => {
    document.body.innerHTML = `
      <li class="splide__slide gplay-slider__slide">
        <a class="navigation-poster" aria-label="Mostrar mais em Grandes Sucessos do Cinema" href="/categorias/sucessos-do-cinema/">
          <span class="navigation-poster__card"></span>
        </a>
      </li>
    `;

    expect(globoplayAdapter.getCards()).toHaveLength(0);
  });
});
