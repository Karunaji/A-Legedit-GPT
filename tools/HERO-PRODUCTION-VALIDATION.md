# Hero production calibration: rare single-color accepted; common/uncommon deferred

**Historical rules-milestone report.** That milestone is now committed as `35a9302`. The subsequent uncommitted rare single-color flavor implementation is documented in `HERO-FLAVOR-PRODUCTION-VALIDATION.md`; it supersedes this report's statements that final flavor placement is unchanged. Rules/font selection remains unchanged. The historical validation counts below describe the rules milestone.

No commit was created. Phase 2.6 and all prior experiments are preserved.

The user accepted the rare single-color Hero implementation as-is after reviewing the exact repeated-prose overflow comparison. This acceptance does not authorize a commit or extension to common/uncommon Heroes.

## Scope and embedded-badge limitation

The production selector is exactly `st.layout === 'single' && isRare` in the Hero drawing path. All rare single-color Hero classes use it. Common/uncommon Heroes, all multicolor Heroes, Split Heroes, Villains/Adversaries, Masterminds/Tactics, Schemes, Locations, Henchmen and Traps retain their pre-change behavior.

The user authorized common/uncommon inclusion only after their embedded contours were reliably derived and validated, and explicitly prohibited approximations. That condition was not met, so this portion was stopped without modifying common/uncommon behavior.

The ten colored common/uncommon templates contain the badge already composited with the textbox/frame. In the investigated badge neighborhood (source x360–489, y570–689), all pixels exceed the diagnostic alpha threshold of 64, including background pixels: common alpha range 166–255, uncommon 127–255. Thresholding this alpha would produce a rectangle, not a badge silhouette. A limited registration check of the separate `cost_common`/`cost_uncommon` assets against the green templates did not establish an exact match; the best integer translation was approximately (+3,-2), with nonzero texture error. That estimate was NOT used in production. This is evidence of an unvalidated mapping, not proof that a mask could never be recovered.

An isolated original badge layer, template without its badge, or independently verified aligned alpha mask is needed to proceed safely. No common/uncommon width or line-advance changes were applied independently of the unavailable contour.

## Recovery point and changes

The permanent pre-change Phase 2.6 regression sources and original SHA-256 manifest are under `tools/test-fixtures/hero-production-baseline/` (seven files, copied byte-for-byte). The original `render.js` SHA-256 is `85A976610827B8DDFDBB27DE8B153AEE469E3DFABF9CAF1A5A7BF5D092AFE2F6`. Regression tooling verifies the snapshot against the manifest before running. Local historical audit records, including `hero-only.diff` and `current-hashes.json`, remain under `tmp/modern-hero-production-baseline/`; neither permanent runner requires that temporary directory. Fixture-specific Git attributes preserve exact historical line-ending bytes on checkout.

Only **render.js** changes production. Relative to the preserved Phase 2.6 version, it has 87 insertions / 10 deletions. Before the documentation acceptance update, the tracked working-tree diff, including existing Phase 2.6 changes, had 144 insertions / 14 deletions across `render.js` and the previously modified `tools/phase25-browser-probes.js`. Subsequent handoff/report changes are documentation only.

The interrupted turn had saved the baseline, added the rare-Hero contour/layout path and started investigating embedded assets. It had not completed regression validation. On resumption, that implementation was retained, the common/uncommon investigation was stopped at the validation limitation, and one confirmed glyph-overhang issue was repaired within the Hero contour path.

## Production behavior

- Rules remain top-anchored at **108/526**, with nominal width **330** (upper right edge 438).
- Ordinary minimum advance is **round(effectiveFontSize × 27/22)**: 27 at 22, 26 at 21, 24 at 19.5, 20 at 16. Existing icon clearance can increase that advance.
- Inline Attack/Recruit scale stays **1.72**. Phase 2.6 alignment and the `max(1, fontSize × .08)` clearance rule remain intact. Consecutive stat icons at size 22 still require at least 39.76 units between origins.
- A transparent canvas composites the real rare cost badge at its existing position and the same cost-number/asterisk painter used by the card. An optional `costOnly` argument excludes other stat numbers without changing normal drawing calls.
- For each raster row, the contour records its leftmost pixel with alpha >64. It is rebuilt for each card render, avoiding stale costs, asterisks, assets or fonts. The same contour is reused across that render's fitting candidates.
- The complete painted text/icon band is expanded vertically by three units. Every intersecting pixel row is considered using floor/ceil at fractional Y. The right edge is three units left of the minimum silhouette X across that band.
- Changed boundaries trigger wrapping and Phase 2.6 spacing again. Per-line limits only tighten, preserving the diagnostic's conservative convergence policy. Every accepted layout converged within three contour passes in focused tests. A defensive 128-pass failure throws rather than painting an unresolved result.
- The focused tests found that a size-16 glyph could paint 0.864 units beyond the nominal safe edge despite its advance width fitting. The contour path now reserves measured glyph overhang and reflows when it enters the badge margin. Generic wrapping is unchanged. Unbreakable overflow remains reported rather than shrunk indefinitely.
- Drawing consumes the final selected positioned layout; it neither measures nor wraps again.

