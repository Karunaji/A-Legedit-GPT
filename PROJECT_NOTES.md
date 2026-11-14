# Project memory: Marvel Legendary card editor

**Accepted milestone checkpoint (14 November 2026):** Common/Uncommon calibration, soft-wrap alignment, and smaller inline icons (1.40 stat / 1.10 class/team) are accepted together. Earlier staged/uncommitted descriptions below are historical. The current permanent test is `tools/accepted-rendering-production.cjs`; see `tools/ACCEPTED-RENDERING-VALIDATION.md`. Tighter spacing and left-width experiments remain unadopted.

Read this before working on the project. Intended for Codex, Cline, local Qwen, and other assistants without chat history. Paths below are relative to the repository root. This is documentation, not permission to change accepted behavior.

**Verified from files/Git: 12 November 2026.** Refresh status when resuming; do not assume the snapshot below is still current.

**Update 14 November 2026:** An additional uncommitted soft-wrap alignment fix in `render.js` removes ordinary word separators at automatic line starts, while preserving explicit indentation/nonbreaking spaces and family geometry. The earlier Common/Uncommon milestone remains staged; this fix is unstaged and awaiting visual review. See `tools/SOFT-WRAP-ALIGNMENT-VALIDATION.md` and `tools/review-artifacts/soft-wrap-alignment/review.pdf`. The smaller-icon candidate was subsequently authorized and applied: ability Attack/Recruit scale 1.40 and class/team scale 1.10. Hero line spacing, origins and widths remain unchanged. See `tools/review-artifacts/post-alignment-calibration/PRODUCTION.md`. Left-width and tighter-spacing experiments remain diagnostic only.

## 1. Start here: status and sources of truth

- Project root: `C:/Users/richa/OneDrive/Documents/A Legedit GPT/`.
- HEAD: `d60d70a` — Calibrate Scheme A text layout.
- The user visually accepted the subsequent Common/Uncommon single-color Hero calibration as good enough. **It is staged but not committed** at this inspection. Seven staged files: `render.js`, `HANDOFF.md`, `tools/COMMON-UNCOMMON-PRODUCTION-VALIDATION.md`, `tools/common-uncommon-browser-probes.js`, `tools/common-uncommon-production.cjs`, and the two JSON files under `tools/test-fixtures/common-uncommon/`.
- Many unrelated experiments/references are untracked. Preserve both the index and working tree. Untracked does not mean disposable.
- Current code, route-specific tests, and the latest relevant validation report take precedence over older narrative notes. `HANDOFF.md` contains useful history but also superseded statements: icon scale1.72, Common/Uncommon deferral, and several “uncommitted” headings no longer describe all current routes.
- Do not reset, amend, stage, commit, push, delete, or reorganize existing work without authorization. The user requested this memory file only in the latest task.

## 2. Overview and architecture

Local Electron application for composing custom Marvel Legendary cards: editable text, class/team icons, artwork positioning, stats/cost, project/card organization, saving/loading, and PNG export. No React framework, bundler, backend, or npm test script. `package.json` declares Electron `^41.2.1`; use the lockfile for reproducibility.

Implemented project types: Hero, Villain, Henchman, Mastermind, Scheme. Hero layouts include single-color, multicolor, and Split; villain-family variants include Adversary, Location and Trap; Mastermind includes Tactics; Schemes have A/B layouts. **Bystander appears in the chooser but is explicitly unsupported by the desktop creation code.** Do not equate a UI label with a completed renderer.

Renderer scripts are classic shared-scope JavaScript, loaded in this order by `index.html`: configuration, assets, keywords, state, rendering, UI, application startup. They share globals such as `st`, `cards`, `projectType`, `projectShared`, asset caches and DOM controls. Moving them into modules is not a routine cleanup.

Electron uses context isolation and disables renderer Node integration. `electron-preload.js` exposes the `legendaryDesktop` IPC bridge; `electron-main.js` handles native dialogs, project files, export and folder operations.

## 3. Code map and working features

