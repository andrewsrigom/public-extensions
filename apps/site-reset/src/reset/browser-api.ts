import { browser } from "wxt/browser";

import {
  getCookieRemovalUrl,
  getSupportedSelectedCategories,
  parseActiveSite,
  type ActiveSite,
  type ResetCategoryId
} from "./model";

type CookiePartitionKey = {
  hasCrossSiteAncestor?: boolean;
  topLevelSite?: string;
};

type BrowserCookie = {
  domain: string;
  name: string;
  partitionKey?: CookiePartitionKey;
  path: string;
  secure: boolean;
  storeId?: string;
};

type CookiesApi = {
  getAll: (details: { partitionKey: CookiePartitionKey }) => Promise<BrowserCookie[]>;
  remove: (details: {
    name: string;
    partitionKey?: CookiePartitionKey;
    storeId?: string;
    url: string;
  }) => Promise<unknown>;
};
type BrowsingDataTypeSet = Partial<{
  cache: boolean;
  cacheStorage: boolean;
  cookies: boolean;
  fileSystems: boolean;
  indexedDB: boolean;
  localStorage: boolean;
  serviceWorkers: boolean;
  webSQL: boolean;
}>;

type BrowsingDataApi = {
  remove: (options: { origins?: string[]; since?: number }, dataToRemove: BrowsingDataTypeSet) => Promise<void>;
};

type ScriptingApi = {
  executeScript: (details: {
    args: [string];
    func: (expectedOrigin: string) => boolean | Promise<boolean>;
    target: {
      tabId: number;
    };
  }) => Promise<Array<{ result?: boolean }>>;
};

type BrowserWithSiteResetApis = typeof browser & {
  browsingData?: BrowsingDataApi;
  scripting?: ScriptingApi;
};

export type SiteResetErrorCode = "cleanup-failed" | "site-changed";

export class SiteResetError extends Error {
  constructor(
    readonly code: SiteResetErrorCode,
    options?: ErrorOptions
  ) {
    super(code, options);
    this.name = "SiteResetError";
  }
}

export async function getActiveSite(): Promise<ActiveSite | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return parseActiveSite({
    favIconUrl: tab?.favIconUrl,
    id: tab?.id,
    title: tab?.title,
    url: tab?.url
  });
}

export async function resetSite(site: ActiveSite, selected: readonly ResetCategoryId[]): Promise<void> {
  await assertSiteStillMatches(site);

  try {
    const selectedSupported = getSupportedSelectedCategories(selected);
    const tasks: Array<Promise<void>> = [];

    if (selectedSupported.includes("cookies")) {
      tasks.push(removeSiteCookies(site));
    }

    if (selectedSupported.includes("cache")) {
      tasks.push(removeBrowsingData(site.origin, { cache: true }));
    }

    if (selectedSupported.includes("localStorage")) {
      tasks.push(clearPageStorage(site.tabId, site.origin));
      tasks.push(removeBrowsingData(site.origin, { fileSystems: true, localStorage: true, webSQL: true }));
    }

    if (selectedSupported.includes("offlineData")) {
      tasks.push(clearOfflineData(site.tabId, site.origin));
      tasks.push(removeBrowsingData(site.origin, { cacheStorage: true, indexedDB: true, serviceWorkers: true }));
    }

    await Promise.all(tasks);
  } catch (error) {
    if (error instanceof SiteResetError) throw error;
    throw new SiteResetError("cleanup-failed", { cause: error });
  }
}

async function removeSiteCookies(site: ActiveSite): Promise<void> {
  const cookiesApi = browser.cookies as unknown as CookiesApi | undefined;
  if (!cookiesApi) throw new SiteResetError("cleanup-failed");

  // browsingData clears regular cookies at every path for the registrable
  // domain. The explicit pass additionally covers CHIPS records associated
  // with the current top-level site, including embedded third-party origins.
  const partitionedCookies = await cookiesApi.getAll({ partitionKey: { topLevelSite: site.origin } }).catch(() => []);

  await Promise.all([
    removeBrowsingData(site.origin, { cookies: true }),
    ...partitionedCookies.map(async (cookie) => {
      const removed = await cookiesApi.remove({
        name: cookie.name,
        partitionKey: cookie.partitionKey ?? { topLevelSite: site.origin },
        storeId: cookie.storeId,
        url: getCookieRemovalUrl(cookie)
      });

      if (!removed) throw new SiteResetError("cleanup-failed");
    })
  ]);
}

async function removeBrowsingData(origin: string, dataToRemove: BrowsingDataTypeSet): Promise<void> {
  const browsingData = (browser as BrowserWithSiteResetApis).browsingData;
  if (!browsingData) throw new SiteResetError("cleanup-failed");

  await browsingData.remove({ origins: [origin] }, dataToRemove);
}

async function assertSiteStillMatches(site: ActiveSite): Promise<void> {
  let tab: { favIconUrl?: string; id?: number; title?: string; url?: string };

  try {
    tab = await browser.tabs.get(site.tabId);
  } catch (error) {
    throw new SiteResetError("site-changed", { cause: error });
  }

  const currentSite = parseActiveSite({
    favIconUrl: tab.favIconUrl,
    id: tab.id,
    title: tab.title,
    url: tab.url
  });

  if (!currentSite || currentSite.origin !== site.origin) {
    throw new SiteResetError("site-changed");
  }
}

async function clearPageStorage(tabId: number, expectedOrigin: string): Promise<void> {
  await executeInPage(tabId, expectedOrigin, clearLocalPageStorage);
}

async function clearOfflineData(tabId: number, expectedOrigin: string): Promise<void> {
  await executeInPage(tabId, expectedOrigin, clearPageOfflineData);
}

async function executeInPage(
  tabId: number,
  expectedOrigin: string,
  func: (origin: string) => boolean | Promise<boolean>
): Promise<void> {
  const scripting = (browser as BrowserWithSiteResetApis).scripting;
  if (!scripting) throw new SiteResetError("cleanup-failed");

  const [result] = await scripting.executeScript({
    args: [expectedOrigin],
    func,
    target: { tabId }
  });

  if (result?.result === false) throw new SiteResetError("site-changed");
  if (result?.result !== true) throw new SiteResetError("cleanup-failed");
}

function clearLocalPageStorage(expectedOrigin: string): boolean {
  if (location.origin !== expectedOrigin) return false;
  localStorage.clear();
  sessionStorage.clear();
  return true;
}

async function clearPageOfflineData(expectedOrigin: string): Promise<boolean> {
  if (location.origin !== expectedOrigin) return false;

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    const deletedCaches = await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    if (deletedCaches.some((deleted) => !deleted)) throw new Error("Could not delete every Cache Storage entry.");
  }

  if ("indexedDB" in window && "databases" in indexedDB) {
    const databases = await indexedDB.databases();
    await Promise.all(
      databases.map(
        (database) =>
          new Promise<void>((resolve, reject) => {
            if (!database.name) {
              resolve();
              return;
            }

            const request = indexedDB.deleteDatabase(database.name);
            request.onerror = () => reject(request.error ?? new Error(`Could not delete IndexedDB ${database.name}.`));
            request.onsuccess = () => resolve();
            request.onblocked = () => reject(new Error(`IndexedDB ${database.name} deletion was blocked.`));
          })
      )
    );
  }

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const unregistered = await Promise.all(registrations.map((registration) => registration.unregister()));
    if (unregistered.some((removed) => !removed)) throw new Error("Could not unregister every service worker.");
  }

  return true;
}
