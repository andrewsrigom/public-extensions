# Release checklist

This checklist keeps source, browser, security, and packaging checks reproducible for contributors and maintainers.

## Publication boundary

The repository contains exactly six applications under `apps/` and the shared `ui` and `ui-tokens` packages. Root
automation, workspace metadata, documentation, and lockfiles must reference only that declared source set.

Create public snapshots with `scripts/export-public-workspace.mjs`. The exporter builds into a temporary sibling
directory, validates the result, and only then moves it into the requested empty destination. Do not publish a snapshot
that contains `.public-export-incomplete`.

## Automated checks

Run the contributor checks from a Git checkout:

```bash
pnpm test:public-export
pnpm check:public-boundary
pnpm quality:public
```

Before packaging a release, also run:

```bash
pnpm release:check:public
pnpm security:audit
pnpm security:audit:prod
```

`test:public-export` exercises the Git-backed exporter. `release:check:public` also works in the resulting source snapshot
without a `.git` directory and verifies all six ZIPs, their license files, and release-critical manifest fields.

## Browser smoke tests

Install the Playwright-managed Chromium once, then build and exercise all six unpacked extensions:

```bash
pnpm playwright:install:public
pnpm test:e2e:public
```

The harness uses a disposable browser profile and local or intercepted fixture pages. It never loads an extension into a
personal Chrome profile, and it blocks unexpected external requests. To target one already-built extension or watch the
run:

```bash
pnpm test:e2e:public:built -- --app quick-notes
pnpm test:e2e:public:built -- --headed --app quick-notes
```

The default pull-request workflow intentionally leaves browser smoke tests local to conserve CI minutes. Run them for
changes to content scripts, browser APIs, storage, manifests, destructive actions, or extension UI. Real-site adapters
still need a focused manual smoke test because third-party markup changes independently of this repository.

## Release review

- Review manifest permissions, privacy policies, store copy, and data-handling behavior.
- Review [asset provenance](./asset-provenance.md), [third-party licenses](./third-party-licenses.md), notices, source maps,
  and the final ZIP contents.
- Run a dedicated secret scanner over every commit being published and inspect the complete file manifest.
- Load each unpacked build in a clean browser profile when permissions or browser integration changed.
- Keep generated builds, local profiles, credentials, personal data, private code, and unrelated Git history out of the
  repository.
