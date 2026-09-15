# Phase 2.6: inline ability icon alignment and clearance

Recovery point: `9bffb0b` (committed Phase 2.5). The working tree was clean before this phase. No commits were amended, reset or created. Changes are intentionally uncommitted.

## Production scope

Only `render.js` changes production behavior. Icon scale, aspect ratio, cropping, horizontal gaps, all geometry/configuration, parser/editor/persistence code, and the Phase 2.5 classifier/fitting rules are unchanged.

Ability layouts containing icons measure `H` in the regular ability font at the effective size, with the caller's existing top text baseline. Let `top = -actualBoundingBoxAscent`, `bottom = actualBoundingBoxDescent`. Each icon's offset is `(top + bottom - iconHeight) / 2`. This uses the same stable reference across bold/italic/underline runs. Other inline consumers retain their old alignment; the optional reference is supplied by ability layout only.

Each line now exposes `paintedBounds: {top, bottom}` and `hasIcon`. Existing line advance remains the minimum. Between neighboring painted lines, if either contains an icon, require a gap of `max(1, fontSize * 0.08)` logical units. Empty explicit lines keep their full advance and are not collapsed. Both upward intrusion by the next line and downward intrusion by the preceding line are considered.

Layout resolves required origins and reruns wrapping with those origins, including resampling the existing obstruction boundaries and reevaluating protection at the resulting widths. It does not translate a completed drawing. Each fitting candidate therefore measures the positions subsequently drawn. `drawRuns` is unchanged and never measures or wraps.

Origins advance monotonically during resolution to avoid oscillation when shifted text crosses a stepped boundary. At a wrap transition this can retain conservative extra clearance rather than chase an unstable tighter arrangement. Diagnostics expose `iconReference`, `minimumIconClearance`, `layoutPasses`, and `spacingResolved`. A defensive 128-pass limit reports unresolved spacing rather than adding clipping or shrinking; no tested layout reached it. New geometry fixtures resolved in at most two passes. Text-only layouts bypass spacing resolution entirely.

## Measured examples

Values below are at fixed effective font sizes, in logical canvas units; asset dimensions are unchanged.

| Font size | Stat height | Old stat top/bottom | New stat top/bottom | Old advance (0.82) | New adjacent-stat advance | Old/new clearance |
|---|---|---|---|---|---|---|
| 22 | 38 | -11 / 27 | -11 / 27 | 30 | 39.76 | -8 / 1.76 |
| 19.5 | 34 | -11 / 23 | -9.875 / 24.125 | 26 | 35.56 | -8 / 1.56 |
| 15 | 26 | -11 / 15 | -7.75 / 18.25 | 20 | 27.2 | -6 / 1.2 |
| 10 | 17 | -11 / 6 | -5 / 12 | 12 | 18 | -5 / 1 |

At 22 the measured capital reference is -0.5 to 16.5, so the old stat/class offsets already centered icons on that reference. At that size the main improvement is spacing, not lowering. At smaller sizes the fixed offsets were proportionally too high; the new rule corrects that.

## Validation

Commands from the project root:

```powershell
.\node_modules\electron\dist\electron.exe tools\phase1-probe.cjs --checks
.\node_modules\electron\dist\electron.exe tools\phase2-probe.cjs --checks
.\node_modules\electron\dist\electron.exe tools\phase26-probe.cjs --checks
.\node_modules\electron\dist\electron.exe tools\phase26-probe.cjs
```

The probes run in hidden Electron windows with temporary storage and offline assets, without opening user projects. This host requires execution outside the filesystem sandbox for Chromium startup. Blocked external keyword-page requests and Electron deprecation warnings are expected.

