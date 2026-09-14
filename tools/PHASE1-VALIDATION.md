# Ability Textbox Phase 1 probes

These probes use the installed Electron runtime, the real project fonts/assets,
and isolated hidden windows. They do not run `app.js`, open project files, or use
the editor's normal application storage. No test dependencies are installed.

From the project directory in PowerShell:

```powershell
node -e 'const cp=require("child_process"); const p=cp.spawn(require("electron"),["tools/phase1-probe.cjs"],{stdio:"inherit",windowsHide:true}); p.on("exit",code=>process.exit(code??1));'
```

Add `"--checks"` after the probe filename for only the focused browser checks.
The complete run compares against baseline commit `ab5bbd1`; the optional
`PHASE1_BASELINE` environment variable can select another baseline explicitly.
The baseline commit and index are never modified.

## Recorded result

Validated on 2026-09-14 with installed Electron 41.2.1 against `ab5bbd1`:

- 102/102 complete-card image comparisons were pixel-identical.
- All focused browser assertions passed, including formatting, project loading,
  split editors, diagnostics, and no remeasurement during drawing.
- Changed JavaScript files and both probe files passed syntax checks.
- `git diff --check` passed.
- A source comparison, ignoring line endings, confirmed that card-family
  rendering before the text parser and the boundary-calculation functions were
  unchanged.

The managed sandbox could not start Electron's renderer; the successful run
used the same isolated harness outside that sandbox. Physical typing/caret
reproduction and the tester's own project corpus remain follow-up validation.

## Coverage

- Pixel comparisons of complete cards for 17 geometry/layout combinations,
  three content fixtures each, at 1x and 3x: 102 comparisons.
- Hero common/uncommon/rare, multicolor, split, Villain, Adversary, Location,
  Trap, Henchman, Mastermind/Tactic, and both Scheme regions.
- Normal wrapping, explicit and consecutive breaks, combined styles, automatic
  headers, stat/cost icons, and long text with flavor to exercise fitting.
- Real browser selections and Bold commands for plain KO, KO:, KO: Draw, and
  ordinary colon punctuation; suppression, restoration, split editors, and
  HTML/project round trips.
- Mid-word style boundaries, unbreakable overflow, missing icons, effective
  font size, unchanged slanted-line progression, and drawing without measuring.

The intentional colon and mid-word wrap corrections have separate assertions;
they are not required to reproduce the old incorrect pixels. The image fixtures
cover synthetic representative cards, not every user-created project.

The run prints its result and a temporary output directory. When a pixel
comparison fails, before/after PNGs are written there for inspection. Temporary
Electron profiles are also kept there, outside the repository. Expected blocked
network messages can occur because the embedded keyword-reference website is
disabled for these offline tests.

## Internal diagnostics

`layoutRuns()` returns positioned `items`/`lines`, logical `bottomY`, painted
bounds, final vertical bounds, horizontal/vertical overflow, missing icon keys,
and requested/effective font sizes. Existing fitting still uses the original
logical line-height policy. Painted overflow is diagnostic only; it does not
trigger additional shrinking or clipping.

For an opt-in development inspection of the final fitted result:

```javascript
window.onAbilityLayoutDiagnostics = result => console.log(result.abilityLayout);
// Disable after inspecting:
delete window.onAbilityLayoutDiagnostics;
```

The callback runs per text block, including each split half. Its result contains
live image references; avoid retaining an unbounded history.

## Deliberately outside this phase

Enter semantics, editor DOM normalization, caret/document-position redesign,
undo/redo, and a new persistence schema are unchanged. Physical keyboard/caret
behavior still needs the tester's original reproduction steps. There is no
recovered history establishing why standalone colon bolding was introduced;
the existing in-app notes document bold headers and keyword expressions only.