The new ability-only layout override leaves flavor width, avoidance zones, line advance, gap adjustment, font fitting and clipping untouched. Flavor still follows `abilityLayout.bottomY + flavorGap`. A reference check invokes the preserved original fitting/flavor function with only the new ability geometry supplied; its flavor result and origin match current production exactly. In the review fixture, flavor remains size 11 and moves from Y651 to Y648. Other inputs may naturally select different flavor sizes through the existing fitter as rules height changes; no new flavor policy was introduced.

## Validation

- Phase 1: **34** assertions passed.
- Phase 2: **162** editor/keyboard/parser assertions passed.
- Phase 2.5: **893** assertions passed within the full corpus run.
- Phase 2.6: **1,457** focused assertions passed. The full corpus includes these plus Phase 2.5 and geometry checks: **2,530** total (overlapping counts, not additive).
- Hero production: **9,569** focused assertions passed, including **576** direct layouts spanning sizes 22/21/19.5/16; upper, widest and lower badge bands; fractional Y; icons; protected clauses; costs 0/8/12 with and without asterisk; composited-alpha equivalence; original flavor behavior; repeated explicit breaks; and draw-without-measurement.
- **101** fractional-band checks cover Y579 through Y580, including the former stepped gap, against an independent intersecting-pixel-row oracle.
- Existing regression images against the saved Phase 2.6 state: **464** comparisons, **445 identical / 19 changed**. Every changed image is a rare single-color Hero; every out-of-scope image must be pixel-identical or the harness fails.
- Focused actual-production images: **32** comparisons, **6 identical / 26 changed**, including four full 3× export pairs.
- Calibration equivalence: all **13 fixed-size-22 images are pixel-identical** to 330/27/contour, with identical wraps and line origins. No unexpected fixed-size diagnostic differences.
- Normal production fitting changes the crowded and Phase 2.6 comparison fixtures to size 21, unlike the frozen-size-22 diagnostic. Their different wrapping is expected. The requested-size-21 replay is separately labeled and fits to size 20.
- No newly overflowing ability textbox in either the full regression corpus or the focused adaptive fixtures. One focused badge-approach case recovers from 3 units of overflow to zero. The accepted repeated-prose regression increases logical overflow from 3 to 14 units because of the combined 330-width/layout calibration, not the badge contour alone; see the exact audit below.
- JavaScript syntax and `git diff --check` passed. Expected Electron messages concern blocked remote keyword fetches/deprecated console events, not render failures.

Representative adaptive overflow (before → after): crowded **38.86 → 26.86**; Phase 2.6 comparison **14.36 → 7.04**; requested-size-21 replay **8.70 → 0.80**. Long prose fits at 22 instead of 21.5; badge-approach fits at 22 instead of 21. No additional shrinking allowance or clipping was introduced.

## Accepted repeated-prose regression: no special-case fix

Exact fixture: `phase1__hero-rare-2-1` / `phase1__hero-rare-2-3`. Ability HTML is `Draw a card. ` repeated twelve times, including its trailing space; flavor is `<i>A little more to say.</i>`. Rare single-color Instinct Hero, cost 4 without asterisk. Replayed before/after images at both 1x and 3x matched all four saved regression images pixel-for-pixel.

| Measurement | Preserved Phase 2.6 | Accepted rare-Hero calibration |
|---|---:|---:|
| Effective font size (requested 22) | 21 | 21 |
| Natural rules lines | 5 | 6 |
| Line origins | 526, 555, 584, 613, 642 | 526, 552, 578, 604, 630, 656 |
| Ordinary line advance | 29 | 26 |
| Rules height / logical bottom | 145 / 671 | 156 / 682 |
| Logical vertical / horizontal overflow | 3 / 0 | 14 / 0 |
| Final rules painted bottom | 657.75 | 671.75 |
| Flavor origin | 677 | 688 |

The old first line needs 334.803 units, which fits 344 but exceeds 330 by 4.803. The initial divergence therefore occurs above the badge. Subsequent wrapping around the badge leaves the final `card.` on line six. Both versions use the existing size-21 fitting floor; this multi-sentence block has no extra Phase 2.5 protection allowance.

A read-only audit enumerated legal word-boundary partitions for all 36 measured tokens at the selected font and line origins against the raw contour, without conservative retained limits. Five lines can fit at most 35 tokens; no legal five-line layout exists under these constraints. Six lines are required. Releasing the small retained limit at Y604 (372.717 versus raw contour 373) does not recover a line. This is not evidence that the iterative contour solver chose an avoidable extra line.

The eleven-unit increase follows from `6 × 26 - 5 × 29 = 11`. Actual final-line ink extends only 3.75 units below the intended Y668 rules boundary; fourteen units is the logical overflow measurement, not the amount of ink outside the region. The fixture already overflowed before this calibration. Its flavor was already below the existing clipping region and remains clipped.

