import { afterEach, describe, expect, it } from "vitest";
import { collectCandidates, getMercadoLivreProductIdFromUrl, mercadoLivreAdapter } from "./mercado-livre";

describe("Mercado Livre product card detection", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("matches Mercado Livre Brazil URLs", () => {
    expect(mercadoLivreAdapter.matches(new URL("https://www.mercadolivre.com.br/ofertas"))).toBe(true);
    expect(mercadoLivreAdapter.matches(new URL("https://lista.mercadolivre.com.br/smart-tv"))).toBe(true);
  });

  it("extracts a candidate from a Mercado Livre poly card", () => {
    document.body.innerHTML = `
      <div class="andes-card poly-card poly-card--grid-card poly-card--xlarge">
        <div class="poly-card__portada">
          <img data-testid="picture" alt="Omega Plus 240 Caps Dark Lab Sem Sabor" />
        </div>
        <div class="poly-card__content">
          <h3 class="poly-component__title-wrapper">
            <a href="https://www.mercadolivre.com.br/omega-plus-240-caps-dark-lab/p/MLB66597831"
              class="poly-component__title">
              Omega Plus 240 Caps Dark Lab Sem Sabor
            </a>
          </h3>
        </div>
      </div>
    `;

    const [candidate] = collectCandidates();

    expect(candidate).toEqual(
      expect.objectContaining({
        productId: "MLB66597831",
        title: "Omega Plus 240 Caps Dark Lab Sem Sabor",
        url: "https://www.mercadolivre.com.br/omega-plus-240-caps-dark-lab/p/MLB66597831"
      })
    );
    expect(candidate?.element).toBe(document.querySelector(".poly-card"));
    expect(candidate?.visualHost).toBe(document.querySelector(".poly-card"));
  });

  it("falls back to the image alt text when the title link has no text", () => {
    document.body.innerHTML = `
      <div class="andes-card poly-card">
        <img data-testid="picture" alt="Smart TV 55 QLED" />
        <a href="/smart-tv/p/MLB123" class="poly-component__title"></a>
      </div>
    `;

    expect(collectCandidates()[0]?.title).toBe("Smart TV 55 QLED");
  });

  it("extracts Mercado Livre product IDs from URLs", () => {
    expect(getMercadoLivreProductIdFromUrl("https://www.mercadolivre.com.br/product/p/MLB66597831")).toBe(
      "MLB66597831"
    );
    expect(getMercadoLivreProductIdFromUrl("https://produto.mercadolivre.com.br/MLB-123456-item?wid=MLB123456")).toBe(
      "MLB123456"
    );
  });
});
