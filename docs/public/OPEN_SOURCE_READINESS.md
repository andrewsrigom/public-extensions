# Open-source readiness standard

This document defines the evidence required before publishing this browser-extension workspace or releasing one of its
extensions. Passing a single automated command is necessary, but it is not sufficient on its own.

## Publication boundary

The public workspace contains exactly six applications under `apps/` and the shared `ui` and `ui-tokens` packages.
Root automation, workspace metadata, documentation, and lockfiles must reference only that declared source set.

A publication snapshot must come from `scripts/export-public-workspace.mjs`. The exporter builds the snapshot in a
temporary sibling directory, validates it, and only then moves it into the requested empty destination. A snapshot
containing `.public-export-incomplete` failed or skipped a required gate and must not be committed or published.

## Blocking criteria

Publication is blocked by any of the following:

- credentials, personal data, private keys, local machine paths, or unreleased source outside the declared allowlist;
- a symlink, sensitive file, generated artifact, or unexpected top-level path in the publication snapshot;
- a missing, stale, malformed, or non-public-only lockfile;
- an unresolved critical or high-severity advisory anywhere in the complete locked graph, including release tooling;
- a missing license or unresolved third-party asset/license provenance;
- failing format, lint, type, test, build, boundary, or release checks;
- browser permissions or data handling that are broader than the product documentation; or
- a Git history that contains material not approved for publication.

## Required evidence

Before the first public push:

1. Run the exporter without `--skip-install` into a new destination outside the source repository.
2. Review the complete exported file manifest and confirm that the boundary checker passes in export mode.
3. Install from the generated frozen lockfile and run `pnpm release:check:public`.
4. Run blocking `pnpm security:audit`, complementary `pnpm security:audit:prod`, and a dedicated secret scanner over
   every commit that will be pushed.
5. Review manifests, privacy policies, [asset provenance](./asset-provenance.md), the
   [third-party license record](./third-party-licenses.md), notices, store copy, source maps, and release archives;
   resolve every pending checklist item in those records before publication.
6. Load every unpacked extension in a clean browser profile and record browser/site smoke-test results.
7. Initialize a new Git history from the approved snapshot; never copy an unrelated internal `.git` directory.
8. Configure branch protection, required CI, dependency updates, secret scanning, and private vulnerability reporting.
9. Obtain a second human review of the final file list and commit history before making the remote public.

## Pull-request and release gates

Contributors should run:

```bash
pnpm check:public-boundary
pnpm quality:public
```

Maintainers should additionally run:

```bash
pnpm release:check:public
pnpm security:audit
pnpm security:audit:prod
```

Manual browser checks remain required for changes to content scripts, permissions, manifests, browser APIs, storage
migrations, destructive actions, and third-party site adapters.

## Severity

- **P0 — publication blocker:** source, credential, personal-data, history, or licensing exposure.
- **P1 — release blocker:** broken quality gate, unsafe permission/data handling, incompatible migration, or unresolved
  critical/high advisory in the complete locked graph, including development and release tooling.
- **P2 — scheduled cleanup:** maintainability or polish that does not create material disclosure, security, or release risk.

Every P0 and P1 issue must be resolved before publication. Accepted P2 work needs an owner or tracking issue.
