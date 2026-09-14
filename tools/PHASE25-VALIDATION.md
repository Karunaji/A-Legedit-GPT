# Phase 2.5 protected ability blocks

Recovery point: `ea2bb5c` (Phase 2), with a clean working tree before implementation.
No commits were amended, reset, or created.

## Production changes

Only `render.js` changes production behavior:

- `classifyAbilityBlock` and `getAbilityBlocks` classify parsed runs without changing HTML, editor state, or persistence.
- `layoutRuns` records each block's eligibility, reason, measured width, available width, protection, and fallback. Eligible blocks that fit are painted from positions on one line. Others retain normal word/icon wrapping.
- `drawAdaptiveTextBlock` first performs the existing vertical fitting. It then tests smaller complete layouts in 0.5-unit increments, down to max(family absolute minimum, requested size minus 3), never enlarging an explicitly smaller size.
- The family absolute minima are Hero 16, Villain/Mastermind/Location/Henchman/Trap and Scheme 14, split halves 13 (generic helper 12). These are separate from the unchanged normal vertical-fitting limits.
- Selection maximizes the number of successfully protected blocks; ties keep the largest font. A candidate must not increase logical vertical overflow, painted ability/flavor vertical overflow, or horizontal overflow compared with the normal fitted result (0.001-unit numerical tolerance).
- A long block that cannot fit cannot justify additional shrinking by itself. Existing vertical fitting can still reduce its size, as before.
- The final selected layout is drawn directly. Geometry, icon placement rules, explicit-break spacing, and flavor fitting policy are unchanged. A smaller ability font naturally changes line heights, icon dimensions, later line positions and sampled existing boundary steps.

Classification treats a nonempty unpunctuated phrase as one sentence, joins formatting fragments without introducing whitespace, and uses neutral icon placeholders. Period/question/exclamation clusters end sentences; an unfinished tail counts too. Colons do not. Decimals, dotted acronyms and the What If...? / What If…? keyword are recognized. Common abbreviations, generic ellipses, and an acronym followed by an uncertain capitalized continuation fall back to ordinary prose. S.H.I.E.L.D. Clearance/Level are recognized continuations. Closing quotes/parentheses following terminal punctuation are allowed. This is intentionally conservative, not a complete natural-language parser.

## Reproduction

Run from the project root using the installed Electron executable:

```powershell
.\node_modules\electron\dist\electron.exe tools\phase1-probe.cjs --checks
.\node_modules\electron\dist\electron.exe tools\phase2-probe.cjs --checks
.\node_modules\electron\dist\electron.exe tools\phase25-probe.cjs
```

On this host Electron's renderer could not start inside the filesystem sandbox; the isolated probes ran successfully outside it. They use hidden windows, temporary storage and offline assets, and do not open user projects. Expected blocked external keyword-page requests and Electron deprecation warnings are not renderer failures.

The new harness reuses the actual Phase 1 and Phase 2 render fixtures, instrumenting their image capture only in the isolated evaluation. It compares committed Phase 2 scripts against current scripts with the same assets and fonts. Existing probe files are unchanged.

## Results

- JavaScript syntax checks: passed for production and both new probe files.
- `git diff --check`: passed.
- Phase 1: 34 assertions passed (including manual colon bolding, suppression, save/load, icons, word/style boundaries, diagnostics, and painting without remeasurement).
- Phase 2: 162 assertions passed (Enter/Shift+Enter, selections, full blank lines, styles, keywords, icons, deletion, undo/redo, paste-shaped native insertion, composition guard, delayed caret preservation, and HTML round trips).
- Phase 2.5: 893 assertions passed: 29 focused classification/layout checks plus 864 per-render diagnostic-presence and no-enlargement checks.
- 408 pixel comparisons: 382 identical, 26 intentional fitting changes.
- Original regression fixtures: 217/221 identical. Four changed images are the Location and Henchman explicit-clause fixture, each at scales 1 and 3. Their single-sentence blocks now fit at a smaller permitted size.
- New fixtures: 165/187 identical; 22 intentional differences. All ordinary multi-sentence prose and very-long-sentence images remained identical.
- Coverage: Hero common/uncommon/rare, multicolor variants, split common/rare, Villain, Adversary, Mastermind, Tactic, Scheme A/B, Location, Henchman, Trap.

Current comparison artifacts (temporary directory):
`C:\Users\richa\AppData\Local\Temp\legedit-phase25-DsZ1Dr`

`results.json` contains all assertion labels, changed/unchanged image names, selected sizes, widths and overflow diagnostics. `review.html` shows new changed fixtures side by side. Before/after PNGs are also saved for the four changed older fixtures. Unchanged new fixtures are saved too.

### Concrete examples

- Hero, after an explicit empty line: `[Avengers]: You get +2 [Attack] and +1 [Recruit]` selects 19.5 from 22. Its width is 264.379 within the existing 266-unit cost-avoidance width; the trailing recruit icon stays on the line. Before/after PNGs visually inspected.
- Mastermind: `Always Leads: Draw another card from your deck.` followed by an icon clause selects 19.5 from 22. Both blocks fit; the header measures 381.478 within 386. Result visually inspected. The recorded 1-unit horizontal bearing overflow is pre-existing and not increased.
- Mastermind, after an explicit empty line: the combined attack/recruit icon phrase fits at 22, measuring 295.582 against the actual narrowed 326-unit width. No reduction is needed.
- Henchman, after an empty line: the combined icon phrase selects 19. Its layout samples the existing wider step at the smaller line height; no boundary or line progression is changed.
- Split Hero: the requested `[Avengers]: You get +2 [Attack]` fits at 15 in both halves, unchanged.
- A very long single sentence falls back to wrapping. In Scheme A it remains at the same vertically fitted 21 as Phase 2; it does not shrink further for protection.
- A focused constrained-width test verifies both endpoint icons and combined bold/italic/underline remain on one line, uses the expanded allowance below 21, and confirms the next larger candidate fails.
- The old Location multi-block result was visually inspected: full blank-line intent is retained and later short clauses remain together inside existing boundaries.

## Manual review and remaining limitations

Review realistic cards with art, especially a mixed textbox containing protected clauses and prose, and both split halves. Uniform textbox shrinking can rewrap neighboring prose and move flavor text even though its wrapping policy is unchanged. Review readability at actual export/print scale and near attack/cost graphics. Very long phrases should keep normal wrapping; two-sentence blocks should not independently request shrinking. Check manual formatting, icons, repeated Enter, undo/redo and project reload in the normal app.

Natural-language ambiguity remains: unusual abbreviations, quoted punctuation or malformed legacy text may be conservatively left as prose. Existing geometry can already report small glyph-bearing overflow; this phase does not hide or clip it. Physical IME input and real external clipboard sources retain the Phase 2 manual-validation limitations.

All Phase 2.5 changes are intentionally uncommitted for review.
