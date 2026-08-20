import { afterEach, describe, expect, it } from "vitest";
import { aliexpressAdapter, collectCandidates, getAliExpressProductIdFromUrl } from "./aliexpress";

describe("AliExpress product card detection", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("matches AliExpress URLs", () => {
    expect(aliexpressAdapter.matches(new URL("https://www.aliexpress.com/ssr/300000512/BundleDeals2"))).toBe(true);
    expect(aliexpressAdapter.matches(new URL("https://pt.aliexpress.com/item/1005007123891906.html"))).toBe(true);
  });

  it("extracts a candidate from a product container", () => {
    document.body.innerHTML = `
      <div class="aec-view">
        <div data-spm="d0">
          <div id="1005007123891906" class="aec-view productContainer product_a12766ed">
            <div class="AIC-MI-container"
              aria-label="Escova de limpeza multifuncional de calçados, Ferramentas de limpeza doméstica">
              <img class="aec-image- AIC-MI-img square GLOBAL-imgFadeAnimation" src="//example.test/image.webp" />
            </div>
            <div>
              <span class="AIC-ATM-multiLine">Frete gratis</span>
            </div>
          </div>
        </div>
      </div>
    `;

    const [candidate] = collectCandidates();

    expect(candidate).toEqual(
      expect.objectContaining({
        productId: "1005007123891906",
        title: "Escova de limpeza multifuncional de calçados, Ferramentas de limpeza doméstica"
      })
    );
    expect(candidate?.element).toBe(document.querySelector('[data-spm="d0"]'));
    expect(candidate?.visualHost).toBe(document.querySelector(".productContainer"));
  });

  it("falls back to the title text when aria-label is missing", () => {
    document.body.innerHTML = `
      <div id="1005009558544529" class="productContainer">
        <div class="AIC-ATM-container">
          <span class="AIC-ATM-multiLine">Frete gratis</span>
        </div>
        <div class="AIC-ATM-container">
          <span class="AIC-ATM-multiLine">6 pces forte auto-adesivo j-gancho impermeavel para cozinha</span>
        </div>
      </div>
    `;

    expect(collectCandidates()[0]?.title).toBe("6 pces forte auto-adesivo j-gancho impermeavel para cozinha");
  });

  it("extracts candidates from AliExpress home recommendation cards", () => {
    document.body.innerHTML = `
      <div class="_2FypS" style="max-width: 20%; flex-basis: 20%; margin-bottom: 24px;">
        <div class="_9HTSH">
          <div class="_3gA8_ card-out-wrapper">
            <a class="_3mPKP"
              href="//pt.aliexpress.com/item/1005009806529460.html?spm=a2g0o.home.pcJustForYou.1"
              target="_blank">
              <div class="_2OjLS _3NYv1">
                <img class="_2EGeS product-img"
                  alt="Máscaras coringa cyberpunk, tranças de palhaço 2d, cosplay, resina" />
              </div>
              <div class="_3jo5e">
                <div title="Máscaras coringa cyberpunk, tranças de palhaço 2d, cosplay, resina"
                  role="heading"
                  aria-label="Máscaras coringa cyberpunk, tranças de palhaço 2d, cosplay, resina">
                  <h3 class="yB6en">Máscaras coringa cyberpunk, tranças de palhaço 2d, cosplay, resina</h3>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    `;

    const [candidate] = collectCandidates();

    expect(candidate).toEqual(
      expect.objectContaining({
        productId: "1005009806529460",
        title: "Máscaras coringa cyberpunk, tranças de palhaço 2d, cosplay, resina",
        url: "http://pt.aliexpress.com/item/1005009806529460.html?spm=a2g0o.home.pcJustForYou.1"
      })
    );
    expect(candidate?.element).toBe(document.querySelector("._2FypS"));
    expect(candidate?.visualHost).toBe(document.querySelector(".card-out-wrapper"));
  });

  it("extracts product IDs from AliExpress item URLs", () => {
    expect(getAliExpressProductIdFromUrl("https://www.aliexpress.com/item/1005007123891906.html")).toBe(
      "1005007123891906"
    );
    expect(getAliExpressProductIdFromUrl("https://pt.aliexpress.com/i/1005009558544529.html?spm=test")).toBe(
      "1005009558544529"
    );
  });
});
