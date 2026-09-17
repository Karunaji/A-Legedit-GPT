// Executed in isolated app scope by hero-flavor-production.cjs.
async function heroFlavorChecks(fixtures, current) {
  const checks=[],results={},images={},rulesImages={},direct=[];
  const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
  await Promise.all(Object.keys(A).map(loadI));await preloadCanvasFonts();await document.fonts.ready;
  projectType='hero';projectShared=getDefaultProjectShared('hero');st.layout='single';st.rar='rare';st.cls='strength';rebuildTeamDropdown('none');syncStartupUI();
  st.showRecruit=true;st.showAttack=true;st.showAPlus=true;st.showRPlus=false;
  document.getElementById('f-rec').value=4;document.getElementById('f-atk').value=0;
  const ctx=document.createElement('canvas').getContext('2d');ctx.textBaseline='top';
  function summarize(l){return l?{fontSize:l.effectiveFontSize,lineH:l.lineH,bottom:l.bottomY,painted:l.paintedBounds,overflow:l.overflow,
    lines:l.lines.map(n=>({y:n.y,left:n.left,right:n.right,painted:n.paintedBounds,text:n.items.map(i=>i.type==='icon'?'['+i.key+']':i.text).join(''),
      items:n.items.map(i=>({type:i.type,text:i.text,key:i.key,x:i.x,y:i.y,width:i.width,height:i.height,font:i.font,underline:i.underline}))}))}:null;}
  function inspect(l,contour,label,verify=true){
    if(verify)check(l.contourResolved,label+' contour converged');let min=Infinity;
    for(const line of l.lines){if(!line.paintedBounds)continue;
      let left=Infinity;contour.rows.forEach((x,k)=>{if(k+1>line.paintedBounds.top-3&&k<line.paintedBounds.bottom+3)left=Math.min(left,x);});
      let right=-Infinity;for(const item of line.items){ctx.font=item.font||ctx.font;right=Math.max(right,item.x+(item.type==='icon'?item.width:ctx.measureText(item.text).actualBoundingBoxRight));}
      if(Number.isFinite(left)){min=Math.min(min,left-right);if(verify)check(right<=left-3+.001,label+' full-band margin '+line.index);}
    }return Number.isFinite(min)?min:null;
  }
  let cfg;const original=drawAdaptiveTextBlock;
  drawAdaptiveTextBlock=(c,q)=>{cfg=q;return original(c,q);};
  for(const cost of [0,8,12])for(const star of [false,true])for(const f of fixtures){
    document.getElementById('f-cost').value=cost;st.costAsterisk=star;
    document.getElementById('f-name').value=f.name;document.getElementById('f-hero').value='Flavor production review';
    document.getElementById('f-ability').innerHTML=f.html;document.getElementById('f-flavor').innerHTML=f.flavor?'<i>'+f.flavor+'</i>':'';
    document.getElementById('ab-sz').value=22;document.getElementById('fl-sz').value=18;autoFormatAbilityEditor();
    let measured;globalThis.onAbilityLayoutDiagnostics=r=>measured=r;
    const c=document.createElement('canvas');renderToCanvas(c,2);delete globalThis.onAbilityLayoutDiagnostics;
    const key=f.id+'__'+cost+'__'+star,r=measured.abilityLayout,l=measured.flavorLayout;
    images[key]=c.toDataURL();const rc=document.createElement('canvas');rc.width=504;rc.height=700;rc.getContext('2d').textBaseline='top';drawRuns(rc.getContext('2d'),r,'#111');rulesImages[key]=rc.toDataURL();
    const gap=l?l.paintedBounds.top-r.paintedBounds.bottom:null;
    const clearance=l?inspect(l,getHeroCostContour(),key,current):null;
    results[key]={fixture:f,cost,star,rules:summarize(r),flavor:summarize(l),flavorY:measured.flavorY,gap,clearance,
      fitting:measured.flavorFitting,placement:measured.flavorPlacement,overflow:measured.overflow,
      clipped:l?Math.max(0,l.paintedBounds.bottom-666):0,fullyClipped:l?l.paintedBounds.top>=666:false};
    if(current&&l){
      check(!l.overflow.missingIcons.length&&!r.overflow.missingIcons.length,key+' no missing inline assets');
      check(gap>=6-.001,key+' six-unit painted gap');
      check(measured.flavorPlacement.targetConverged,key+' target converged');
      if(!measured.flavorPlacement.gapFallback)check(Math.abs(l.paintedBounds.bottom-648)<.001,key+' target 648');
      check(measured.overflow===l.overflow.vertical,key+' final overflow reported');
      check(l.effectiveFontSize===measured.flavorFitting.flavorSize,key+' selected font retained');
      check(measured.flavorPlacement.paintedBottomBeyondClip===Math.max(0,l.paintedBounds.bottom-666),key+' clipping reported');
    }
  }
  if(current){
    // Direct fractional bands, several costs/stars, and top/middle/bottom badge regions.
    const runs=[{t:'Every victory begins with a hero willing to take the first step.',i:true}];
    for(const cost of [0,8,12])for(const star of [false,true]){
      document.getElementById('f-cost').value=cost;st.costAsterisk=star;const contour=getHeroCostContour();
      for(const y of [568.25,579.1,601.765625,630.015625,662.5,682.17,682.19]){
        const l=layoutRuns(ctx,runs,108,y,360,11.64,[],{rightContour:contour,maxBottom:668});
        inspect(l,contour,'direct '+cost+'/'+star+'/'+y);direct.push({cost,star,y,...summarize(l)});
        const m=ctx.measureText;ctx.measureText=()=>{throw Error('Drawing remeasured');};try{drawRuns(ctx,l,'#333');}finally{ctx.measureText=m;}
      }
      const near=direct.filter(d=>d.cost===cost&&d.star===star&&d.y>682);
      check(near[0].lines[0].right===near[1].lines[0].right,'No old width discontinuity '+cost+'/'+star);
    }
    // Formatting, explicit breaks, unusual font sizes and content lengths.
    document.getElementById('f-cost').value=8;st.costAsterisk=false;
    const contour=getHeroCostContour();
    check(contour.rows.some(Number.isFinite),'Visible composited badge contour available');
    const formatted=layoutHeroFlavor(ctx,{...cfg,y:526,w:360,
      flRuns:[{t:'A brave ',i:true},{t:'bold promise',i:true,b:true},{br:true},{t:'And an underlined ending.',i:true,u:true}],
      finalFlavorLayout:{targetBottom:648,minPaintedGap:6,rightContour:contour}},
      {paintedBounds:{bottom:542.5}},13.64);
    inspect(formatted.flavorLayout,contour,'Mixed flavor formatting');
    const formattedItems=formatted.flavorLayout.lines.flatMap(l=>l.items);
    check(formattedItems.some(i=>/bold/.test(i.font)&&/italic/.test(i.font)),'Mixed bold italic retained');
    check(formattedItems.some(i=>i.underline),'Flavor underline retained');
    check(formatted.flavorLayout.lines.length>=2,'Flavor explicit break retained');
    direct.push({formatting:true,placement:formatted.flavorPlacement,...summarize(formatted.flavorLayout)});
    for(const size of [9,11.64,13.64,18])for(const count of [1,4,12,30]){
      const q={...cfg,y:526,w:360,flRuns:[{t:'A quiet promise. '.repeat(count),i:true}],finalFlavorLayout:{targetBottom:648,minPaintedGap:6,rightContour:contour}};
      const rules={paintedBounds:{bottom:542.5}};
      const v=layoutHeroFlavor(ctx,q,rules,size);inspect(v.flavorLayout,contour,'length '+size+'/'+count);
      check(v.flavorLayout.paintedBounds.top>=548.5-.001,'Length gap '+size+'/'+count);
      direct.push({size,count,placement:v.flavorPlacement,...summarize(v.flavorLayout)});
    }
  }
  // Color selector coverage, with flavor and without: all five rare colors.
  for(const cls of ['strength','instinct','tech','range','covert'])for(const hasFlavor of [false,true]){
    st.cls=cls;st.costAsterisk=false;document.getElementById('f-cost').value=8;
    document.getElementById('f-ability').innerHTML=fixtures[1].html;document.getElementById('f-flavor').innerHTML=hasFlavor?'<i>'+fixtures[1].flavor+'</i>':'';
    let m;globalThis.onAbilityLayoutDiagnostics=r=>m=r;const c=document.createElement('canvas');renderToCanvas(c,1);delete globalThis.onAbilityLayoutDiagnostics;
    const key='color__'+cls+'__'+hasFlavor;images[key]=c.toDataURL();results[key]={rules:summarize(m.abilityLayout),flavor:summarize(m.flavorLayout)};
    if(current)check(!!m.flavorPlacement===hasFlavor,key+' selector');
  }
  drawAdaptiveTextBlock=original;return {checks,results,images,rulesImages,direct};
}
