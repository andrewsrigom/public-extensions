import { browser } from "wxt/browser";

import { handleNavigation } from "../src/pathswitch/navigation-runtime";
import { RedirectHopGuard } from "../src/pathswitch/redirect-guard";
import { loadSettings } from "../src/pathswitch/storage";

export default defineBackground(() => {
  const guard = new RedirectHopGuard();
  const navigationEpochs = new Map<number, number>();

  browser.webNavigation.onBeforeNavigate.addListener((details) => {
    const navigationEpoch =
      details.frameId === 0 && details.tabId >= 0
        ? (navigationEpochs.get(details.tabId) ?? 0) + 1
        : (navigationEpochs.get(details.tabId) ?? 0);

    if (details.frameId === 0 && details.tabId >= 0) {
      navigationEpochs.set(details.tabId, navigationEpoch);
    }

    void handleNavigation(details, {
      guard,
      isNavigationCurrent: () => navigationEpochs.get(details.tabId) === navigationEpoch,
      loadSettings,
      updateTab: async (tabId, targetUrl) => {
        await browser.tabs.update(tabId, {
          url: targetUrl
        });
      }
    }).catch(() => undefined);
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    guard.reset(tabId);
    navigationEpochs.delete(tabId);
  });
});
