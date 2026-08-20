# Useful Browser Extensions

Small browser extensions for everyday annoyances.

This repository brings together focused tools that help with filtering content, taking notes, working across time zones,
resetting site data, and redirecting pages. Each extension remains independent, while shared tooling keeps development
and testing consistent.

Contributions are welcome. You can help reproduce and fix bugs, improve accessibility or translations, maintain website
adapters, refine existing features, or propose a new extension that solves a clear browser-sized problem.

## Extensions

| Extension                                       | What it does                                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [Watched Filter](./apps/watched-filter)         | Marks watched streaming titles and can reduce their visual prominence.                    |
| [Hide Unwanted Products](./apps/product-filter) | Hides marketplace product cards that match user-defined terms or product IDs.             |
| [Quick Notes](./apps/quick-notes)               | Keeps global or site-specific notes in the browser side panel and a dedicated notes page. |
| [Time Zone Helper](./apps/time-zone-helper)     | Monitors another time zone and converts typed dates and times.                            |
| [Site Reset](./apps/site-reset)                 | Clears selected browser data for the current website after an explicit confirmation.      |
| [PathSwitch](./apps/pathswitch)                 | Redirects matching pages to fixed destinations using local, user-defined rules.           |

Browser-store links will be added after the first releases are published. Until then, the extensions can be built and
loaded locally from source.

## Ways to contribute

- Report a reproducible bug, including the extension, browser version, expected behavior, and actual behavior.
- Suggest a focused improvement or a new extension idea.
- Improve tests, documentation, translations, accessibility, or browser compatibility.
- Update a website adapter when an external page changes.
- Submit a small pull request with a clear explanation and verification notes.

For substantial features or a new extension, start with an issue so the scope and browser permissions can be discussed
before implementation. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, conventions, and pull request expectations.
Security issues follow the private process in [SECURITY.md](./SECURITY.md).

## Build from source

Requirements:

- Node.js 24
- pnpm 11
- A Chromium-based browser for the automated browser smoke tests

Install dependencies and run the public workspace checks:

```bash
pnpm install --frozen-lockfile
pnpm quality:public
```

Run a single extension while developing:

```bash
pnpm watched-filter:dev
pnpm product-filter:dev
pnpm quick-notes:dev
```

Each app exposes its own development and quality commands in `apps/<name>/package.json`. Generated builds are written
below `apps/<name>/.output/` and are intentionally ignored by Git.

## Test in a browser

Build all extensions and run the automated smoke suite in disposable Chromium profiles:

```bash
pnpm playwright:install:public
pnpm test:e2e:public
```

The smoke suite never uses the maintainer's personal browser profile. Browser tests stay local by default to conserve CI
minutes. Use [docs/release-checklist.md](./docs/release-checklist.md) for focused, headed, and final artifact checks.

## Project principles

- Keep every extension focused on one understandable problem.
- Request the minimum browser permissions needed for the feature.
- Store user settings locally unless a feature explicitly documents otherwise.
- Keep site-specific selectors and browser behavior inside the owning extension.
- Add shared code only after a second real consumer exists.
- Prefer focused tests and deterministic browser fixtures over live third-party websites in CI.

Shared React primitives live in [`packages/ui`](./packages/ui), with presentation assets in
[`packages/ui-tokens`](./packages/ui-tokens).

## License and collaboration

The source is available under the [PolyForm Shield License 1.0.0](./LICENSE). You may study it, modify it for permitted
purposes, and contribute improvements here. The license does not permit publishing a competing substitute for these
extensions, whether it is renamed, rebranded, sold, or distributed free of charge.

The extension names, logos, and icons are also covered by the [Trademark and Brand Policy](./TRADEMARKS.md). Third-party
components remain subject to their own licenses and notices. Their records are maintained in
[docs/third-party-licenses.md](./docs/third-party-licenses.md).
