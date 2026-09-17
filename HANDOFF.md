# A Legedit GPT Handoff

## Latest change: ability Attack/Recruit scale 1.60 (uncommitted)

- Accepted recovery checkpoint: `a8232b2`, rare Hero rules/flavor calibration. Do not rewrite it. Current icon work remains uncommitted.
- `textboxIcons.abilityStatScale` is 1.60, used only for Attack/Recruit (including `/a` and `/r`) placements with the ability font reference. `statScale` stays 1.72 for ordinary minimum line-height calculations and non-ability consumers; class scale stays 1.28.
- Preserve Phase 2.6 centering/clearance, Phase 2.5 fitting, all geometry, large stats/cost graphics and flavor behavior. Shared ability paths in other families inherit the smaller icons; no family geometry is recalibrated.
- The accepted uppercase/lowercase fixture crosses the existing protected-fit threshold: font 19 / one line. Mixed prose changes one wrap; dense rules recover 2.72 units of overflow, while dense flavor stays clipped. Do not special-case these fixtures.
- Permanent current-production verification: `tools/inline-stat-production.cjs`, `tools/inline-stat-browser-probes.js`, `tools/test-fixtures/inline-stat-icons/fixtures.json`. It compares actual production against the accepted baseline with an isolated 1.60 override, including legacy short-token aliases, and runs existing cross-family/Hero/flavor assertions at actual production scale.
- Historical Hero geometry/flavor runners explicitly retain 1.72 for their exact milestone oracles; their results must not be presented as current-scale comparisons. See `tools/INLINE-STAT-ICON-PRODUCTION-VALIDATION.md` and persistent review under `tools/review-artifacts/inline-stat-icon-production/`.

## Accepted milestone: rare single-color Hero flavor (a8232b2)

- The flavor milestone was accepted and committed as `a8232b2`, following rules/Phase 2.6 recovery commit `35a9302`. Do not rewrite either commit.
- Only rare single-color Hero flavor changes. Final flavor prefers painted bottom 648, moves downward if needed for a six-unit painted gap from the selected rules, and uses the actual cost badge/number contour with full-band three-unit clearance. Nominal flavor width remains 360; its original font/line advance and clipping are retained.
- Preserve the original fitting pass, including its flavor-driven rules shrinking and font-floor behavior. New placement runs afterward on the exact selected rules and flavor size; it does not feed back into fitting. The legacy fitting measurements are exposed separately from final overflow diagnostics.
- Rules, no-flavor cards, common/uncommon, multicolor, split and other families must remain unchanged. Common/uncommon contour work remains deferred; do not approximate embedded badges.
- Permanent focused tests: `tools/hero-flavor-production.cjs`, `tools/hero-flavor-browser-probes.js`, and `tools/test-fixtures/rare-hero-flavor/fixtures.json`. Before images load source directly from `35a9302`.
- Current validation: `tools/HERO-FLAVOR-PRODUCTION-VALIDATION.md`. Persistent before/after review: `tools/review-artifacts/rare-hero-flavor-production/`. The previous vertical/horizontal diagnostic reviews are retained unchanged.

## Latest Ability Text decision: rare Hero calibration accepted

This section supersedes older notes below where they conflict with the current Ability Text renderer.

- Rare single-color Hero rules production was accepted and committed in `35a9302`: origin 108/526, width 330, ordinary advance `round(effectiveFontSize * 27/22)`, actual cost-badge/number alpha contour with full painted-band clearance.
- Prior Phase 2.6 font-relative icon alignment and bounds-aware spacing remain intact. Inline Attack/Recruit scale stays 1.72. Preserve existing fitting and Phase 2 newline/protection behavior; the new rare single-color flavor policy is described above.
- The repeated-prose synthetic fixture's logical overflow increase from 3 to 14 is reviewed and accepted. It requires six lines at font 21 under the current constraints; the initial divergence comes from width 330 above the badge. The solver does not introduce an avoidable extra line. Final ink exceeds the rules region by only 3.75 units; the fixture already overflowed and flavor was already clipped. Do not special-case it.
- Common/uncommon Heroes are explicitly deferred and unchanged. Do not approximate their embedded badges. Revisit only with a reliably aligned source mask/layer or other independently validated contour source. Split, multicolor and other families retain their previous behavior.
- Permanent report: `tools/HERO-PRODUCTION-VALIDATION.md`. Accepted regression review: `tools/review-artifacts/rare-hero-overflow/Rare Hero Overflow Before and After.pdf` and the self-contained `review.html` alongside it. Preserve these files and their measurements/images.
- Permanent test inputs are under `tools/test-fixtures/hero-production-baseline/` and `tools/test-fixtures/hero-calibration-330-27/`. Both `hero-production-regression.cjs` and `hero-production-probe.cjs` run with repository-contained default inputs; see `tools/test-fixtures/README.md` for fresh-checkout commands. The old temporary baseline is retained only as local audit history.

