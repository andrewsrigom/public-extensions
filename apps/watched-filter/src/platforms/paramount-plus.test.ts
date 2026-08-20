import { paramountPlusAdapter } from "./paramount-plus";
import { beforeEach, describe, expect, it } from "vitest";

async function collectMutations(update: () => void): Promise<MutationRecord[]> {
  const records: MutationRecord[] = [];
  const observer = new MutationObserver((mutations) => records.push(...mutations));

  observer.observe(document.body, {
    attributeFilter: ["style"],
    attributes: true,
    childList: true,
    subtree: true
  });
  update();
  await Promise.resolve();
  observer.disconnect();

  return records;
}

describe("paramountPlusAdapter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    window.history.replaceState({}, "", "/");

    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 180,
        height: 180,
        left: 0,
        right: 260,
        top: 0,
        width: 260,
        x: 0,
        y: 0,
        toJSON: () => ({})
      })
    });
  });

  it("matches Paramount+ pages", () => {
    expect(
      paramountPlusAdapter.matchesLocation(new URL("https://www.paramountplus.com/br/") as unknown as Location)
    ).toBe(true);
    expect(paramountPlusAdapter.matchesLocation(new URL("https://www.youtube.com/") as unknown as Location)).toBe(
      false
    );
  });

  it("extracts a stable item from a Paramount+ carousel tile", () => {
    document.body.innerHTML = `
      <a class="link zoom-carousel-effect-disabled content-highlight-enabled focusable imdb"
        aria-label="A Agência"
        id="943970057"
        data-genre="DRAMA"
        href="/shows/the-agency/"
        title="A Agência"
        data-tracking="A Agência|2"
        data-impression="943970057|getdisplayIDAbove|2|show||A Agência">
        <span class="aria-item-content" id="a-ag-ncia-content">
          O agente secreto da CIA Martian é forçado a abandonar sua identidade secreta.
        </span>
        <div class="thumb-wrapper">
          <img class="thumb lazy without-addToMyList loaded" alt="A Agência" src="poster.jpg">
        </div>
      </a>
    `;

    const [card] = paramountPlusAdapter.getCards();
    const item = card ? paramountPlusAdapter.getItem(card) : null;

    expect(card?.tagName.toLowerCase()).toBe("a");
    expect(item).toMatchObject({
      dimModeFallback: "overlay",
      key: "paramount-plus:content:943970057",
      markerPlacement: "cover-top-left",
      platform: "paramount-plus",
      title: "A Agência"
    });
    expect(item?.url).toContain("/shows/the-agency/");
    expect(item?.markerHost?.tagName.toLowerCase()).toBe("a");
    expect(item?.visualHost?.className).toContain("thumb-wrapper");
  });

  it("extracts the current Paramount+ movie page as a page action item", () => {
    window.history.replaceState({}, "", "/movies/video/n75MX5KW30pmm3coEUEr0fSGfi0eNiNg/");
    document.body.innerHTML = `
      <div class="cta-box">
        <div class="cta-progress-wrapper">
          <div class="cta_progress_container">
            <a class="button focusable watchMovieButton age-gate-trigger playIcon buttonWindows"
              href="javascript:void(0)"
              aa-link="hero|dynamic play|ASSISTA AGORA|1|South Park: Guerras do Streaming Parte 2">
              <div class="button__text">ASSISTA AGORA</div>
            </a>
          </div>
        </div>
        <div class="hero__lockup-right">
          <div class="watchlist-preferences">
            <div class="watchlist_wrapper initialized in_movie_page"
              data-content_id="n75MX5KW30pmm3coEUEr0fSGfi0eNiNg"
              data-content_type="movie"
              data-title="South Park: Guerras do Streaming Parte 2">
              <a href="#" class="watchlistCta">
                <span class="watchlist_copy">
                  <span class="mylist">Minha lista</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;

    const cards = paramountPlusAdapter.getCards();
    const watchCard = cards.find((card) => card.classList.contains("cta-box"));
    const item = watchCard ? paramountPlusAdapter.getItem(watchCard) : null;

    expect(item).toMatchObject({
      key: "paramount-plus:content:n75MX5KW30pmm3coEUEr0fSGfi0eNiNg",
      markerPlacement: "page-action",
      platform: "paramount-plus",
      title: "South Park: Guerras do Streaming Parte 2",
      url: "http://localhost:3000/movies/video/n75MX5KW30pmm3coEUEr0fSGfi0eNiNg/"
    });
    expect(document.querySelector(".watchlist_wrapper")?.nextElementSibling).toBe(item?.markerHost);
  });

  it("ignores hidden Paramount+ hover previews during automatic card scans", () => {
    document.body.innerHTML = `
      <div id="943970057" class="ch-expanded-container imdb" data-showid="943970057" title="A Agência" style="display: none;">
        <div class="thumb-wrapper">
          <img class="thumb loaded" alt="A Agência" src="poster.jpg">
        </div>
        <a class="link" aria-label="A Agência" href="/shows/the-agency/" data-impression="943970057|getdisplayIDAbove|2|show||A Agência"></a>
      </div>
    `;

    expect(paramountPlusAdapter.getCards()).toEqual([]);
  });

  it("ignores Paramount+ hover preview mutations", async () => {
    document.body.innerHTML = `
      <a id="943970057" class="ch-expanded-container imdb" href="/shows/the-agency/" style="display: none;"></a>
      <a class="link" id="regular-card" href="/shows/the-agency/"></a>
    `;

    const preview = document.querySelector<HTMLElement>(".ch-expanded-container");
    const regularCard = document.querySelector<HTMLElement>("#regular-card");

    if (!preview || !regularCard) {
      throw new Error("Test fixture failed to render.");
    }

    const previewMutations = await collectMutations(() => {
      preview.style.display = "block";
    });
    const regularMutations = await collectMutations(() => {
      regularCard.style.display = "block";
    });

    expect(previewMutations.length).toBeGreaterThan(0);
    expect(previewMutations.every((mutation) => paramountPlusAdapter.shouldIgnoreMutation?.(mutation))).toBe(true);
    expect(regularMutations.some((mutation) => !paramountPlusAdapter.shouldIgnoreMutation?.(mutation))).toBe(true);
  });

  it("can still read a Paramount+ hover preview when requested directly", () => {
    document.body.innerHTML = `
      <div id="943970057" class="ch-expanded-container imdb" data-showid="943970057" title="A Agência">
        <div class="thumb-wrapper">
          <img class="thumb loaded" alt="A Agência" src="poster.jpg">
        </div>
        <a class="link" aria-label="A Agência" href="/shows/the-agency/" data-impression="943970057|getdisplayIDAbove|2|show||A Agência"></a>
      </div>
    `;

    const card = document.querySelector<HTMLElement>(".ch-expanded-container");
    const item = card ? paramountPlusAdapter.getItem(card) : null;

    expect(card?.className).toContain("ch-expanded-container");
    expect(item).toMatchObject({
      key: "paramount-plus:content:943970057",
      markerPlacement: "cover-top-left",
      platform: "paramount-plus",
      title: "A Agência"
    });
    expect(item?.markerHost?.className).toContain("ch-expanded-container");
    expect(item?.visualHost?.className).toContain("thumb-wrapper");
  });
});
