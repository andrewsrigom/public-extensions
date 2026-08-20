# Public Extensions

A production-oriented pnpm workspace for focused browser extensions built with WXT, TypeScript, React, and Chrome
Manifest V3.

## Extensions

- [Watched Filter](./apps/watched-filter) marks watched streaming titles and reduces their visual prominence.
- [Product Filter](./apps/product-filter) hides marketplace product cards that match user-defined terms.
- [Quick Notes](./apps/quick-notes) keeps global or site-specific notes in the browser side panel.
- [Time Zone Helper](./apps/time-zone-helper) monitors another time zone and converts typed times.
- [Site Reset](./apps/site-reset) clears selected browser data for the current website.
- [PathSwitch](./apps/pathswitch) redirects matching pages using local, user-defined rules.

Shared React primitives live in [`packages/ui`](./packages/ui), with presentation assets in
[`packages/ui-tokens`](./packages/ui-tokens).

## Requirements

- Node.js 24
- pnpm 11
- A Chromium-based browser for local extension testing

## Setup

```bash
pnpm install --frozen-lockfile
pnpm quality:public
```

Run one extension while developing:

```bash
pnpm watched-filter:dev
pnpm product-filter:dev
pnpm quick-notes:dev
```

Build and validate all six release artifacts:

```bash
pnpm release:check:public
```

Generated unpacked builds and ZIPs are written below `apps/<name>/.output/` and are intentionally ignored by Git.

## Repository structure

```text
apps/
  watched-filter/
  product-filter/
  quick-notes/
  time-zone-helper/
  site-reset/
  pathswitch/
packages/
  ui/
  ui-tokens/
```

Each extension owns its manifest permissions, content scripts, storage keys, selectors, domain logic, privacy policy, and
release notes. Shared abstractions are reserved for stable behavior with a real second consumer.

## Quality and security

Before opening a pull request, run:

```bash
pnpm check:public-boundary
pnpm test:public-export
pnpm quality:public
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development conventions,
[SECURITY.md](./SECURITY.md) for vulnerability reporting, and
[docs/open-source-readiness.md](./docs/open-source-readiness.md) for the publication and release criteria. Asset-rights and
dependency-license evidence, including unresolved manual release gates, is recorded in
[docs/asset-provenance.md](./docs/asset-provenance.md) and [docs/third-party-licenses.md](./docs/third-party-licenses.md).

## License

Released under the [MIT License](./LICENSE). Third-party components remain subject to their own licenses and notices.