### Persistent visual-review deliverables

For future visual/rendering work, when before/after images, galleries or diagnostic sheets would help the user verify a change, create a persistent downloadable artifact. Prefer a PDF and a self-contained HTML version when practical, stored under `tools/review-artifacts/`. Provide exact paths in the final response. Temporary files may be used internally but must not be the only review copy.

## Project Folder
- Active folder: `C:\Users\richa\OneDrive\Documents\A Legedit GPT`
- This is an Electron desktop app for making Marvel Legendary custom cards.
- The folder was previously renamed from `Legedit GPT` to `A Legedit GPT`; old missing-directory warnings were caused by that rename.

## How To Run
1. Open the project folder.
2. Double-click `Run Legedit Desktop.vbs` or `Run Legedit Desktop.cmd`.

From terminal if needed:
- `npm.cmd install`
- `npm.cmd start`

## Current Status As Of 2026-05-19
The cleanup pass has covered the original card-quality issues and the latest tester bug/QOL pass. The current build is ready for external testing unless new bugs are found.

Supported project types in the New Project chooser:
- Hero
- Villain
- Henchman
- Mastermind
- Scheme
- Bystander

## Recently Completed Work

### Hero Title Bar / Text Uniformity
- Hero title bar uses `assets/newtemplates/Dark Card Title BG.png`.
- Corrected title appearance is configured in `hero-template-config.js`.
- Important locked values:
  - `titleBar.heroTopY: 20`
  - `titleBar.heroBottomY: 71`
  - `titleText.nameTracking: -3.2`
  - `titleText.subtitleTracking: -2.6`
  - `titleText.nameWordSpacing: 5`
  - `titleText.subtitleWordSpacing: 3`
  - `titleText.nameOffsetY: -5`
  - `titleText.subtitleOffsetY: -18`
- Split cards were recently updated to use the same title sizing/spacing defaults as regular Hero cards.

### Split Hero Cards
- Split cards now inherit the shared Hero Name by default.
- Old placeholder split names like `Hero Name 1` / `Hero Name 2` are normalized to the shared Hero Name.
- Split title defaults are now:
  - card title size: `34`
  - hero/group size: `24`
- Split title rendering explicitly uses the same letter spacing and word spacing as normal Hero title rendering.

### Sidebar Card List
- Villains already used a two-line card list item.
- Hero cards now do too:
  - line 1: card name
  - line 2: `CardRarity - GroupNameHere`
- Split cards use both split hero/group names on the second line.

### Team And Class Icons
- Team icons are no longer forced into circles; transparent PNG shapes render as-is.
- Common/Uncommon multicolor class icons are baked into the templates, so user overlay icons are hidden there.
- Rare multicolor class icons use exported icon assets from `assets/newtemplates/-e ...png`.
- Class icon dragging was disabled after the positions were tuned.
- Current rare multicolor overlay values live in `hero-template-config.js` under `titleText.classIconOverlay...`.

### Flavor Text
- Flavor text is dynamic and constrained better inside the white textbox.
- Hero/split/villain/scheme text rendering uses adaptive text block behavior.
- User accepted this pass as good enough.

### Mass Export
- Export flow now offers current card or all cards in the right sidebar list.
- Exported PNGs now use grouped filenames: `ProjectOrGroup - TypeOrRarity - CardTitle_legendary.png`.
- This keeps multiple Hero/Villain/etc. projects grouped together when imported into Tabletop Simulator tooling.
- Main files involved:
  - `electron-preload.js`
  - `electron-main.js`
  - `ui.js`
  - `index.html`

