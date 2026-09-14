async function phase25BrowserProbes(version) {
  const checks=[], diagnostics={};
  const check=(condition,label)=>{if(!condition)throw Error(label);checks.push(label);};
  let captured=[], prefix='phase1__';
  globalThis.onAbilityLayoutDiagnostics=r=>captured.push(r.abilityLayout);
  globalThis.phase25Record=key=>{
    diagnostics[prefix+key]=captured.map(({requestedFontSize,effectiveFontSize,blocks,overflow})=>({requestedFontSize,effectiveFontSize,blocks,overflow}));
    captured=[];
  };
  const legacy=await phase1BrowserProbes('baseline');
  const phase2=await createPhase2Probe();
  prefix='phase2__';
  const images={...Object.fromEntries(Object.entries(legacy.images).map(([k,v])=>['phase1__'+k,v])),
    ...Object.fromEntries(Object.entries(phase2.renderFixtures()).map(([k,v])=>['phase2__'+k,v]))};
  delete globalThis.onAbilityLayoutDiagnostics;
  function renderFixtures() {
    const families=[['hero-common','hero','single','common'],['hero-uncommon','hero','single','uncommon'],['hero-rare','hero','single','rare'],
      ['multi-common','hero','multicolor','common'],['multi-uncommon','hero','multicolor','uncommon'],['multi-rare','hero','multicolor','rare'],
      ['split-common','hero','split','common'],['split-rare','hero','split','rare'],
      ['villain','villain','villain'],['adversary','villain','adversary'],['location','villain','location'],['trap','villain','trap'],
      ['henchman','henchman','henchman'],['mastermind','mastermind','mastermind'],['tactic','mastermind','tactic'],['scheme-a','scheme','a'],['scheme-b','scheme','b']];
    const fixtures={
      attack:'<img data-icon="team:avengers">: You get +2 <img data-icon="attack">',
      recruit:'<img data-icon="team:avengers">: You get +1 <img data-icon="recruit">.',
      header:'Always Leads: Draw another card from your deck.',
      single:'Master Strike: Each player discards a card',
      prose:'Master Strike: Each player discards a card. Then each player draws a card.',
      long:'Each player may choose to discard any number of cards from their hand to reveal that many cards from the top of their deck and then put all of those revealed cards back in any order they choose',
      styled:'<b data-autobold="1">Fight:</b> You <i>get <u>+2</u></i> <img data-icon="attack">',
      suppressed:'<span data-noautobold="1">Fight:</span> You get +2 <img data-icon="attack">',
      narrowed:'Draw.<br><br><img data-icon="team:avengers">: You get +2 <img data-icon="attack"> and +1 <img data-icon="recruit">',
      mixed:'Draw a card. Then draw another.<br><img data-icon="team:avengers">: You get +2 <img data-icon="attack">',
      competing:'Always Leads: Draw another card from your deck.<br><img data-icon="team:avengers">: You get +2 <img data-icon="attack">'
    };
    const images={};
    for(const [name,type,layout,rarity] of families) {
      projectType=type;projectShared=getDefaultProjectShared(type);st.layout=type==='hero'?layout:'single';st.rar=rarity||'common';st.cls='instinct';st.cls2='tech';
      document.getElementById('v-layout').value=layout;document.getElementById('m-layout').value=layout;document.getElementById('scheme-layout').value=layout;
      for(const [fixture,html] of Object.entries(fixtures)) {
        for(const id of ['f-ability','split-ability-1','split-ability-2'])document.getElementById(id).innerHTML=html;
        for(const id of ['f-flavor','split-flavor-1','split-flavor-2'])document.getElementById(id).innerHTML='';
        const captured=[]; globalThis.onAbilityLayoutDiagnostics=r=>captured.push(r.abilityLayout);
        const canvas=document.createElement('canvas');renderToCanvas(canvas,1);
        diagnostics['new__'+name+'__'+fixture]=captured.map(({requestedFontSize,effectiveFontSize,blocks,overflow})=>({requestedFontSize,effectiveFontSize,blocks,overflow}));
        delete globalThis.onAbilityLayoutDiagnostics;
        images[`new__${name}__${fixture}`]=canvas.toDataURL();
      }
    }
    return images;
  }

  Object.assign(images,renderFixtures());
  if(version==='current') {
    const cases=[
      ['[icon]: You get +2 [attack]',true],['[icon]: You get +1 [recruit].',true],
      ['Always Leads: short single-sentence effect.',true],['Master Strike: Draw a card',true],
      ['Master Strike: Draw a card. Then draw another.',false],['Draw. Then draw',false],
      ['S.H.I.E.L.D. Clearance: Draw a card.',true],['Use 2.5 cards.',true],
      ['Use U.S.A. cards.',true],['Reveal S.H.I.E.L.D. Draw a card.',false],['What If…?: Draw.',true],['Ask Dr. Strange.',false],['Draw etc. cards.',false],
      ['What If...?: Draw a card.',true],['Choose... then draw.',false],
      ['Say "Draw a card."',true],['Draw a card (if possible).',true],
      ['Draw a card?! Then draw another.',false],['',false]
    ];
    for(const [t,want] of cases) check(classifyAbilityBlock([{t}]).eligible===want,'Classifier: '+t);
    check(!classifyAbilityBlock([{t:'Draw',b:true},{t:'.',i:true},{t:' Then draw.'}]).eligible,'Punctuation across styles');
    const ctx=document.createElement('canvas').getContext('2d');ctx.textBaseline='top';
    const runs=[{icon:'team:avengers'},{t:': You '},{t:'get',b:true,i:true,u:true},{t:' +2 '},{icon:'attack'}];
    const raw=layoutRuns(ctx,runs,0,0,1000,22,[],{abilityBlocks:getAbilityBlocks(runs)});
    const width=raw.blocks[0].measuredWidth * 0.91;
    const cfg={abRuns:runs,flRuns:[],x:0,y:0,w:width,abSz:22,flSz:12,maxBottom:500,minAbilitySize:21,abilityAbsoluteMinimum:16};
    const fit=drawAdaptiveTextBlock(ctx,cfg).abilityLayout;
    check(fit.effectiveFontSize>=19&&fit.effectiveFontSize<21,'Expanded allowance used');
    check(fit.blocks[0].protected&&fit.lines.filter(l=>l.items.length).length===1,'Both icons and styles protected together');
    check(fit.items.some(i=>i.underline&&i.font.includes('italic')),'Style retained in protected phrase');
    const next=layoutRuns(ctx,runs,0,0,width,fit.effectiveFontSize+0.5,[],{abilityBlocks:getAbilityBlocks(runs)});
    check(!next.blocks[0].protected,'Largest successful candidate selected');
    const long=drawAdaptiveTextBlock(ctx,{...cfg,abRuns:[{t:'A very long single sentence '.repeat(20)}],maxBottom:10000}).abilityLayout;
    check(long.effectiveFontSize===22&&long.blocks[0].fallback,'Impossible sentence alone does not shrink');
    const small=drawAdaptiveTextBlock(ctx,{...cfg,abSz:10,abRuns:[{t:'X'.repeat(300)}],maxBottom:10000}).abilityLayout;
    check(small.effectiveFontSize===10,'Small user size never enlarged');
    const broken=[...runs,{br:true,fullLine:true},{br:true,fullLine:true},{t:'Draw.'}];
    const b=drawAdaptiveTextBlock(ctx,{...cfg,abRuns:broken}).abilityLayout;
    check(b.blocks.length===3&&!b.blocks[1].eligible,'Empty explicit block preserved');
    check(b.items.at(-1).y===b.items[0].y-getInlineIconPlacement('team:avengers',b.effectiveFontSize).offsetY+2*b.lineH,'Full empty line preserved');
    check(getAbilityBlocks([{icon:'attack'}])[0].eligible,'Icon-only content eligible');
    for(const [name,d] of Object.entries(diagnostics)) {
      check(d.length>0,name+' captured real geometry');
      for(const l of d) check(l.effectiveFontSize<=l.requestedFontSize,name+' never enlarged');
    }
  }
  return {images,checks,diagnostics};
}
