import { crunchyrollAdapter } from "./crunchyroll";
import { beforeEach, describe, expect, it } from "vitest";

describe("crunchyrollAdapter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";

    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 250,
        height: 250,
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

  it("matches Crunchyroll pages", () => {
    expect(
      crunchyrollAdapter.matchesLocation(new URL("https://www.crunchyroll.com/pt-br/") as unknown as Location)
    ).toBe(true);
    expect(crunchyrollAdapter.matchesLocation(new URL("https://tv.apple.com/br") as unknown as Location)).toBe(false);
  });

  it("extracts a stable item from a Crunchyroll browse card", () => {
    document.body.innerHTML = `
      <div class="browse-card--esJdT" data-t="series-card personalized-collection-card">
        <a href="/pt-br/series/G6NVG970Y/welcome-to-demon-school-iruma-kun" class="browse-card__poster-wrapper--pU-AW">
          <div class="content-image--3na7E content-image--is-sized--SOai1 browse-card__poster--l05TD">
            <figure class="content-image__figure--7vume">
              <img class="content-image__image--7tGlg" alt="Welcome to Demon School! Iruma-kun" data-t="original-image" src="poster.png">
            </figure>
          </div>
        </a>
        <div class="browse-card__body--yGjzX">
          <h3 data-t="title">
            <a href="/pt-br/series/G6NVG970Y/welcome-to-demon-school-iruma-kun" class="browse-card__title-link--SLlRM">
              Welcome to Demon School! Iruma-kun
            </a>
          </h3>
        </div>
      </div>
    `;

    const [card] = crunchyrollAdapter.getCards();
    const item = card ? crunchyrollAdapter.getItem(card) : null;

    expect(card?.dataset.t).toContain("series-card");
    expect(item).toMatchObject({
      key: "crunchyroll:series:G6NVG970Y",
      markerPlacement: "cover-top-left",
      platform: "crunchyroll",
      title: "Welcome to Demon School! Iruma-kun"
    });
    expect(item?.url).toContain("/pt-br/series/G6NVG970Y/welcome-to-demon-school-iruma-kun");
    expect(item?.markerHost?.dataset.t).toContain("series-card");
    expect(item?.visualHost?.className).toContain("content-image");
  });

  it("uses hover links from the same Crunchyroll card", () => {
    document.body.innerHTML = `
      <div class="browse-card--esJdT" data-t="series-card personalized-collection-card">
        <div class="browse-card-hover--CxFWw" data-t="hover-component">
          <a aria-label="Welcome to Demon School! Iruma-kun" class="browse-card-hover__link--0BAl-" data-t="hover-link" href="/pt-br/series/G6NVG970Y/welcome-to-demon-school-iruma-kun"></a>
          <div class="browse-card-hover__poster-wrapper--Yf-IK">
            <img class="content-image__image--7tGlg" alt="Welcome to Demon School! Iruma-kun" data-t="original-image" src="poster.png">
          </div>
        </div>
      </div>
    `;

    const [card] = crunchyrollAdapter.getCards();
    const item = card ? crunchyrollAdapter.getItem(card) : null;

    expect(item).toMatchObject({
      key: "crunchyroll:series:G6NVG970Y",
      platform: "crunchyroll",
      title: "Welcome to Demon School! Iruma-kun"
    });
    expect(item?.markerHost?.dataset.t).toContain("series-card");
  });
});
