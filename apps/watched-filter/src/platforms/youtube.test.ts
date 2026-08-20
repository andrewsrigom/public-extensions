import { SETTINGS_DEFAULTS } from "../shared/defaults";
import { youtubeAdapter } from "./youtube";
import { beforeEach, describe, expect, it } from "vitest";

describe("youtubeAdapter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    window.history.replaceState({}, "", "/");

    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 140,
        height: 140,
        left: 0,
        right: 240,
        top: 0,
        width: 240,
        x: 0,
        y: 0,
        toJSON: () => ({})
      })
    });
  });

  it("matches YouTube pages", () => {
    expect(youtubeAdapter.matchesLocation(new URL("https://www.youtube.com/") as unknown as Location)).toBe(true);
    expect(youtubeAdapter.matchesLocation(new URL("https://youtu.be/Oowryq1TdF0") as unknown as Location)).toBe(true);
    expect(youtubeAdapter.matchesLocation(new URL("https://www.netflix.com/browse") as unknown as Location)).toBe(
      false
    );
  });

  it("extracts a stable item from a YouTube rich grid card", () => {
    document.body.innerHTML = `
      <ytd-rich-item-renderer>
        <div id="content" class="style-scope ytd-rich-item-renderer">
          <yt-lockup-view-model class="ytd-rich-item-renderer lockup ytLockupViewModelWrapper" ytb-content-type="video">
            <div class="ytLockupViewModelHost content-id-Oowryq1TdF0">
              <a href="/watch?v=Oowryq1TdF0" class="ytLockupViewModelContentImage" aria-hidden="true">
                <yt-thumbnail-view-model class="ytThumbnailViewModelHost ytThumbnailViewModelAspectRatio16By9">
                  <div class="ytThumbnailViewModelImage">
                    <img alt="" src="https://i.ytimg.com/vi/Oowryq1TdF0/hq720.jpg">
                  </div>
                </yt-thumbnail-view-model>
              </a>
              <h3 title="MOUNT E COLEGAS NO ORFANATO ABANDONADO | Lost Lullabies" aria-label="MOUNT E COLEGAS NO ORFANATO ABANDONADO | Lost Lullabies">
                <a href="/watch?v=Oowryq1TdF0" class="ytLockupMetadataViewModelTitle" aria-label="MOUNT E COLEGAS NO ORFANATO ABANDONADO | Lost Lullabies 1 hora e 53 minutos">
                  <span>MOUNT E COLEGAS NO ORFANATO ABANDONADO | Lost Lullabies</span>
                </a>
              </h3>
            </div>
          </yt-lockup-view-model>
        </div>
      </ytd-rich-item-renderer>
    `;

    const [card] = youtubeAdapter.getCards();
    const item = card ? youtubeAdapter.getItem(card) : null;

    expect(card?.tagName.toLowerCase()).toBe("yt-lockup-view-model");
    expect(item).toMatchObject({
      key: "youtube:video:Oowryq1TdF0",
      markerPlacement: "cover-top-left",
      platform: "youtube",
      title: "MOUNT E COLEGAS NO ORFANATO ABANDONADO | Lost Lullabies"
    });
    expect(item?.url).toContain("/watch");
    expect(item?.markerHost?.tagName.toLowerCase()).toBe("yt-lockup-view-model");
    expect(item?.visualHost?.className).toContain("ytLockupViewModelContentImage");
  });

  it("extracts the current YouTube watch page as a page action item", () => {
    window.history.replaceState({}, "", "/watch?v=626zTOsxyGY");
    document.body.innerHTML = `
      <ytd-watch-metadata>
        <div id="above-the-fold" class="style-scope ytd-watch-metadata">
          <div id="title">
            <h1>
              <yt-formatted-string title="AVE MARIA, que filme bom! Project Hail Mary | Gaveta">
                AVE MARIA, que filme bom! Project Hail Mary | Gaveta
              </yt-formatted-string>
            </h1>
          </div>
          <div id="top-row">
            <div id="subscribe-button"></div>
            <div class="wmButton wmButtonYtPageFix">☐</div>
          </div>
        </div>
      </ytd-watch-metadata>
    `;

    const cards = youtubeAdapter.getCards();
    const watchCard = cards.find((card) => card.tagName.toLowerCase() === "ytd-watch-metadata");
    const item = watchCard ? youtubeAdapter.getItem(watchCard) : null;

    expect(item).toMatchObject({
      key: "youtube:video:626zTOsxyGY",
      markerPlacement: "page-action",
      platform: "youtube",
      title: "AVE MARIA, que filme bom! Project Hail Mary | Gaveta",
      url: "https://www.youtube.com/watch?v=626zTOsxyGY"
    });
    expect(document.querySelector(".wmButtonYtPageFix")?.nextElementSibling).toBe(item?.markerHost);
  });

  it("detects in-progress YouTube cards from progress signals", () => {
    document.body.innerHTML = `
      <ytd-rich-item-renderer>
        <yt-lockup-view-model>
          <a href="/watch?v=Oowryq1TdF0" class="ytLockupViewModelContentImage">
            <yt-thumbnail-view-model>
              <img alt="" src="poster.jpg">
              <div role="progressbar" aria-valuenow="45"></div>
            </yt-thumbnail-view-model>
          </a>
          <h3 title="Lost Lullabies">
            <a href="/watch?v=Oowryq1TdF0" aria-label="Lost Lullabies 1 hour and 53 minutes">
              <span>Lost Lullabies</span>
            </a>
          </h3>
        </yt-lockup-view-model>
      </ytd-rich-item-renderer>
    `;

    const [card] = youtubeAdapter.getCards();
    const item = card ? youtubeAdapter.getItem(card) : null;
    const state = item ? youtubeAdapter.getAutoState?.(item, SETTINGS_DEFAULTS) : null;

    expect(state).toMatchObject({
      progress: 45,
      state: "in-progress"
    });
  });
});
