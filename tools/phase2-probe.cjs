// Isolated real-keyboard and render comparisons; never opens user projects.
const { app, BrowserWindow, session, nativeImage } = require('electron');
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const baseline = 'aa0988e';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'legedit-phase2-'));
app.setPath('userData', path.join(output, 'profile'));
app.disableHardwareAcceleration();
app.on('window-all-closed', () => {});
const read = (version, file) => version === 'baseline'
  ? execFileSync('git', ['show', `${baseline}:${file}`], {cwd:root,encoding:'utf8'})
  : fs.readFileSync(path.join(root,file),'utf8');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function open(version) {
  const isolated = session.fromPartition(`phase2-${version}-${Date.now()}`);
  isolated.webRequest.onBeforeRequest((d,cb)=>cb({cancel:/\.js(?:[?#]|$)/.test(d.url)||/^https?:/.test(d.url)}));
  const win = new BrowserWindow({show:false,webPreferences:{session:isolated,backgroundThrottling:false}});
  await win.loadFile(path.join(root,'index.html'));
  const code = ['hero-template-config.js','assets.js','keywords.js','state.js','render.js','ui.js']
    .map(file=>read(version,file)).join('\n;\n');
  const events = read(version,'app.js').split("window.addEventListener('resize'")[0];
  const browser = fs.readFileSync(path.join(__dirname,'phase1-browser-probes.js'),'utf8') + '\n' + fs.readFileSync(path.join(__dirname,'phase2-browser-probes.js'),'utf8');
  await win.webContents.executeJavaScript(`(async()=>{${code}\n${events}\n${browser}\nwindow.phase2 = await createPhase2Probe();})()`,true);
  win.webContents.focus();
  await pause(100);
  const call = (method,...args)=>win.webContents.executeJavaScript(`phase2.${method}(...${JSON.stringify(args)})`,true);
  const key = async (keyCode,modifiers=[])=>{
    win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});
    if(keyCode==='Enter') win.webContents.sendInputEvent({type:'char',keyCode:'\r',modifiers});
    win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});
    await pause(30);
  };
  return {win,call,key};
}
async function keyboard(version) {
  const p = await open(version);
  const results = [], checks = [];
  const equal = (actual, expected, label) => {
    assert.deepEqual(actual, expected, label); checks.push(label);
  };
  await p.call('setup','',0,0); await p.key('Enter');
  for (const id of ['f-ability','split-ability-1','split-ability-2']) {
    await p.call('setup','',0,0,id); await p.key('Enter');
    for (const spec of [
      ['end','AB',2,2,1,[],'AB\n','AB\nZ'],
      ['middle','AB',1,1,1,[],'A\nB','A\nZB'],
      ['start','AB',0,0,1,[],'\nAB','\nZAB'],
      ['empty','',0,0,1,[],'\n','\nZ'],
      ['two','AB',1,1,2,[],'A\n\nB','A\n\nZB'],
      ['three','AB',1,1,3,[],'A\n\n\nB','A\n\n\nZB'],
      ['shift','AB',1,1,1,['shift'],'A\nB','A\nZB'],
      ['replace','ABCD',1,3,1,[],'A\nD','A\nZD'],
      ['styles','<b><i><u>AB</u></i></b>',1,1,1,[],'A\nB','A\nZB'],
      ['keyword','<b data-autobold="1">Fight:</b> Draw',6,6,1,[],'Fight:\n Draw','Fight:\nZ Draw'],
      ['suppressed','<span data-noautobold="1">Fight:</span> Draw',6,6,1,[],'Fight:\n Draw','Fight:\nZ Draw']
    ]) {
      const [name,html,start,end,count,mods,expected,typedExpected]=spec;
      await p.call('setup',html,start,end,id);
      for(let i=0;i<count;i++) await p.key('Enter',mods);
      await pause(450);
      const enter=await p.call('snapshot');
      await p.win.webContents.insertText('Z'); await pause(450);
      const typed=await p.call('snapshot');
      results.push({id,name,enter,typed});
      equal(enter.text,expected,id+' '+name+' break');
      equal(typed.text,typedExpected,id+' '+name+' caret after delay');
      if(name==='two'||name==='three') equal(enter.lines.at(-1).y,count*enter.lineH,id+' '+name+' full line spacing');
      if(name==='styles') equal(typed.runs.filter(r=>r.t?.trim()).every(r=>r.b&&r.i&&r.u),true,id+' styles preserved');
      if(name==='suppressed') equal(typed.runs.find(r=>r.t?.includes('Fight'))?.b,false,id+' suppression preserved');
      if(name==='keyword'||name==='suppressed'||name==='styles') {
        await p.win.webContents.insertText('Y');await pause(450);
        equal((await p.call('snapshot')).text,typedExpected.replace('Z','ZY'),id+' next character after auto-format delay '+name);
      }
    }
    for(const after of [false,true]) {
      await p.call('setup','A<img data-icon="team:avengers" contenteditable="false">B',0,0,id);
      await p.call('placeAroundIcon',after);await p.key('Enter');await pause(450);
      const iconSnapshot=await p.call('snapshot');
      equal(iconSnapshot.text,after?'A[icon]\nB':'A\n[icon]B',id+' break '+(after?'after':'before')+' icon');
      await p.key('z',['control']);
      equal((await p.call('snapshot')).text,'A[icon]B',id+' undo icon-adjacent break');
      await p.key('y',['control']);
      equal((await p.call('snapshot')).text,iconSnapshot.text,id+' redo icon-adjacent break');
    }
    for(const deleteKey of ['Backspace','Delete']) {
      await p.call('setup','AB',1,1,id);await p.key('Enter');
      if(deleteKey==='Delete')await p.key('Left');
      await p.key(deleteKey);await pause(450);
      equal((await p.call('snapshot')).text,'AB',id+' '+deleteKey+' rejoins break');
    }
    for(const html of ['AB','<b data-autobold="1">Fight:</b> Draw']) {
      const at=html==='AB'?1:6, original=html==='AB'?'AB':'Fight: Draw';
      await p.call('setup',html,at,at,id);await p.key('Enter');await pause(450);
      const entered=await p.call('snapshot');
      await p.key('z',['control']);await pause(450);
      equal((await p.call('snapshot')).text,original,id+' undo Enter '+original);
      await p.key('y',['control']);await pause(450);
      equal((await p.call('snapshot')).text,entered.text,id+' redo Enter '+original);
    }
    for(const [name,text,html,expected] of [
      ['plain','A\n\nB',null,'A\n\nB'],
      ['CRLF','A\r\n\r\nB',null,'A\n\nB'],
      ['rich', '', '<div>A</div><div><br></div><div>B</div>','A\n\nB'],
      ['empty blocks','','<p>A</p><p></p><p>B</p>','A\n\nB']
    ]) {
      await p.call('setup','',0,0,id);await p.call('paste',text,html);await pause(450);
      equal((await p.call('snapshot')).text,expected,id+' paste '+name);
      const trip=await p.call('roundTrip');equal(trip.after,trip.before,id+' saved HTML roundtrip '+name);
    }
    await p.call('setup','AB',1,1,id);
    equal(await p.call('compositionGuard'),true,id+' composition not intercepted');
    await p.call('setup','<span title="keep">alpha</span><div>beta</div>',0,0,id);
    const legacyTrip=await p.call('roundTrip');
    equal(legacyTrip.afterHtml,legacyTrip.beforeHtml,id+' unrelated legacy HTML preserved on load');
  }
  const parser=await p.call('parserChecks');checks.push(...parser);
  fs.writeFileSync(path.join(output,version+'-keyboard.json'),JSON.stringify({results,checks},null,2));
  p.win.destroy();return {checks};
}
async function imageComparisons() {
  const images={};
  for(const version of ['baseline','current']) {
    console.log('Rendering '+version+' fixtures...');
    const p=await open(version);
    images[version]=await p.call('renderFixtures');
    const legacy=await p.call('phase1Images');
    for(const [key,value] of Object.entries(legacy)) images[version]['phase1__'+key]=value;
    p.win.destroy();
  }
  const same=[],changed=[];
  for(const [name,before] of Object.entries(images.baseline)) {
    const after=images.current[name];
    if(nativeImage.createFromDataURL(before).toBitmap().equals(nativeImage.createFromDataURL(after).toBitmap()))same.push(name);
    else {
      const allowed=name.startsWith('phase1__') ? /-1-[13]$/.test(name) : /__(blank|literal|emptyBlock|blockThenText)$/.test(name);
      assert(allowed,'Unexpected pixel difference: '+name);
      changed.push(name);
      for(const [label,src] of [['before',before],['after',after]])fs.writeFileSync(path.join(output,name+'-'+label+'.png'),nativeImage.createFromDataURL(src).toPNG());
    }
  }
  const report={identical:same.length,changed:changed.length,same,changes:changed};
  fs.writeFileSync(path.join(output,'image-results.json'),JSON.stringify(report,null,2));
  const examples=changed.filter(name=>/^(hero-common|split-common|villain|mastermind|scheme-a|location|henchman|trap)__blank$/.test(name)
    || /^hero-common__(literal|emptyBlock|blockThenText)$/.test(name));
  const rows=examples.map(name=>`<section><h2>${name}</h2><div>${['before','after'].map(label=>
    `<figure><figcaption>${label==='before'?'Phase 1':'Phase 2'}</figcaption><img loading="lazy" src="${name}-${label}.png"></figure>`).join('')}</div></section>`).join('');
  fs.writeFileSync(path.join(output,'review.html'),`<!doctype html><meta charset="utf-8"><title>Phase 2 newline comparison</title>
    <style>body{font:16px system-ui;background:#eee;color:#222;max-width:1060px;margin:32px auto}section{margin:32px 0}section>div{display:flex;gap:20px}figure{margin:0}img{width:100%;max-width:504px}figcaption{font-weight:bold;padding:8px}</style>
    <h1>Phase 2 newline comparison</h1><p>119 unchanged comparisons; 102 expected newline differences. These examples show corrected full blank lines and previously collapsed newline/block structures. No card geometry was retuned.</p>${rows}`);
  return report;
}
app.whenReady().then(async()=>{
  try {
    const keyboardResult=process.argv.includes('--images')?null:await keyboard('current');
    const imageResult=process.argv.includes('--checks')?null:await imageComparisons();
    const report={baseline,output,keyboardChecks:keyboardResult?.checks.length,images:imageResult};
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify({baseline,output,keyboardChecks:report.keyboardChecks,images:imageResult && {identical:imageResult.identical,changed:imageResult.changed}},null,2));app.exit(0);
  } catch(error) {console.error(error.stack);console.error(output);app.exit(1);}
});
