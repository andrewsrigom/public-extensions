import { afterEach, describe, expect, it } from "vitest";
import { collectCandidates, getTemuProductIdFromUrl, temuAdapter } from "./temu";

describe("Temu product card detection", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("matches Temu URLs", () => {
    expect(temuAdapter.matches(new URL("https://www.temu.com/br"))).toBe(true);
    expect(temuAdapter.matches(new URL("https://m.temu.com/br"))).toBe(true);
  });

  it("extracts a candidate from a Temu product card", () => {
    document.body.innerHTML = `
      <div class="EKDT7a3v">
        <div class="wx5xL7Ky">
          <div class="Ois68FAW" tabindex="0" role="group"
            aria-label="Jaqueta Masculina com Gola Alta e Estampa de Letras. XMJK093">
            <div data-tooltip="goodContainer-601104624066267"
              data-tooltip-title="Jaqueta Masculina com Gola Alta e Estampa de Letras. XMJK093">
              <a href="/br/jaqueta-masculina-com-gola-alta-g-601104624066267.html" class="_2Tl9qLr1">
                <h3>
                  <span>Jaqueta Masculina com Gola Alta e Estampa de Letras. XMJK093</span>
                  <span>Abrir em uma nova aba.</span>
                </h3>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;

    const [candidate] = collectCandidates();

    expect(candidate).toEqual(
      expect.objectContaining({
        productId: "601104624066267",
        title: "Jaqueta Masculina com Gola Alta e Estampa de Letras. XMJK093",
        url: "http://localhost:3000/br/jaqueta-masculina-com-gola-alta-g-601104624066267.html"
      })
    );
    expect(candidate?.element).toBe(document.querySelector(".EKDT7a3v"));
    expect(candidate?.visualHost).toBe(document.querySelector('[role="group"]'));
  });

  it("falls back to tooltip product IDs", () => {
    document.body.innerHTML = `
      <div>
        <div role="group" aria-label="Organizador de cabos">
          <div data-tooltip="QuickLook-601104624066267" data-tooltip-title="Organizador de cabos"></div>
        </div>
      </div>
    `;

    expect(collectCandidates()[0]?.productId).toBe("601104624066267");
  });

  it("extracts product IDs from Temu URLs", () => {
    expect(getTemuProductIdFromUrl("https://www.temu.com/br/example-g-601104624066267.html")).toBe("601104624066267");
    expect(getTemuProductIdFromUrl("https://www.temu.com/br/search?goods_id=123456789")).toBe("123456789");
  });
});
