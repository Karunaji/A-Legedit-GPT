# Soft-wrap left alignment — 14 November 2026

> Milestone update, 14 November 2026: accepted together with soft-wrap alignment and inline scales 1.40/1.10. Earlier status/results below describe their original stage. Use `tools/accepted-rendering-production.cjs` for current production; `tools/common-uncommon-production.cjs --historical` isolates the original calibration. See `tools/ACCEPTED-RENDERING-VALIDATION.md`.

Implemented, uncommitted, pending user visual review. Preserve the earlier staged Common/Uncommon milestone; this fix is an additional unstaged render.js diff, not a replacement of that work.

## Change

`layoutRunsAtOrigins()` now discards a word's leading ordinary whitespace separator only when automatic wrapping moves that word to a new line. It then measures the trimmed styled fragments and paints that exact layout. Interior spaces, initial indentation, explicit-break indentation and nonbreaking spaces remain intact. Style fragments within a word remain together. No HTML/persistence/editor changes.

Hero origin/width, icon scales (1.60 stat /1.28 class), line spacing, fitting/protection policy, stat graphics and obstruction boundaries are unchanged. Locations/Henchmen retain their deliberate stepped line starts; text now starts at those boundaries without an extra separator. Natural glyph side bearings remain, so visible ink edges need not be identical for every letter. This does not adopt any of the separate icon/left-width diagnostic candidates.

## Validation

- 28 focused assertions: soft wrapping, multiple separators, interior spaces, explicit indentation/blank lines, nonbreaking spaces, bold/italic/underline fragments, icon-adjacent words, stepped boundaries and draw-without-remeasurement.
- Broad before/after corpus:464 images across17 family/layout variants;115 changed,349 identical. Existing checks passed:2529 before,2530 after (counts include per-line assertions and can vary with wrapping).
- No increased vertical overflow in captured cross-family layouts. No remaining ordinary leading spaces in the detailed spacing corpus.66 textbox results gained horizontal diagnostics, all at most1 logical unit; removing the separator exposes normal glyph-edge overhang at the boundary. These diagnostics are not suppressed. This is not a new left-stat collision certification.
-17 official-text before/after fixtures. All retain their line counts. Vibranium Shield and Spark of the Divine fit at21.5 rather than21; other effective rules sizes remain unchanged. Existing dense-card overflow, Henchman flavor clipping and Location stat crowding are outside this fix and remain visible.
- Final lightweight rerun:28 focused +1458 existing icon/layout checks passed with exit0. The initial full run wrote all completed results then emitted a Windows `PostQueuedCompletionStatus` shutdown error; no assertion failed. The clean lightweight rerun confirms the executable checks; the completed full-render evidence was preserved rather than overwritten.
- JavaScript syntax and `git diff --check` pass.

## Files and reproduction

Production: `render.js` (13-line tracked diff relative to the existing staged renderer:11 additions,2 removals).

Tests: `tools/soft-wrap-alignment.cjs`, `tools/soft-wrap-alignment-browser-probes.js`. Baseline: `tools/test-fixtures/soft-wrap-alignment/render-before.js` plus SHA256. This is the accepted pre-fix working renderer (hash8f7a23b128fec44016bab7461fdb00ff189ac4c648907e69eb14da79acd0312e), not older Git HEAD.

Commands from root:

```powershell
.\node_modules\.bin\electron.cmd tools/soft-wrap-alignment.cjs --checks
.\node_modules\.bin\electron.cmd tools/soft-wrap-alignment.cjs
node --check render.js
git diff --check
```

The full runner reuses the official-text review's fixtures/probe and the prior rare-multicolor study's Wakanda icon fixture, in addition to the existing phase probes. Preserve those diagnostic dependencies when curating commit scope; this runner currently expects the existing project checkout, not just the new files in isolation. It blocks network requests and uses isolated temporary browser storage.

Persistent review: `tools/review-artifacts/soft-wrap-alignment/review.pdf` (7 pages), self-contained `review.html`, before/after metrics, summary.json and image-changes.json. `build.py` regenerates the gallery with Pillow/reportlab/pypdf and pdftoppm; `summarize.py` regenerates the comparison summary. Gallery columns: official / actual production before / actual production after. The measured official inputs are the same on both render sides; no artificial soft breaks or diagnostic icon scales were introduced.

Git index is untouched. No commit or push.
