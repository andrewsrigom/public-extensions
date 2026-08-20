# Asset provenance

This record covers the static visual assets committed for the six public extensions. It is reviewed when an asset changes
and before a public release. Inventory and evidence snapshot: 2026-08-19.

## Evidence status

On 2026-08-19, maintainer Andrews Ribeiro Gomes confirmed that he personally generated and owns the six PNG masters
listed below. This is the retained provenance statement: it identifies no third-party source artwork and does not claim
a specific generation tool. By directing publication of the assets in this source-available repository, the maintainer
licenses the masters and their committed size derivatives under the repository's
[PolyForm Shield License 1.0.0](../LICENSE). The extension names, logos, and icons also remain subject to the
[Trademark and Brand Policy](../TRADEMARKS.md).

The internal source history shows that the masters and corresponding public icon sizes entered or changed on
2026-07-09. Internal commit identifiers are intentionally omitted from this public record because publication uses a
clean history and must not disclose references into the private workspace. The written maintainer confirmation above is
the authorship, ownership, and redistribution evidence for this inventory.

## Inventory

| App              | Master file                                    | First observed | SHA-256                                                            | Creator / license                             |
| ---------------- | ---------------------------------------------- | -------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| Watched Filter   | `apps/watched-filter/assets/icon-master.png`   | 2026-07-09     | `660a30f6248a735193c2a38f39bc9a00b9146406e1543bde0f63c0da8716bc3a` | Andrews Ribeiro Gomes / PolyForm Shield 1.0.0 |
| Product Filter   | `apps/product-filter/assets/icon-master.png`   | 2026-07-09     | `51450dfcba158a5f8d74b7e15594f7756ef695ff54a167b23f9d6f88f322eaec` | Andrews Ribeiro Gomes / PolyForm Shield 1.0.0 |
| Quick Notes      | `apps/quick-notes/assets/icon-master.png`      | 2026-07-09     | `ef5687eb2797148abbcb28691ead681902cfa5bb77fbd38029e2eab612b50285` | Andrews Ribeiro Gomes / PolyForm Shield 1.0.0 |
| Time Zone Helper | `apps/time-zone-helper/assets/icon-master.png` | 2026-07-09     | `e5c61c4afd6758c810f3d849c47842c39a3fa5d82aed7f676a0d3262f4ae03e9` | Andrews Ribeiro Gomes / PolyForm Shield 1.0.0 |
| Site Reset       | `apps/site-reset/assets/icon-master.png`       | 2026-07-09     | `85377ec148fadc7a0de237497c0dabda8b21ce58ae8afb170a4da7451ae321cd` | Andrews Ribeiro Gomes / PolyForm Shield 1.0.0 |
| PathSwitch       | `apps/pathswitch/assets/icon-master.png`       | 2026-07-09     | `530dd68ec9f9ab0c8de0a71b7a42a27762d93b27b5bea96a3e97e1262af2cb94` | Andrews Ribeiro Gomes / PolyForm Shield 1.0.0 |

The files at `apps/<app>/public/icons/icon-{16,32,48,128}.png` are committed size derivatives of the corresponding
master. The maintainer's confirmation and PolyForm Shield grant cover these derivatives as well as the masters.

The repository scan found no public font files, screenshots, or promotional images at the snapshot date. Icons rendered
at runtime from `lucide-react` are dependency code and are covered by the
[third-party license record](./third-party-licenses.md).

## Hash verification

Run from the source-workspace root:

```bash
sha256sum \
  apps/watched-filter/assets/icon-master.png \
  apps/product-filter/assets/icon-master.png \
  apps/quick-notes/assets/icon-master.png \
  apps/time-zone-helper/assets/icon-master.png \
  apps/site-reset/assets/icon-master.png \
  apps/pathswitch/assets/icon-master.png
```

A matching hash ties the inspected file to the ownership and licensing confirmation recorded above.

## Publication gate

Before the first public release:

- [x] Obtain and retain explicit maintainer confirmation for every master listed above.
- [x] Record the creator, evidence reference, and redistribution license.
- [x] Confirm the four public icon sizes are permitted derivatives of the identified master.
- [x] Include the PolyForm Shield license and trademark policy in the repository and each release archive.
- [x] Inspect the final exported manifest and every packaged extension archive for unrecorded visual assets.

A pull request that adds or replaces an asset must record its exact path, creator or source URL, license or written
permission, material modifications or generated derivatives, and SHA-256. Do not merge an asset with unverifiable origin.
Screenshots must use fictional or redacted data and must not expose browser profiles, accounts, tokens, or private
products.