### Keyword Auto-Bold
- `Unleashed` was added and now bolds fully.
- Auto-bolded keywords can be unbolded/rebolded by the user.
- Relevant files:
  - `keywords.js`
  - `render.js`

### Villain / Location / Trap / Henchman Naming
- Location subtitles default to `Location - GroupName`.
- Trap subtitles default to `Trap - GroupName`.
- Regular Villains use only the group name, without the `Villain -` prefix in the card title itself.
- Henchman is now a separate New Project type, not a Villain dropdown option.
- Henchman group subtitle defaults to `Henchman Villain`.

### Location / Henchman Text Wrap
- Location, Trap, and Henchman use a simple line-based left slant now, not the old curve-point interpolation.
- Important: the user was frustrated by curve tuning. Do not reintroduce curve interpolation for this textbox unless explicitly requested.
- Current left slant is controlled by:
  - `leftLineStart`
  - `leftLineStep`
  in `render.js` near `curvedVillainFamilyTextLayout`.
- Location has a right-side attack wrap around the attack icon/number.
- Henchman currently also uses the attack wrap, controlled by:
  - `const useHenchmanAttackWrap = true;`
- To revert Henchman wrapping only, set that to `false`.
- Trap intentionally does not use the right-side attack wrap because Traps have no attack.
- Bottom-edge overflow was accepted as good enough; users can lower font size if text reaches the lower curve.

### Ability Text Spaces
- Multiple spaces in rich text boxes are preserved visually with `white-space: pre-wrap`.
- Renderer now keeps leading spaces attached to the word that follows when wrapping.
- This lets users manually nudge wrapped lines with spaces in most cases.

### Cost Icon In Ability Text
- Added `/cost` as an inline icon token.
- Added `Cost` toolbar buttons to:
  - main Hero/Villain ability text box
  - Split half 1 ability text box
  - Split half 2 ability text box
- Cost icon uses existing `cost_common`, `cost_uncommon`, and `cost_rare` assets.
- It is intentionally sized like class icons, not like the larger recruit/attack inline stat icons.

### Project Tabs
- The editor now has a browser-like project tab strip above the card preview.
- New projects and loaded projects open in their own tabs instead of replacing the only open project.
- Switching tabs snapshots the current project first, then restores the selected tab.
- The main Save button saves every open tab/project in the desktop app.
- New projects are prompted for a save location before the project/tab is created; canceling that prompt skips creation.
- Tabs are session-only for now; normal project files are still saved/loaded through the existing Save/Load buttons.
- Main files involved:
  - `index.html`
  - `styles.css`
  - `state.js`

### Tester Bug / QOL Pass
- Autosave was changed from a very aggressive 250ms debounce to a 5-minute delay after edits.
- Autosave now skips writing if the serialized project has not actually changed.
- Autosave has an in-flight guard so another autosave cannot start while one is already writing.
- Manual Save All clears the pending autosave timer/dirty flag after a successful save.
- Deeper render/rich-text performance work was completed after a zip backup was saved:
  - card list/tabs no longer rebuild on every keystroke unless their visible labels change
  - renders only schedule autosave when active card data actually changes
  - ability auto-bold DOM formatting is delayed until 350ms after typing pauses
  - canvas CSS sizing is not recalculated on every render
- A hidden console benchmark was added:
  - `runLagTest().then(console.log)`
  - `runLagTest({ iterations: 300 }).then(console.log)`
- Benchmark results after the delayed auto-bold change:
  - Desktop 300-iteration test: average about `16.57ms`, p95 about `16.8ms`, worst about `17.7ms`
  - Laptop 300-iteration test: average about `13.34ms`, p95 about `23.6ms`, worst about `30.8ms`
- Custom team-icon upload now reports whether a PNG has real transparent pixels, no transparency, or failed to load.
- Rich-text caret handling was adjusted to avoid placing the caret inside non-editable inline markers/icons.
- Villain-family attack stats now have an `*` toggle in addition to the `+` toggle.
- The preview area now has a subtle checker background and a high-contrast preview-only border around the card canvas; exports are unaffected.

