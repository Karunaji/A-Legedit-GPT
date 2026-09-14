// Run: .\node_modules\electron\dist\electron.exe tools\phase1-probe.cjs
// Uses isolated storage and hidden windows; never loads the production app startup.
const { app, BrowserWindow, session, nativeImage } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const baseline = 'ea2bb5c';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'legedit-phase25-'));
app.setPath('userData', path.join(output, 'profile'));
app.disableHardwareAcceleration();
app.on('window-all-closed', () => {}); // Both versions run sequentially.
const scripts = ['hero-template-config.js', 'assets.js', 'keywords.js', 'state.js', 'render.js', 'ui.js'];
const probe = ['phase1-browser-probes.js','phase2-browser-probes.js','phase25-browser-probes.js'].map(file => {
  const source=fs.readFileSync(path.join(__dirname,file),'utf8');
  return file==='phase25-browser-probes.js' ? source : source.replace(/images\[([^\n]+?)\]\s*=\s*canvas.toDataURL\(\);/g, '$&\n        globalThis.phase25Record($1);');
}).join('\n');

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
    return await phase25BrowserProbes(${JSON.stringify(version)});
  })()`, true);
  win.destroy();
  assert.deepEqual(errors, [], `${version}: renderer errors`);
  return result;
}

app.whenReady().then(async () => {
  try {
    const before = await run('baseline'), after = await run('current');
    const same = [], changed = [];
    for (const [name, image] of Object.entries(before.images)) {
      const other = after.images[name];
      const equal = nativeImage.createFromDataURL(image).toBitmap().equals(nativeImage.createFromDataURL(other).toBitmap());
      if (equal) same.push(name);
      else {
        assert(!/__(prose|long)$/.test(name) && !/^phase1__.*-[02]-[13]$/.test(name), 'Unaffected fixture changed: '+name);
        const d = after.diagnostics[name] || [];
        assert(d.some(result => result.effectiveFontSize < result.requestedFontSize && result.blocks?.some(b => b.protected)), 'Unexplained difference: '+name);
        changed.push(name);
      }
      if (!equal || name.startsWith('new__')) for (const [label, src] of [['before',image],['after',other]]) {
        fs.writeFileSync(path.join(output,name+'-'+label+'.png'),nativeImage.createFromDataURL(src).toPNG());
      }
    }
    const report = {baseline,output,checks:after.checks,same,changed,diagnostics:after.diagnostics};
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2));
    const rows = changed.filter(name=>name.startsWith('new__')).map(name=>`<h2>${name}</h2><div><img src="${name}-before.png"><img src="${name}-after.png"></div>`).join('');
    fs.writeFileSync(path.join(output,'review.html'),`<!doctype html><meta charset="utf-8"><style>body{font:16px system-ui}div{display:flex}img{max-width:48%;object-fit:contain}</style><h1>Phase 2 / Phase 2.5</h1>${rows}`);
    console.log(JSON.stringify({output,checks:after.checks.length,identical:same.length,changed:changed.length,changes:changed},null,2));
    app.exit(0);
  } catch(error) { console.error(error.stack); console.error(output); app.exit(1); }
});
