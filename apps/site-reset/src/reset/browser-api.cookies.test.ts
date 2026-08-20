import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetSite } from "./browser-api";
import type { ActiveSite } from "./model";

const browserApiMock = vi.hoisted(() => ({
  getAllCookies: vi.fn(),
  getTab: vi.fn(),
  removeBrowsingData: vi.fn(),
  removeCookie: vi.fn()
}));

vi.mock("wxt/browser", () => ({
  browser: {
    browsingData: {
      remove: browserApiMock.removeBrowsingData
    },
    cookies: {
      getAll: browserApiMock.getAllCookies,
      remove: browserApiMock.removeCookie
    },
    tabs: {
      get: browserApiMock.getTab
    }
  }
}));

const SITE: ActiveSite = {
  hostname: "example.com",
  origin: "https://example.com",
  tabId: 12,
  title: "Example",
  url: "https://example.com/"
};

describe("site reset cookie handling", () => {
  beforeEach(() => {
    browserApiMock.getAllCookies.mockReset();
    browserApiMock.getAllCookies.mockResolvedValue([]);
    browserApiMock.getTab.mockReset();
    browserApiMock.getTab.mockResolvedValue({ id: SITE.tabId, title: SITE.title, url: SITE.url });
    browserApiMock.removeBrowsingData.mockReset();
    browserApiMock.removeBrowsingData.mockResolvedValue(undefined);
    browserApiMock.removeCookie.mockReset();
    browserApiMock.removeCookie.mockResolvedValue({});
  });

  it("clears every regular cookie path and partitioned cookies for the active top-level site", async () => {
    const partitionKey = { topLevelSite: "https://example.com" };
    browserApiMock.getAllCookies.mockResolvedValue([
      {
        domain: "embedded.example",
        name: "partitioned",
        partitionKey,
        path: "/account",
        secure: true,
        storeId: "0"
      }
    ]);

    await resetSite(SITE, ["cookies"]);

    expect(browserApiMock.getAllCookies).toHaveBeenCalledWith({ partitionKey });
    expect(browserApiMock.removeBrowsingData).toHaveBeenCalledWith({ origins: [SITE.origin] }, { cookies: true });
    expect(browserApiMock.removeCookie).toHaveBeenCalledWith({
      name: "partitioned",
      partitionKey,
      storeId: "0",
      url: "https://embedded.example/account"
    });
  });

  it("fails closed when Chrome cannot enumerate partitioned cookies", async () => {
    browserApiMock.getAllCookies.mockRejectedValue(new Error("partitionKey is unavailable"));

    await expect(resetSite(SITE, ["cookies"])).rejects.toMatchObject({
      code: "cleanup-failed"
    });

    expect(browserApiMock.removeBrowsingData).not.toHaveBeenCalled();
    expect(browserApiMock.removeCookie).not.toHaveBeenCalled();
  });

  it("reports failure when Chrome cannot confirm a partitioned cookie removal", async () => {
    browserApiMock.getAllCookies.mockResolvedValue([
      { domain: "embedded.example", name: "partitioned", path: "/", secure: true }
    ]);
    browserApiMock.removeCookie.mockResolvedValue(undefined);

    await expect(resetSite(SITE, ["cookies"])).rejects.toMatchObject({
      code: "cleanup-failed"
    });
  });
});
