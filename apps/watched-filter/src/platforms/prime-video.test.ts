import { primeVideoAdapter } from "./prime-video";
import { beforeEach, describe, expect, it } from "vitest";

describe("primeVideoAdapter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";

    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 140,
        height: 140,
        left: 0,
        right: 240,
        toJSON: () => ({}),
        top: 0,
        width: 240,
        x: 0,
        y: 0
      })
    });
  });

  it("matches Prime Video pages", () => {
    expect(primeVideoAdapter.matchesLocation(new URL("https://www.primevideo.com/") as unknown as Location)).toBe(true);
    expect(primeVideoAdapter.matchesLocation(new URL("https://www.netflix.com/browse") as unknown as Location)).toBe(
      false
    );
  });

  it("marks unentitled Prime cards as requiring an extra subscription", () => {
    document.body.innerHTML = `
      <ul>
        <li>
          <article data-testid="card" data-card-title="Paid Movie" data-card-entitlement="Unentitled">
            <div data-testid="packshot">
              <a href="/detail/0ABC123/ref=atv_dp" aria-label="Paid Movie">
                <img src="poster.jpg" alt="Paid Movie">
              </a>
            </div>
          </article>
        </li>
      </ul>
    `;

    const [card] = primeVideoAdapter.getCards();
    const item = card ? primeVideoAdapter.getItem(card) : null;

    expect(item).toMatchObject({
      platform: "prime-video",
      requiresAdditionalSubscription: true,
      title: "Paid Movie"
    });
    expect(item?.key).toContain("/detail/0ABC123");
  });

  it("does not mark entitled Prime cards as requiring an extra subscription", () => {
    document.body.innerHTML = `
      <ul>
        <li>
          <article data-testid="card" data-card-title="Included Movie" data-card-entitlement="Entitled">
            <div data-testid="packshot">
              <a href="/detail/0DEF456/ref=atv_dp" aria-label="Included Movie">
                <img src="poster.jpg" alt="Included Movie">
              </a>
            </div>
          </article>
        </li>
      </ul>
    `;

    const [card] = primeVideoAdapter.getCards();
    const item = card ? primeVideoAdapter.getItem(card) : null;

    expect(item).toMatchObject({
      platform: "prime-video",
      requiresAdditionalSubscription: false,
      title: "Included Movie"
    });
    expect(item?.key).toContain("/detail/0DEF456");
  });

  it("marks event cards and their carousel section", () => {
    document.body.innerHTML = `
      <div data-testid="navigation-carousel-wrapper">
        <section>
          <h2>
            <span data-testid="carousel-title">Copa do Mundo FIFA 2026 ao vivo e proximos eventos</span>
          </h2>
          <a href="/tournament/fifa" data-testid="see-more">Veja mais</a>
        </section>
        <ul>
          <li>
            <article
              data-testid="card"
              data-card-title="Aqui E Brasil"
              data-card-entity-type="EVENT"
              data-card-entitlement="Entitled"
            >
              <div data-testid="packshot">
                <a href="/detail/0EVENT/ref=atv_dp" aria-label="Aqui E Brasil">
                  <img src="poster.jpg" alt="Aqui E Brasil">
                </a>
              </div>
            </article>
          </li>
        </ul>
      </div>
    `;

    const [card] = primeVideoAdapter.getCards();
    const item = card ? primeVideoAdapter.getItem(card) : null;

    expect(item).toMatchObject({
      isLiveEvent: true,
      platform: "prime-video",
      sectionHideReason: "live-event",
      title: "Aqui E Brasil"
    });
    expect(item?.sectionElement).toBe(document.querySelector("[data-testid='navigation-carousel-wrapper']"));
  });

  it("marks buy or rent carousels so the whole section can be hidden", () => {
    document.body.innerHTML = `
      <div data-testid="navigation-carousel-wrapper">
        <section>
          <h2>
            <span data-testid="carousel-title">Filmes para comprar ou alugar selecionados para voce</span>
          </h2>
        </section>
        <ul>
          <li>
            <article data-testid="card" data-card-title="Paid Movie" data-card-entitlement="Unentitled">
              <div data-testid="packshot">
                <a href="/detail/0BUYRENT/ref=atv_dp" aria-label="Paid Movie">
                  <img src="poster.jpg" alt="Paid Movie">
                </a>
              </div>
            </article>
          </li>
        </ul>
      </div>
    `;

    const [card] = primeVideoAdapter.getCards();
    const item = card ? primeVideoAdapter.getItem(card) : null;

    expect(item).toMatchObject({
      requiresAdditionalSubscription: true,
      sectionHideReason: "paid-content",
      title: "Paid Movie"
    });
    expect(item?.sectionElement).toBe(document.querySelector("[data-testid='navigation-carousel-wrapper']"));
  });

  it("marks channel cards with free sample style assets", () => {
    document.body.innerHTML = `
      <ul>
        <li>
          <article data-testid="card" data-card-title="Widow's Bay" data-card-entity-type="TV Show">
            <div data-testid="packshot">
              <a href="/detail/0WIDOW/ref=atv_dp" aria-label="O Segredo de Widow's Bay">
                <picture>
                  <source srcset="https://images-na.ssl-images-amazon.com/images/S/pv-target-images/example._UR1920,1080_CLs%7C1920,1080%7C/G/01/digital/video/merch/subs/benefit-id/a-f/appletvbr/logos/channels-logo-white.png%7C0,0,1920,1080_SX624_FMwebp_.jpg">
                  <img src="poster.jpg" alt="O Segredo de Widow's Bay">
                </picture>
              </a>
            </div>
          </article>
        </li>
      </ul>
    `;

    const [card] = primeVideoAdapter.getCards();
    const item = card ? primeVideoAdapter.getItem(card) : null;

    expect(item).toMatchObject({
      requiresChannelSubscription: true,
      title: "O Segredo de Widow's Bay"
    });
  });

  it("does not mark entitled channel cards as requiring a channel subscription", () => {
    document.body.innerHTML = `
      <ul>
        <li>
          <article
            data-testid="card"
            data-card-title="Included Channel Show"
            data-card-entitlement="Entitled"
            data-card-entity-type="TV Show"
          >
            <div data-testid="packshot">
              <a href="/detail/0CHANNEL/ref=atv_dp" aria-label="Included Channel Show">
                <picture>
                  <source srcset="https://images-na.ssl-images-amazon.com/images/S/pv-target-images/example._UR1920,1080_CLs%7C1920,1080%7C/G/01/digital/video/merch/subs/benefit-id/m-r/Prime/logos/channels-logo-white.png%7C0,0,1920,1080_SX624_FMwebp_.jpg">
                  <img src="poster.jpg" alt="Included Channel Show">
                </picture>
              </a>
            </div>
          </article>
        </li>
      </ul>
    `;

    const [card] = primeVideoAdapter.getCards();
    const item = card ? primeVideoAdapter.getItem(card) : null;

    expect(item).toMatchObject({
      requiresChannelSubscription: false,
      title: "Included Channel Show"
    });
  });

  it("does not mark Prime branded super-carousel originals as paid channel content", () => {
    document.body.innerHTML = `
      <div data-testid="navigation-carousel-wrapper">
        <ul>
          <li>
            <article data-testid="super-carousel-card">
              <button aria-label="Elle: Legalmente Loira"></button>
              <a href="/detail/0PRIME/ref=atv_dp" aria-label="Elle: Legalmente Loira" data-testid="poster-link">
                <picture>
                  <source srcset="https://images-na.ssl-images-amazon.com/images/S/pv-target-images/example._UR2000,3000_CLs%7C2000,3000%7C/G/01/digital/video/merch/subs/benefit-id/m-r/Prime/logos/channels-logo-white.png%7C0,0,2000,3000_SX750_FMwebp_.jpg">
                  <img src="poster.jpg" alt="Elle: Legalmente Loira">
                </picture>
              </a>
            </article>
          </li>
        </ul>
      </div>
    `;

    const [card] = primeVideoAdapter.getCards();
    const item = card ? primeVideoAdapter.getItem(card) : null;

    expect(item).toMatchObject({
      requiresChannelSubscription: false,
      title: "Elle: Legalmente Loira"
    });
    expect(item?.markerHost?.getAttribute("data-testid")).toBe("super-carousel-card");
  });

  it("cleans stale markers from virtualized Prime carousel placeholders", () => {
    document.body.innerHTML = `
      <ul>
        <li
          class="hwc-card-instrumented hwc-card-marker-host hwc-card-dimmed"
          data-hidden="true"
          data-hwc-managed="true"
          data-hwc-reason="marcado manualmente"
        >
          <button class="hwc-watch-marker" type="button"></button>
        </li>
      </ul>
    `;

    primeVideoAdapter.getCards();

    const placeholder = document.querySelector("li");

    expect(placeholder?.querySelector(".hwc-watch-marker")).toBeNull();
    expect(placeholder?.getAttribute("data-hwc-managed")).toBeNull();
    expect(placeholder?.classList.contains("hwc-card-instrumented")).toBe(false);
    expect(placeholder?.classList.contains("hwc-card-marker-host")).toBe(false);
    expect(placeholder?.classList.contains("hwc-card-dimmed")).toBe(false);
  });
});
