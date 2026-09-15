# Permanent Hero regression inputs

These are historical test inputs, not application sources. Do not update their expected images or hashes merely to make a failing test pass.

## Baseline

`hero-production-baseline/` contains exactly the seven inputs required by the permanent regression runner: six pre-Hero-calibration Phase 2.6 source files plus their original `hashes.json`. They were copied byte-for-byte from the preserved session snapshot. The original paths in the hash manifest are provenance only; the runner resolves files relative to this directory. `.gitattributes` disables text conversion for these historical bytes so a fresh checkout preserves their hashes.

## Selected calibration

`hero-calibration-330-27/` preserves the original experiment's width-330, advance-27, contour records: 14 records, with every selected measurement and HTML input unchanged. Thirteen size-22 reference PNGs are copied byte-for-byte. The size-21 replay record is included, but its PNG is not consumed by the existing focused runner and is not included. `provenance.json` records the source measurement-file hash and hashes of the archived inputs. The source experiment was `legedit-modern-hero-86iixE`; nothing was regenerated to establish these expectations.

## Fresh-checkout commands

From the project root on Windows, install the locked Electron dependency and run:

```powershell
npm.cmd ci
.\node_modules\electron\dist\electron.exe tools\hero-production-regression.cjs
.\node_modules\electron\dist\electron.exe tools\hero-production-probe.cjs
```

The first runner executes the Phase 2.5/2.6 corpus and compares preserved/current renders. The second executes the focused production cases and selected calibration comparisons, including the original 13 reference images. Neither default invocation reads an AppData/Temp input or `tmp/modern-hero-production-baseline/`. An explicit alternative calibration directory remains supported as the focused runner's first argument.

Runs use isolated temporary browser profiles and output directories; those are outputs, not required inputs. Existing local assets/fonts and the locked Electron version should be retained for pixel comparisons. Pixel identity across other OS/font rasterizers is not claimed. Some external keyword-fetch attempts are blocked by the isolated test session as before.

The optional `hero-overflow-review-probe.cjs` now also uses this stable baseline and the four existing PNGs in `tools/review-artifacts/rare-hero-overflow/`. Those PNGs are not dependencies of the two permanent runners above. The optional PDF/HTML builder consumes the two 3x PNGs; PDF and HTML viewing requires none of the standalone PNGs because images are embedded.
