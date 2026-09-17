# Inline Attack/Recruit ability scale 1.60 (uncommitted)

Recovery checkpoint: a8232b2. The user accepted the visual 1.60 result and its protected-fitting threshold interaction. Do not stage or commit without review.

## Production change and scope

`hero-template-config.js` adds `textboxIcons.abilityStatScale: 1.60`. In `render.js`, `getInlineIconMetrics` accepts an ability flag; `getInlineIconPlacement` supplies it only when the existing ability font reference is present. The existing Attack/Recruit detection includes `a` and `r` aliases. Size remains rounded from font size, with no per-size lookup table.

`statScale` remains 1.72 for non-ability consumers and `getRunLineHeight`. Class scale remains 1.28. No centering, clearance, fitting, newline, geometry, contour, flavor, or large stat/cost drawing code changes. Other families already using the shared ability path inherit the smaller inline stat icons.

## Regression strategy

Historical Hero tests contain exact 1.72-origin/image assertions from earlier milestones. Their runners now explicitly set an isolated 1.72 ability basis, retaining those exact oracles. The three historical runners report that basis; they do not validate current icon scale. `LEGEDIT_REVIEW_OUTPUT` lets the historical flavor runner write a separate output directory without overwriting the accepted review.

The permanent `inline-stat-production.cjs` runner separately executes the existing Phase 2.6 corpus, focused Hero and flavor browser checks at **actual unmodified production 1.60**. It compares actual positioned layouts and pixels with a8232b2 plus the accepted diagnostic override. That oracle also handles `/a` and `/r`: the original nine-fixture diagnostic used only canonical image tokens; the cross-family corpus exposed the alias coverage gap. Production already treats these aliases correctly.

`phase26-browser-probes.js` now compares ability icon dimensions against placement with the ability reference, rather than the deliberately different non-ability sizing basis. Its centering/clearance assertions remain intact.

## Expected outcomes

At font22 stat icons are35 units (was38); at18 they are29 (was31); at21 they are34 (was36). Adjacent stat lines at22 retain1.76 clearance. Ordinary minimum line advances retain their production basis.

The mixed Recruit/Attack prose moves `a` to the first line. `HERO power: You get +2 [ATTACK] and +1 [RECRUIT].` becomes one protected line at font19: measured width328.4589 within330. This accepted transition is not special-cased. Dense prose remains five lines/font21 and recovers its2.72 logical rules overflow. Flavor remains fully clipped there.

## Reproduce

Run `node_modules/electron/dist/electron.exe tools/inline-stat-production.cjs`. Inputs are permanent repository fixtures plus Git a8232b2. The accepted untracked diagnostic folder is not a runtime dependency. Build the production PDF/HTML with `tools/build-inline-stat-review.py` (Pillow/ReportLab).

Persistent outputs: `tools/review-artifacts/inline-stat-icon-production/review.pdf`, `review.html`, `measurements.json`, and validation logs. Older diagnostic and accepted review files remain untouched. The compact production review contains seven informative before/after fixtures; all nine are measured.

## Completed validation

- Phase 1: 34 checks, actual production.
- Phase 2: 162 checks, actual production.
- Phase 2.5: 893 checks, actual production.
- Phase 2.6: 1,457 checks, actual production.
- Combined permanent cross-family corpus: 2,530 checks at actual 1.60. 464 baseline images: 152 identical / 312 changed. Every production image and positioned diagnostic matches the alias-aware isolated 1.60 oracle.
- Hero flavor: 612 assertions at actual 1.60.
- Focused Hero: 9,571 assertions / 576 direct layouts at actual 1.60.
- Historical 1.72-basis rare-Hero regression, focused Hero probe and flavor comparisons also pass (2,530 / 9,571 / 612 respectively). These are separate historical geometry guards, not current-scale image comparisons.
- Nine focused production images all change from a8232b2, and all nine are pixel-identical to the saved accepted 1.60 PNGs. Together with the corpus, 473 image comparisons match the isolated diagnostic oracle.
- No newly overflowing or worsened vertical-overflow cases in recorded corpus diagnostics (14 entries improve). No new focused clipping or collisions. The dense rules recover 2.72 overflow exactly; dense flavor remains fully clipped.
- Only mixed prose and the accepted uppercase/lowercase fixture change wrapping among the nine. Only the latter changes font: 22 -> 19, two lines -> one, fallback -> protected.
- Existing Phase 2.6 spacing fixtures show five changed stat-bearing renders each for Hero, Villain, Mastermind, Location, Henchman, Trap, Scheme and split. Text-only/class-only controls remain unchanged. No new family-specific boundary code was added.
- Upper-card, large-left-stat and cost-badge-interior pixel regions remain identical for all nine focused cards. Class sizing at 22/21/18 and stat aliases were checked separately. No other icon family or large graphic path changes.
- Eight PDF pages rendered and visually inspected. HTML opens with 28 embedded images, zero broken images, and no horizontal page overflow. Syntax and `git diff --check` pass. Suite counts overlap and must not be summed as independent coverage.

All work remains uncommitted. New permanent sources: `inline-stat-production.cjs`, `inline-stat-browser-probes.js`, `build-inline-stat-review.py`, and `test-fixtures/inline-stat-icons/fixtures.json`. New review output is confined to `review-artifacts/inline-stat-icon-production/`; pre-existing untracked diagnostics remain untouched.
