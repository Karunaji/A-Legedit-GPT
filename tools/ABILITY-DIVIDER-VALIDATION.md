# Ability dividers

Use **Divider** in the main or either Split ability toolbar. The native horizontal-rule editing command inserts at the caret or replaces selected text, with native undo/redo. Select the divider and delete it to remove it. Composition input is left alone.

Persistence uses an ordinary `<hr>` inside existing abilityHtml (including Split halves); no new schema. The ability parser treats HR as a separate block. The renderer measures a one-logical-unit rule on its own line, using that line's available width. Painted bounds participate in contour avoidance, overflow and neighboring-icon clearance. Each divider consumes vertical space; crowded cards may require adjusting the font size. Older app versions may ignore HR during canvas rendering, so share projects with the updated app.

No automatic underscore conversion. Explicit blank lines remain explicit blank lines. No changes to geometry, ordinary spacing or fitting policy. Existing pasted/saved HR elements in ability HTML now render as dividers; non-ability HTML parsing is unchanged.

Validation:

```powershell
.\node_modules\.bin\electron.cmd tools/ability-divider-browser.cjs
.\node_modules\.bin\electron.cmd tools/accepted-rendering-production.cjs
node tools/custom-team-upload-probes.cjs
```

- 54 focused checks: native insertion/replacement/deletion/undo/redo in all three editors, 350-ms formatting preservation, leading/trailing/consecutive dividers, HTML round trip, positioned bounds/clearance, contour convergence and actual Split/Villain/Scheme rendering paths.
- 28 existing alignment assertions and 2,531 corpus checks pass; all 464 corpus and 78 detailed Hero images without dividers match accepted hashes exactly.
- 32 pending team-upload checks pass. That separate uncommitted work remains intact.
- Syntax checks and git diff --check pass.

Persistent visual review: `tools/review-artifacts/ability-divider/review.pdf` and self-contained `review.html`, with `results.json` and before/after PNGs. Three synthetic examples show Common, Rare and a Rare divider at badge level. All three PDF pages were visually inspected. The browser probe regenerates data/images; build.py (Pillow and ReportLab) regenerates the review.

Not committed. No save-schema migration or broad editor redesign.