| Location | Responsibility |
| --- | --- |
| `index.html`, `styles.css` | Editor controls, contenteditable fields, preview, bundled font faces |
| `hero-template-config.js` | Template/typography/stat/icon configuration; not every value is the final route-specific value |
| `assets.js` | Asset registry, icon/team options and shared constants |
| `state.js` | Live cards/projects, serialization, tabs, sorting, autosave, asset loading, formatting scheduling |
| `render.js` | Card composition, template drawing, typography, HTML parsing/formatting, fitting, line layout and canvas painting |
| `ui.js` | Artwork/team uploads, drag controls, preview zoom, export naming/current/all-card export |
| `app.js` | Startup and editor event wiring, caret/Enter/composition handling, `runLagTest()` diagnostic |
| `keywords.js` | Keyword vocabulary; matching/formatting implementation also lives in `render.js` |
| `assets/`, `Legenedit/` | Local templates/icons and fonts; preserve asset crops, dimensions and font files |
| `tools/` | Electron probes, visual builders and milestone validation documentation |
| `tools/test-fixtures/` | Permanent historical sources, accepted images/measurements and hashes; never regenerate casually |
| `tools/review-artifacts/` | Persistent comparisons, reports, source scans and experiments; inspect dependencies before cleanup |

Working features include multiple project tabs, card lists/sorting, shared project fields, custom team icons, artwork drag/scale, independent Split artwork, rich text, inline icons, stat modifiers, current/all-card PNG export, recent projects and autosave. `state.js` defines a five-minute autosave interval. Desktop IPC and browser fallback paths coexist.

Projects use JSON (`*.legendary.json` by default), currently version1 in `snapshotProject()`, with project type/shared fields/cards/custom teams. Ability content remains saved HTML (`abilityHtml`), not a structured document schema. Preserve load/save compatibility and user-selected sizes.

## 4. Shared text-rendering pipeline

```text
contenteditable HTML / saved abilityHtml
  -> parseRTE(): styled text runs, icon runs, explicit breaks
  -> getAbilityBlocks() / getLayoutUnits()
  -> drawAdaptiveTextBlock(): fitting and final flavor placement
  -> layoutRuns(): positioned lines/items and diagnostics
  -> drawRuns(): paint those exact positions, without rewrapping
```

- Standard portrait canvas coordinates are504x700; export scales the composition. Split composition has its own dimensions/half transforms. CSS preview size is not layout geometry.
- Templates can contain baked graphics. Other graphics are painted separately. Source asset coordinates, visible alpha bounds and final canvas coordinates are different things. Follow `drawI()`, `drawCenteredAssetBounds()` and actual transforms before changing geometry.
- Family entry points include `renderToCanvas()`, `renderSplitToCanvas()`, `renderVillainToCanvas()`, `renderSchemeToCanvas()` and `drawText()`. Overrides in these functions can supersede nominal configuration values.
- Text uses bundled Eurostile regular/bold faces, with italic/underline support. Style boundaries within a word must not introduce a new soft-wrap opportunity.
- `getInlineIconPlacement()` uses actual icon aspect/crop bounds and aligns ability icons to the regular font's capital-height center. Ability Attack/Recruit height scale is1.40; class/team scale1.10. Legacy `statScale:1.72` still participates in other consumers/minimum-height calculations. Do not change it assuming it is the current ability icon scale.
- `layoutRunsWithIconSpacing()` reserves sufficient painted clearance for neighboring icon-bearing lines. `layoutRuns()` iteratively checks full painted bands against a contour where configured. Ordinary line advance alone is not sufficient to guarantee no collision.
- Diagnostics include requested/effective size, logical and painted bounds, horizontal/vertical overflow, missing icons and protected-block results. `onAbilityLayoutDiagnostics` is an opt-in development hook. Logical overflow and visible ink beyond a boundary are not interchangeable.

### Editing and fitting contracts

- Enter and Shift+Enter insert the same explicit break. Two Enters mean one full empty line; additional Enters add full empty lines. Native Chromium editing transactions preserve undo/redo; composition input is excluded from interception. Main/Split editors share these semantics.
- Browser block/placeholder markup is normalized by the parser. Soft wrapping is never saved. Do not rewrite unrelated legacy HTML merely on load.
- Keyword auto-formatting is delayed350ms. Manual formatting/suppression must take precedence. The standalone-colon auto-bold bug was fixed; punctuation alone is not an auto-bold semantic element.
- Phase2.5 classifies each explicit block: a single sentence may be protected on one line; multi-sentence or ambiguous abbreviation/ellipsis cases flow normally. Colon is not a sentence ending. Icons participate in measurement.
- Fitting first uses configured normal allowances; protection can use its existing additional allowance when it actually gains protection without worsening overflow. Long content must fall back to wrapping rather than shrink indefinitely. Read `drawAdaptiveTextBlock()` for route-specific floors and ordering.
- A proposed `abilityDoc`/document-position editor redesign has **not** been implemented. Do not describe it as current architecture.

