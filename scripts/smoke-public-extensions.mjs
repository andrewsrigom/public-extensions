#!/usr/bin/env node

import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { createServer } from "node:http";
import { cpSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
const publicApps = ["watched-filter", "product-filter", "quick-notes", "time-zone-helper", "site-reset", "pathswitch"];
const smokeByApp = {
  "watched-filter": smokeWatchedFilter,
  "product-filter": smokeProductFilter,
  "quick-notes": smokeQuickNotes,
  "time-zone-helper": smokeTimeZoneHelper,
  "site-reset": smokeSiteReset,
  pathswitch: smokePathSwitch
};
const activeTemporaryRoots = new Set();

export function parseSmokeArguments(arguments_) {
  let headed = process.env.PW_HEADED === "1";
  let selectedApp;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--") continue;

    if (argument === "--headed") {
      headed = true;
      continue;
    }

    if (argument === "--app") {
      if (selectedApp) throw new Error("The --app option may only be provided once.");
      const value = arguments_[index + 1];
      if (!value || value.startsWith("-")) {
        throw new Error("The --app option requires one public extension name.");
      }
      selectedApp = value;
      index += 1;
      continue;
    }

    if (argument.startsWith("--app=")) {
      if (selectedApp) throw new Error("The --app option may only be provided once.");
      selectedApp = argument.slice("--app=".length);
      if (!selectedApp) throw new Error("The --app option requires one public extension name.");
      continue;
    }

    throw new Error(`Unknown smoke option "${argument}". Expected --headed or --app <name>.`);
  }

  if (selectedApp && !publicApps.includes(selectedApp)) {
    throw new Error(`Unknown public extension "${selectedApp}". Expected one of: ${publicApps.join(", ")}.`);
  }

  return {
    headed,
    selectedApps: selectedApp ? [selectedApp] : [...publicApps]
  };
}

