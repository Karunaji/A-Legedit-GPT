const {app,BrowserWindow,session,nativeImage}=require('electron');
const fs=require('fs'),path=require('path'),os=require('os');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'review-artifacts/ability-divider');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'ability-divider-')));
app.disableHardwareAcceleration();app.on('window-all-closed',()=>{});
app.whenReady().then(async()=>{try{
 const s=session.fromPartition('divider');s.webRequest.onBeforeRequest((d,cb)=>cb({cancel:/\.js(?:[?#]|$)/.test(d.url)||/^https?:/.test(d.url)}));
 const w=new BrowserWindow({show:false,webPreferences:{session:s}});await w.loadFile(path.join(root,'index.html'));
 const code=['hero-template-config.js','assets.js','keywords.js','state.js','render.js','ui.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n;\n');
 const result=await w.webContents.executeJavaScript('(async()=>{'+code+String.raw`
 await Promise.all(Object.keys(A).map(loadI));await preloadCanvasFonts();await document.fonts.ready;
 const checks=[];const check=(v,m)=>{if(!v)throw Error(m);checks.push(m);};
 const editor=document.getElementById('f-ability');
 const parse=html=>{editor.innerHTML=html;return parseAbilityRTE(editor);};
 for(const html of ['First<hr>Second','<div>First</div><hr><div>Second</div>','<hr>Second','First<hr>','<hr><hr>']){
   const runs=parse(html);check(runs.filter(r=>r.divider).length===(html.match(/<hr>/g)||[]).length,'parse '+html);
   const clone=document.createElement('div');clone.id='f-ability';clone.innerHTML=JSON.parse(JSON.stringify({abilityHtml:editor.innerHTML})).abilityHtml;
   check(JSON.stringify(parseAbilityRTE(clone))===JSON.stringify(runs),'HTML round trip '+html);
 }
 for(const id of ['f-ability','split-ability-1','split-ability-2']){
   const e=document.getElementById(id);e.style.display='block';
   // Split controls are hidden by the initial Hero mode; make ancestors visible for native editing.
   for(let n=e.parentElement;n&&n!==document.body;n=n.parentElement)n.style.display='block';
   e.innerHTML='BeforeAfter';e.focus();const r=document.createRange();r.setStart(e.firstChild,6);r.collapse(true);
   const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r);
   insertAbilityDivider(id);check(e.querySelectorAll('hr').length===1,id+' insertion');
   check(parseAbilityRTE(e).filter(x=>x.divider).length===1,id+' parsed insertion');
   document.execCommand('undo');check(!e.querySelector('hr'),id+' undo');
   document.execCommand('redo');check(!!e.querySelector('hr'),id+' redo');
   scheduleAbilityAutoFormat(id);await new Promise(resolve=>setTimeout(resolve,420));
   check(!!e.querySelector('hr'),id+' delayed autoformat');
   const deletion=document.createRange();deletion.selectNode(e.querySelector('hr'));
   sel.removeAllRanges();sel.addRange(deletion);document.execCommand('delete');
   check(!e.querySelector('hr'),id+' native deletion');
   e.innerHTML='Keep Replace End';e.focus();const replacement=document.createRange();
   replacement.setStart(e.firstChild,5);replacement.setEnd(e.firstChild,12);
   sel.removeAllRanges();sel.addRange(replacement);insertAbilityDivider(id);
   check(e.textContent==='Keep  End'&&!!e.querySelector('hr'),id+' replace selected text');
 }
 const ctx=document.createElement('canvas').getContext('2d');ctx.textBaseline='top';
 const runs=parse('Fight: Draw a card.<hr><img data-icon="attack"> You get +2 Attack.');
 for(const [name,options,zones] of [
   ['plain',{},[]],['stepped',{},[{y0:0,y1:700,x:260}]],
   ['contour',{rightContour:{rows:new Float64Array(700).fill(280),clearance:3}},[]],
   ['left-boundary',{leftBoundary:[{y:0,x:120},{y:700,x:120}]},[]]]){
   const l=layoutRuns(ctx,runs,108,526,330,22,zones,{...options,abilityBlocks:getAbilityBlocks(runs),maxBottom:668});
   const rule=l.items.find(i=>i.type==='divider');check(!!rule,name+' positioned divider');
   const line=l.lines.find(n=>n.items.includes(rule));check(rule.x===line.left&&rule.x+rule.width<=line.right+.001,name+' bounds');
   check(l.contourResolved!==false&&l.spacingResolved!==false,name+' converges');
   if(name==='contour')check(rule.x+rule.width<=277,name+' clearance');
   const before=l.lines[line.index-1],after=l.lines[line.index+1];
   check(before.paintedBounds.bottom<rule.y&&after.paintedBounds.top>rule.y+rule.height,name+' vertical separation');
 }
 const images={},metrics={};
 for(const rarity of ['common','rare','rare-badge'])for(const divider of [false,true]){
   projectType='hero';projectShared=getDefaultProjectShared('hero');st.layout='single';st.rar=rarity;st.cls='strength';st.costAsterisk=false;
   st.rar=rarity==='rare-badge'?'rare':rarity;
   rebuildTeamDropdown('none');syncStartupUI();st.showAttack=true;st.showRecruit=false;
   for(const [id,v]of Object.entries({'f-name':'Divided Ability','f-hero':'Divider example','f-cost':8,'f-atk':4,'ab-sz':22,'fl-sz':12}))document.getElementById(id).value=v;
   editor.innerHTML=(rarity==='rare-badge'?'Draw a card.<br>Draw another card.<br>Then discard a card.':'Fight: Draw two cards.')+(divider?'<hr>':'<br>')+'<img data-icon="strength">: You get +2 <img data-icon="attack"> this turn.';
   document.getElementById('f-flavor').innerHTML='';autoFormatAbilityEditorById('f-ability');
   const captured=[];globalThis.onAbilityLayoutDiagnostics=x=>captured.push(x);const cv=document.createElement('canvas');renderToCanvas(cv,2);delete globalThis.onAbilityLayoutDiagnostics;
   const key=rarity+'-'+(divider?'after':'before');images[key]=cv.toDataURL();const l=captured[0].abilityLayout;
   metrics[key]={font:l.effectiveFontSize,overflow:l.overflow,lines:l.lines.map(n=>({y:n.y,left:n.left,right:n.right})),divider:l.items.filter(i=>i.type==='divider')};
 }
 for(const family of ['split','villain','scheme']){
   projectType=family==='split'?'hero':family;projectShared=getDefaultProjectShared(projectType);st.layout=family==='split'?'split':'single';syncStartupUI();
   for(const id of ['f-ability','split-ability-1','split-ability-2'])document.getElementById(id).innerHTML='Draw a card.<hr>Then discard a card.';
   const records=[];globalThis.onAbilityLayoutDiagnostics=x=>records.push(x);renderToCanvas(document.createElement('canvas'),1);delete globalThis.onAbilityLayoutDiagnostics;
   check(records.length===(family==='split'?2:1),family+' rendered textboxes');
   check(records.every(r=>r.abilityLayout.items.filter(i=>i.type==='divider').length===1),family+' canvas divider');
 }
 return {checks,images,metrics};})()`,true);
 fs.mkdirSync(out,{recursive:true});for(const[k,v]of Object.entries(result.images))fs.writeFileSync(path.join(out,k+'.png'),nativeImage.createFromDataURL(v).toPNG());
 delete result.images;fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));console.log(result.checks.length+' divider checks passed');w.destroy();app.exit(0);
}catch(e){console.error(e.stack);app.exit(1);}});
