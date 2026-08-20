# Chrome Web Store Submission Notes

## Listing Draft

### Name

Time Zone Helper

### Short Description

Monitor time zones and convert a typed wall-clock time into your local time from a lightweight popup.

### Detailed Description

Time Zone Helper makes it quick to compare local time with the places and people you work with.

Features:

- see your current local time;
- add and label time-zone cards that matter to you;
- convert a typed wall-clock time into your local time;
- save time-zone choices for the next popup session;
- use the interface in English, Portuguese, or Spanish.

The extension works entirely in its popup. It has no content script, host access, background service worker, analytics, or remote server.

## Privacy Tab

### Single Purpose

Display selected time zones and convert a user-entered time into local time.

### Permission Justification

- `storage`: saves time-zone cards, optional labels, and interface preferences in browser extension storage.

Remote code: select **No, I am not using remote code**.

Data declarations: no personal or sensitive data categories are expected. Time-zone choices, labels, and typed conversion values are processed locally and are not sold, shared, used for advertising, or available to humans.

Privacy policy URL after the file is public:

`https://github.com/andrewsrigom/public-extensions/blob/main/apps/time-zone-helper/PRIVACY.md`

## Required Assets

- 128x128 icon: included in the ZIP at `icons/icon-128.png`.
- At least one 1280x800 or 640x400 screenshot showing saved time zones and the converter.
- One 440x280 small promotional image.

## Manual Release Checklist

1. Run `pnpm time-zone-helper:release:check`.
2. Load `apps/time-zone-helper/.output/chrome-mv3` unpacked in Chrome.
3. Test adding, editing, and removing time-zone cards.
4. Test conversion around midnight and daylight-saving transitions.
5. Test persistence and all three languages.
6. Upload `apps/time-zone-helper/.output/time-zone-helper-0.1.0-chrome.zip`.
7. Fill the listing, privacy, and distribution tabs with the copy above.
8. Start as Unlisted or with trusted testers, then submit for review.
