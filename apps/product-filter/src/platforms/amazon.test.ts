import { afterEach, describe, expect, it } from "vitest";
import { amazonAdapter, collectCandidates, getAsinFromUrl } from "./amazon";

describe("Amazon product card detection", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("extracts a candidate from an Amazon deals card", () => {
    document.body.innerHTML = `
      <div data-testid="B0FP6JN5VR" data-test-index="0">
        <div data-testid="product-card" data-asin="B0FP6JN5VR">
          <a data-testid="product-card-link" href="/Samsung-Galaxy/dp/B0FP6JN5VR?ref=deal">
            <p id="title-B0FP6JN5VR">
              <span class="a-truncate-full a-offscreen">
                Samsung Tablet Galaxy Tab S10 Lite WiFi, 256GB
              </span>
            </p>
          </a>
        </div>
      </div>
    `;

    expect(collectCandidates()).toEqual([
      expect.objectContaining({
        productId: "B0FP6JN5VR",
        title: "Samsung Tablet Galaxy Tab S10 Lite WiFi, 256GB",
        url: "http://localhost:3000/Samsung-Galaxy/dp/B0FP6JN5VR?ref=deal",
        element: expect.objectContaining({
          dataset: expect.objectContaining({
            testIndex: "0",
            testid: "B0FP6JN5VR"
          })
        })
      })
    ]);
  });

  it("uses the Amazon grid item as the hidden element instead of the inner product card", () => {
    document.body.innerHTML = `
      <div class="GridRow-module__container_q6XsDi4clqdE6jhYFSBW">
        <div data-testid="B08BG687L9" data-test-index="144" class="GridItem-module__container_PW2gdkwTj1GQzdwJjejN">
          <div class="GridItem-module__changeover_oK8RqSFeYt808QCPHUex"></div>
          <div data-testid="product-card" data-asin="B08BG687L9">
            <a data-testid="product-card-link" href="/BLACK-DECKER-Misturador-Multiuso-M150-BR/dp/B08BG687L9">
              <p id="title-B08BG687L9">
                <span class="a-truncate-full a-offscreen">
                  BLACK+DECKER Mixer Multiuso Sem Fio com Haste Removivel M150
                </span>
              </p>
            </a>
          </div>
        </div>
      </div>
    `;

    const [candidate] = collectCandidates();
    const productCard = document.querySelector<HTMLElement>('[data-testid="product-card"]');

    expect(candidate?.element).toBe(document.querySelector('[data-test-index="144"]'));
    expect(candidate?.visualHost).toBe(productCard);
  });

  it("extracts a candidate from a classic Amazon search result", () => {
    document.body.innerHTML = `
      <div role="listitem" data-asin="B078JXFBDP" data-component-type="s-search-result">
        <div data-cy="title-recipe">
          <a href="/sspa/click?ie=UTF8&amp;url=%2FKitchenAid-Dish-Rack%2Fdp%2FB078JXFBDP%2Fref%3Dsr_1_2_sspa">
            <h2 aria-label="KitchenAid Large Capacity Dish Rack">
              <span>KitchenAid Large Capacity Dish Rack</span>
            </h2>
          </a>
        </div>
      </div>
    `;

    expect(collectCandidates()).toEqual([
      expect.objectContaining({
        productId: "B078JXFBDP",
        title: "KitchenAid Large Capacity Dish Rack",
        url: "http://localhost:3000/KitchenAid-Dish-Rack/dp/B078JXFBDP/ref=sr_1_2_sspa",
        element: document.querySelector('[data-component-type="s-search-result"]'),
        visualHost: document.querySelector('[data-component-type="s-search-result"]')
      })
    ]);
  });

  it("supports Amazon Brazil and Amazon US domains", () => {
    expect(amazonAdapter.matches(new URL("https://www.amazon.com.br/deals"))).toBe(true);
    expect(amazonAdapter.matches(new URL("https://www.amazon.com/s?k=kitchen"))).toBe(true);
    expect(amazonAdapter.matches(new URL("https://example.com/"))).toBe(false);
  });

  it("extracts an ASIN from product URLs", () => {
    expect(getAsinFromUrl("https://www.amazon.com.br/example/dp/B0FP6JN5VR?ref=deal")).toBe("B0FP6JN5VR");
    expect(getAsinFromUrl("https://www.amazon.com.br/gp/product/B012345678")).toBe("B012345678");
  });

  it("ignores product cards without a readable title", () => {
    document.body.innerHTML = '<div data-testid="product-card" data-asin="B0FP6JN5VR"></div>';

    expect(collectCandidates()).toEqual([]);
  });
});
