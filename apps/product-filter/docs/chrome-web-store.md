# Chrome Web Store Submission Notes

## Listing Draft

### Name

Hide Unwanted Products

### Short Description

Hide marketplace product cards that match your blocked terms on Amazon Brazil and US, Mercado Livre, AliExpress, and Temu.

### Detailed Description

Hide Unwanted Products makes supported marketplace pages easier to browse by reducing product cards that match terms you choose.

Features:

- filter product cards on Amazon Brazil and US, Mercado Livre, AliExpress, and Temu;
- create global rules or terms that apply only to one marketplace;
- match terms without depending on capitalization or accents;
- hide, dim, or cover matching cards with a dark overlay;
- manage rules from the popup and options page;
- export and import rules as a local JSON backup;
- use the interface in English, Portuguese, or Spanish.

Product details and filtering rules are processed and stored locally. The extension does not send them to the developer or to a developer-controlled server. Small interface preferences may follow the user through Google-operated Chrome Sync when browser profile sync is enabled.

This project is unofficial and is not affiliated with Amazon, Mercado Livre, Mercado Libre, AliExpress, or Temu.

## Privacy Tab

### Single Purpose

Hide product cards that match user-defined terms on supported marketplace pages.

### Permission Justifications

- `storage`: saves potentially large filtering rules in local extension storage and small interface preferences in Chrome Sync storage.
- `activeTab`: lets the popup identify and communicate with the supported marketplace tab after the user opens the extension.
- Supported marketplace site access: runs the card filter only on the Amazon Brazil and US, Mercado Livre, AliExpress, and Temu domains listed in the manifest.

Remote code: select **No, I am not using remote code**.

Suggested conservative data declarations: **Website content** for product titles, identifiers, and URLs processed on supported pages; **Web history** if the dashboard definition includes the current marketplace URL used to select the adapter. Page data and rules remain local. Small interface preferences can use Chrome Sync, with no sale, developer sharing, advertising, or human access.

Privacy policy URL after the file is public:

`https://github.com/andrewsrigom/public-extensions/blob/main/apps/product-filter/PRIVACY.md`

## Required Assets

- 128x128 icon: included in the ZIP at `icons/icon-128.png`.
- At least one 1280x800 or 640x400 screenshot showing blocked terms and filtered product cards.
- One 440x280 small promotional image.

Avoid marketplace logos in promotional art unless their branding rules are followed. Screenshots should use test rules and avoid personal account details.

## Manual Release Checklist

1. Run `pnpm product-filter:release:check`.
2. Load `apps/product-filter/.output/chrome-mv3` unpacked in Chrome.
3. Test global and site-specific terms on each supported marketplace.
4. Test hide, dim, and overlay modes.
5. Test popup messaging, options, JSON export, and JSON import.
6. Upload `apps/product-filter/.output/product-filter-0.1.0-chrome.zip`.
7. Fill the listing, privacy, and distribution tabs with the copy above.
8. Start as Unlisted or with trusted testers, then submit for review.