- Phase 1: all 34 existing assertions passed.
- Phase 2: all 162 existing editor/parser assertions passed.
- Phase 2.5: all 893 assertions were rerun inside the full Phase 2.6 harness and passed. One assertion now derives the first line origin directly instead of subtracting the legacy fixed icon offset; its full-empty-line contract is unchanged.
- Phase 2.6 focused run: 1,457 assertions passed, covering 13 content patterns at sizes 22, 19.5, 15, 10 and 8, plus 80 boundary/reflow stress cases and paint-without-measurement.
- Full harness: 2,530 assertions passed total, including the Phase 2.5 checks, focused checks, and geometry-specific clearance checks. Counts overlap with the focused run.
- 464 before/after image comparisons against `9bffb0b`: 369 pixel-identical, 95 changed icon-bearing fixtures. All 144 designated text-only images remained pixel-identical.
- The existing 408-image corpus plus 56 new images covers Hero/multicolor/rarity variants, Villain/Adversary, Mastermind/Tactic, Location, Henchman, Trap, Scheme A/B and Split Hero.
- JavaScript syntax and `git diff --check` passed.
- The detailed comparison-report generator was also exercised against the completed image-run data.

The first image attempt correctly stopped on a test-label mistake: Phase 2's `single` fixture includes an attack icon, despite its generic name. The text-only image rule was corrected; the final complete rerun passed. No production changes were made to accommodate the fixture.

Artifacts from the final run:
`C:\Users\richa\AppData\Local\Temp\legedit-phase26-sSgw52`

- `review.html`: side-by-side new spacing examples.
- `results.json`: all assertions, before/after diagnostics, fixed-size metrics and image classifications.
- `spacing-changes.json`: 63 textbox/half comparisons with old/new item bounds, line origins, minimum clearance, wrap changes, overflow and protection decisions.
- PNG pairs: changed images and all new spacing fixtures.

## Visible effects and crowded-card tradeoffs

The Mastermind comparison-style before/after pair, Split Hero mixed-icon result, and Location mixed-icon result were visually inspected. Consecutive icon rows are separated; small split-card icons no longer sit at the old fixed upward displacement. Icon assets retain their size.

Across the 63 new textbox results (split halves counted separately):

- 13 selected a different effective font size through the existing fitter.
- 13 increased vertical overflow, including seven previously non-overflowing cases: Location stat/mixed, Trap stat/mixed, and Scheme stat/mixed/comparison.
- Two changed word wrapping: Location comparison and Scheme comparison.
- No protected-block success/fallback flags changed, in these examples or the larger comparison corpus.

Examples:

- Hero stat lines at 22: Y origins `[526,557,588,619]` become `[526,557,596.76,627.76]`. Clearance improves from -7 to 1.76; no wrap or overflow change.
- Split mixed icons at 15: `[532,553,574,595]` becomes `[532,553,580.2,601.2]` in both halves. Clearance improves from -5 to 1.2, with no wrap/overflow change.
- Mastermind comparison stays at 21 and retains its word wrapping. Clearance improves from -8 to 1.68. It was already overflowing by 18 units; it now overflows by 31.36.
- Location comparison was already overflowing by 23 units. Final Y positions encounter a different existing boundary, adding a wrapped line and increasing overflow to 64.36. This is the largest increase (41.36). Geometry is unchanged.
- Scheme comparison selects 21 instead of 22 through normal fitting and reports 4.36 units of overflow rather than hiding it.

No extra shrinking allowance or new clipping was added to conceal these outcomes. More honest spacing consumes real vertical room; crowded existing cards need manual review.

## Manual inspection and remaining size question

Inspect your comparison card, consecutive Attack/Recruit clauses, mixed Class/stat lines, explicit blank lines, both split halves, and cards close to the lower text boundary. Check preview and exported/printed scale. Pay particular attention to Location/Henchman/Trap and Scheme overflow diagnostics. Enter and persistence remain unchanged, but a normal save/reload check is useful before committing.

Stat icons still look visually substantial after spacing is corrected: at size 22 they are 38 units tall versus a measured 17-unit capital height. A separate modest stat-only scale experiment is reasonable, compared at actual export scale against the official reference. This phase deliberately does not reduce them. The class icons do not show equally strong evidence for reduction. Correct spacing should remain even if a future scale adjustment is accepted.

All Phase 2.6 work remains uncommitted for manual review.
