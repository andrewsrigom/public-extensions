# Site Reset

Site Reset is a WXT browser extension for clearing data tied to the current website.

It uses the shared `@browser-extensions/ui` components and keeps reset logic local to this app.

## Commands

```bash
pnpm --filter site-reset dev
pnpm --filter site-reset build
pnpm --filter site-reset quality
pnpm --filter site-reset zip
pnpm site-reset:release:check
```

Load the unpacked Chrome build from `apps/site-reset/.output/chrome-mv3`.

## Privacy and Publishing

See [PRIVACY.md](./PRIVACY.md) for the privacy policy and [docs/chrome-web-store.md](./docs/chrome-web-store.md) for listing copy, permission justifications, required assets, and the release checklist.
