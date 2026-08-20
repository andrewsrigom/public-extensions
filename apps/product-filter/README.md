# Hide Unwanted Products

Hide Unwanted Products is a WXT extension for hiding marketplace product cards by blocked terms.

## Scope

- Targets Amazon Brazil and US, Mercado Livre, AliExpress, and Temu pages, including Amazon deals and search results, `https://www.mercadolivre.com.br/ofertas`, AliExpress deal pages, and `https://www.temu.com/br`.
- Detects product cards through platform adapters under `src/platforms/`.
- Matches rules by:
  - global term in product title, ignoring case and accents
  - platform-specific term in product title, configured from the popup while a supported marketplace is open
  - product ID or ASIN, managed from the options page opened through the popup; ID rules apply globally across the
    supported marketplaces
- Supports three visual modes:
  - hide
  - dim
  - overlay

## Storage model

Filtering rules can grow beyond Chrome Sync's per-item quota, so global terms,
marketplace-specific terms, and blocked product IDs are stored in
`storage.local`. Small preferences (`enabled`, visual mode, and language) use
`storage.sync` and may follow the user through Chrome Sync when Chrome profile
sync is enabled.

Existing all-in-sync settings are migrated automatically on first load.

## Commands

Run from the repository root:

```bash
pnpm product-filter:dev
pnpm product-filter:build
pnpm product-filter:typecheck
pnpm product-filter:test
pnpm product-filter:quality
pnpm product-filter:release:check
```

Load the unpacked Chrome build from:

```text
apps/product-filter/.output/chrome-mv3
```

## Notes

This is intentionally separate from the streaming extension. Keep it as a separate package/app unless stable browser-extension utilities gain a clear second consumer.

## Privacy and Publishing

See [PRIVACY.md](./PRIVACY.md) for the privacy policy and [docs/chrome-web-store.md](./docs/chrome-web-store.md) for listing copy, permission justifications, required assets, and the release checklist.
