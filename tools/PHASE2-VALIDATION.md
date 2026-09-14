# Ability Textbox Phase 2

## Resume audit

The previous turn stopped before completion. On resumption, Git HEAD was
`aa0988e` (Phase 1), with `ab5bbd1` still its parent. Four production files were
modified and two Phase 2 probes were untracked. The basic break handler, parser,
full-line renderer advance, and timer/composition guards were present.

The probes recorded keyboard observations but had no pass/fail assertions.
Icon, deletion, paste, save/load, composition, and image-comparison coverage was
not completed; several helpers existed but were never called. No Phase 2
validation document existed. No existing work was discarded or reset.

The resumed checks found and repaired an actual defect: Chromium's
`insertLineBreak` inserts an extra newline immediately before a non-editable
inline node. That boundary now uses native `insertHTML('<br>')`, which preserves
native undo/redo and inserts one break. Other positions retain the native
line-break command. The input timer guard also covers this insertion transaction.

## Behavior and scope

- Main and both split Ability editors use one full line per Enter/Shift+Enter.
- Consecutive explicit breaks add full empty lines.
- The parser interprets DIV/P block boundaries, empty blocks, BR elements, and
  literal LF/CRLF text without rewriting the stored HTML.
- Chromium's terminal caret placeholder (BR or newline) is not an extra logical
  break. It remains in the editor HTML for native caret behavior.
- `fullLine` is a transient renderer-run attribute, not saved metadata. There is
  no new schema, document model, or legacy-break marker.
- Flavor text retains its previous parsing/spacing. Card geometry, soft wrapping,
  font-fitting limits, assets, and export code are unchanged.
- Break/history transactions cancel pending DOM auto-formatting. The canvas
  still resolves automatic bold; the editor's automatic bold markup can wait
  until the next ordinary input/formatting action. Composition is excluded from
  Enter interception and from formatting while composition is active.

## Reproduction

From the project directory, using the installed Electron runtime:

```powershell
node -e 'const p=require("child_process").spawn(require("electron"),["tools/phase2-probe.cjs"],{stdio:"inherit",windowsHide:true});p.on("exit",c=>process.exit(c??1));'
```

Add `"--checks"` after the filename to run only behavioral assertions, or
`"--images"` for image comparisons. The default runs both. The probe uses hidden,
isolated Electron sessions and temporary application storage. It loads the
production event-handler portion of `app.js`, excluding normal startup/project
dialogs. Initial hidden-window focus is settled before assertions. Network
keyword-reference loading is blocked. The real app's projects and clipboard
are not modified.

Full results and changed before/after PNGs go into the printed temporary folder.
Image runs also generate `review.html` with representative differences. The
managed sandbox could not run Electron's renderer; successful probes ran outside
that sandbox with the same isolated storage and hidden windows.

## Recorded validation — 2026-09-14, Electron 41.2.1

- **162 Phase 2 assertions passed**, with real Electron keyDown/char/keyUp events
  for Enter, Shift+Enter, Backspace/Delete, and Ctrl+Z/Ctrl+Y. Typing is injected
  through the native renderer text-input path.
- **34 existing Phase 1 focused assertions passed**, using its unchanged probe
  with `--checks`.
- **221 image comparisons against aa0988e:** 119 pixel-identical and 102 expected
  differences. No unexpected differences were allowed.
- All changed/new JavaScript files passed syntax checks; `git diff --check`
  passed.
- A source comparison confirmed all pre-parser card-family rendering unchanged,
  and `layoutRuns` unchanged except for the full-line explicit-break advance.

Behavioral results: `C:\Users\richa\AppData\Local\Temp\legedit-phase2-OXWO1p`.
Image results: `C:\Users\richa\AppData\Local\Temp\legedit-phase2-IDR6Ss`.
These temporary files are review aids, not tracked project dependencies.

## Requirement-by-requirement coverage

