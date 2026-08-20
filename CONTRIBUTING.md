# Contributing

Thank you for considering a contribution. This repository brings together focused browser extensions, and contributions
that improve them here are welcome. Changes should keep product behavior isolated and make the smallest reasonable
addition to the codebase.

## Public project scope

The public source set is intentionally limited to:

- `apps/watched-filter`
- `apps/product-filter`
- `apps/quick-notes`
- `apps/time-zone-helper`
- `apps/site-reset`
- `apps/pathswitch`
- `packages/ui`
- `packages/ui-tokens`

Private products and their supporting packages are not part of the public contribution surface. Proposals that depend on
code outside the list above cannot be accepted into the public repository.

## Development setup

Requirements:

- Node.js 24
- pnpm 11
- Chromium or Firefox for manual extension testing

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm quality:public
```

Use an app-specific command while iterating, for example:

```bash
pnpm product-filter:dev
pnpm product-filter:quality
```

Generated directories such as `.output`, `.wxt`, `coverage`, and `node_modules` must not be committed.

## Making a change

1. Open an issue first for substantial features or architecture changes.
2. Keep DOM selectors, permissions, storage keys, and domain behavior within the owning app.
3. Add or update focused tests for changed behavior.
4. Update user-facing documentation, privacy information, changelogs, and every supported locale when applicable. Asset
   or dependency changes must also update the applicable provenance or third-party license record under `docs/`.
   Unresolved rights or packaged-notice checklist items block publication.
5. Run the app-specific quality command and `pnpm check:public-boundary`.
6. Manually load the unpacked extension when the change affects permissions, content scripts, manifests, or browser APIs.

Prefer short, imperative commit subjects with a clear scope, such as `fix(pathswitch): preserve query parameters`. Keep
refactors separate from behavior changes when practical.

## Pull requests

A pull request should explain the problem, the chosen approach, user-visible effects, and verification performed. Keep it
small enough to review. Screenshots or recordings are expected for visible UI changes.

Reviewers will look for:

- strict TypeScript and focused tests;
- least-privilege browser permissions;
- backward-compatible storage or an explicit migration;
- isolated click and message behavior in content scripts;
- complete i18n and privacy documentation;
- no credentials, personal data, generated output, or private-product references; and
- a clean public-boundary check.

This project is source-available to support upstream collaboration. It is not intended as a base for publishing renamed,
rebranded, paid, or free competing extensions. See [LICENSE](./LICENSE) and [TRADEMARKS.md](./TRADEMARKS.md) before
contributing or distributing any part of the project.

By contributing, you agree that your contribution is licensed under the repository's PolyForm Shield License 1.0.0 and
that you have the right to submit it.

## Security reports

Do not disclose vulnerabilities in an issue or pull request. Follow [SECURITY.md](./SECURITY.md) for private reporting.
