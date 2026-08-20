# Chrome Web Store Submission Notes

## Listing Draft

### Name

Site Reset

### Short Description

Clear selected cookies, cache, and local site storage for the website open in your current tab.

### Detailed Description

Site Reset gives you a focused way to clear data for the website you are currently viewing without clearing data for every site in Chrome.

- remove both regular cookies and partitioned cookies associated with the active top-level site;
  Features:

- identify the current HTTP or HTTPS website before clearing anything;
- choose cookies, browser cache, localStorage and sessionStorage, or Cache Storage, IndexedDB, and service workers;
- confirm destructive cleanup before it starts;
- clear only the selected categories for the current website;
- use the interface in English, Portuguese, or Spanish.

All cleanup operations happen locally through Chrome APIs after a user action. The extension does not send URLs, cookies, website data, settings, or browsing activity to the developer or to a developer-controlled server. Chrome may synchronize the language preference through Chrome Sync when the user enables browser synchronization.

Clearing cookies or site storage can sign you out and cannot be undone.

## Privacy Tab

### Single Purpose

Clear user-selected browser data for the website open in the active tab.

### Permission Justifications

- `browsingData`: clears selected cache and site-storage categories for the current origin.
- `cookies`: finds and removes cookies belonging to the current website.
- `scripting`: runs user-requested local, session, offline-cache, database, and service-worker cleanup in the current website.
- `storage`: saves interface preferences.
- `tabs`: reads the active tab's URL, title, and favicon so the popup can identify the site that will be reset.
- `<all_urls>`: lets the same user-requested reset feature work on any HTTP or HTTPS website opened by the user.

Remote code: select **No, I am not using remote code**.

Suggested conservative data declarations: **Web history** for the current URL, **Website content** for site storage handled during cleanup, and **Authentication information** because cookies can contain session data even though the extension only obtains them locally to delete them. Nothing is retained or transmitted; there is no sale, sharing, advertising, or human access.

Privacy policy URL after the file is public:

`https://github.com/andrewsrigom/browser-extensions/blob/main/apps/site-reset/PRIVACY.md`

## Required Assets

- 128x128 icon: included in the ZIP at `icons/icon-128.png`.
- At least one 1280x800 or 640x400 screenshot showing the current-site card and selected reset categories.
- One 440x280 small promotional image.

Use a disposable test site in screenshots. Do not expose account names, cookies, or private browsing context.

## Manual Release Checklist

1. Run `pnpm site-reset:release:check`.
2. Load `apps/site-reset/.output/chrome-mv3` unpacked in Chrome.
3. Test each supported cleanup category on a disposable site.
4. Confirm data from unrelated origins is not removed.
5. Confirm cancellation changes nothing and unsupported pages show a safe state.
6. Upload `apps/site-reset/.output/site-reset-0.1.0-chrome.zip`.
7. Fill the listing, privacy, and distribution tabs with the copy above.
8. Start as Unlisted or with trusted testers, then submit for review.
