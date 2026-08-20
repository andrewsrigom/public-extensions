import {
  getCookieRemovalUrl,
  getDefaultSelectedCategories,
  getSupportedSelectedCategories,
  normalizeHostname,
  parseActiveSite
} from "./model";

describe("site reset model", () => {
  it("parses supported active tabs into site context", () => {
    expect(
      parseActiveSite({
        id: 12,
        title: "Amazon",
        url: "https://www.amazon.com/products/1"
      })
    ).toMatchObject({
      hostname: "amazon.com",
      origin: "https://www.amazon.com",
      tabId: 12,
      title: "Amazon"
    });
  });

  it("rejects unsupported browser pages", () => {
    expect(parseActiveSite({ id: 12, url: "chrome://extensions" })).toBeNull();
    expect(parseActiveSite({ id: 12, url: "about:blank" })).toBeNull();
    expect(parseActiveSite({ url: "https://example.com" })).toBeNull();
  });

  it("normalizes hosts for display", () => {
    expect(normalizeHostname("www.Example.com")).toBe("example.com");
  });

  it("builds safe cookie removal URLs", () => {
    expect(getCookieRemovalUrl({ domain: ".example.com", path: "/", secure: true })).toBe("https://example.com/");
    expect(getCookieRemovalUrl({ domain: "shop.example.com", path: "cart", secure: false })).toBe(
      "http://shop.example.com/cart"
    );
  });

  it("keeps unsupported categories out of actionable selections", () => {
    expect(getDefaultSelectedCategories()).toEqual(["cookies", "cache"]);
    expect(getSupportedSelectedCategories(["cookies", "permissions", "siteSettings"])).toEqual(["cookies"]);
  });
});
