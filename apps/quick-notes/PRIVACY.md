# Privacy Policy

Effective date: 2026-08-04

Quick Notes lets users create notes that are available globally or associated with the current website.

## Data Stored by the Extension

The extension stores user-created note content, note formatting data, note status, optional website domain, optional page title and URL, timestamps, and per-note revision metadata in local browser extension storage. Each active note uses an isolated versioned record so changes to one note do not overwrite unrelated notes.

Language is stored as a small `storage.sync` preference. If the user is signed in to Chrome and has extension sync enabled, Chrome may synchronize that preference through the user's Google account. Note content and page context are never placed in Chrome Sync.

This information is used only to display, search, filter, organize, and edit the user's notes.

## Data Transmission and Sharing

Quick Notes does not send notes, page URLs, page titles, or browsing activity to the developer or to a developer-controlled server. Chrome Sync of the language preference described above is operated by Google as part of the user's browser profile; it is not a server operated by the extension developer. The extension does not use analytics, advertising SDKs, trackers, or other third-party data processors. No user data is sold or shared by the developer.

## Data Retention and Control

Active v2 note records remain in local browser extension storage until the user edits or deletes them, removes the extension, or clears extension data. Archived notes remain stored until the user deletes them.

When upgrading from the v1 storage format, Quick Notes copies existing notes into isolated v2 records and retains the original local-only v1 snapshot as a rollback fallback. That fallback is not used after migration, but it can contain the pre-upgrade note state until the user clears extension data or removes the extension.

## Permissions

- `storage`: saves notes in local extension storage and the language preference in Chrome Sync storage;
- `tabs`: identifies the active page for site-specific notes, updates that context when the active tab changes, and opens the full notes view;
- `sidePanel`: displays the note editor in Chrome's side panel.

## Limited Use Disclosure

The use of information received from Chrome extension APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Changes

If the extension's data practices change, this policy will be updated before a new version is published.
