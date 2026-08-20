# Chrome Web Store Submission Notes

## Listing Draft

### Name

Quick Notes

### Short Description

Capture, organize, and find quick notes globally or for the website open in your current tab.

### Detailed Description

Quick Notes keeps a lightweight note workspace close to the page you are browsing in Chrome's side panel.

Features:

- create and edit notes without leaving the current page;
- keep notes available globally or associate them with one website;
- search, pin, archive, copy, restore, and delete notes;
- open a full-page notes view when more space is useful;
- autosave notes in local browser extension storage;
- use the interface in English, Portuguese, or Spanish.

Notes and optional page context stay in local browser extension storage. The extension does not send them to the developer or to a developer-controlled server. The language preference may follow the user through Google-operated Chrome Sync when browser profile sync is enabled.

## Privacy Tab

### Single Purpose

Let users create and organize local notes globally or for the website open in the active tab.

### Permission Justifications

- `storage`: saves note records in local extension storage and the language preference in Chrome Sync storage.
- `tabs`: identifies the active page for website-specific notes, updates the context when the active tab changes, and opens the full notes view.
- `sidePanel`: displays the note editor in Chrome's side panel.

Remote code: select **No, I am not using remote code**.

Suggested conservative data declarations: **Website content** for optional page URL and title context. Review the dashboard definition for **Personal communications** and select it if Chrome classifies user-entered private notes in that category. Notes remain local; only the language preference can use Chrome Sync, with no sale, developer sharing, advertising, or human access.

Privacy policy URL after the file is public:

`https://github.com/andrewsrigom/public-extensions/blob/main/apps/quick-notes/PRIVACY.md`

## Required Assets

- 128x128 icon: included in the ZIP at `icons/icon-128.png`.
- At least one 1280x800 or 640x400 screenshot showing the side panel with sample notes.
- One 440x280 small promotional image.

Use fictional sample notes and neutral page context in screenshots. Do not capture personal notes or private tabs.

## Manual Release Checklist

1. Run `pnpm quick-notes:release:check`.
2. Load `apps/quick-notes/.output/chrome-mv3` unpacked in Chrome.
3. Test side-panel opening and active-tab context changes.
4. Test global and website-specific notes, autosave, search, pin, archive, restore, copy, and delete.
5. Test the full-page notes view and all three languages.
6. Upload `apps/quick-notes/.output/quick-notes-0.1.0-chrome.zip`.
7. Fill the listing, privacy, and distribution tabs with the copy above.
8. Start as Unlisted or with trusted testers, then submit for review.
