# Privacy Policy

Effective date: 2026-07-15

Site Reset clears selected browser data for the website open in the active tab.

## Data Handled by the Extension

After the user opens the popup, the extension reads the active tab's URL, title, hostname, and favicon so it can identify the website to reset. When the user confirms a reset, Chrome provides the site's cookie records and stored browser data as needed to delete the selected categories. The extension may also run local cleanup code in the active page to clear site storage.

This information is processed locally and only in response to the user's actions. Site Reset does not retain website history, cookie contents, authentication information, or cleared site data. It stores only interface preferences such as language in Chrome `storage.sync`.

If the user is signed in to Chrome and has extension sync enabled, Chrome may synchronize those interface preferences through the user's Google account. That browser-managed synchronization is controlled by Chrome, not by this extension or its developer.

## Data Transmission and Sharing

Site Reset does not send URLs, cookie data, website content, settings, or browsing activity to the developer or to a developer-controlled server. It does not use analytics, advertising SDKs, trackers, or third-party data processors. No user data is sold or shared.

## Data Retention and Control

Interface preferences remain in browser extension storage until the user changes them, removes the extension, or clears extension data. Data selected for reset is deleted through Chrome APIs and cannot be restored by the extension.

## Permissions

- `browsingData`: clears selected cache and site storage categories for the current origin;
- `cookies`: finds and removes cookies belonging to the current website;
- `scripting`: runs user-requested local-storage cleanup in the current website;
- `storage`: saves interface preferences;
- `tabs`: reads the active tab's website details so the popup can show which site will be reset;
- `<all_urls>` host access: allows the same user-requested reset feature to work on any HTTP or HTTPS website opened by the user.

## Limited Use Disclosure

The use of information received from Chrome extension APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Changes

If the extension's data practices change, this policy will be updated before a new version is published.