## 5. Accepted geometry and decisions

| Route | Current behavior |
| --- | --- |
| Rare single-color and Rare multicolor Hero | Rules x108/y526, width330, ordinary advance `round(size*27/22)`; full-band avoidance from the actual separately painted cost badge/number contour, clearance3 |
| Common/Uncommon single-color Hero | x108/y526, upper rules width344, ordinary advance `round(size*26/22)`; conservative embedded-badge envelope, detailed below |
| Calibrated Hero flavor above | Nominal width360; prefer painted bottom648, at least6 painted units below rules; retain fitting/floors and clipping (actual edge666) |
| Scheme A | x22/y525, width460, logical bottom670, advance ratio1.1; actual flavor clip668 |
| Scheme B | Existing x22/y370, width432, logical bottom650, spacing scale0.82; actual flavor clip648; recalibration deferred |

Common/Uncommon's envelope expands the Rare badge witness1.06 about its center and shifts it2 units left, then unions the actual **untransformed** number/asterisk; clearance3. Earlier all-ten-frame rim/white-panel-shadow measurements support this practical envelope. It is not an exact recovered alpha matte over every textured pixel. The actual badge image is unchanged.

Only Common/Uncommon single-color enables `balanceShortLastLine`: one explicit block, at least3 lines, last line under30% of its available width. Try0.5-size steps within the existing normal allowance; retain a trial only if it removes a line without increasing measured overflow. Never collapse to one line or cross explicit breaks. Existing protection follows afterward.

Keep the tuned Hero cost avoidance, Villain/Mastermind stat avoidance, Scheme regions, Split transforms and Location/Henchman/Trap line progression. Do not reintroduce curve interpolation into tuned stepped boundaries. A change in vertical advance changes which obstruction a later line encounters; validate both together.

The Rare repeated-prose regression (logical overflow3 ->14) was reviewed and accepted: width330 causes the initial divergence, no legal five-line arrangement exists at size21, and final ink exceeds the region by about3.75 units. It was already overflowing. Do not special-case it. See `tools/HERO-PRODUCTION-VALIDATION.md` and `tools/review-artifacts/rare-hero-overflow/`.

## 6. Tests and reproducible review

From the repository root on Windows:

```powershell
npm.cmd ci
npm.cmd start
# Focused current Common/Uncommon regression:
.\node_modules\.bin\electron.cmd tools/common-uncommon-production.cjs
# Lightweight checks after relevant edits:
node --check render.js
git diff --check
```

Use `npm ci` only when dependencies need installation; do not update packages incidentally. Desktop launchers also exist: `Run Legedit Desktop.cmd` / `.vbs`.

The current Common/Uncommon runner requires `d60d70a` in local Git history. It uses isolated browser storage and repository-contained fixtures. Optional `LEGEDIT_REVIEW_OUTPUT` selects a retained output directory; otherwise output is temporary. Pixel comparisons depend on the locked Electron version, bundled assets/fonts and platform rasterization.

Recorded last implementation results (not rerun for this documentation task):78 focused fixtures,32 exact candidate image/layout matches,90 excluded-family images identical,12 intended route images changed,34 Phase1 checks and1,457 icon/layout checks passed. See `tools/COMMON-UNCOMMON-PRODUCTION-VALIDATION.md` and `tools/review-artifacts/common-uncommon-wrap-calibration/validation/results.json`.

Other test entry points: `tools/phase1-probe.cjs`, `phase2-probe.cjs`, `phase25-probe.cjs`, `hero-production-regression.cjs`, `hero-production-probe.cjs`, `hero-flavor-production.cjs`, `inline-stat-production.cjs`, `rare-multicolor-production.cjs`, `scheme-a-production.cjs`. Read their corresponding `*-VALIDATION.md` / `*-PRODUCTION-VALIDATION.md` and script headers before running. **Some are historical milestone oracles**, explicitly restoring old icon scales or routing; they are not all current global regression suites. Do not weaken them or regenerate expectations just to remove intended-difference failures. `tools/test-fixtures/README.md` explains permanent historical inputs.

