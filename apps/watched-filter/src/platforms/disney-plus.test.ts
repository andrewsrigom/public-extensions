import { disneyPlusAdapter } from "./disney-plus";
import { beforeEach, describe, expect, it } from "vitest";

describe("disneyPlusAdapter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";

    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 220,
        height: 220,
        left: 0,
        right: 140,
        top: 0,
        width: 140,
        x: 0,
        y: 0,
        toJSON: () => ({})
      })
    });
  });

  it("matches Disney+ pages", () => {
    expect(
      disneyPlusAdapter.matchesLocation(new URL("https://www.disneyplus.com/pt-br/home") as unknown as Location)
    ).toBe(true);
    expect(disneyPlusAdapter.matchesLocation(new URL("https://www.netflix.com/browse") as unknown as Location)).toBe(
      false
    );
  });

  it("extracts a stable item from a Disney+ shelf card", () => {
    document.body.innerHTML = `
      <div data-testid="set-shelf-item" role="group" aria-roledescription="slide" class="wmParent">
        <a data-item-id="7cd85309-875e-41e3-a416-eae745391d31" data-testid="set-item" aria-label="O Clã Olimpia: Uma História de Redenção Lançamento em 2025. Drama, Suspense Selecione para exibir detalhes sobre este título." href="/pt-br/browse/entity-7cd85309-875e-41e3-a416-eae745391d31">
          <div>
            <div data-testid="poster-set-item-background">
              <img alt="" src="poster.webp">
              <div data-testid="poster-vertical-title-art">
                <img src="title.webp" alt="O Clã Olimpia: Uma História de Redenção">
              </div>
            </div>
          </div>
        </a>
        <div class="wmButton wmButtonDP">☐</div>
      </div>
    `;

    const [card] = disneyPlusAdapter.getCards();
    const item = card ? disneyPlusAdapter.getItem(card) : null;

    expect(card?.getAttribute("data-testid")).toBe("set-shelf-item");
    expect(item).toMatchObject({
      key: "disney-plus:entity:7cd85309-875e-41e3-a416-eae745391d31",
      markerPlacement: "host-bottom-left",
      platform: "disney-plus",
      title: "O Clã Olimpia: Uma História de Redenção"
    });
    expect(item?.url).toContain("/pt-br/browse/entity-7cd85309-875e-41e3-a416-eae745391d31");
    expect(item?.markerHost?.getAttribute("data-testid")).toBe("poster-set-item-background");
  });
});
