async function heroProductionChecks(fixtures, current) {
  const checks=[],images={},results={},direct=[];
  const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
  await Promise.all(Object.keys(A).map(loadI));await preloadCanvasFonts();await document.fonts.ready;
  projectType='hero';projectShared=getDefaultProjectShared('hero');st.layout='single';st.rar='rare';st.cls='strength';rebuildTeamDropdown('none');syncStartupUI();
  st.showRecruit=true;st.showAttack=true;st.showAPlus=true;st.showRPlus=false;st.costAsterisk=false;
  document.getElementById('f-cost').value=8;document.getElementById('f-rec').value=4;document.getElementById('f-atk').value=0;
  const ctx=document.createElement('canvas').getContext('2d');ctx.textBaseline='top';
  function serialize(layout) {
    return {size:layout.effectiveFontSize,requested:layout.requestedFontSize,lineH:layout.lineH,bottom:layout.bottomY,overflow:layout.overflow,
      contourPasses:layout.contourPasses,contourResolved:layout.contourResolved,spacingResolved:layout.spacingResolved,blocks:layout.blocks,
      lines:layout.lines.map(l=>({y:l.y,left:l.left,right:l.right,top:l.paintedBounds?.top,bottom:l.paintedBounds?.bottom,hasIcon:l.hasIcon,
        text:l.items.map(i=>i.type==='icon'?'['+i.key+']':i.text).join('')}))};
  }
  // Independent oracle: enumerate all occupied pixel rows intersecting the band.
  function oracle(contour,top,bottom){let right=Infinity;
    contour.rows.forEach((left,row)=>{if(row+1>top-3&&row<bottom+3)right=Math.min(right,left-3);});return right;}
  function inspect(layout,contour,label) {
    check(layout.contourResolved,label+' contour converged');check(layout.spacingResolved!==false,label+' spacing converged');
    let previous;
    for(const l of layout.lines){if(!l.paintedBounds)continue;
      const right=oracle(contour,l.paintedBounds.top,l.paintedBounds.bottom);
      check(l.right<=right+.001,label+' final band safe '+l.index);
      let paintedRight=-Infinity;
      for(const i of l.items){let end=i.x+i.width;
        if(i.type==='text'){ctx.font=i.font;end=i.x+Math.max(i.width,ctx.measureText(i.text).actualBoundingBoxRight||0);}
        paintedRight=Math.max(paintedRight,end);
      }
      if(layout.overflow.horizontal<=1)check(paintedRight<=right+.001,label+' painted right safe '+l.index+' '+JSON.stringify({paintedRight,right,lineRight:l.right,items:l.items.map(i=>({text:i.text,key:i.key,x:i.x,width:i.width,font:i.font})),overflow:layout.overflow}));
      if(previous&&(previous.hasIcon||l.hasIcon))check(l.paintedBounds.top-previous.bottom>=Math.max(1,layout.effectiveFontSize*.08)-.001,label+' icon gap '+l.index);
      previous={bottom:l.paintedBounds.bottom,hasIcon:l.hasIcon};
    }
  }
  const originalAdaptive=drawAdaptiveTextBlock;let lastCfg;
  for(const mode of ['adaptive','fixed']) {
    drawAdaptiveTextBlock=function(c,cfg){lastCfg=mode==='fixed'?{...cfg,minAbilitySize:cfg.abSz,abilityAbsoluteMinimum:cfg.abSz}:cfg;return originalAdaptive(c,lastCfg);};
    for(const fixture of fixtures){
      document.getElementById('f-name').value=fixture.name;document.getElementById('f-hero').value='Modern Hero calibration';
      document.getElementById('f-ability').innerHTML=fixture.html;document.getElementById('f-flavor').innerHTML=fixture.flavor;
      document.getElementById('ab-sz').value=fixture.fontSize;autoFormatAbilityEditor();
      let measured;globalThis.onAbilityLayoutDiagnostics=r=>measured=r;
      const canvas=document.createElement('canvas');renderToCanvas(canvas,1);delete globalThis.onAbilityLayoutDiagnostics;
      const label=mode+'__'+fixture.name,layout=measured.abilityLayout;
      images[label]=canvas.toDataURL();results[label]={ability:serialize(layout),flavor:measured.flavorLayout?serialize(measured.flavorLayout):null,flavorY:measured.flavorY};
      if(current){
        check(layout.lines[0].left===108&&layout.lines[0].y===526,label+' origin retained');
        check(layout.lineH===Math.round(layout.effectiveFontSize*27/22),label+' relative minimum');
        check(layout.effectiveFontSize<=fixture.fontSize,label+' no enlargement');inspect(layout,getHeroCostContour(),label);
        if(mode==='fixed')check(layout.effectiveFontSize===fixture.fontSize,label+' fixed comparison size');
        if(fixture.flavor){
          // Compare the untouched pre-change fitter/flavor function, supplying
          // only the new ability layout to its ability call. Flavor calls pass through.
          const originalLayout=layoutRuns;
          layoutRuns=function(c,r,x,y,w,size,zones,opt){
            if(opt?.abilityBlocks)return originalLayout(c,r,x,y,lastCfg.abilityLayout.width,size,lastCfg.abilityLayout.avoidZones,{...opt,...lastCfg.abilityLayout.options});
            return originalLayout(c,r,x,y,w,size,zones,opt);
          };
          try{
            const reference=referenceAdaptiveTextBlock(ctx,lastCfg);
            check(JSON.stringify(serialize(reference.flavorLayout))===JSON.stringify(serialize(measured.flavorLayout)),label+' original flavor/fitting output retained');
            check(reference.flavorY===measured.flavorY,label+' original flavor origin formula retained');
          }finally{layoutRuns=originalLayout;}
        }
      }
      if(mode==='adaptive'&&['badge','mixed','crowded','flavor'].includes(fixture.name)){
        const full=document.createElement('canvas');renderToCanvas(full,3);images[label+'__export3']=full.toDataURL();
      }
    }
  }
  drawAdaptiveTextBlock=originalAdaptive;
  if(current){
    check(TEXTBOX_ICONS.statScale===1.72,'Production stat scale retained');
    // Small sizes, fractional Y, upper/widest/lower badge bands and two-digit / starred cost.
    const patterns=[[{t:'Draw two cards. Then discard a card. Reveal another card from your deck.'}],
      [{t:'You get +2 '},{icon:'attack'},{t:' and +1 '},{icon:'recruit'},{t:'. Then draw another card.'}],
      [{icon:'strength'},{t:': You get +2 '},{icon:'attack'},{br:true,fullLine:true},{t:'Draw a card. Then discard a card.'}]];
    for(const cost of [0,8,12])for(const star of [false,true]){
      document.getElementById('f-cost').value=cost;st.costAsterisk=star;const contour=getHeroCostContour();
      const badge=document.createElement('canvas');badge.width=CW;badge.height=CH;
      const bx=badge.getContext('2d'),cp=P.cost,cfg=STAT_NUMBERS.cost;
      drawCenteredAssetBounds(bx,'cost_rare',(cp.x0+cp.x1)/2+(cfg.offsetX||0),(cp.y0+cp.y1)/2+(cfg.offsetY||0));
      st.showRecruit=false;st.showAttack=false;drawOverlayStatNumbers(bx);st.showRecruit=true;st.showAttack=true;
      const pixels=bx.getImageData(0,0,CW,CH).data;
      for(let row=0;row<CH;row++){let left=Infinity;for(let x=0;x<CW;x++)if(pixels[(row*CW+x)*4+3]>64){left=x;break;}
        check(left===contour.rows[row],'Composited badge matches '+cost+'/'+star+'/'+row);}
      for(const size of [22,21,19.5,16])for(const y of [550,568.25,579.1,579.5,579.9,600.75,635.25,660.5])for(let p=0;p<patterns.length;p++){
        const runs=patterns[p],l=layoutRuns(ctx,runs,108,y,330,size,[],{abilityBlocks:getAbilityBlocks(runs),maxBottom:668,lineAdvanceRatio:27/22,rightContour:contour});
        const label=[cost,star,size,y,p].join('/');inspect(l,contour,label);
        check(l.lineH===Math.round(size*27/22),label+' line advance');
        direct.push({label,...serialize(l)});
      }
    }
    document.getElementById('f-cost').value=8;st.costAsterisk=false;const contour=getHeroCostContour();
    const br={br:true,fullLine:true},runs=[{t:'Draw.'},br,br,{t:'Draw.'}];
    const l=layoutRuns(ctx,runs,108,526,330,22,[],{abilityBlocks:getAbilityBlocks(runs),lineAdvanceRatio:27/22,rightContour:contour});
    check(l.lines[2].y-l.lines[0].y===54,'Full explicit empty line retained');
    const measure=ctx.measureText;ctx.measureText=()=>{throw Error('Draw remeasured');};drawRuns(ctx,l,'#111');ctx.measureText=measure;check(true,'Contour draw does not measure');
    // No midpoint hole: exact pixel-row oracle applies throughout the old gap.
    for(let n=0;n<=100;n++){const y=579+n/100;check(contourRightForBand(contour,y-.5,y+21)===oracle(contour,y-.5,y+21),'Fractional hole absent '+n);}
  }
  return {checks,images,results,direct};
}