## Important Files
- `index.html`: UI controls and toolbar buttons.
- `styles.css`: editor styling, including `white-space: pre-wrap` for rich text boxes.
- `assets.js`: asset paths.
- `state.js`: project/card persistence, card list labels, project type behavior.
- `render.js`: card drawing, title text, inline icons, text wrapping.
- `ui.js`: export flow and helpers.
- `electron-main.js`: app shell, project creation, export save dialogs.
- `electron-preload.js`: IPC bridge.
- `hero-template-config.js`: tuned hero title/stat/template geometry.
- `keywords.js`: keyword list for auto-bold.

## Important Assets
- `assets/newtemplates/Dark Card Title BG.png`
- `assets/newtemplates/-e covert.png`
- `assets/newtemplates/-e covert bottom.png`
- equivalent `-e ...` files for other class icons
- `assets/embedded/cost_common.png`
- `assets/embedded/cost_uncommon.png`
- `assets/embedded/cost_rare.png`
- `assets/newtemplates/Asterisk.png`
- `assets/multicolor/...`
- `assets/singlecolor/...`

## Verification Last Run
Recent syntax checks passed:
- `node --check render.js`
- `node --check state.js`
- `node --check ui.js`
- `node --check app.js`
- `node --check electron-main.js`
- `node --check electron-preload.js`

No full automated visual test was run at the very end. The hidden lag benchmark was run manually on desktop and laptop as noted above.

## Where We Stopped
The latest pass addressed the tester bug list as far as possible without external retesting:
- Performance/autosave/rich-text lag improvements are in.
- PNG/team-icon upload diagnostics are in. The app appears to support transparent PNGs correctly; the status message should clarify bad/flattened PNGs vs decode failures.
- Villain/Mastermind/etc. attack `*` toggle is in.
- Rich-text click/caret bug has a targeted fix.
- Export filenames are grouped by project/group name and type/rarity.
- Preview-only border/checker background is in.

Next step is external testing. If more lag is reported, compare benchmark numbers using `runLagTest({ iterations: 300 }).then(console.log)` and ask whether the lag happens while typing long ability text, dragging art, uploading images, switching tabs, or exporting.

Before changing title bars or Location/Henchman text wrapping, inspect the current rendered result first. Those areas were tuned through many small visual passes and should be handled carefully.

## Suggested Prompt For New Chat
Use this if resuming elsewhere:

> The active project folder is `C:\Users\richa\OneDrive\Documents\A Legedit GPT`. This is an Electron desktop app for making Marvel Legendary custom cards. Please read `HANDOFF.md` first. We just finished a tester bug/QOL pass covering autosave/performance, delayed auto-bold formatting, a hidden `runLagTest` benchmark, PNG/team-icon diagnostics, rich-text caret handling, attack `*` toggles for villain-family cards, grouped export filenames, and a preview-only card border/checker background. The next step is external testing unless a new bug is reported. Inspect current code/rendering before changing tuned layout values.

## Extra Notes
- If the app seems to use stale template PNGs, fully close and reopen it to clear in-memory asset cache.
- If PowerShell blocks `npm`, use `npm.cmd`.
- The thread history does not travel with the folder; this file is the portable handoff.

## Rare multicolor Hero production transfer (uncommitted)

Rare single-color and rare multicolor now share the accepted rules/flavor contour options via the explicit selector in render.js. Geometry, fonts/fitting, icon scale1.60, badge/stat/class placement and persistence are unchanged. Split remains separate. Common/uncommon multicolor and single-color embedded contours remain deferred.

Production matches all six saved Candidate B images/measurement records. Sixteen excluded-route before/after comparisons remain identical. See tools/RARE-MULTICOLOR-PRODUCTION-VALIDATION.md and tools/review-artifacts/rare-multicolor-hero-production/ for reproduction, validation and persistent PDF/HTML review. The original engineering/reference studies remain intact.

Official sign-off used Beast / Multi-Variate Smackulus, Black Panther / King of Wakanda, and King Black Panther / Unite the Tribes of Wakanda. The dense2022 card still overflows at requested22 and fits at16; no card-specific fitting exception was introduced. The current changes are intentionally unstaged/uncommitted for manual review.
