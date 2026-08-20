import { iqiyiAdapter } from "./iqiyi";
import { beforeEach, describe, expect, it } from "vitest";

describe("iqiyiAdapter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";

    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 360,
        height: 360,
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

  it("matches iQIYI pages", () => {
    expect(iqiyiAdapter.matchesLocation(new URL("https://www.iq.com/?lang=pt_br") as unknown as Location)).toBe(true);
    expect(iqiyiAdapter.matchesLocation(new URL("https://www.youtube.com/") as unknown as Location)).toBe(false);
  });

  it("extracts a stable item from an iQIYI poster card", () => {
    document.body.innerHTML = `
      <div class="plist-img-wrap pull-hover" data-type="pop">
        <div style="position: relative;">
          <a href="//www.iq.com/play/bl-buzz-must-watch-recent-finales-20s64hiyrk2?lang=pt_br" gtag-category="home_pcw_vertical_list">
            <div class="pic-box">
              <span>
                <img alt=" BL Buzz: Must-Watch Recent Finales Legendas em português Dublagem em chinês" class="img" src="//pic2.iqiyipic.com/image/poster.jpg">
              </span>
            </div>
          </a>
        </div>
        <a href="//www.iq.com/play/bl-buzz-must-watch-recent-finales-20s64hiyrk2?lang=pt_br" gtag-category="home_pcw_vertical_list">
          <div class="text-box">
            <p class="title">BL Buzz: Must-Watch Recent Finales</p>
          </div>
        </a>
      </div>
    `;

    const [card] = iqiyiAdapter.getCards();
    const item = card ? iqiyiAdapter.getItem(card) : null;

    expect(card?.className).toContain("plist-img-wrap");
    expect(item).toMatchObject({
      key: "iqiyi:play:20s64hiyrk2",
      markerPlacement: "cover-top-left",
      platform: "iqiyi",
      title: "BL Buzz: Must-Watch Recent Finales"
    });
    expect(item?.url).toContain("/play/bl-buzz-must-watch-recent-finales-20s64hiyrk2");
    expect(item?.markerHost?.className).toContain("plist-img-wrap");
    expect(item?.visualHost?.className).toContain("pic-box");
  });

  it("cleans language badges when the image alt is the only title source", () => {
    document.body.innerHTML = `
      <div class="plist-img-wrap pull-hover">
        <a href="/play/bl-buzz-must-watch-recent-finales-20s64hiyrk2?lang=pt_br">
          <div class="pic-box">
            <img alt=" BL Buzz: Must-Watch Recent Finales Legendas em português Dublagem em chinês" src="poster.jpg">
          </div>
        </a>
      </div>
    `;

    const [card] = iqiyiAdapter.getCards();
    const item = card ? iqiyiAdapter.getItem(card) : null;

    expect(item?.title).toBe("BL Buzz: Must-Watch Recent Finales");
  });

  it("extracts album cards from iQIYI carousel rows", () => {
    document.body.innerHTML = `
      <div class="slider-move">
        <div class="slide-item-wrap">
          <div class="plist-img-wrap pull-hover" data-type="pop">
            <div style="position: relative;">
              <a href="//www.iq.com/album/ver%C3%A3o-sem-fim-2026-14mg4loc341?lang=pt_br" gtag-category="home_pcw_vertical_list">
                <div class="pic-box">
                  <img alt=" Verão Sem Fim Legendas em português Dublagem em chinês" class="img" src="poster.jpg">
                </div>
              </a>
            </div>
            <a href="//www.iq.com/album/ver%C3%A3o-sem-fim-2026-14mg4loc341?lang=pt_br" gtag-category="home_pcw_vertical_list">
              <div class="text-box">
                <p class="title">Verão Sem Fim</p>
                <p class="hot-update-info">29 Episódios</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    `;

    const cards = iqiyiAdapter.getCards();
    const item = cards[0] ? iqiyiAdapter.getItem(cards[0]) : null;

    expect(cards).toHaveLength(1);
    expect(item).toMatchObject({
      key: "iqiyi:album:14mg4loc341",
      markerPlacement: "cover-top-left",
      platform: "iqiyi",
      title: "Verão Sem Fim"
    });
    expect(item?.url).toContain("/album/ver%C3%A3o-sem-fim-2026-14mg4loc341");
    expect(item?.visualHost?.className).toContain("pic-box");
  });

  it("uses the outer filter result wrapper when the inner iQIYI card has no box", () => {
    document.body.innerHTML = `
      <div class="video-filter-wrapper">
        <div class="sc-9dd022e8-0 dJExWA normal img-type-1" data-issendpb="1">
          <div class="plist-img-wrap">
            <a href="//www.iq.com/album/o-caminho-para-o-sucesso-2026-2f3498mxwyx?lang=pt_br" rseat="0" data-pb="rpage=explore_library_2&block=filter_result&r=8753735083871301" target="_blank" rel="noreferrer">
              <div style="position: relative;">
                <div class="pic-box">
                  <img class="img" src="poster.webp" alt=" O Caminho para o Sucesso (2026) Legendas em português Dublagem em chinês Drama">
                  <div class="mask-container collection">
                    <div class="wrap" role="button" aria-label="play-button" tabindex="0"></div>
                  </div>
                </div>
              </div>
              <div class="text-box">
                <p class="title">O Caminho para o Sucesso</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    `;

    const innerCard = document.querySelector<HTMLElement>(".plist-img-wrap");
    const outerCard = document.querySelector<HTMLElement>("[data-issendpb]");

    Object.defineProperty(innerCard, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        top: 0,
        width: 0,
        x: 0,
        y: 0,
        toJSON: () => ({})
      })
    });

    Object.defineProperty(outerCard, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 360,
        height: 360,
        left: 0,
        right: 260,
        top: 0,
        width: 260,
        x: 0,
        y: 0,
        toJSON: () => ({})
      })
    });

    const [card] = iqiyiAdapter.getCards();
    const item = card ? iqiyiAdapter.getItem(card) : null;

    expect(card?.dataset.issendpb).toBe("1");
    expect(item).toMatchObject({
      key: "iqiyi:album:2f3498mxwyx",
      markerPlacement: "cover-top-left",
      platform: "iqiyi",
      title: "O Caminho para o Sucesso"
    });
    expect(item?.visualHost?.className).toContain("pic-box");
  });
});
