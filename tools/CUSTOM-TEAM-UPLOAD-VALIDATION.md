# Custom team upload hardening

The reported failure on another PC has not been reproduced or diagnosed. These changes address independently verified weaknesses without changing rendering, asset sizes, persistence format or project-type UI availability.

- Every file selection invalidates older read/decode callbacks and clears stale pending images.
- The file input clears immediately, permitting the same file to be selected again after a failure.
- Read errors, aborted reads and synchronous read exceptions leave Add disabled with a retry message.
- A decoded image explicitly prompts the user to click Add to List; existing transparency warnings remain.
- Adding an icon or applying a different project invalidates pending callbacks. Saved custom icons remain embedded data URLs.

Validation commands from the repository root:

```powershell
node tools/custom-team-upload-probes.cjs
.\node_modules\.bin\electron.cmd tools/custom-team-upload-browser.cjs
.\node_modules\.bin\electron.cmd tools/accepted-rendering-production.cjs
```

The controlled callback test passes 32 assertions, including out-of-order reads/decodes, stale failures, interruption, identical-file retry, duplicate add, cancellation and pending-state reset. The isolated Electron test uses a real PNG File, FileReader, Image decoding, Add button, and serialization/reload; all passed. It binds production event handlers explicitly because its scripts run in an isolated function scope. Neither test uses user project storage.

The final accepted-rendering runner passed 28 alignment assertions and 2,531 existing checks; all 464 corpus and 78 Hero image hashes were unchanged. Syntax checks and git diff --check passed. An earlier run correctly rejected a mid-run source edit; the completed rerun passed with stable sources.

Remaining limits: no native Windows file-picker automation or reproduction on the affected PC; large files are not resized or capped; no timeout is imposed on slow reads; Split/non-Hero import-control availability is unchanged. Resetting an upload on a project switch deliberately discards an unadded icon. No claim that these changes resolve the brother's unknown failure.
