# Privacy Policy

Effective date: 2026-08-04

Hide Unwanted Products hides product cards on supported marketplaces using rules chosen by the user.

## Data Handled by the Extension

On supported marketplace pages, the extension processes product titles, product identifiers, product URLs, and the current marketplace domain so it can decide which cards match the user's rules. This page data is processed locally.

The extension stores blocked terms, site-specific terms, and product identifiers explicitly blocked by the user in local browser extension storage. These filtering rules stay on the current browser profile and are not placed in Chrome Sync.

The enabled state, visual mode, and language preference are small interface preferences stored in `storage.sync`. If the user is signed in to Chrome and has extension sync enabled, Chrome may synchronize those preferences through the user's Google account.

## Data Transmission and Sharing

Hide Unwanted Products does not send page content, URLs, product data, or filtering rules to the developer or to a developer-controlled server. Chrome Sync of the small preferences described above is operated by Google as part of the user's browser profile; it is not a server operated by the extension developer. The extension does not use analytics, advertising SDKs, trackers, or other third-party data processors. No user data is sold or shared by the developer.

## Backup Files

Users can export their rules and settings as a JSON file. The browser creates the file locally. Importing a backup reads only the file selected by the user.

## Data Retention and Control

Local rules and synchronized preferences remain in their respective browser extension storage areas until the user changes or clears them, removes the extension, or clears extension data. The options page can clear saved rules. Chrome controls retention of synchronized preferences in the user's Chrome profile.

## Permissions

- `storage`: saves filtering rules in local extension storage and small interface preferences in Chrome Sync storage;
- `activeTab`: lets the popup identify and communicate with the supported marketplace tab after the user opens the extension.

The extension runs content scripts only on the supported Amazon Brazil and US, Mercado Livre, AliExpress, and Temu domains declared in its manifest.

## Limited Use Disclosure

The use of information received from Chrome extension APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Changes

If the extension's data practices change, this policy will be updated before a new version is published.
