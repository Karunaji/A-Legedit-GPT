// Run: .\node_modules\electron\dist\electron.exe tools\phase1-probe.cjs
// Uses isolated storage and hidden windows; never loads the production app startup.
const { app, BrowserWindow, session, nativeImage } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const baseline = process.env.PHASE1_BASELINE || 'ab5bbd1';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'legedit-phase1-'));
app.setPath('userData', path.join(output, 'profile'));
app.disableHardwareAcceleration();
app.on('window-all-closed', () => {}); // Both versions run sequentially.
const scripts = ['hero-template-config.js', 'assets.js', 'keywords.js', 'state.js', 'render.js', 'ui.js'];
const probe = fs.readFileSync(path.join(__dirname, 'phase1-browser-probes.js'), 'utf8');

async function run(version) {
  const isolated = session.fromPartition(`phase1-${version}-${Date.now()}`);
  isolated.webRequest.onBeforeRequest((details, callback) => callback({
    cancel: /\.js(?:[?#]|$)/.test(details.url) || /^https?:/.test(details.url)
  }));
  const win = new BrowserWindow({ show: false, webPreferences: {
    session: isolated, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false
  }});
  const errors = [];
  win.webContents.on('console-message', (_event, level, message) => {
    if (level === 3 && !message.includes('ERR_BLOCKED_BY_CLIENT')) errors.push(message);
  });
  await win.loadFile(path.join(root, 'index.html'));
  // One evaluation keeps the classic scripts' shared lexical declarations intact.
  const code = scripts.map(file => version === 'baseline'
    ? execFileSync('git', ['show', `${baseline}:${file}`], { cwd: root, encoding: 'utf8' })
    : fs.readFileSync(path.join(root, file), 'utf8')).join('\n;\n');
  const result = await win.webContents.executeJavaScript(`(async () => {
    ${code}
    ${probe}
    return await phase1BrowserProbes(${JSON.stringify(version)}, ${process.argv.includes('--checks')});
  })()`, true);
  win.destroy();
  assert.deepEqual(errors, [], `${version}: renderer errors`);
  return result;
}

app.whenReady().then(async () => {
  try {
    const before = process.argv.includes('--checks') ? { images: {} } : await run('baseline');
    const after = await run('current');
    let identical = 0;
    const differences = [];
    for (const [name, image] of Object.entries(before.images)) {
      const a = nativeImage.createFromDataURL(image).toBitmap();
      const b = nativeImage.createFromDataURL(after.images[name]).toBitmap();
      if (a.equals(b)) identical++;
      else {
        differences.push(name);
        for (const [suffix, src] of [['before', image], ['after', after.images[name]]]) {
          fs.writeFileSync(path.join(output, `${name}-${suffix}.png`), nativeImage.createFromDataURL(src).toPNG());
        }
      }
    }
    console.log(JSON.stringify({ baseline, identicalRenders: identical, differences,
      checks: after.checks, output }, null, 2));
    assert.deepEqual(differences, [], 'Accepted fixture renders must be pixel-identical');
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error);
    console.error('Probe output:', output);
    app.exit(1);
  }
});
