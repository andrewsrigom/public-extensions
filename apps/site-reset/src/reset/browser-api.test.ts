import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetSite } from "./browser-api";
import type { ActiveSite } from "./model";

const browserApiMock = vi.hoisted(() => ({
  removeBrowsingData: vi.fn(),
  executeScript: vi.fn(),
  getTab: vi.fn()
}));

vi.mock("wxt/browser", () => ({
  browser: {
    browsingData: {
      remove: browserApiMock.removeBrowsingData
    },
    scripting: {
      executeScript: browserApiMock.executeScript
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

describe("site reset browser API", () => {
  beforeEach(() => {
    browserApiMock.removeBrowsingData.mockReset();
    browserApiMock.removeBrowsingData.mockResolvedValue(undefined);
    browserApiMock.executeScript.mockReset();
    browserApiMock.executeScript.mockResolvedValue([{ result: true }]);
    browserApiMock.getTab.mockReset();
    browserApiMock.getTab.mockResolvedValue({ id: SITE.tabId, title: SITE.title, url: SITE.url });
  });

  it("keeps the browser-cache category limited to browser cache", async () => {
    await resetSite(SITE, ["cache"]);

    expect(browserApiMock.removeBrowsingData).toHaveBeenCalledOnce();
    expect(browserApiMock.removeBrowsingData).toHaveBeenCalledWith(
      { origins: ["https://example.com"] },
      { cache: true }
    );
    expect(browserApiMock.executeScript).not.toHaveBeenCalled();
  });

  it("clears Cache Storage, IndexedDB, and service workers only when offline data is selected", async () => {
    await resetSite(SITE, ["offlineData"]);

    expect(browserApiMock.removeBrowsingData).toHaveBeenCalledOnce();
    expect(browserApiMock.removeBrowsingData).toHaveBeenCalledWith(
      { origins: ["https://example.com"] },
      {
        cacheStorage: true,
        indexedDB: true,
        serviceWorkers: true
      }
    );
    expect(browserApiMock.executeScript).toHaveBeenCalledWith({
      args: [SITE.origin],
      func: expect.any(Function),
      target: { tabId: 12 }
    });
  });

  it("aborts before deletion when the captured tab changed origins", async () => {
    browserApiMock.getTab.mockResolvedValue({ id: SITE.tabId, title: "Other", url: "https://other.example/" });

    await expect(resetSite(SITE, ["cache"])).rejects.toMatchObject({
      code: "site-changed"
    });
    expect(browserApiMock.removeBrowsingData).not.toHaveBeenCalled();
  });

  it("reports an incomplete cleanup instead of silently succeeding", async () => {
    browserApiMock.executeScript.mockResolvedValue([{ result: undefined }]);

    await expect(resetSite(SITE, ["localStorage"])).rejects.toMatchObject({
      code: "cleanup-failed"
    });
  });

  it("aborts injected cleanup if the document changed after the preflight check", async () => {
    browserApiMock.executeScript.mockResolvedValue([{ result: false }]);

    await expect(resetSite(SITE, ["offlineData"])).rejects.toMatchObject({
      code: "site-changed"
    });
  });
});
