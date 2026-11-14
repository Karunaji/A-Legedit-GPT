# Smaller inline icons adopted — 14 November 2026

User authorized adopting the tested smaller-icon candidate after reviewing the official comparisons. This supersedes the diagnostic-only recommendation in REPORT.md, without changing those historical results.

Production change: only two values in hero-template-config.js:
- abilityStatScale: 1.60 -> 1.40 (inline Attack/Recruit).
- classScale: 1.28 -> 1.10 (inline class/team icons).

The legacy statScale remains 1.72. Ordinary line spacing, bounds-aware clearance, text origins, widths, badge avoidance, fitting and explicit breaks are unchanged. Large stat/title/team graphics are unchanged. Smaller inline footprints can naturally change wrapping, fitting and subsequent line positions. The existing unstaged soft-wrap alignment fix and staged Common/Uncommon milestone were preserved.

Validation: verify-production.cjs runs the actual production sources without icon overrides for its control mode. All 2,531 checks passed; all 464 corpus image hashes and all 78 detailed Hero image hashes exactly match the previously reviewed icons-only candidate. It also verifies production source hashes are unchanged during execution. Results are in production-validation/control.json and verification.json. Syntax checks and git diff --check passed.

Run from the project root:
```powershell
.\node_modules\.bin\electron.cmd tools/review-artifacts/post-alignment-calibration/verify-production.cjs
```

Persistent visual reference: review.pdf and self-contained review.html in this directory. The column labelled “Smaller icons only” represents the adopted settings; “Aligned production” is the historical pre-adoption control. Keep the gallery unchanged as the before/after record. No new matrix or duplicate gallery was generated. Existing official wrapping differences and dense-text limitations documented in REPORT.md remain; tighter Hero spacing and left-extension candidates were not adopted.

No files were staged or committed by this change. PROJECT_NOTES.md was updated to reflect the new settings.
