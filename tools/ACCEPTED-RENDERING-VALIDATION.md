# Accepted rendering milestone — 14 November 2026

Scope: Common/Uncommon single-color Hero calibration, removal of ordinary separators at automatically wrapped line starts, and smaller inline icons (Attack/Recruit 1.40; class/team 1.10). Existing Hero line spacing, origins, widths and large graphics remain as accepted. No left-extension or additional tighter-spacing experiment is adopted.

## Permanent check

Install dependencies with `npm.cmd ci`, then run from the repository root:

```powershell
.\node_modules\.bin\electron.cmd tools/accepted-rendering-production.cjs
```

`tools/common-uncommon-production.cjs` delegates to this current check by default. It needs only committed repository sources, bundled fonts/assets and fixtures, not temporary calibration files or downloaded references. Network requests are blocked and browser storage/output use isolated temporary directories. Set LEGEDIT_REVIEW_OUTPUT to retain results in a chosen directory.

The runner executes 28 focused alignment assertions, 2,531 existing corpus checks, 464 corpus image comparisons and 78 detailed Hero image comparisons. Immutable expected image hashes are in `tools/test-fixtures/accepted-rendering/expected.json`, extracted from the reviewed icons-only diagnostic before production adoption. Both IDs/counts and pixels are checked. Source hashes are checked before/after execution. Font/Electron/platform differences require investigation; do not blindly refresh oracles.

For the original Common/Uncommon calibration in isolation, run `tools/common-uncommon-production.cjs --historical`. That mode uses the preserved pre-alignment renderer plus the other sources from Git checkpoint d60d70a, preserving original candidate snapshots instead of changing them to accommodate subsequent accepted work. It requires Git history. Older milestone reports remain historical evidence, not current full-render oracles.

## Persistent review

- `tools/review-artifacts/common-uncommon-wrap-calibration/review.pdf` and self-contained review.html: original Hero calibration.
- `tools/review-artifacts/soft-wrap-alignment/review.pdf` and self-contained review.html: alignment before/after.
- `tools/review-artifacts/post-alignment-calibration/review.pdf` and self-contained review.html: official cards plus four candidates; **Smaller icons only** is the adopted state, **Aligned production** is the prior control. Measurements and REPORT.md retain the diagnostic evidence.

Untracked diagnostic runners, scans and broad experimental outputs are intentionally excluded from this checkpoint. They remain on disk. Review HTML/PDF files are independently viewable; regenerating older galleries may require those optional diagnostic sources. The permanent regression runner does not.

Known limits: some crowded cards still overflow; automatic fitting can differ from official printed wrapping. Smaller icons recovered six existing corpus overflow cases without new/worsened overflow in the reviewed comparison. Full document-model work and tighter spacing remain separate future tasks.
