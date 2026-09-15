// Isolated measurements; no production startup, project files or storage.
async function phase26BrowserProbes(version, checksOnly = false) {
  const checks=[], metrics={}, diagnostics={};
  const check=(condition,label)=>{if(!condition)throw Error(label);checks.push(label);};
  const current=version==='current';
  await Promise.all(Object.keys(A).map(loadI));
  await preloadCanvasFonts(); await document.fonts.ready;
  projectShared=getDefaultProjectShared('hero');rebuildTeamDropdown('none');syncStartupUI();
  const prior=checksOnly ? {images:{},checks:[],diagnostics:{}} : await phase25BrowserProbes(version);
  const images={...prior.images};checks.push(...prior.checks);
  const ctx=document.createElement('canvas').getContext('2d');ctx.textBaseline='top';
  function summarize(layout) {
    return {size:layout.effectiveFontSize,requested:layout.requestedFontSize,overflow:layout.overflow,
      blocks:layout.blocks,passes:layout.layoutPasses,resolved:layout.spacingResolved,reference:layout.iconReference,
      minimumGap:layout.minimumIconClearance,
      lines:layout.lines.map(line=>{
        let top=Infinity,bottom=-Infinity;
        const items=line.items.map(item=>{
          let t,b;
          if(item.type==='icon'){t=item.y;b=item.y+item.height;}
          else {ctx.font=item.font;const m=ctx.measureText(item.text);t=item.y-m.actualBoundingBoxAscent;b=item.y+m.actualBoundingBoxDescent;
            if(item.underline){t=Math.min(t,item.y+item.size*0.12);b=Math.max(b,item.y+item.size*0.12+1);}}
          top=Math.min(top,t);bottom=Math.max(bottom,b);
          return {text:item.text,key:item.key,x:item.x,y:item.y,width:item.width,height:item.height,top:t,bottom:b};
        });
        return {index:line.index,y:line.y,left:line.left,right:line.right,top:items.length?top:null,bottom:items.length?bottom:null,
          hasIcon:items.some(item=>item.key),items};
      })};
  }
  function checkClearance(summary,label) {
    let previous=null;
    for(const line of summary.lines) {
      if(line.top===null)continue;
      if(previous&&(previous.hasIcon||line.hasIcon))check(line.top-previous.bottom>=summary.minimumGap-0.001,label+' clearance '+line.index);
      previous=line;
    }
    check(summary.resolved,label+' converged');
  }
  const br={br:true,fullLine:true}, text={t:'Draw a card.'}, attack={icon:'attack'}, recruit={icon:'recruit'}, cls={icon:'strength'};
  const cases={textIcon:[text,br,attack,{t:' +2'}],iconText:[attack,{t:' +2'},br,text],
    statStat:[attack,br,recruit],classClass:[cls,br,{icon:'range'}],mixed:[attack,br,cls,br,recruit],
    multiple:[cls,{t:': +2 '},attack,{t:' and +1 '},recruit],first:[attack,br,text],last:[text,br,recruit],
    styled:[{t:'Hg',b:true,i:true,u:true},br,attack,{t:' +2',b:true,i:true,u:true}],
    blank:[attack,br,br,recruit],textOnly:[text,br,text,br,br,text],
    protected:[cls,{t:': You get +2 '},attack],
    wrapped:[{t:'Draw a card. Then gain '},attack,{t:' and recruit '},recruit,{t:' before drawing another card.'}]};
  for(const size of [22,19.5,15,10,8])for(const [name,runs] of Object.entries(cases)) {
    const options={abilityBlocks:getAbilityBlocks(runs),maxBottom:500,lineHeightScale:0.82};
    const layout=layoutRuns(ctx,runs,0,0,name==='wrapped'?130:350,size,[],options);
    const summary=summarize(layout);metrics[size+'__'+name]=summary;
    if(current){
      if(runs.some(r=>r.icon))checkClearance(summary,size+' '+name);
      for(const item of layout.items.filter(i=>i.type==='icon')) {
        const old=getInlineIconPlacement(item.key,size);
        check(item.width===old.width&&item.height===old.height,size+' '+name+' icon dimensions unchanged');
        check(Math.abs(item.y+item.height/2-layout.lines.find(l=>l.items.includes(item)).y-(layout.iconReference.top+layout.iconReference.bottom)/2)<0.001,size+' '+name+' cap centered');
      }
      if(name==='textOnly') {
        const plain=layoutRuns(ctx,runs,0,0,350,size,[],{lineHeightScale:0.82});
        check(JSON.stringify(layout.items)===JSON.stringify(plain.items),size+' text-only positions unchanged');
      }
      if(name==='blank')check(layout.lines[2].y-layout.lines[0].y>=2*layout.lineH,size+' full blank line preserved');
      if(name==='protected')check(layout.blocks[0].protected&&layout.lines.length===1,size+' protected icon phrase intact');
    }
  }
  if(current) {
    // Changing Y must resample the obstruction, including during fitting.
    for(let n=0;n<80;n++) {
      const size=[22,19.5,15,10][n%4];
      const runs=Array.from({length:6+n%9},(_,i)=>i%3===0?{icon:i%2?'attack':'strength'}:i%3===1?{t:' Draw cards. Then gain more. ',i:i%2===0}:br);
      const zones=[{y0:40,y1:100,x1:110},{y0:101,y1:180,x1:165}];
      const result=layoutRuns(ctx,runs,0,0,200,size,zones,{abilityBlocks:getAbilityBlocks(runs),lineHeightScale:0.82,maxBottom:200});
      checkClearance(summarize(result),'Boundary stress '+n);
      for(const line of result.lines){const sample=line.y+size*0.5;const right=sample>=40&&sample<=100?110:sample>=101&&sample<=180?165:200;
        check(line.right===right,'Final Y boundary '+n+' '+line.index);}
      check(result.overflow.vertical===Math.max(0,result.bounds.bottom-200),'Final overflow '+n);
    }
    const result=layoutRuns(ctx,cases.mixed,0,0,300,22,[],{abilityBlocks:getAbilityBlocks(cases.mixed)});
    const saved=ctx.measureText;ctx.measureText=()=>{throw Error('Paint remeasured');};drawRuns(ctx,result,'#111');ctx.measureText=saved;
    check(true,'Final positions painted without measurement');
  }
  if(!checksOnly) {
    const families=[['hero','hero','single'],['villain','villain','villain'],['mastermind','mastermind','mastermind'],
      ['location','villain','location'],['henchman','henchman','henchman'],['trap','villain','trap'],['scheme','scheme','a'],['split','hero','split']];
    const fixtures={textOnly:'Draw a card. Then draw another.<br>Each player discards a card.',
      statLines:'Draw a card.<br>You get +2 <img data-icon="attack">.<br>You get +1 <img data-icon="recruit">.<br>Draw again.',
      classLines:'<img data-icon="strength">: Draw.<br><img data-icon="range">: Draw.<br><img data-icon="tech">: Draw.',
      mixed:'Draw a card.<br><img data-icon="strength">: You get +2 <img data-icon="attack"><br><img data-icon="recruit"> +1<br>Draw again.',
      blank:'Draw.<br><br><img data-icon="strength">: You get +2 <img data-icon="attack"><br><br>Draw.',
      styled:'<b><i><u>Draw a card.</u></i></b><br><img data-icon="strength">: <b>You get +2</b> <img data-icon="attack">',
      comparison:'Ability text goes here.<br><img data-icon="strength">: You may gain 4 <img data-icon="attack"> this turn if you made at least 5 <img data-icon="recruit">.<br>This is a test text block. This is a test text block.'};
    for(const [family,type,layout] of families)for(const [name,html] of Object.entries(fixtures)) {
      projectType=type;projectShared=getDefaultProjectShared(type);st.layout=type==='hero'?layout:'single';st.rar='common';st.cls='instinct';
      document.getElementById('v-layout').value=layout;document.getElementById('m-layout').value=layout;document.getElementById('scheme-layout').value=layout;
      for(const id of ['f-ability','split-ability-1','split-ability-2'])document.getElementById(id).innerHTML=html;
      for(const id of ['f-flavor','split-flavor-1','split-flavor-2'])document.getElementById(id).innerHTML='';
      const captured=[];globalThis.onAbilityLayoutDiagnostics=r=>captured.push(summarize(r.abilityLayout));
      const canvas=document.createElement('canvas');renderToCanvas(canvas,1);delete globalThis.onAbilityLayoutDiagnostics;
      const key='spacing__'+family+'__'+name;images[key]=canvas.toDataURL();diagnostics[key]=captured;
      if(current&&name!=='textOnly')for(const result of captured)checkClearance(result,key);
    }
  }
  return {images,checks,metrics,diagnostics:{...prior.diagnostics,...diagnostics}};
}
