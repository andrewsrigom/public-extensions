import { maxAdapter } from "./max";
import { beforeEach, describe, expect, it } from "vitest";

describe("maxAdapter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";

    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 120,
        height: 120,
        left: 0,
        right: 180,
        top: 0,
        width: 180,
        x: 0,
        y: 0,
        toJSON: () => ({})
      })
    });
  });

  it("matches Max and HBO Max pages", () => {
    expect(maxAdapter.matchesLocation(new URL("https://play.hbomax.com") as unknown as Location)).toBe(true);
    expect(maxAdapter.matchesLocation(new URL("https://play.max.com") as unknown as Location)).toBe(true);
    expect(maxAdapter.matchesLocation(new URL("https://www.disneyplus.com/home") as unknown as Location)).toBe(false);
  });

  it("extracts a stable item from a Max tile", () => {
    document.body.innerHTML = `
      <div class="StyledTileWrapper-Fuse-Web-Play__sc-1ramr47-28">
        <a aria-label="⁦⁨⁨Duna: A Profecia⁩⁩. ⁨1 de 20⁩⁩" data-sonic-id="57660b16-a32a-476f-89da-3302ac379e91" data-sonic-type="show" data-testid="57660b16-a32a-476f-89da-3302ac379e91_tile" href="/show/57660b16-a32a-476f-89da-3302ac379e91">
          <div aria-hidden="true" data-testid="57660b16-a32a-476f-89da-3302ac379e91_tileImage" class="StyledTileImageContainer-Fuse-Web-Play__sc-1ramr47-2">
            <img alt="" src="poster.jpeg">
            <div class="StyledTileOverlays-Fuse-Web-Play__sc-1ramr47-6">
              <p aria-hidden="true" class="StyledTileBackupImageText-Fuse-Web-Play__sc-1ramr47-1">Duna: A Profecia</p>
            </div>
          </div>
        </a>
      </div>
    `;

    const [card] = maxAdapter.getCards();
    const item = card ? maxAdapter.getItem(card) : null;

    expect(card?.className).toContain("StyledTileWrapper");
    expect(item).toMatchObject({
      key: "max:sonic:57660b16-a32a-476f-89da-3302ac379e91",
      markerPlacement: "host-bottom-left",
      platform: "max",
      title: "Duna: A Profecia"
    });
    expect(item?.url).toContain("/show/57660b16-a32a-476f-89da-3302ac379e91");
    expect(item?.markerHost?.getAttribute("data-testid")).toBe("57660b16-a32a-476f-89da-3302ac379e91_tileImage");
  });
});
