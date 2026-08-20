# Public Extensions Agent Guide

## Scope and repository boundary

- These instructions apply to the entire repository. A more specific `AGENTS.md` may add stricter rules for its subtree.
- This is a public, MIT-licensed workspace. The allowed product surface is exactly:
  - `apps/watched-filter`
  - `apps/product-filter`
  - `apps/quick-notes`
  - `apps/time-zone-helper`
  - `apps/site-reset`
  - `apps/pathswitch`
  - `packages/ui`
  - `packages/ui-tokens`
- Do not add, copy, link, or describe private product code, configuration, fixtures, operational data, or implementation
  history. Recruiting/application automation and mailbox or message-assistant products belong only in the private
  repository. Generic deny-list references inside boundary/security checks and their focused tests are the only exception.
- Do not introduce dependencies on private repositories, unpublished packages, local sibling paths, submodules, or
  symlinks that escape this repository.
- Keep content scripts, browser permissions, storage keys, selectors, and domain behavior inside the owning app. Extract a
  shared package only for stable, tested behavior with a real second consumer.

## Environment

- Use Node.js 24 and pnpm 11, and run workspace commands from the repository root.
- When the checkout is in WSL, run Git, Node, and pnpm inside WSL. Do not run Windows package-manager commands against a
  `\\wsl.localhost` path.
- Use the committed lockfile. Do not change dependency versions or regenerate the lockfile unless the task requires it.

## Git branches and commits

- Never create or rename a branch with the `codex/` prefix.
- When a Jira key is known, use the exact key as the default branch name unless the user requests another name. Otherwise,
  create a branch only when requested and use a short descriptive name without reserved tool prefixes.
- Do not stage, commit, push, open a pull request, rewrite history, or change remotes unless the user explicitly authorizes
  that action.
- Commits must use a GitHub noreply address for both author and committer. Verify the effective identity before committing;
  stop instead of publishing a personal email address. Do not amend or rewrite another commit merely to change identity
  without explicit approval.
- Keep commits reviewable and limited to the requested concern. Inspect the staged diff before every authorized commit.

## Secrets, privacy, and public writing

- Never commit credentials, tokens, cookies, OAuth material, private keys, populated environment files, signed or resumable
  URLs, browser profiles, logs, database data, mailbox content, resumes, personal contact data, or absolute home-directory
  paths. Examples must use unmistakable placeholders and synthetic data.
- Treat metadata and fixtures as potentially sensitive. Inspect text, binary assets, archives, source maps, Git history, and
  generated output before publication.
- Keep public language objective and evidence-based. Describe behavior, limits, commands, and observed results; avoid broad
  self-certifications or marketing claims about maturity, security, or audit status.
- Do not narrate internal audits, private migrations, cleanup history, hidden repositories, or unpublished implementation
  details in public documentation. Record only facts needed by users and contributors.
- Security vulnerabilities must follow `SECURITY.md`; do not disclose them in public issues, examples, or changelogs.

## Change safety

- Inspect `git status` before editing. Treat all existing modifications and untracked files as user work; preserve them and
  avoid overlapping edits. Touch only files required by the task.
- Never use destructive Git or filesystem operations such as `git reset --hard`, `git clean`, broad checkout/restore,
  recursive deletion, or bulk replacement unless the user explicitly requests the exact operation and targets.
- Do not discard, stash, move, rename, or overwrite user changes to make validation pass. Report conflicts or blockers.
- Keep browser permissions and host access least-privilege. Document any broad permission and manually verify changes to
  manifests, content scripts, browser APIs, destructive actions, storage migrations, or third-party site adapters.
- Preserve stored-data and backup compatibility. A storage-shape change requires an explicit, tested migration or a
  documented compatibility decision.

## Proportional quality gates and CI cost

- Validate locally first and use the smallest gate that exercises the changed surface. Do not use CI as the first feedback
  loop or repeatedly rerun unchanged failures.
- Documentation-only changes: run Prettier on the changed files and `pnpm check:public-boundary`.
- A single app or package: run its focused tests/typecheck while iterating, then `pnpm <app-name>:quality` or
  `pnpm --filter <package-name> quality` before handoff.
- Shared UI, root tooling, permissions, dependencies, lockfile, boundary, or cross-app changes: run
  `pnpm quality:public`.
- Routine npm version PRs are intentionally disabled; grouped Dependabot security updates remain enabled. During an
  explicit dependency-maintenance task, run `pnpm outdated`, review release notes plus Node/peer requirements, regenerate
  the lockfile once, and reject unrelated downgrades. Keep `@types/node` on the runtime Node major unless both migrate
  together. GitHub Actions updates remain grouped and monthly.
- Before a public release, run `pnpm test:public-export` in the Git checkout, run `pnpm release:check:public` in a clean
  exported snapshot without `.git`, and run both `pnpm security:audit` and `pnpm security:audit:prod`.
- Keep public CI rigorous but non-duplicative. Prefer one authoritative invocation of each gate, bounded concurrency, frozen
  installs, and dependency caching. Do not add redundant OS/browser matrices, duplicate builds, or cache-busting steps
  without a documented risk they cover; never skip a required security or release gate merely to reduce cost.
- Pin third-party CI actions to reviewed full commit SHAs, grant the workflow token minimum permissions, and keep checkout
  credentials disabled when a job does not need to push.

## Artifacts, assets, and licenses

- Do not commit `.output`, `.wxt`, `node_modules`, coverage, source maps, ZIPs, local browser data, or temporary exports.
- New dependencies and bundled assets require verified redistribution rights. Update the relevant provenance,
  third-party-license record, notices, and hashes when applicable.
- Release archives must contain the repository `LICENSE` and current third-party notices, and must not contain secrets,
  private paths, undeclared fonts/assets, or development-only files.
- Use `scripts/export-public-workspace.mjs` for publication snapshots and treat any boundary failure or incomplete marker as
  a publication blocker.

## Handoff

- Report the exact files changed, commands run, results, and any unverified manual step. Distinguish observed evidence from
  assumptions and do not claim completion when a required gate remains pending.
