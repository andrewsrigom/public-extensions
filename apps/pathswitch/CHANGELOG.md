# Changelog

## Unreleased

- Added per-tab redirect-chain and hop-limit protection against indirect loops.
- Preserved redirect-chain state across unmatched destinations so a later return to the source is still blocked.
- Prevented a delayed storage read from redirecting a newer navigation in the same tab.
- Reset redirect-chain state when Chrome rejects a tab update so retries are not blocked.
- Rejected destinations containing URL credentials to avoid misleading redirect rules.

## 0.1.0 - 2026-07-15

- Added automatic redirects based on user-created wildcard URL rules.
- Added global and per-rule enable controls.
- Added exact-source-host and destination-loop safeguards.
- Added local-only rule storage.
- Added English, Portuguese, and Spanish interface support.
- Removed an unused `tabs` permission before the first release.
