# Third-party license record

This document records the dependency-license review for the public workspace. It covers the production closure and build
tools known to emit runtime, helpers, preflight, or generated styles into release artifacts. It is evidence for a specific
lockfile snapshot, not legal advice or a substitute for upstream legal text.

Inventory snapshot: 2026-08-04.

## Production inventory

The production scope is all six public apps plus `@browser-extensions/ui` and `@browser-extensions/ui-tokens`, as resolved
by the root `pnpm-lock.yaml`. Reproduce the metadata inventory from a clean checkout after
`pnpm install --frozen-lockfile`:

```bash
pnpm \
  --filter @browser-extensions/ui \
  --filter @browser-extensions/ui-tokens \
  --filter watched-filter \
  --filter product-filter \
  --filter quick-notes \
  --filter time-zone-helper \
  --filter site-reset \
  --filter pathswitch \
  --recursive licenses list --prod --json
```

The reviewed snapshot contained 123 resolved package records:

| Declared license | Records |
| ---------------- | ------: |
| MIT              |     116 |
| MPL-2.0          |       3 |
| Apache-2.0       |       1 |
| ISC              |       1 |
| 0BSD             |       1 |
| MIT OR CC0-1.0   |       1 |

The metadata command reported no unknown, proprietary, or GPL-only identifier in this production scope. Metadata alone
does not preserve copyright or license conditions, so the generated notices include the legal files shipped by each
resolved package.

## Distributed toolchain inventory

Compiled output contains WXT bootstrap/content-script runtime, Vite's modulepreload helper, Rollup runtime/helpers,
esbuild transformation helpers, and Tailwind preflight/generated styles. The generator reads the root development
inventory and requires these reviewed pins:

| Package            | Required version | Distribution rationale                                          |
| ------------------ | ---------------- | --------------------------------------------------------------- |
| `@wxt-dev/browser` | `0.2.5`          | Browser runtime selected by WXT and emitted into bootstrap code |
| `esbuild`          | `0.25.12`        | Transformation helpers appear in emitted JavaScript             |
| `rollup`           | `4.62.4`         | Bundling emits module runtime and helpers                       |
| `tailwindcss`      | `4.3.2`          | Preflight and generated styles enter distributed CSS            |
| `vite`             | `6.4.3`          | Build output includes modulepreload/runtime helpers             |
| `wxt`              | `0.21.3`         | Extension bootstrap and content-script runtime enter bundles    |

Reproduce the source inventory with:

```bash
pnpm --filter browser-extensions licenses list --dev --json
```

The generator fails if a pin is absent or an unreviewed additional version is resolved. The root inventory also contains
`@wxt-dev/browser@0.1.43`; it is not selected because module resolution from `wxt@0.21.3` is verified to resolve exactly
`@wxt-dev/browser@0.2.5`. Native esbuild adapters and `@tailwindcss/vite` perform the build but are not distributed and are
not included. Including the six packages above is intentionally conservative.

## Deterministic packaged notices

Run:

```bash
pnpm licenses:generate:public
pnpm licenses:check:public
```

The generator produces `apps/<app>/public/THIRD_PARTY_NOTICES.txt` for each public extension. Every notice includes
package name, exact version, safe HTTP(S) homepage, declared/selected license, distribution rationale, and full
LICENSE/LICENCE/COPYING/NOTICE text. Each app conservatively receives the union of its production inventory, shared UI
production inventory, and the six pinned toolchain packages; tree-shaking does not remove an obligation by assumption.

`licenses:check:public` is read-only. It regenerates expected content in memory and compares bytes without creating,
rewriting, or deleting a notice. The control fails closed on:

- missing or stale per-app output;
- a missing, empty, symlinked, or non-regular legal file;
- a dependency path outside the repository, including Windows cross-drive escapes;
- missing or unreviewed toolchain versions;
- a dual-license expression without an explicit selection;
- an MPL package without the full MPL-2.0 text;
- an unsafe output path or output symlink; or
- a changed or missing offline legal override.

Write mode computes all six notices before writing and replaces each file through an exclusive temporary sibling and
atomic rename. The generated content contains no timestamp or local absolute path.

## Explicit license decisions and overrides

`type-fest@5.8.0` declares `MIT OR CC0-1.0`; the generator explicitly selects its shipped `license-mit` text.

Three installed tarballs declare MIT but omit a legal file. Network access is never used by generation or check mode.
Their reviewed upstream text is vendored and hash-pinned:

| Packages covered                       | Offline file                                                       | SHA-256                                                            | Upstream evidence                                                        |
| -------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `react-remove-scroll-bar@2.3.8`        | `docs/license-overrides/react-remove-scroll-bar-2.3.8-LICENSE.txt` | `a79aae0c0f21990d9d963bb3c5a79cdcea9a46f8523ba55c58d7fe776b6ebc84` | Upstream `LICENSE` commit `7301c160fda44cb8cf2b9fdfde61efad35736196`     |
| `wxt@0.21.3`, `@wxt-dev/browser@0.2.5` | `docs/license-overrides/wxt-0.21.3-LICENSE.txt`                    | `7b0b00fcdbc6a036078aad84d0bc0fae240ac67144b86c911149c2daa37c9f85` | Official `wxt-v0.21.3` commit `c9520b688d49bd4296d89ff5dcc6cd7fc2a8c5f1` |

Quick Notes includes the full MPL-2.0 text for `@blocknote/core`, `@blocknote/mantine`, and `@blocknote/react` 0.51.4 in
its generated aggregate. The existing `apps/quick-notes/public/licenses/MPL-2.0.txt` remains as a standalone copy. The
upstream project is [BlockNote](https://github.com/TypeCellOS/BlockNote).

## Release gate

`licenses:check:public` runs inside `quality:public`, therefore inside `release:check:public` and public CI. Before release:

1. Regenerate after any dependency, lockfile, generator, selection, or override change.
2. Review new license families, versions, legal texts, and distribution rationale.
3. Run `pnpm licenses:check:public` and keep all six outputs committed.
4. Build all six extensions and confirm `THIRD_PARTY_NOTICES.txt` is present in every unpacked output and ZIP.
5. Run blocking `pnpm security:audit` for the complete locked graph and complementary `pnpm security:audit:prod`.

Critical or high-severity findings block publication unless resolved or covered by an explicit reviewed risk decision.
Asset ownership is tracked separately in [Asset provenance](./asset-provenance.md).
