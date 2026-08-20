# Time Zone Helper

Time Zone Helper is a lightweight WXT browser-extension popup for checking local time, monitoring custom time-zone cards, and converting a typed wall-clock time back to your local time.

It has no content script, host access, or background worker. Its only permission is `storage`, used to keep time-zone
cards and preferences in extension-local storage between popup sessions. Writes are serialized so a slower request
cannot overwrite newer preferences, and the popup reports persistence failures instead of silently losing changes.

The time-zone pieces are split for reuse:

- `src/timezones/catalog.ts`: curated time-zone options and display names.
- `src/timezones/select.ts`: helpers that build reusable time-zone option lists for combobox controls.
- `src/timezones/time.ts`: pure formatting and wall-clock conversion helpers.

## Commands

Run commands from the repository root.

```bash
pnpm time-zone-helper:dev
pnpm time-zone-helper:build
pnpm time-zone-helper:quality
pnpm time-zone-helper:zip
pnpm time-zone-helper:release:check
```

Load the unpacked Chrome build from `apps/time-zone-helper/.output/chrome-mv3`.

## Privacy and Publishing

See [PRIVACY.md](./PRIVACY.md) for the privacy policy and [docs/chrome-web-store.md](./docs/chrome-web-store.md) for listing copy, permission justification, required assets, and the release checklist.
