# Common/Uncommon single-color Hero wrapping calibration

> Milestone update, 14 November 2026: accepted together with soft-wrap alignment and inline scales 1.40/1.10. Earlier status/results below describe their original stage. Use `tools/accepted-rendering-production.cjs` for current production; `tools/common-uncommon-production.cjs --historical` isolates the original calibration. See `tools/ACCEPTED-RENDERING-VALIDATION.md`.

Uncommitted milestone, 12 November 2026. Baseline: `d60d70a` (Scheme A checkpoint).

## Evidence and decision

Compared 18 Core Set Second Edition ability-text examples: 14 downloaded scans plus four exact-text examples reused from the earlier study. Six newly added cards cover mixed Recruit/Attack symbols, multiple class symbols, team symbols, KO, long prose, and an explicit second ability clause. Added seven synthetic cases for each rarity: protected clause plus prose, successive icon lines, blank lines, formatting within words, crowded prose, an unbroken string, and keyword headers. No older expansion was needed.

Source gallery: https://www.legendarycardgame.com/core-set-at-a-glace-2ndedition (fan site hosting official card scans). Scans and source URLs/hashes remain in the two official-review directories. Measurements are normalized to504x700; approximate scan edges have2-3 units of uncertainty. Printed font sizes cannot be inferred exactly from these scans.

The earlier330-width/default22 candidate was not adopted. Smaller requested fonts can reproduce more official wraps but also trigger existing protected-block fitting on short sentences; a blanket reduction is not justified. The accepted Rare calibration and all non-target families remain unchanged.

## Production change

Only standard single-color Common/Uncommon Heroes opt in:

- Keep x108/y526, the existing344-unit upper rules width, flavor width360, requested font controls, fonts, icon sizes, badge graphics/numbers, and existing font floors.
- Ordinary line advance is26 at size22 (ratio26/22), down from31. Bounds-aware icon spacing still increases advance when needed. Repeated explicit breaks remain full lines.
- Use full-painted-band badge avoidance for rules and flavor instead of the old midpoint-sampled step. The badge witness expands the existing Rare badge by1.06 about its current center and shifts its contour2 units left. The actual untransformed number/asterisk silhouette is unioned afterward; clearance remains3. Rebuild per render, including cost/star edits.
- Use the evidence-supported preferred flavor painted bottom648, with at least6 painted units below rules and existing clipping/fitting. This is a preferred target, not a guarantee for crowded content.
- A scoped short-last-line refinement applies only to one explicit block with at least3 lines and a final line occupying less than30% of its available width. Try0.5-unit decrements within the existing normal font allowance, retain the first trial that removes a line without increasing any measured overflow, and never collapse the paragraph to one line. Multi-block text and short protected clauses bypass this refinement. Subsequent Phase2.5 protection is unchanged.

The practical badge envelope is supported by the prior all-ten-frame solid-rim and white-panel-shadow measurements. It is not an exact recovered alpha matte over every textured background or faint shadow tail. No template, badge placement, icon scale, document schema, editor behavior, or saved content was changed.

## Why spacing alone was rejected

The independent contour witness exposed text intrusions in existing stepped layouts. Tightening spacing alone moved some long lines farther into the badge band (notably Captain America and Nick Fury). A matching official line count can therefore hide a collision. Full-band avoidance is necessary before accepting a spacing change. The saved diagnostic comparison includes the rejected spacing-only trials.

## Results

-78 focused production fixtures pass:32 saved candidate comparisons,40 color/cost/asterisk variations, and6 additional font-size cases.
-All32 candidate images and positioned-layout measurements match production exactly.
-90 excluded-family images are pixel-identical to `d60d70a`;12 Common/Uncommon corpus images intentionally change. Upper-card crops are unchanged on those12.
-34 existing Phase1 checks and1,457 Phase2.6 icon/layout checks pass.
-All focused cases retain icon clearance, the modeled badge clearance, flavor gap, and font-floor constraints. No missing icons.
-Among the32 comparison fixtures, five already had vertical rules overflow; there are no newly overflowing cases. Nick Fury falls from61 to33 logical units; four crowded/blank-line synthetic cases fall from32 to8. Their already-clipped flavor remains honestly clipped, reduced from51.734 to37.75 units beyond the clip.
-Official rules line counts match16/18 at request22, the same count as control, but without the measured badge intrusions. This count is not a quality score and does not imply pixel matching.
-Psychic Link still takes3 lines at22 versus official2. Battlefield Promotion takes7 versus official6 and still overflows. Separate explicit user-size20 examples give2 and6 lines respectively, with no overflow (Nick Fury fits to19.5). Defaults/floors were not changed to force these examples.
-Vibranium Shield uses21 instead of the previous21.5; Spark of the Divine uses21 instead of22; Covert Operation uses21.5 instead of22. Several synthetic icon cases now retain22 instead of shrinking to21.

## Reproduce

Install the repository's Electron dependency, then run from the project root:

```powershell
node_modules/.bin/electron.cmd tools/common-uncommon-production.cjs
```

The runner needs checkpoint `d60d70a` in Git history. It reads immutable candidate fixtures from `tools/test-fixtures/common-uncommon/`, uses isolated browser storage, and defaults to a new temporary output directory. Set `LEGEDIT_REVIEW_OUTPUT` to a chosen review directory to retain outputs. Pixel snapshots use the bundled fonts and Electron; font/platform rendering differences can require investigation rather than blindly regenerating snapshots.

The permanent runner compares all17 family routes directly against this milestone's immediate baseline. Earlier milestone image oracles intentionally describe older Common/Uncommon pixels and are not substitutes for this runner. Their code and saved fixtures were preserved.

## Persistent review

`tools/review-artifacts/common-uncommon-wrap-calibration/review.pdf`

`tools/review-artifacts/common-uncommon-wrap-calibration/review.html` (self-contained)

`tools/review-artifacts/common-uncommon-wrap-calibration/measurements.json`

The review directory also retains before/candidate images, raw experiments, source scans, validation results, and the final preservation/Git check. No files staged or committed.
