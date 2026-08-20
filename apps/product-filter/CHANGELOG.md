# Changelog

## Unreleased

- Moved quota-sensitive filtering rules from Chrome Sync to local extension storage.
- Added automatic migration from the legacy all-in-sync settings value.
- Serialized rule mutations in the background worker to prevent concurrent lost updates.
- Merged stale options-page drafts by their rule delta instead of replacing newer rules.
- Rejected JSON imports larger than 1 MB before reading or parsing them.

## 0.1.0 - 2026-07-15

- Added product-card filtering for Amazon Brazil and US, Mercado Livre, AliExpress, and Temu.
- Added global and marketplace-specific blocked terms.
- Added hide, dim, and dark-overlay visual modes.
- Added popup controls, options management, and JSON backup import/export.
- Added English, Portuguese, and Spanish interface support.
