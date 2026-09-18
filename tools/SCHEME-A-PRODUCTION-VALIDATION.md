# Scheme A production calibration

Production checkpoint before this milestone: `30794ef`.

Only `render.js` changes production behavior. A and B retain the same Scheme
renderer and adaptive fitting system. Layout-specific options now select:

| Layout | X | Y | Width | Logical/max bottom | Actual flavor clip | Advance |
|---|---:|---:|---:|---:|---:|---|
| A | 22 | 525 | 460 | 670 | 668 | round(font size * 1.1) |
| B, unchanged | 22 | 370 | 432 | 650 | 648 | existing 0.82 basis |

The clip rectangle mechanism remains unchanged: its actual bottom is the
configured `clipBottom` minus two. No contour/obstacle logic is added.

Scheme B is explicitly deferred pending a template-height decision. Its shipped
white region opens around Y364; moving text alone to the unapproved Y422 would
leave a large gap below the banner. No B candidate geometry has been adopted.

## Preserved behavior

Scheme flavor remains a custom-editor feature with flow-relative placement,
preferred logical gap 16 compressed toward 6, existing flavor font selection and
clipping. None of the official study references supplies separate flavor evidence.
There is no Hero target-bottom policy. Title/template drawing, all other card
families, editor/persistence, full-line explicit breaks, protected-block policy,
bounds-aware icon spacing, stat scale 1.60 and class scale 1.28 are unchanged.

Automatic font floors are unchanged. Effective fonts can improve because the
accepted rectangle and spacing let more text fit; this is not extra shrinking.

## Exact saved-candidate results

| Fixture / requested size | Effective before -> after | Lines | Advance before -> after | Logical bottom before -> after | Vertical overflow before -> after |
|---|---|---:|---|---|---|
| Short / 22 | 22 -> 22 | 3 | 30 -> 24 | 615 -> 597 | 0 -> 0 |
| Cosmic Cube / 20 | 19 -> 20 | 6 | 25 -> 22 | 675 -> 657 | 29 -> 0 |
| Legacy Virus / 20 | 17.5 -> 18.5 | 6 | 23 -> 20 | 663 -> 645 | 17 -> 0 |
| Custom flavor / 20 | 20 -> 20 | 3 | 26 -> 22 | 603 -> 591 | 0 -> 0 |
| Legacy Virus / 22 | 21 -> 21 | 8 | 28 -> 23 | 749 -> 709 | 103 -> 39 |
| Legacy Virus / 14 | 14 -> 14 | 5 | 18 -> 15 | 615 -> 600 | 0 -> 0 |

Cube painted bottom improves 664.25 -> 650. Virus at20 improves 653.125 ->
638.875. The dense requested 22 caveat is intentional: painted bottom remains
701.75 (1.75 beyond the canvas), logical overflow 39. No emergency shrinking,
content-specific exceptions or changed fitting floors have been introduced.

Custom flavor origin moves 619 -> 607, painted bottom629.25 -> 617.25 and
painted rules/flavor gap 17.75 -> 13.75; it remains unclipped. Full explicit blank
lines remain full line advances in both layouts. Short protection remains 3/3;
Cube remains 6/6. Complete protection/fallback records match the saved candidate.
Line counts in these six A cases are unchanged; some word-wrap locations change
with width/font selection. Horizontal overflow stays at1, the existing left
glyph overhang. No new overflow, missing assets or flavor clipping is introduced.

## Reproduction and validation

From a checkout with Git history including `30794ef` and installed dependencies:

```powershell
.\node_modules\electron\dist\electron.exe tools/scheme-a-production.cjs
.\node_modules\electron\dist\electron.exe tools/phase1-probe.cjs --checks
.\node_modules\electron\dist\electron.exe tools/phase2-probe.cjs --checks
.\node_modules\electron\dist\electron.exe tools/phase25-probe.cjs --checks
.\node_modules\electron\dist\electron.exe tools/phase26-probe.cjs --checks
$env:LEGEDIT_REVIEW_OUTPUT = "$PWD/tools/review-artifacts/scheme-a-production/inline-stat"
.\node_modules\electron\dist\electron.exe tools/inline-stat-production.cjs
```

The Scheme runner is independently reproducible using permanent fixtures under
`tools/test-fixtures/scheme-a/`; it never imports the untracked calibration study.
It validates all four saved A images and full measurement records, both dense
A sizes, four saved B images/records, two dense B cases, explicit breaks and
the 102-render cross-family corpus at 1x and 3x. All 90 non-Scheme images and
all 6 corpus B images are unchanged. Four title/template upper regions match.
Including focused/dense cases, all 12 current-vs-baseline B image pairs match.

Historical Hero/icon milestone runners explicitly restore old Scheme A geometry
in their isolated oracle environment via `historical-scheme-a-basis.cjs`.
They already restore their historical icon/rare-multicolor assumptions. This
does not change expected results or production: the new Scheme runner compares
actual unmodified production against the saved candidate and actual checkpoint.

`tools/phase26-probe.cjs` was a pre-existing untracked runner and is not altered
by this milestone. Its browser checks also run through the tracked inline-stat
runner. Include that launcher separately if all listed standalone commands must
be available in a newly cloned repository.

Persistent review: `tools/review-artifacts/scheme-a-production/review.pdf`,
`review.html` and `measurements.json`. The HTML embeds all 20 images; the PDF
contains five paired full-card/crop pages. `tools/build-scheme-a-review.py`
rebuilds the documents from the new runner's output. The original diagnostic
and all pre-existing untracked files are preserved. No files are staged/committed.

## Recorded run results

- Phase1: 34 checks passed. Phase2: 162 keyboard/parser checks passed.
- Phase2.5: 893 checks passed. Phase2.6: 1,457 checks passed.
- Inline-stat permanent oracle: 473 exact diagnostic pixel matches (464 corpus
  plus 9 focused); 2,530 checks, 612 flavor checks, 9,571 Hero checks and 576 direct
  Hero cases passed. Historical icon changes relative to its old 1.72 baseline
  are expected; they are not changes introduced by this Scheme milestone.
- Actual production Scheme A: 4 saved candidate pixel/metric matches plus 2 dense
  metric matches. All 12 B before/after images and 90 non-Scheme images match.
  Four upper-title/template image regions match; 4 explicit-break checks pass.
- All four regular A fixtures retain their exact words per line. Dense Virus22
  and14 have different word wraps, but retain 8 and 5 lines respectively.
- Five PDF pages rendered and visually inspected. HTML: all 20 embedded images
  decode, five sections, no missing assets or horizontal page overflow.
- JavaScript/Python syntax and git diff --check pass. Only render.js differs
  among the nine original production-file fingerprints. The Git index is empty.

Machine-readable detailed measurements, hash audit, full status and inventories
are retained alongside the review. The intentionally blocked external keyword
fetch may appear as ERR_BLOCKED_BY_CLIENT in isolated Electron logs; it does not
indicate a failed render or missing local asset.

Historical runner maintenance was also exercised: Hero regression passed 2,530 checks, with 445 identical images and only its 19 previously accepted rare-Hero differences. Historical flavor passed 612 focused and 2,530 corpus checks; all 48 focused rules images and corpus rules diagnostics are unchanged, with no newly overflowing or clipped flavor cases. These are confirmations of old milestones, not additional production changes.
