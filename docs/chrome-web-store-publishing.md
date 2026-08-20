# Chrome Web Store Publishing

This release track covers only the six extensions approved for the public repository:

1. Watched Filter
2. Hide Unwanted Products
3. Quick Notes
4. Time Zone Helper
5. Site Reset
6. PathSwitch

## Release Command

Run from the repository root:

```bash
pnpm release:check:public
```

The command runs formatting and lint checks, then typechecks, tests, builds, and creates a Chrome ZIP for each of the six extensions. Generated ZIPs live under each app's `.output` directory and are intentionally ignored by Git.

The automated command does not resolve asset ownership or assemble complete dependency notices. Do not upload a ZIP until
every pending item in [Asset provenance](./asset-provenance.md) and the
[Third-party license record](./third-party-licenses.md) is resolved, and the required notices are confirmed inside that
ZIP. New store screenshots and promotional images also need a recorded source and redistribution right before they enter
the public repository.

## Submission Material

| Extension              | Listing and privacy answers                                      | Privacy policy                                |
| ---------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| Watched Filter         | [Store notes](../apps/watched-filter/docs/chrome-web-store.md)   | [Policy](../apps/watched-filter/PRIVACY.md)   |
| Hide Unwanted Products | [Store notes](../apps/product-filter/docs/chrome-web-store.md)   | [Policy](../apps/product-filter/PRIVACY.md)   |
| Quick Notes            | [Store notes](../apps/quick-notes/docs/chrome-web-store.md)      | [Policy](../apps/quick-notes/PRIVACY.md)      |
| Time Zone Helper       | [Store notes](../apps/time-zone-helper/docs/chrome-web-store.md) | [Policy](../apps/time-zone-helper/PRIVACY.md) |
| Site Reset             | [Store notes](../apps/site-reset/docs/chrome-web-store.md)       | [Policy](../apps/site-reset/PRIVACY.md)       |
| PathSwitch             | [Store notes](../apps/pathswitch/docs/chrome-web-store.md)       | [Policy](../apps/pathswitch/PRIVACY.md)       |

## Recommended Submission Order

Submit the lowest-permission extensions first so the publisher account and listing workflow can be validated before broader reviews:

1. Time Zone Helper
2. Quick Notes
3. Hide Unwanted Products
4. Watched Filter
5. Site Reset
6. PathSwitch

Site Reset and PathSwitch require `<all_urls>` for their user-facing purpose and may receive more review scrutiny.

## Assets Still Requiring Manual Product Screenshots

Each listing needs:

- the 128x128 icon already included in its ZIP;
- at least one 1280x800 or 640x400 product screenshot;
- one 440x280 small promotional image.

Capture screenshots from the final unpacked build using fictional content and a clean browser profile. Keep account names, private notes, internal URLs, cookies, and other personal data out of the images.

## Dashboard Sequence

For each extension:

1. Create the item and upload the matching ZIP.
2. Paste the listing copy and add the required images.
3. Paste the single-purpose and permission justifications.
4. Declare no remote code.
5. Complete the data-use certification consistently with the app's policy.
6. Add the public privacy-policy URL after these files are pushed to the public repository.
7. Start with Unlisted visibility or trusted testers.
8. Submit for review and save reviewer feedback before changing the next build.

Official references: [Prepare your extension](https://developer.chrome.com/docs/webstore/prepare), [Complete the listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing/), [Fill out privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy/), and [Supply images](https://developer.chrome.com/docs/webstore/images).
