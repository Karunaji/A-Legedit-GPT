// Loaded only in the isolated regression runner, never by application startup.
async function commonUncommonStudy(fixtures) {
  await Promise.all(Object.keys(A).map(loadI));
  await preloadCanvasFonts(); await document.fonts.ready;
  projectType = 'hero'; projectShared = getDefaultProjectShared('hero');
  st.layout = 'single'; rebuildTeamDropdown('none'); syncStartupUI();
  const serialize = l => l ? {
    font:l.effectiveFontSize,requested:l.requestedFontSize,lineH:l.lineH,bottom:l.bottomY,
    painted:l.paintedBounds,overflow:l.overflow,blocks:l.blocks,contourResolved:l.contourResolved,
    lines:l.lines.map(n=>({y:n.y,left:n.left,right:n.right,painted:n.paintedBounds,
      paintedRight:n.paintedRight,text:n.items.map(i=>i.type==='icon'?'['+i.key+']':i.text).join('')}))
  } : null;
  const results=[];
  for (const f of fixtures) {
    st.rar=f.rarity; st.cls=f.cls; st.costAsterisk=!!f.star;
    st.showAttack=f.showAttack??(f.attack>0);st.showRecruit=f.recruit>0;
    st.showAPlus=!!f.attackPlus;st.showRPlus=false;
    for(const [id,value] of Object.entries({'f-atk':f.attack,'f-rec':f.recruit,'f-cost':f.cost,
      'f-name':f.name,'f-hero':f.hero,'ab-sz':f.font??22,'fl-sz':f.flavorFont??18})) {
      document.getElementById(id).value=value;
    }
    document.getElementById('f-ability').innerHTML=f.html;
    document.getElementById('f-flavor').innerHTML=f.flavor?'<i>'+f.flavor+'</i>':'';
    autoFormatAbilityEditor();
    let m;globalThis.onAbilityLayoutDiagnostics=result=>m=result;
    const canvas=document.createElement('canvas');renderToCanvas(canvas,2);
    delete globalThis.onAbilityLayoutDiagnostics;
    let contourSlack=Infinity,minimumIconGap=Infinity,requiredGap=0;
    const contour=typeof getEmbeddedHeroCostContour==='function'?getEmbeddedHeroCostContour():null;
    for(const l of [m.abilityLayout,m.flavorLayout].filter(Boolean)) {
      let previous=null;
      for(const line of l.lines.filter(n=>n.paintedBounds)) {
        if(previous&&(previous.hasIcon||line.hasIcon)) {
          minimumIconGap=Math.min(minimumIconGap,line.paintedBounds.top-previous.paintedBounds.bottom);
          requiredGap=Math.max(requiredGap,l.minimumIconClearance);
        }
        previous=line;
        if(contour)contourSlack=Math.min(contourSlack,contourRightForBand(contour,line.paintedBounds.top,line.paintedBounds.bottom)-line.paintedRight);
      }
    }
    results.push({id:f.id,image:canvas.toDataURL(),rules:serialize(m.abilityLayout),flavor:serialize(m.flavorLayout),
      flavorY:m.flavorY,flavorPlacement:m.flavorPlacement||null,
      paintedGap:m.flavorLayout?m.flavorLayout.paintedBounds.top-m.abilityLayout.paintedBounds.bottom:null,
      flavorClipped:m.flavorLayout?Math.max(0,m.flavorLayout.paintedBounds.bottom-666):0,
      contourSlack:Number.isFinite(contourSlack)?contourSlack:null,
      minimumIconGap:Number.isFinite(minimumIconGap)?minimumIconGap:null,requiredGap});
  }
  return results;
}
