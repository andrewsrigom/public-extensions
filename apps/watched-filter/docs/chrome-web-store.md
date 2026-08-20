# Chrome Web Store Submission Notes

These notes are preparation material for publishing Watched Filter on the Chrome Web Store. Keep the Developer Dashboard fields aligned with the current extension behavior.

## Listing Draft

### Name

Watched Filter

### Short Description

Mark watched streaming titles and visually reduce them with an overlay, dimming, or hiding.

### Detailed Description

Watched Filter helps you keep supported streaming catalog pages easier to scan by marking titles you have already watched.

Features:

- add a watched marker to supported Prime Video, Netflix, Disney+, Max/HBO Max, YouTube, Globoplay, Paramount+, Apple TV, Crunchyroll, and iQIYI cards;
- mark or unmark a title directly on the card;
- use a right-click context menu for the current card;
- reduce watched cards with a dark overlay, dimming, or hiding;
- manage watched titles from the options page with search, filters, sorting, and pagination;
- enable or disable individual supported platforms;
- export and import a local JSON backup;
- choose automatic, Portuguese, English, or Spanish interface language.

The extension stores watched-state data in browser extension storage. It does not send watched titles, URLs, settings, or backup data to a remote server.

This project is unofficial and is not affiliated with Prime Video, Amazon, Netflix, Disney+, Max, HBO Max, YouTube, Globoplay, Globo, Paramount+, Paramount, Apple TV, Apple, Crunchyroll, iQIYI, or any streaming platform.

## Single Purpose

Let users mark supported streaming titles as watched and visually reduce watched cards in the catalog.

## Permission Justification

- `storage`: saves extension settings and watched-title records.
- `contextMenus`: adds a right-click action to mark or unmark the current supported card.
- `activeTab`: lets the popup communicate with the current supported tab after user interaction.

## Privacy Answers

- Data collected: website content needed to identify supported streaming cards, extension settings, watched item titles, optional item URLs, marked dates.
- Data use: only to provide watched-card marking, visual reduction, options management, and backup import/export.
- Data transfer: no remote transmission by the extension.
- Advertising: no advertising and no personalized ads.
- Human access: no developer access to locally stored data.

## Required Store Assets

- Extension package: generated with `pnpm zip`.
- Extension icon: included in the extension zip at `icons/icon-128.png`.
- Screenshot: capture the extension working on a supported Prime Video catalog page.
- Small promotional image: create in the Developer Dashboard asset workflow before public release.

## Release Checklist

1. Update `CHANGELOG.md`.
2. Run `pnpm release:check`.
3. Load `.output/chrome-mv3` manually in Chrome.
4. Test marker click on default and hover-expanded Prime Video, Netflix, Disney+, Max/HBO Max, YouTube, Globoplay, Paramount+, Apple TV, Crunchyroll, and iQIYI cards.
5. Test right-click context menu toggle.
6. Test popup settings.
7. Test platform enable/disable from the options page.
8. Test options page backup export/import.
9. Upload the zip generated in `.output`.
10. Fill the Privacy tab with the single purpose and permission justifications above.
11. Start with `Unlisted` or trusted testers before a public listing.
