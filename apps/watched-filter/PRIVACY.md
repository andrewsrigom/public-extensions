# Privacy Policy

Effective date: 2026-07-08

Watched Filter helps users mark supported streaming titles as watched and visually reduce watched cards in the catalog.

## Data Stored by the Extension

The extension stores the following data in browser extension storage:

- extension settings, such as whether the extension is enabled, visual mode, watched threshold, and language preference, in Chrome `storage.sync`;
- watched item records, including title, platform identifier, optional item URL, source, and marked date, in local extension storage.

This data is used only to provide the extension's watched-item features.

## Data Transmission

Watched Filter does not send watched titles, URLs, browsing activity, or backup data to the developer or to a developer-controlled server. If the user is signed in to Chrome and has extension sync enabled, Chrome may synchronize the extension settings stored in `storage.sync` through the user's Google account. That browser-managed synchronization is controlled by Chrome, not by this extension or its developer.

The extension does not use analytics, advertising SDKs, trackers, or third-party data processors.

## Backup Files

Users can export a JSON backup from the options page. Backup files are created locally in the browser and downloaded by the user. If a user shares or stores a backup file elsewhere, that handling is outside the extension.

## Permissions

The extension requests only the permissions needed for its user-facing features:

- `storage`: saves settings and watched titles in browser extension storage;
- `contextMenus`: adds a right-click action to mark or unmark a supported card;
- `activeTab`: lets the popup communicate with the current supported tab after user interaction.

## Limited Use Disclosure

The use of information received from Chrome extension APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Third-Party Services

This extension is unofficial and is not affiliated with Prime Video, Amazon, Netflix, Disney+, Disney, Max, HBO Max, YouTube, Globoplay, Globo, Paramount+, Paramount, Apple TV, Apple, Crunchyroll, iQIYI, or any other streaming platform.

## Changes

If the extension's data practices change, this policy should be updated before publishing a new version.
