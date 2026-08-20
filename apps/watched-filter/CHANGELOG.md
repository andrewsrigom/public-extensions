# Changelog

## Unreleased

- Serialized watched-item mutations in the background worker to prevent lost concurrent updates.
- Kept content scripts synchronized with storage changes made by other extension views.
- Restricted imported and clickable watched-item URLs to absolute HTTP(S) links.
- Added strict backup envelope validation plus file, item-count, and field-size limits.

## 0.1.0 - 2026-07-08

- Added Prime Video support.
- Added Netflix support.
- Added Disney+ support.
- Added Max/HBO Max support.
- Added YouTube support.
- Added Globoplay support.
- Added Paramount+ support.
- Added Apple TV support.
- Added Crunchyroll support.
- Added iQIYI support.
- Added manual watched markers on supported cards.
- Added context-menu toggle for the current card.
- Added overlay, dim, and hide visual modes.
- Added settings popup and options page.
- Added popup controls to hide Prime Video paid titles, live events, and paid channel content.
- Added backup export/import.
- Added paginated watched-title management with search, platform filters, and sorting.
- Added per-platform enable/disable settings.
- Added Portuguese, English, and Spanish UI language support.
- Added Prime Video section hiding for buy/rent carousels.
- Added safer content scanning so one malformed streaming card does not stop the page scan.
- Updated the extension icon.
- Adjusted Paramount+ dim mode to use a dark overlay because opacity caused hover flicker.
