// Actual production calls: no experimental scale or layout overrides.
async function inlineStatProductionFixtures(fixtures){
 await Promise.all(Object.keys(A).map(loadI));await preloadCanvasFonts();await document.fonts.ready;
 projectType='hero';projectShared=getDefaultProjectShared('hero');st.layout='single';st.rar='rare';st.cls='strength';rebuildTeamDropdown('none');syncStartupUI();
 st.showRecruit=true;st.showRPlus=false;st.showAttack=true;st.showAPlus=true;st.costAsterisk=false;
 document.getElementById('f-cost').value=8;document.getElementById('f-rec').value=4;document.getElementById('f-atk').value=0;
 const results=[];const ctx=document.createElement('canvas').getContext('2d');ctx.textBaseline='top';
 for(const f of fixtures){
  document.getElementById('f-name').value=f.id.toUpperCase();document.getElementById('f-hero').value='Inline icon scale comparison';
  document.getElementById('f-ability').innerHTML=f.html;document.getElementById('ab-sz').value=f.font||22;
  document.getElementById('f-flavor').innerHTML='<i>They call him the God of Thunder. His enemies better start praying.</i>';document.getElementById('fl-sz').value=18;autoFormatAbilityEditor();
  let m;globalThis.onAbilityLayoutDiagnostics=r=>m=r;const canvas=document.createElement('canvas');renderToCanvas(canvas,2);delete globalThis.onAbilityLayoutDiagnostics;
  const l=m.abilityLayout;
  let thresholdAt19=null;if(f.id==='centering'){const runs=parseRTE(document.getElementById('f-ability'));const trial=layoutRuns(ctx,runs,108,526,330,19,[],{abilityBlocks:getAbilityBlocks(runs),lineAdvanceRatio:27/22,rightContour:getHeroCostContour(),maxBottom:668});thresholdAt19={font:19,blocks:trial.blocks,lines:trial.lines.length};}
  const lines=l.lines.map(n=>({y:n.y,left:n.left,right:n.right,top:n.paintedBounds.top,bottom:n.paintedBounds.bottom,text:n.items.map(i=>i.type==='icon'?'['+i.key+']':i.text).join(''),items:n.items.map(i=>{
   if(i.type==='icon')return {icon:i.key,x:i.x,top:i.y,bottom:i.y+i.height,height:i.height,exportPixelHeight:i.height*2,width:i.width};
   ctx.font=i.font;const mm=ctx.measureText(i.text);return {text:i.text,x:i.x,top:i.y-mm.actualBoundingBoxAscent,bottom:i.y+mm.actualBoundingBoxDescent,font:i.font};
  })}));
  lines.forEach((n,i)=>{n.previousGap=i?n.top-lines[i-1].bottom:null;n.nextGap=i<lines.length-1?lines[i+1].top-n.bottom:null;});
  if(l.spacingResolved===false||!l.contourResolved||l.overflow.missingIcons.length)throw Error('Unresolved layout/assets '+f.id);
  const clear=l.minimumIconClearance;for(let i=1;i<lines.length;i++){
   if(lines[i].items.some(x=>x.icon)||lines[i-1].items.some(x=>x.icon))if(lines[i].previousGap<clear-.001)throw Error('Icon clearance '+f.id);
  }
  ctx.font=l.effectiveFontSize+"px 'eurostile_ltstd_regular'";const h=ctx.measureText('H');
  results.push({fixture:f,thresholdAt19,image:canvas.toDataURL(),fontSize:l.effectiveFontSize,capHeight:h.actualBoundingBoxAscent+h.actualBoundingBoxDescent,lineH:l.lineH,minimumIconClearance:clear,reference:l.iconReference,
   lines,painted:l.paintedBounds,paintedHeight:l.paintedBounds.bottom-l.paintedBounds.top,logicalHeight:l.bottomY-526,overflow:l.overflow,blocks:l.blocks,
   flavor:{y:m.flavorY,font:m.flavorLayout?.effectiveFontSize,lines:m.flavorLayout?.lines.map(n=>({y:n.y,text:n.items.map(i=>i.text||'').join('')})),painted:m.flavorLayout?.paintedBounds,overflow:m.flavorLayout?.overflow,placement:m.flavorPlacement}});
 }
 return results;
}