| # | Requirement | Result/evidence |
|---|---|---|
| 1 | One Enter = one explicit break | Passed in all three editors |
| 2 | Shift+Enter equals Enter | Passed in all three editors |
| 3 | Two Enters = one full empty line | Parsed content and exact line Y positions passed |
| 4 | Additional full empty lines | Three-Enter content and Y positions passed |
| 5 | Beginning/middle/end | Passed; typing after the break lands on the expected side |
| 6 | Replace selection | ABCD with BC selected becomes A, break, D |
| 7 | Bold/italic/underline | Combined styles retained through Enter and further typing |
| 8 | Keywords/suppression | Auto-bold header and explicit suppression retained |
| 9 | Before/after inline icons | Icon retained; one break; native Undo/Redo passed |
| 10 | Backspace/Delete | Both rejoin the inserted break correctly |
| 11 | Multiline paste | Native plain/rich insertion probes passed (see limitation below) |
| 12 | Pasted blank lines | LF, CRLF, BR and empty paragraph/block cases passed |
| 13 | Main and split consistency | Same assertions run in each of the three editors |
| 14 | Existing abilityHtml save/load | Real card serialization/project loading retains newline text |
| 15 | Undo/Redo | Enter and icon-adjacent Enter passed, including auto-bold headers |
| 16 | 350 ms formatter | Checks wait 450 ms; subsequent characters retain expected position and breaks |
| 17 | Composition exclusion | Synthetic composition/beforeinput guard passed; physical IME not tested |
| 18 | Full repeated-break spacing | Exact line-height increments passed; visual comparisons cover all families |
| 19 | Wrapping and geometry | Source comparison passed; unaffected image fixtures identical |
| 20 | Phase 1 regressions | 34 focused assertions and all 68 unaffected Phase 1 images passed |
| 21 | Newline images across families | 17 combinations, including Hero, multicolor, split, Villain, Adversary, Mastermind/Tactic, Scheme A/B, Location, Henchman, Trap |

## Legacy differences for review

There are no saved user projects in this repository. Comparisons use legacy HTML
fixtures, not the tester's full card corpus.

- 51 new fixtures with ordinary text, one BR, or ordinary consecutive populated
  DIVs were pixel-identical (three fixtures across 17 families).
- 68 unaffected original Phase 1 fixtures were pixel-identical, including long
  soft-wrapped content and fitting with flavor, at 1x and 3x.
- 34 original Phase 1 comparisons intentionally changed because their fixture
  contains consecutive BRs (17 families at 1x and 3x).
- 68 new newline comparisons changed (four fixtures across 17 families): full
  blank lines, formerly collapsed literal newlines, empty DIVs, and inline text
  following a DIV that previously lost its boundary.

Thus differences are **not limited to repeated blank lines**. They also correct
the parser's inconsistent block/literal-newline interpretation. These changes
match the conventional newline contract; no permanent legacy metadata was added.
Parsing is non-mutating, and unrelated legacy HTML attributes/structure were
checked through actual project loading. Existing Phase 1 keyword auto-formatting
on load remains; this phase does not add general HTML rewriting on load.

The Location full-blank-line before/after PNGs were visually inspected: the text
advances by the agreed full empty line while the frame and boundaries stay fixed.

## Limits and manual follow-up

- Paste probes invoke Chromium's native insertText/insertHTML transactions with
  multiline clipboard-shaped content. They do not modify the system clipboard or
  claim exhaustive coverage of Word/web clipboard CSS or every paste source.
- Composition guards were event-tested; physical IME completion requires manual
  testing with the user's input method.
- More blank-line spacing can push crowded existing cards farther down. Existing
  fitting/overflow diagnostics remain; no aggressive shrinking or new clipping
  was added to hide this consequence.
- Arbitrary legacy HTML can still be ambiguous, especially terminal placeholder
  intent. Standard browser-generated forms are covered; unusual legacy examples
  should be reviewed individually rather than introducing a broad compatibility
  mechanism preemptively.

All Phase 2 changes remain uncommitted for manual testing.