**User decision: accepted as-is; no production fix required.** Do not special-case this synthetic fixture by changing width, fitting, font floor, spacing, contour behavior, protection or flavor policy. The result is a consequence of the combined calibration, not proof that the real badge contour alone caused the extra line.

## Persistent review artifacts and future review requirement

Exact regression review files (retained, not regenerated by the acceptance update):

- `tools/review-artifacts/rare-hero-overflow/Rare Hero Overflow Before and After.pdf`
- `tools/review-artifacts/rare-hero-overflow/review.html` (self-contained HTML)
- The same directory retains the four before/after PNGs and `measurements.json`, including the packing audit and production hashes.

The PDF and HTML embed their images. Required permanent review content is the PDF, self-contained HTML and `measurements.json`. The four standalone PNGs are optional for viewing and for the permanent regression suite. Keep them if using the optional exact replay tool (all four) or rebuilding the PDF/HTML (the two 3x PNGs). They have not been deleted.

For future visual/rendering work, create persistent downloadable review output whenever it helps verify a change. Prefer PDF plus self-contained HTML when practical, store it under `tools/review-artifacts/`, and provide exact paths in the final response. Temporary outputs may be used internally but must not be the only review copy.

The following older temporary outputs are supplementary validation records, not the persistent review deliverables:

Focused production results: `C:/Users/richa/AppData/Local/Temp/legedit-hero-production-8i2CJM/` (`review.html`, `results.json`, before/after PNGs and 3× exports).

Final complete image-regression results: `C:/Users/richa/AppData/Local/Temp/legedit-hero-production-regression-6klEOf/` (`review.html` and `results.json`).

Preservation verification also confirms the original Phase 2.6 spacing function body is unchanged apart from its function name, and the other five captured production sources remain byte-identical to the pre-change snapshot.

In the app, inspect rare single-color Heroes with three/five-line prose, icons near the badge, short protected clauses followed by prose, two-digit/starred costs, and crowded rules with flavor. Inspect both preview and export. Common/uncommon and multicolor cards should look unchanged. Review existing overflow rather than assuming every crowded card now fits.

Permanent runners: `hero-production-regression.cjs` and `hero-production-probe.cjs`, with `hero-production-browser-probes.js` supplying focused assertions. Both default invocations now use repository-contained inputs. The focused runner reads `tools/test-fixtures/hero-calibration-330-27/`: 14 exact selected original measurement records and the 13 original size-22 reference PNGs, with provenance hashes. No expected result was fabricated or regenerated. Its optional directory argument is retained. See `tools/test-fixtures/README.md` for fresh-checkout commands and platform notes. All changes remain uncommitted.

From the project root on Windows:

```powershell
npm.cmd ci
.\node_modules\electron\dist\electron.exe tools\hero-production-regression.cjs
.\node_modules\electron\dist\electron.exe tools\hero-production-probe.cjs
```

The optional exact-overflow replay also uses the stable baseline and the existing repository PNGs instead of a session-specific Temp directory. Historical probes outside these named runners may still have session-specific assumptions; they are not required for the accepted permanent suite.

Repository-input cleanup was validated with both default invocations: the full runner passed 2,530 assertions (445 identical / 19 expected changed images against Phase 2.6), and the focused runner passed 9,569 assertions with all 13 calibration images matching. Compared with the previously accepted runs, all 38 saved full-corpus comparison PNGs and all 64 focused PNGs are byte-identical; full regression diagnostics/checks are unchanged. All six production hashes still match the accepted state. Syntax, fixture-provenance hashes, Git fixture attributes and `git diff --check` passed. Outputs for this verification are `legedit-hero-production-regression-23IFnX` and `legedit-hero-production-d7afx0` in the local temporary directory; they add no new visual result requiring review.

## Acceptance-update verification and change separation

The acceptance update changes this report and `HANDOFF.md` only. Production SHA-256 values match those recorded in the persistent regression review. The accepted `render.js` hash is `43AE29D439C02779569EE08112E86A7EDBE44139EF2955E54C6C0250BC1603A0`. Persistent regression artifacts were checked for presence and preserved byte-for-byte. Syntax checks, the Phase 2.6 preservation check and `git diff --check` passed; the full image matrix was not rerun because no implementation or test behavior changed.

- **Rare single-color Hero:** accepted origin/width, font-relative progression and full-painted-band badge avoidance; no further production changes.
- **Prior Phase 2.6:** original icon alignment and bounds-aware spacing remain intact, with stat scale 1.72. Its existing test edit remains separate from this documentation update.
- **Documentation/tests/tooling:** acceptance and audit are recorded here; handoff records scope and persistent-artifact requirements. Existing probes, reports, builders and downloadable files are preserved.
- **Deferred common/uncommon:** no behavior changes or approximate masks. Revisit only when a reliably aligned source mask/layer or another independently validated contour source becomes available.
