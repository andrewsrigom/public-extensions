# Asset provenance

This record covers the static visual assets committed for the six public extensions. It is reviewed when an asset changes
and before a public release. Inventory snapshot: 2026-08-04.

## Evidence status

The internal source history shows that the six PNG masters and their corresponding public icon sizes entered or changed
on 2026-07-09. Internal commit identifiers are intentionally omitted from this public record because publication uses a
clean history and must not disclose references into the private workspace. A commit date records when a file entered this
workspace; it does not prove who created the artwork, who owns it, or which redistribution license applies.

A repository search found no source URL, asset-specific license, authorship declaration, or generation record for these
masters. Their origin and redistribution rights are therefore **unresolved**. Public release is blocked until the
maintainer provides an explicit written confirmation for each master and this record is updated.

The confirmation must identify the creator or source, state whether third-party or generated material was used, cite any
applicable terms or permission, and name the license under which the asset may be redistributed. Do not assume that the
repository's source-code license covers an asset while this evidence is pending.

## Inventory

| App              | Master file                                    | First observed | SHA-256                                                            | Rights status        |
| ---------------- | ---------------------------------------------- | -------------- | ------------------------------------------------------------------ | -------------------- |
| Watched Filter   | `apps/watched-filter/assets/icon-master.png`   | 2026-07-09     | `660a30f6248a735193c2a38f39bc9a00b9146406e1543bde0f63c0da8716bc3a` | Confirmation pending |
| Product Filter   | `apps/product-filter/assets/icon-master.png`   | 2026-07-09     | `51450dfcba158a5f8d74b7e15594f7756ef695ff54a167b23f9d6f88f322eaec` | Confirmation pending |
| Quick Notes      | `apps/quick-notes/assets/icon-master.png`      | 2026-07-09     | `ef5687eb2797148abbcb28691ead681902cfa5bb77fbd38029e2eab612b50285` | Confirmation pending |
| Time Zone Helper | `apps/time-zone-helper/assets/icon-master.png` | 2026-07-09     | `e5c61c4afd6758c810f3d849c47842c39a3fa5d82aed7f676a0d3262f4ae03e9` | Confirmation pending |
| Site Reset       | `apps/site-reset/assets/icon-master.png`       | 2026-07-09     | `85377ec148fadc7a0de237497c0dabda8b21ce58ae8afb170a4da7451ae321cd` | Confirmation pending |
| PathSwitch       | `apps/pathswitch/assets/icon-master.png`       | 2026-07-09     | `530dd68ec9f9ab0c8de0a71b7a42a27762d93b27b5bea96a3e97e1262af2cb94` | Confirmation pending |

The same internal-history review shows that `apps/<app>/public/icons/icon-{16,32,48,128}.png` entered or changed alongside
the corresponding master. Their naming and appearance indicate that they are size derivatives, but the repository
contains no retained generation record. Their redistribution status follows the unresolved master until the maintainer
confirms the relationship and rights.

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

A matching hash proves file identity only. It does not establish authorship, ownership, originality, or permission to
redistribute.

## Publication gate

Before the first public release:

- [ ] Obtain and retain explicit maintainer confirmation for every master listed above.
- [ ] Replace each pending rights status with the creator/source, evidence reference, and redistribution license.
- [ ] Confirm the four public icon sizes are permitted derivatives of the identified master.
- [ ] Add required attribution or license text to the repository and release archive when applicable.
- [ ] Inspect the final exported manifest and every packaged extension archive for unrecorded visual assets.

A pull request that adds or replaces an asset must record its exact path, creator or source URL, license or written
permission, material modifications or generated derivatives, and SHA-256. Do not merge an asset with unverifiable origin.
Screenshots must use fictional or redacted data and must not expose browser profiles, accounts, tokens, or private
products.