Relevant history: `aa0988e` consolidated layout/colon fix; `ea2bb5c` newlines; `9bffb0b` protection; `35a9302` Rare rules/icon clearance; `a8232b2` Rare flavor; `8f3e0fa` scale1.60; `30794ef` Rare multicolor; `d60d70a` Scheme A. Preserve these checkpoints.

## 7. Current goal, calibration references and limitations

**User goal:** improve the reusable shared text renderer across all supported card types and rarities, with official-reference validation. Doomblast (Common) and Infernal Chainsaw (Rare) are initial visual calibration cases, not card-specific targets to hardcode. The user accepted approximate visual similarity; an official Upper Deck template is unavailable.

Initial spot check: `tools/review-artifacts/symbol-heavy-spot-check/` contains `review.pdf`, self-contained `review.html`, comparison PNGs, exact fixture HTML, measurements and source URLs.

- Doomblast uses the new Common route: request22/effective22,3 rules lines, no overflow/missing icons/flavor clipping. Its repeated Range symbols stay together, but word wraps differ from the scan.
- Infernal Chainsaw uses the **unchanged Rare route**: request22/effective21,5 rules lines, no vertical overflow; a1-unit left glyph overhang is reported. At request20, existing protection selects17.5 and4 lines. That is an alternative, not an approved default reduction.
- These checks used actual app icons and natural wrapping, with explicit breaks between distinct abilities. Custom artwork/team emblems were omitted. Flavor request18 was used where present, subject to the existing cap; this is not the UI default11.

Broader Common/Uncommon review: `tools/review-artifacts/common-uncommon-wrap-calibration/` (PDF, HTML, measurements, validation, experiments). Psychic Link and Battlefield Promotion still need a smaller user-selected size to reproduce official line counts. Extremely crowded text can overflow and flavor can clip; diagnostics must remain honest. No blanket smaller default or aggressive shrinking was accepted.

Rare flavor target search can cycle on pathological extra-long probes as wrapping changes height. Its finite search retains the closest measured contour-valid trial and reports non-convergence; do not confuse this with contour-layout convergence. See the Rare flavor report for limits.

Common/Uncommon multicolor, Split and other families have not inherited the newest single-color calibration. Scheme B remains deferred. Bystander is unfinished. New local items `TestingReferences/review.pdf` and `tools/inline-icon-spacing-probe.cjs` exist; their provenance/results were not established here. The latter is an untracked diagnostic, **not approval to reduce production icon scales further**.

## 8. Next work and safe workflow

1. Inspect status/diffs and read relevant report before editing. Preserve the staged accepted milestone and existing experiments. Keep cleanup separate from rendering changes.
2. Extend reference coverage by family, rarity, text density, icons and keywords. Prefer Second Edition, then newer expansions when a comparable case is unavailable. Sources include `https://www.legendarycardgame.com/` (fan gallery of official scans), `tools/reference-cards/` and existing review folders.
3. Compare default and clearly labeled user-selected sizes. Separate font/width/spacing/obstruction effects; do not force scan line breaks, mislabel rarity routes, or optimize only Doomblast/Infernal Chainsaw.
4. Improve shared layout only where evidence identifies a reusable problem. Preserve format boundaries, explicit breaks, manual formatting, icon bounds and save/load. Treat a canonical document/editor redesign as a separate future phase, not incidental cleanup.
5. Run focused probes plus unchanged-family image checks. Record logical/painted bounds, effective sizes, icon and badge clearance, wrapping, overflow and clipping. Preserve immutable fixture provenance.
6. For visual changes, retain a downloadable PDF and preferably self-contained HTML plus measurements under `tools/review-artifacts/`. Temporary output must not be the only review copy. Inspect rendered pages and provide exact deliverable paths.
7. Report changes, evidence, uncertainty and final Git state. Do not commit/push without explicit authorization. Update these notes after accepted milestones, distinguishing implemented behavior from proposals.

This file does not make old reports current or automatically load itself into every assistant. Ask a new assistant to read it explicitly. Prefer targeted source inspection over loading all historical reports into a local model's context.
