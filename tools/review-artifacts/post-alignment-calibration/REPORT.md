# Post-alignment icon and spacing assessment — 2026-11-14

Diagnostic only. Production sources, existing staging, origins, widths, contours, fitting policy and the soft-wrap alignment fix were preserved. Both verification.json files record unchanged SHA-256 hashes for six production sources.

## Controlled comparison

| Mode | Inline stat / class-team scales | Calibrated Hero ordinary advance at size 22 |
|---|---|---|
| control | 1.60 / 1.28 | Existing: common/uncommon 26, rare 27 |
| icons | 1.40 / 1.10 | Existing |
| spacing | 1.60 / 1.28 | 24 |
| combined | 1.40 / 1.10 | 24 |

Bounds-aware icon clearance still applies; 24 is not a forced advance for every line. Icon changes apply across families; the spacing override only affects calibrated Heroes. This experiment does not isolate stat-icon reduction from class/team reduction.

Seventeen exact official-card fixtures were rendered in four modes (68 renders). Existing source scans and transcriptions are identified in fixtures.json. Modern Second Edition, 2099 and Weapon X are emphasized; older references provide other-family coverage. Natural wrapping is retained. Nine useful comparisons appear in review.pdf and the self-contained review.html, including full cards and equal-scale lower-region crops. All 17 results are in measurements.json. Official scan point sizes are unknown; these are controlled application-size comparisons, not pixel matching.

## Results

Each mode completed 2,531 checks, 464 corpus renders and 78 detailed Hero fixtures. Counts below compare each candidate with aligned production; detailed Hero fixtures are a separate sample, not additional recoveries to sum into the corpus.

| Candidate | Corpus images changed | Corpus overflow cases recovered | New/worsened vertical overflow | Detailed Hero recoveries | Detailed Hero wrap changes |
|---|---:|---:|---:|---:|---:|
| icons | 320 | 6 | 0 / 0 | 0 | 1 |
| spacing | 55 | 8 | 0 / 0 | 4 | 3 |
| combined | 349 | 14 | 0 / 0 | 4 | 3 |

All candidates: zero worsened horizontal-overflow results, zero detailed Hero safety failures, zero worsened detailed Hero flavor clipping. Icons and combined each changed two corpus protected-block outcomes; spacing changed none. No detailed Hero protection outcomes changed. Full case lists are in generalization/summary.json. These checks establish safety for the tested fixtures, not universal official-card fidelity.

Official-card findings:

- Infernal Chainsaw: production fits at 21; each candidate uses 22. All have five lines, but word distribution differs. Smaller icons look less dominant; no candidate duplicates the official wrapping exactly.
- Spark of Divine (Thor): control and icons use 21.5 with four lines. Spacing alone selects 22 and five lines, farther from the official four-line arrangement. Combined returns to 21.5/four. This is a fitting/wrapping interaction, not a new overflow failure.
- Ultimate Killing Machine: all use 21/six lines. Logical overflow falls from 16.18 to 14.18 (icons), 1.36 (spacing), and zero (combined).
- Unite the Tribes of Wakanda: all use 21/seven lines; existing overflow remains, declining from 56.90 to 46.86 / 51.08 / 36.40 respectively. This is not solved by the candidates.
- Avengers Assemble!: all retain 22/two lines. Keeping the origin unchanged avoids the earlier left-extension candidate's unwanted one-line/shrunken outcome.
- Doomblast: all retain 22/three lines, and “Instead” still begins the third line. These tests intentionally do not reintroduce the left-extension experiment to force an official match.

## Recommendation and limits

The smaller-icon candidate has the stronger case for a next production decision: visibly less dominant icons, six corpus recoveries, and no measured safety regressions. Keep it a candidate until reviewed. A blanket Hero advance of 24 is not ready for unconditional adoption: it helps dense examples but is not consistently closer to official wrapping. Preserve existing spacing for now rather than treating overflow recovery alone as visual approval.

Official comparisons do not cover every family/rarity (notably Split, common/uncommon multicolor, Adversary and Trap). Synthetic regression coverage is broader. Font, template and scan differences remain. No permanent scale or spacing change was made.

## Reproduce / inspect

From the project root, with installed Electron dependencies:

```powershell
.\node_modules\.bin\electron.cmd tools/review-artifacts/post-alignment-calibration/run.cjs
.\node_modules\.bin\electron.cmd tools/review-artifacts/post-alignment-calibration/generalize.cjs
python tools/review-artifacts/post-alignment-calibration/generalization/summarize.py
python tools/review-artifacts/post-alignment-calibration/build.py
```

The gallery builder requires Pillow, ReportLab and pdftoppm. Runners reuse repository diagnostic helpers and existing official scans; they are not standalone export tools. review.pdf and review.html are persistent, shareable review artifacts. Measurements and generalization results retain the underlying numerical evidence. Existing source/staged changes remain uncommitted.
