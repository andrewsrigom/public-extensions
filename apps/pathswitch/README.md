# PathSwitch

WXT/React browser extension for redirecting matching pages to a preferred URL.

## Features

- Global enable/disable toggle.
- Rule list with per-rule enable/disable, edit, and delete.
- Wildcard source patterns such as `amazon.com/*`.
- New rules start with the active HTTP(S) tab as their source when its URL is available, preserving scheme and port while
  excluding query parameters and fragments.
- Destination URL normalization, accepting either `https://example.com/` or `example.com`.
- Fixed destinations: source paths, queries, and fragments are not copied to the destination.
- Background redirect through `webNavigation.onBeforeNavigate`.
- Local-only storage through `storage.local`.
- Shared UI through `@browser-extensions/ui`.

## Commands

Run commands from the repository root.

```bash
pnpm pathswitch:dev
pnpm pathswitch:build
pnpm pathswitch:quality
pnpm pathswitch:zip
pnpm pathswitch:release:check
```

Load the unpacked Chrome build from:

```text
apps/pathswitch/.output/chrome-mv3
```

## Privacy and Publishing

See [PRIVACY.md](./PRIVACY.md) for the privacy policy and [docs/chrome-web-store.md](./docs/chrome-web-store.md) for listing copy, permission justifications, required assets, and the release checklist.
