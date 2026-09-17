# Rare multicolor Hero production transfer

Baseline: `8f3e0fa` (Reduce inline Attack and Recruit icon scale). This milestone remains unstaged and uncommitted for review.

## Production scope

Only `render.js` changes production. `drawText` now selects the existing calibrated rare path for `isRare && (st.layout === 'single' || st.layout === 'multicolor')`. Split Heroes are dispatched to their separate renderer before this path; the selector also explicitly excludes split. All existing ability/flavor options and constants are reused. No additional contour, flavor, fitting, icon, persistence or typography logic is introduced.

Rare multicolor now uses origin108/526, rules width330, ordinary advance round(font*27/22), actual badge/number/star contour, full painted-band3-unit clearance, and final flavor target648/minimum painted gap6. Fitting and Phase2/2.5/2.6 behavior remain unchanged. Attack/Recruit ability scale1.60, ordinary basis1.72 and class scale1.28 are unchanged.

Common/uncommon multicolor and single-color baked-badge geometry remains deferred until a reliable source mask is independently validated. Split Heroes remain separate at all rarities.

## Accepted evidence and caveats

The engineering study and official-reference sign-off remain under `tools/review-artifacts/rare-multicolor-hero-calibration/`. Direct references: Beast / Multi-Variate Smackulus (Secret Wars2), Black Panther / King of Wakanda (Secret Wars1), King Black Panther / Unite the Tribes of Wakanda (Black Panther2022). The direct sign-off found no repeatable multicolor-specific structural requirement.

Dense2022 text at requested22 still fits only to21, seven lines, logical overflow56.90 and painted bottom714.65. Requested16 fits six lines, painted bottom651.40. This reflects smaller printed typography, not a routing exception. No title/content detection or card-specific font floor is introduced.

## Permanent reproduction

Run `node_modules/electron/dist/electron.exe tools/rare-multicolor-production.cjs` from the project root. It reads BEFORE sources directly from Git8f3e0fa, AFTER from working production and accepted expected Candidate B records/PNGs from `tools/test-fixtures/rare-multicolor/`. The hash manifest guards those saved inputs. No AppData baseline or untracked calibration folder is required.

Build persistent PDF/HTML with `tools/build-rare-multicolor-review.py` (Pillow/ReportLab). Output: `tools/review-artifacts/rare-multicolor-hero-production/`. PDF and HTML embed their images. measurements.json and REPORT.md retain fixture inputs, wraps, per-line origins/widths/bounds, selected fonts, protection, overflow, flavor and clearance data.

## Production parity and exclusion results

- Six of six production images match saved Candidate B exactly; six of six complete JSON-normalized measurement records match. The test normalizes undefined properties the same way as the saved JSON; no numerical tolerance or expected-value rewrite hides differences.
- Six baseline/production image pairs: five changed, short/no-flavor identical. All font decisions match Candidate B.
- Sixteen excluded-route image and complete diagnostic pairs are identical: single common/uncommon/rare, multicolor common/uncommon, split common/uncommon/rare, each with left stats OFF/ON.
- Six rare-multicolor left-stat toggles leave measured layout identical. Strength/Tech, Covert/Range and Strength/Range, costs4/8/12 and optional star are covered. Full Candidate B pixel identity includes unchanged badge/class/stat composition.
- 64 focused browser assertions cover full painted-band clearance, contour convergence and stat-toggle stability; saved-oracle/excluded-route assertions are additional.
- Medium stays three lines with tighter origins. Crowded stays font21/six lines: logical overflow32 ->14, flavor remains wholly clipped. Short flavor reaches648. Long flavor recovers8.73 units of clipping with6-unit painted-gap fallback. Icons stay font22 but change2 ->3 lines.
- Minimum intersecting candidate badge clearance12.18 units (required3). No new overflow/clipping in these six fixtures. Existing icon-fixture1-unit left glyph overhang remains. Null clearance means no overlap with the badge's vertical band.

## Historical test maintenance

Historical Hero geometry/flavor/icon runners compare earlier milestones and correctly asserted that rare multicolor was then unchanged. `historical-rare-multicolor-basis.cjs` explicitly retains that route's old options inside those historical harnesses only; their previous numerical/pixel assertions are not relaxed. They log the basis. Their original historical1.72 icon basis is unchanged where applicable.

Actual new production is tested by `rare-multicolor-production.cjs`, including both stats states and all excluded Hero routes. Phase1/2/2.5/2.6 focused checks run unmodified production. The inline-icon runner now honors `LEGEDIT_REVIEW_OUTPUT`, like the flavor runner, so accepted earlier artifacts are not overwritten. Historical corpus totals overlap and should not be added as independent coverage.

## Validation results

- Phase1:34 checks passed.
- Phase2:162 keyboard/parser checks passed.
- Phase2.5:893 checks passed.
- Phase2.6:1,457 checks passed.
- Existing historical Hero production regression:2,530 checks;464 images,445 identical and19 expected historical changes; no newly overflowing case.
- Existing historical Hero flavor validation:612 focused assertions plus2,530 corpus checks; passed.
- Inline-stat production validation:2,530 corpus checks,612 flavor checks,9,571 focused Hero assertions/576 direct layouts;473 diagnostic image matches. Passed. This historical icon oracle explicitly retains legacy rare-multicolor routing.
- Focused production parity:6 saved images +6 complete records;16 excluded images +16 complete records; all passed.

All outputs/logs for this milestone are isolated under the new production-review folder. Earlier untracked diagnostics and accepted reviews are retained. Final Git status, diff stat, artifact QA and syntax results are recorded alongside the review.
