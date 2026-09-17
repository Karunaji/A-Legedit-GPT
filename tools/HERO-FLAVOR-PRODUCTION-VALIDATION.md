# Rare single-color Hero flavor production (uncommitted)

Recovery point: `35a9302`. Only `render.js` changes production. Do not rewrite the recovery commit or commit this work without user review.

## Scope and algorithms

The modern Core Set Second Edition study is the reference basis: six flavor cards had painted bottoms around 642-650 (spread 8, median 648), versus rules-to-flavor gaps around 30-64 (spread 34). Rare Hulk Smash / God of Thunder ended around 646 / 650. This supports a preferred lower band, not proof of an exact publisher algorithm. The original measurements and horizontal study remain under `tools/review-artifacts/hero-flavor-calibration/`. Common/uncommon embedded badge contours remain explicitly deferred until an independently validated source is available.

The selector is exactly single-color (`st.layout === 'single'`) rare Hero. All five classes receive the same policy. Common/uncommon Heroes, multicolor Heroes, split cards, and all non-Hero families retain their prior paths. Rules geometry, fonts, inline icon scale/alignment, badge placement, persistence, and Phase 2/2.5/2.6 behavior are unchanged.

The existing fitting pass is deliberately preserved byte-for-byte in its decision-making portion. It still measures legacy flavor placement/width, compresses the old gap, shrinks flavor under the original floor behavior, and can shrink rules under the existing limits. Phase 2.5 selection also remains unchanged. **Only after that pass** does final rare-Hero flavor placement use the selected rules object and selected flavor size. The new layout never feeds back into rules/font selection. This retains rather than removes or expands the existing coupling; it can retain a small font that a future integrated fitter might no longer require.

`layoutHeroFlavor()` measures flavor against the actual composited cost badge/number/asterisk contour. Nominal width is still 360 at x108; flavor retains its original line advance. Every line's full painted band is expanded by three units and intersected with fractional pixel rows using the unchanged rules contour solver. Retained limits and glyph-overhang handling remain conservative. Final positioned runs are drawn directly, without a second wrapping decision.

The vertical pass starts from the configured text origin, measures the painted bottom, and adjusts origin by `648 - paintedBottom`, reflowing each time. Once the target is selected, flavor moves downward only enough to preserve six painted units below the final rules ink. This is remeasured until the gap is satisfied. No new shrinking or clipping rule is introduced. Existing flavor clipping still ends at actual Y666 (configured limit 668 and the pre-existing rectangle offset).

Finite cycle detection is necessary because changing line count can make the target iteration oscillate. It keeps the closest already-measured contour-valid trial and reports `targetConverged: false`; it does not claim the target was reached or prove that no other legal layout exists. Six-unit gap enforcement still applies. Two extra-long direct probes exercise this limitation: font 9 / 30 repeated phrases ends at 637; font 18 / 12 phrases ends at 691.5 after the gap constraint. Neither is used to tune the normal fixtures. All 42 normal flavor/cost/asterisk combinations reach a fixed target solution before any required gap fallback.

Diagnostics retain old selection measurements in `flavorFitting`; `flavorPlacement` records target convergence, iterations, target reached, gap fallback, actual clip edge, painted extent beyond that edge, and fully-clipped state. Final `overflow` and flavor layout bounds describe the actual new positions, not the discarded legacy placement. Crowded flavor can remain fully clipped; no rescue policy exists.

## Validation

- Phase 1: **34** checks.
- Phase 2: **162** keyboard/parser checks.
- Phase 2.5: **893** checks (`--checks` mode added to avoid obsolete historical-image assumptions after later accepted milestones).
- Phase 2.6: **1,457** checks.
- Existing rare-Hero production regression against preserved Phase 2.6: **2,530** checks, **464 images: 445 identical / 19 changed**, all expected existing rare-Hero changes; no newly overflowing rules.
- Existing focused Hero production probe: **9,571** checks, **576 direct layouts**. Its fitting oracle now checks unchanged selected rules, flavor size, and pre-placement fitting origin. Of 13 prior fixed-font calibration images, 12 remain identical; the flavor image intentionally changes.
- New permanent focused flavor checks: **612** assertions, costs **0/8/12**, each with/without asterisk, eight fixtures, all five class colors, no-flavor controls, and **59 direct layouts** (42 fractional badge-band probes + 16 font/content-length probes + one mixed bold/italic/underline explicit-break case).
- New image comparison directly against `35a9302`: **464/464 corpus images identical** and all corresponding rules diagnostics identical. This corpus is separate from the older Phase 2.6 comparison above.
- Focused full cards: **58 comparisons: 17 identical / 41 changed**. **48/48 isolated rules images pixel-identical**; all 58 selected rules records identical. All selected flavor sizes and old fitting origins/overflow remain identical.
- No new overflowing or clipped focused case. **Six recovered clipping cases**, all long-fixture cost/asterisk variants. Crowded flavor remains fully clipped.
- At size 11.64, Y682.17/Y682.19 have the same contour boundary; no old 266-to-360 step remains. Every checked flavor band satisfies the independent three-unit clearance oracle.
- JavaScript/Python syntax, `git diff --check`, and visual artifact checks are recorded alongside the persistent review. Check counts overlap and must not be added as independent coverage totals.

## Representative cost 8, no asterisk

| Fixture | Flavor origin before -> after | Painted bottom before -> after | Vertical overflow before -> after |
|---|---|---|---|
| Short | 621 -> 616.77 | 652.23 -> 648 | 0 -> 0 |
| Medium | 630 -> 616.77 | 661.23 -> 648 | 0 -> 0 |
| Long | 644 -> 630.02 | 670.73 -> 656.75 | 6 -> 0 |
| One-line flavor | 648 -> 634.77 | 661.23 -> 648 | 0 -> 0 |
| Three-line flavor | 612 -> 601.77 | 658.23 -> 648 | 0 -> 0 |
| Crowded | 688 -> 682.02 | 699.73 -> 693.75 | 35 -> 29.02 |
| Thor-like | 630 -> 616.77 | 661.23 -> 648 | 0 -> 0 |

Long flavor keeps font 11.64 and ends below 648 to preserve the six-unit gap; it is no longer clipped. The crowded rules are already overflowing, so moving flavor cannot make it visible. Normal selected flavor remains 13.64 for the requested 18/22 fixture inputs; those values are test results, not hardcoded production typography.

## Reproduce and review

Run `node_modules/electron/dist/electron.exe tools/hero-flavor-production.cjs`. It reads before sources directly from Git commit `35a9302` and permanent inputs from `tools/test-fixtures/rare-hero-flavor/fixtures.json`; it has no dependency on the untracked calibration folders or a Temp baseline. Windows Chromium child processes may require execution outside a restricted tool sandbox. Network keyword requests are intentionally blocked by the isolated harness.

Review output lives in `tools/review-artifacts/rare-hero-flavor-production/`: `review.pdf`, self-contained `review.html`, and `measurements.json`, with before/after PNGs. `tools/build-hero-flavor-review.py` builds PDF/HTML from those saved results using Pillow and ReportLab. Previous vertical/horizontal study artifacts and the accepted rare-Hero overflow review remain untouched.

The source measurements, scope tests and review cover the accepted rare flavor model; they do not authorize common/uncommon contour work or further fitting redesign.
