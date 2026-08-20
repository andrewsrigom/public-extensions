# Quick Notes

Quick Notes is a WXT browser extension for fast notes in Chrome's side panel.

Chrome 114 or newer is required because the extension uses the Chrome Side Panel API.

## MVP

- Create notes from the side panel.
- Save notes globally or for the current site.
- Search and filter notes.
- Autosave note edits to extension local storage.

## Persistence and concurrency

Each note is stored under its own versioned `storage.local` key. A background
mutation queue serializes writes from the side panel and full-page view.
Per-note revisions detect simultaneous edits: if two views change the same
revision, Quick Notes preserves the later submission as a separate conflict
copy instead of silently overwriting either edit.

Pending editor changes are flushed on `pagehide` and React unmount. The
previous v1 note snapshot is copied into v2 records on upgrade and retained
locally as a rollback fallback. Language is a small `storage.sync` preference
and may follow the user's Chrome profile when Chrome Sync is enabled.

## Commands

Run commands from the repository root.

```bash
pnpm quick-notes:dev
pnpm quick-notes:build
pnpm quick-notes:quality
pnpm quick-notes:zip
pnpm quick-notes:release:check
```

Load the unpacked Chrome build from `apps/quick-notes/.output/chrome-mv3`.

## Privacy and Publishing

See [PRIVACY.md](./PRIVACY.md) for the privacy policy and [docs/chrome-web-store.md](./docs/chrome-web-store.md) for listing copy, permission justifications, required assets, and the release checklist.

## Third-party software

Quick Notes includes BlockNote 0.51.4 components under the Mozilla Public License 2.0.
The packaged extension includes `THIRD_PARTY_NOTICES.txt` and the complete MPL 2.0
license under `licenses/MPL-2.0.txt`. Upstream source is available from the
[BlockNote repository](https://github.com/TypeCellOS/BlockNote). No BlockNote
source files are modified by this project.
