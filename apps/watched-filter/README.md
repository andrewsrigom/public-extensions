# Watched Filter

Watched Filter is a WXT/TypeScript browser extension for marking watched streaming titles and visually reducing cards you have already seen.

The current working adapters target Prime Video, Netflix, Disney+, Max/HBO Max, YouTube, Globoplay, Paramount+, Apple TV, Crunchyroll, and iQIYI. The code is structured around a generic core plus platform adapters so support for other catalog-style interfaces can be added without rewriting the extension runtime.

> This project is unofficial and is not affiliated with Prime Video, Amazon, Netflix, Max, YouTube, Globoplay, Globo, Paramount+, Paramount, Apple TV, Apple, Crunchyroll, iQIYI, or any other streaming platform.

## Features

- Manual watched marker on supported cards.
- Right-click context menu to mark or unmark the current card.
- Visual modes for watched items: dark overlay, dim, or hide.
- Settings stored with `storage.sync`.
- Watched titles stored locally with `storage.local`.
- Backup export/import for watched items and settings.
- Search, filter, sort, and paginate watched-title management.
- Per-platform enable/disable controls.
- Interface language preference: automatic, Portuguese, English, or Spanish.
- Conservative auto-detection based on watched text and progress signals where supported.

## Requirements

- Node.js 24
- pnpm 11
- Chromium-based browser for local Chrome extension testing

## Install

```bash
pnpm install
```

## Development

Start the WXT development server:

```bash
pnpm dev
```

Build the Chrome MV3 extension:

```bash
pnpm build
```

After building, load the unpacked extension from:

```text
apps/watched-filter/.output/chrome-mv3
```

In Chrome:

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select `apps/watched-filter/.output/chrome-mv3`.
5. Open a supported page, such as `https://www.primevideo.com/movie`.

## Quality

Run the full local quality gate:

```bash
pnpm watched-filter:quality
```

Individual checks:

```bash
pnpm format:check
pnpm lint
pnpm watched-filter:typecheck
pnpm watched-filter:test:run
pnpm watched-filter:build
```

For a release candidate package:

```bash
pnpm release:check
```

The Chrome Web Store zip is generated under `apps/watched-filter/.output` when run from the repository root.

## Project Structure

```text
entrypoints/
  background.ts           # context menu and background events
  content.ts              # WXT content script entrypoint
  popup/                  # popup UI
  options/                # options and backup UI
public/
  _locales/               # extension manifest localization
src/
  content/
    content-app.ts        # generic content runtime
  core/
    backup.ts             # backup export/import
    renderer.ts           # marker, overlay, dim, and hide behavior
    storage.ts            # browser storage access
  platforms/
    apple-tv.ts           # Apple TV adapter
    crunchyroll.ts        # Crunchyroll adapter
    disney-plus.ts        # Disney+ adapter
    globoplay.ts          # Globoplay adapter
    iqiyi.ts              # iQIYI adapter
    max.ts                # Max/HBO Max adapter
    netflix.ts            # Netflix adapter
    paramount-plus.ts     # Paramount+ adapter
    prime-video.ts        # Prime Video adapter
    youtube.ts            # YouTube adapter
    index.ts              # platform adapter registry
  shared/
    defaults.ts
    i18n.ts
    types.ts
    url.ts
```

## Adding a Platform Adapter

1. Create a new adapter in `src/platforms/`.
2. Implement `PlatformAdapter`.
3. Register it in `src/platforms/index.ts`.
4. Add matching URL patterns to `entrypoints/content.ts`.
5. Add focused tests for URL/key normalization and any pure adapter heuristics.

Each adapter is responsible for:

- finding candidate cards with `getCards()`;
- extracting a stable `ContentItem` with `getItem(card)`;
- optionally detecting watched or in-progress state with `getAutoState(item, settings)`.

## Storage and Backup

Watched items are stored in browser-local extension storage. They are not synced automatically across browsers. Use the options page to export a JSON backup before changing browsers, reinstalling the extension, or clearing browser data.

The backup file is versioned and includes:

- extension settings;
- watched items;
- export timestamp.

Imports merge by item key. Existing items are updated only when their stored data changes.

## Privacy

This extension stores watched-state data in browser extension storage. It does not require a backend service and does not send watched titles to a remote server.

See [PRIVACY.md](./PRIVACY.md) for the publication-ready privacy policy draft.

## Publishing

Chrome Web Store submission notes, listing copy, permission justifications, and release checklist live in [docs/chrome-web-store.md](./docs/chrome-web-store.md).

### Chrome Web Store Dashboard Checklist

Current checkpoint: the extension package has already been generated and uploaded. Continue from the Chrome Web Store item setup screens.

Local release package:

```text
apps/watched-filter/.output/watched-filter-0.1.0-chrome.zip
```

Use this checklist to resume the first Chrome Web Store submission:

1. Complete the developer account setup.
   - Confirm the publisher profile and contact email.
   - For this current free, personal release, use the non-trader declaration unless the publishing context changes.
   - Revisit the trader declaration before publishing future commercial, paid, company, or professional products from the same publisher account.
2. Keep item support visibility disabled unless a public support channel is ready.
   - Enable email notifications for review completion, support messages, tester status, and item publication.
3. Fill the Store Listing tab.
   - Use the name, short description, detailed description, and disclaimer from [docs/chrome-web-store.md](./docs/chrome-web-store.md).
   - Add at least one 1280x800 or 640x400 screenshot showing the extension on a supported streaming page.
   - Add the required 440x280 small promotional image.
   - Select the closest category for a browser productivity/streaming utility.
4. Fill the Privacy tab.
   - Single purpose: mark supported streaming titles as watched and visually reduce watched cards in the catalog.
   - Permission justifications:
     - `storage`: saves settings and watched-title records.
     - `contextMenus`: adds a right-click action to mark or unmark the current supported card.
     - `activeTab`: lets the popup communicate with the current supported tab after user interaction.
   - Remote code: no remote code is used.
   - Data use: local-only extension settings, watched item titles, optional item URLs, and marked dates.
   - Data transfer, ads, and human access: none.
   - Provide a public privacy policy URL based on [PRIVACY.md](./PRIVACY.md).
5. Fill the Distribution tab.
   - Start as `Unlisted` or trusted testers for the first approved release.
   - Select target regions.
   - Confirm there are no in-app purchases.
6. Submit for review.
   - Keep the generated zip unchanged after upload.
   - If the review requests changes, update code/docs, bump the version if needed, run `pnpm release:check`, and upload a new zip.

## Status

This is an early project. Prime Video, Netflix, Disney+, Max/HBO Max, YouTube, Globoplay, Paramount+, Apple TV, Crunchyroll, and iQIYI are the first supported adapters; additional services should be added behind platform-specific adapters and tested independently.