async function main() {
  const { headed, selectedApps } = parseSmokeArguments(process.argv.slice(2));
  const testIdentity = createTestExtensionIdentity();
  const fixtureServer = await startFixtureServer();
  const failures = [];

  try {
    for (const app of selectedApps) {
      try {
        await runWithExtension(
          app,
          {
            fixtureBaseUrl: fixtureServer.baseUrl,
            headed,
            testIdentity
          },
          (runtime) => smokeByApp[app](runtime, fixtureServer.baseUrl)
        );
        console.log(`PASS ${app}`);
      } catch (error) {
        failures.push({ app, error });
        console.error(`FAIL ${app}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } finally {
    await fixtureServer.close();
  }

  if (failures.length > 0) {
    for (const { app, error } of failures) {
      console.error(`\n${app}\n${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Public extension smoke passed for ${selectedApps.length} app${selectedApps.length === 1 ? "" : "s"}.`);
}

function createTestExtensionIdentity() {
  const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const publicKeyBytes = publicKey.export({ format: "der", type: "spki" });
  const digest = createHash("sha256").update(publicKeyBytes).digest().subarray(0, 16);
  const alphabet = "abcdefghijklmnop";
  const extensionId = [...digest].flatMap((byte) => [alphabet[byte >> 4], alphabet[byte & 0x0f]]).join("");

  return {
    extensionId,
    manifestKey: publicKeyBytes.toString("base64")
  };
}

async function runWithExtension(app, options, run) {
  const { fixtureBaseUrl, headed, testIdentity } = options;
  const buildDirectory = join(repositoryRoot, "apps", app, ".output", "chrome-mv3");
  const sourceManifestPath = join(buildDirectory, "manifest.json");
  if (!existsSync(sourceManifestPath)) {
    throw new Error(`Missing ${sourceManifestPath}. Run pnpm build:public:extensions first.`);
  }

  const temporaryRoot = mkdtempSync(join(tmpdir(), `public-extension-${app}-`));
  activeTemporaryRoots.add(temporaryRoot);
  const extensionDirectory = join(temporaryRoot, "extension");
  const profileDirectory = join(temporaryRoot, "profile");

  let context;
  let manifest;
  let runError;
  try {
    cpSync(buildDirectory, extensionDirectory, { recursive: true });

    const manifestPath = join(extensionDirectory, "manifest.json");
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.key = testIdentity.manifestKey;
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    context = await chromium.launchPersistentContext(profileDirectory, {
      args: [`--disable-extensions-except=${extensionDirectory}`, `--load-extension=${extensionDirectory}`],
      channel: "chromium",
      headless: !headed,
      ignoreHTTPSErrors: true,
      locale: "en-US",
      timezoneId: "America/Sao_Paulo",
      viewport: { height: 900, width: 1280 }
    });

    const diagnostics = installRuntimeDiagnostics(context, testIdentity.extensionId);
    await installNetworkGuard(context, fixtureBaseUrl, diagnostics.unexpectedRequests);

    const runtime = {
      app,
      context,
      extensionId: testIdentity.extensionId,
      open: (path) => openExtensionPage(context, testIdentity.extensionId, path),
      runtimeErrors: diagnostics.runtimeErrors
    };

    await run(runtime);
    await assertExpectedServiceWorker(context, testIdentity.extensionId, manifest);
    assert.deepEqual(
      diagnostics.unexpectedRequests,
      [],
      `Unexpected external requests were blocked:\n${diagnostics.unexpectedRequests.join("\n")}`
    );
    assert.deepEqual(
      diagnostics.runtimeErrors,
      [],
      `Uncaught extension runtime errors:\n${diagnostics.runtimeErrors.join("\n")}`
    );
  } catch (error) {
    if (isMissingBrowserError(error)) {
      runError = new Error("Playwright Chromium is not installed. Run pnpm playwright:install:public.", {
        cause: error
      });
    } else {
      runError = error;
    }
  } finally {
    const cleanupErrors = [];
    try {
      await context?.close();
    } catch (error) {
      cleanupErrors.push(error);
    } finally {
      try {
        removeTemporaryRoot(temporaryRoot);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }

    if (cleanupErrors.length > 0) {
      runError = runError
        ? new AggregateError([runError, ...cleanupErrors], `Smoke run and cleanup failed for ${app}.`)
        : new AggregateError(cleanupErrors, `Smoke cleanup failed for ${app}.`);
    }
  }

  if (runError) throw runError;
}

function installRuntimeDiagnostics(context, extensionId) {
  const runtimeErrors = [];
  const unexpectedRequests = [];
  const observedPages = new WeakSet();
  const observedWorkers = new WeakSet();
  const extensionPrefix = `chrome-extension://${extensionId}/`;

  const observePage = (page) => {
    if (observedPages.has(page)) return;
    observedPages.add(page);
    page.on("pageerror", (error) => runtimeErrors.push(`${page.url() || "unknown page"}: ${error.message}`));
  };
  const observeWorker = (worker) => {
    if (observedWorkers.has(worker) || !worker.url().startsWith(extensionPrefix)) return;
    observedWorkers.add(worker);
    worker.on("console", (message) => {
      if (message.type() === "error") {
        runtimeErrors.push(`${worker.url()}: console.error: ${message.text()}`);
      }
    });
  };

  for (const page of context.pages()) observePage(page);
  for (const worker of context.serviceWorkers()) observeWorker(worker);
  context.on("page", observePage);
  context.on("serviceworker", observeWorker);
  context.on("weberror", (webError) => {
    const location = webError.location();
    const source = location.url || webError.page()?.url() || "unknown context";
    runtimeErrors.push(`${source}:${location.line + 1}:${location.column + 1}: ${webError.error().message}`);
  });

  return { runtimeErrors, unexpectedRequests };
}

async function installNetworkGuard(context, fixtureBaseUrl, unexpectedRequests) {
  await context.route(/^https?:\/\//i, async (route) => {
    const request = route.request();
    const url = request.url();
    if (url === fixtureBaseUrl || url.startsWith(`${fixtureBaseUrl}/`)) {
      await route.continue();
      return;
    }

    unexpectedRequests.push(`${request.method()} ${url}`);
    await route.abort("blockedbyclient");
  });
}

async function assertExpectedServiceWorker(context, extensionId, manifest) {
  if (!manifest.background?.service_worker) return;

  const extensionPrefix = `chrome-extension://${extensionId}/`;
  let worker = context.serviceWorkers().find((candidate) => candidate.url().startsWith(extensionPrefix));
  worker ??= await context.waitForEvent("serviceworker", {
    predicate: (candidate) => candidate.url().startsWith(extensionPrefix),
    timeout: 5_000
  });
  assert.equal(await worker.evaluate(() => true), true, "The extension service worker did not respond.");
}

function removeTemporaryRoot(temporaryRoot) {
  rmSync(temporaryRoot, { force: true, maxRetries: 5, recursive: true, retryDelay: 100 });
  activeTemporaryRoots.delete(temporaryRoot);
}

async function openExtensionPage(context, extensionId, path) {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/${path}`, { waitUntil: "domcontentloaded" });
  const root = page.locator("#root");
  await root.waitFor({ state: "visible" });
  await root.locator(":scope > *").first().waitFor({ state: "attached" });
  return page;
}

async function smokeWatchedFilter(runtime) {
  const popup = await runtime.open("popup.html");
  await expect(popup.getByText("Watched Filter", { exact: true })).toBeVisible();
  const options = await runtime.open("options.html");
  await expect(options.locator("#root")).toBeVisible();

  await setStorage(popup, "sync", {
    autoDetectWatched: false,
    enabled: true,
    hideCompleted: true,
    language: "en",
    mode: "hide",
    showManualMarker: true
  });

  const catalog = await runtime.context.newPage();
  await catalog.route("https://www.youtube.com/**", (route) =>
    route.fulfill({
      body: getYoutubeFixture(),
      contentType: "text/html",
      status: 200
    })
  );
  await catalog.goto("https://www.youtube.com/", { waitUntil: "domcontentloaded" });

  const marker = catalog.locator(".hwc-watch-marker");
  await marker.waitFor({ state: "visible" });
  await marker.click();
  await expect(catalog.locator("yt-lockup-view-model")).toHaveClass(/hwc-card-hidden/);

  const stored = await getStorage(popup, "local", "hideWatchedContentWatchedItems");
  assert.equal(Object.keys(stored.hideWatchedContentWatchedItems ?? {}).length, 1);
}

async function smokeProductFilter(runtime) {
  const popup = await runtime.open("popup.html");
  await expect(popup.getByText("Hide Products", { exact: true })).toBeVisible();

  const optionsUrl = `chrome-extension://${runtime.extensionId}/options.html`;
  await popup.getByRole("button", { name: "Manage all rules", exact: true }).click();
  await expect.poll(() => runtime.context.pages().some((page) => page.url() === optionsUrl)).toBe(true);
  const options = runtime.context.pages().find((page) => page.url() === optionsUrl);
  assert.ok(options, `Manage all rules did not open ${optionsUrl}.`);
  await expect(options.locator("#root")).toBeVisible();

  await setStorage(popup, "sync", {
    hideUnwantedProductsSettings: {
      enabled: true,
      language: "en",
      mode: "hide"
    }
  });
  await setStorage(popup, "local", {
    "hideUnwantedProductsRules:v1": {
      blockedProductIds: [],
      blockedTerms: ["Samsung"],
      blockedTermsByPlatform: {}
    }
  });

  const marketplace = await runtime.context.newPage();
  await marketplace.route("https://www.amazon.com/**", (route) =>
    route.fulfill({
      body: getAmazonFixture(),
      contentType: "text/html",
      status: 200
    })
  );
  await marketplace.goto("https://www.amazon.com/s?k=tablet", { waitUntil: "domcontentloaded" });
  await expect(marketplace.locator('[data-component-type="s-search-result"]')).toHaveClass(/hup-product-hidden/);
}

async function smokeQuickNotes(runtime, fixtureBaseUrl) {
  const notesPage = await runtime.open("notes.html");
  const globalNote = {
    archived: false,
    content: "Playwright persisted note",
    createdAt: "2026-08-19T12:00:00.000Z",
    id: "playwright-note",
    pinned: false,
    revision: 1,
    scope: "global",
    updatedAt: "2026-08-19T12:00:00.000Z"
  };
  const fixturePageUrl = `${fixtureBaseUrl}/quick-notes`;
  const siteNote = {
    archived: false,
    content: "Fixture-only site note",
    createdAt: "2026-08-19T12:05:00.000Z",
    id: "playwright-site-note",
    pageTitle: "Quick Notes fixture",
    pageUrl: fixturePageUrl,
    pinned: false,
    revision: 1,
    scope: "site",
    siteKey: "127.0.0.1",
    updatedAt: "2026-08-19T12:05:00.000Z"
  };
  await setStorage(notesPage, "local", {
    "quick-notes:note:v2:playwright-note": globalNote,
    "quick-notes:note:v2:playwright-site-note": siteNote,
    "quick-notes:storage:v2": { version: 2 }
  });
  await notesPage.reload({ waitUntil: "domcontentloaded" });
  await expect(notesPage.getByText("Playwright persisted note", { exact: false })).toBeVisible();

  const fixturePage = await runtime.context.newPage();
  await fixturePage.goto(fixturePageUrl, { waitUntil: "domcontentloaded" });

  const sidePanel = await runtime.open("sidepanel.html");
  await sidePanel.evaluate(async (url) => {
    const tabs = await chrome.tabs.query({});
    const fixtureTab = tabs.find((tab) => tab.url === url);
    if (fixtureTab?.id === undefined) throw new Error(`Could not find the Quick Notes fixture tab for ${url}.`);
    await chrome.tabs.update(fixtureTab.id, { active: true });
  }, fixturePageUrl);
  await sidePanel.reload({ waitUntil: "domcontentloaded" });

  const thisSiteFilter = sidePanel.getByRole("button", { name: "This site", exact: true });
  await expect(thisSiteFilter).toBeEnabled();
  await thisSiteFilter.click();
  await expect(thisSiteFilter).toHaveAttribute("aria-pressed", "true");
  await expect(sidePanel.getByText("Fixture-only site note", { exact: false })).toBeVisible();
  await expect(sidePanel.getByText("Playwright persisted note", { exact: false })).toHaveCount(0);
}

async function smokeTimeZoneHelper(runtime) {
  const popup = await runtime.open("popup.html");
  await setStorage(popup, "local", {
    "time-zone-helper:settings": {
      convertDate: "2026-08-19",
      convertTime: "09:00",
      convertTimeZone: "America/New_York",
      language: "en",
      monitors: [{ id: "new-york", label: "New York team", timeZone: "America/New_York" }]
    }
  });
  await popup.reload({ waitUntil: "domcontentloaded" });
  await expect(popup.getByText("Time Zone Helper", { exact: true })).toBeVisible();
  await expect(popup.getByText("New York team", { exact: true })).toBeVisible();

  const conversionSection = popup
    .locator("section")
    .filter({ has: popup.getByRole("heading", { name: "Convert", exact: true }) });
  await expect(conversionSection.getByText(/^09:00\s+.+\s+->\s+to your local time$/)).toBeVisible();
  await expect(conversionSection.locator("strong")).toContainText(/^10:00\b/);
}

async function smokeSiteReset(runtime, fixtureBaseUrl) {
  const target = await runtime.context.newPage();
  await target.goto(`${fixtureBaseUrl}/site-reset`, { waitUntil: "domcontentloaded" });
  await target.evaluate(() => {
    localStorage.setItem("site-reset-e2e", "present");
    sessionStorage.setItem("site-reset-e2e", "present");
    document.cookie = "site_reset_e2e=present; SameSite=Lax; path=/";
  });

  const popup = await runtime.open("popup.html");
  const targetTabId = await popup.evaluate(async (url) => {
    const tabs = await chrome.tabs.query({});
    const targetTab = tabs.find((tab) => tab.url?.startsWith(url));
    if (targetTab?.id === undefined) throw new Error(`Could not find the fixture tab for ${url}.`);
    await chrome.tabs.update(targetTab.id, { active: true });
    return targetTab.id;
  }, fixtureBaseUrl);
  assert.equal(typeof targetTabId, "number");

  await popup.reload({ waitUntil: "domcontentloaded" });
  await expect(popup.getByRole("heading", { name: "127.0.0.1", exact: true })).toBeVisible();
  await expect(popup.getByText("Permissions", { exact: true })).toHaveCount(0);
  await expect(popup.getByText("Site settings", { exact: true })).toHaveCount(0);

  await popup.getByRole("checkbox", { name: /localStorage/i }).check();
  await popup.getByRole("button", { name: "Clear selected data", exact: true }).click();
  const dialog = popup.getByRole("dialog");
  await dialog.getByRole("button", { name: "Clear selected data", exact: true }).click();
  await expect(popup.getByText(/cleared|complete|done/i)).toBeVisible();

  await expect
    .poll(() =>
      target.evaluate(() => ({
        cookie: document.cookie,
        local: localStorage.getItem("site-reset-e2e"),
        session: sessionStorage.getItem("site-reset-e2e")
      }))
    )
    .toEqual({ cookie: "", local: null, session: null });
}

async function smokePathSwitch(runtime) {
  const popup = await runtime.open("popup.html");
  await setStorage(popup, "local", {
    "pathswitch:settings": {
      enabled: true,
      language: "en",
      rules: [
        {
          condition: "none",
          createdAt: 1,
          destinationUrl: "https://b.example/",
          enabled: true,
          id: "playwright-rule",
          ignoreIfAtDestination: true,
          name: "",
          sourcePattern: "a.example/*",
          updatedAt: 1
        }
      ]
    },
    "pathswitch:quick-tip-dismissed": true
  });
  await popup.reload({ waitUntil: "domcontentloaded" });
  await expect(popup.locator("strong", { hasText: "a.example/*" })).toBeVisible();

  const target = await runtime.context.newPage();
  await target.route("https://a.example/**", fulfillSimplePage);
  await target.route("https://b.example/**", fulfillSimplePage);
  await target.goto("https://a.example/start", { waitUntil: "domcontentloaded" }).catch((error) => {
    if (!(error instanceof Error) || !/ERR_ABORTED|interrupted/i.test(error.message)) throw error;
  });
  await expect.poll(() => target.url()).toBe("https://b.example/");
}

async function setStorage(page, area, values) {
  await page.evaluate(
    async ({ storageArea, storedValues }) => {
      await chrome.storage[storageArea].set(storedValues);
    },
    { storageArea: area, storedValues: values }
  );
}

async function getStorage(page, area, key) {
  return page.evaluate(async ({ storageArea, storageKey }) => chrome.storage[storageArea].get(storageKey), {
    storageArea: area,
    storageKey: key
  });
}

function fulfillSimplePage(route) {
  return route.fulfill({ body: "<!doctype html><title>Fixture</title><main>Fixture</main>", contentType: "text/html" });
}

async function startFixtureServer() {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end("<!doctype html><html><head><title>Site Reset Fixture</title></head><body>Fixture</body></html>");
  });
  await new Promise((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not start the local fixture server.");

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolvePromise, rejectPromise) =>
        server.close((error) => (error ? rejectPromise(error) : resolvePromise()))
      )
  };
}

function isMissingBrowserError(error) {
  return error instanceof Error && /Executable doesn't exist|browserType\.launchPersistentContext/i.test(error.message);
}

function getAmazonFixture() {
  return `<!doctype html>
<html>
  <head><title>Amazon fixture</title></head>
  <body>
    <div role="listitem" data-asin="B078JXFBDP" data-component-type="s-search-result">
      <div data-cy="title-recipe">
        <a href="/KitchenAid-Dish-Rack/dp/B078JXFBDP">
          <h2 aria-label="Samsung Tablet"><span>Samsung Tablet</span></h2>
        </a>
      </div>
    </div>
  </body>
</html>`;
}

function getYoutubeFixture() {
  return `<!doctype html>
<html>
  <head>
    <title>YouTube fixture</title>
    <style>ytd-rich-item-renderer, yt-lockup-view-model { display: block; width: 240px; height: 140px; }</style>
  </head>
  <body>
    <ytd-rich-item-renderer>
      <div id="content">
        <yt-lockup-view-model ytb-content-type="video">
          <div class="ytLockupViewModelHost content-id-playwright01">
            <a href="/watch?v=playwright01" class="ytLockupViewModelContentImage">
              <yt-thumbnail-view-model><div><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" /></div></yt-thumbnail-view-model>
            </a>
            <h3 title="Playwright video">
              <a href="/watch?v=playwright01" aria-label="Playwright video"><span>Playwright video</span></a>
            </h3>
          </div>
        </yt-lockup-view-model>
      </div>
    </ytd-rich-item-renderer>
  </body>
</html>`;
}

process.once("exit", () => {
  for (const temporaryRoot of activeTemporaryRoots) {
    try {
      removeTemporaryRoot(temporaryRoot);
    } catch {
      // Best-effort fallback for an interrupted run; normal cleanup reports failures.
    }
  }
});

const invokedAsScript =
  typeof process.argv[1] === "string" && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (invokedAsScript) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    process.exitCode = 1;
  }
}
