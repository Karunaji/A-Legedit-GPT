async function createPhase2Probe() {
  await Promise.all(Object.keys(A).map(loadI));
  await preloadCanvasFonts(); await document.fonts.ready;
  projectType='hero';projectShared=getDefaultProjectShared('hero');
  rebuildTeamDropdown('none');syncStartupUI();
  let editor=document.getElementById('f-ability');
  editor.oninput=event=>onAbilityInput(event);
  for(const side of ['1','2']) document.getElementById(`split-ability-${side}`).oninput=event=>onSplitAbilityInput(side,event);
  function setup(html,start,end=start,id='f-ability') {
    st.layout=id.startsWith('split')?'split':'single';syncStartupUI();
    editor=document.getElementById(id);
    for(const timer of abilityAutoFormatTimers.values()) clearTimeout(timer);
    abilityAutoFormatTimers.clear();
    window.getSelection().removeAllRanges();
    editor.innerHTML=html;editor.focus();
    editor.querySelectorAll('img[data-icon]').forEach(img => {
      img.src=getEditorInlineIconSrc(img.dataset.icon);
      img.style.cssText='height:1em;width:auto;vertical-align:middle;margin:0 2px';
    });
    const range=document.createRange();
    const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);
    let node,offset=0,a,b;
    while((node=walker.nextNode())) {
      if(!a&&start<=offset+node.length)a=[node,start-offset];
      if(end<=offset+node.length){b=[node,end-offset];break;}
      offset+=node.length;
    }
    if(a&&b){range.setStart(...a);range.setEnd(...b);}
    else{range.selectNodeContents(editor);range.collapse(false);}
    window.getSelection().addRange(range);
  }
  function snapshot() {
    const runs=parseRTE(editor);
    const ctx=document.createElement('canvas').getContext('2d');ctx.textBaseline='top';
    const layout=layoutRuns(ctx,runs,0,0,400,22);
    const selection=window.getSelection();
    return {html:editor.innerHTML,text:runs.map(r=>r.br?'\n':r.icon?'[icon]':r.t).join(''),
      lines:layout.items.map(item=>({text:item.text||item.key,y:item.y})),
      runs,lineH:layout.lineH,
      caret:selection.anchorNode?.nodeName,offset:selection.anchorOffset};
  }
  function placeAroundIcon(after) {
    const range=document.createRange();
    if(after)range.setStartAfter(editor.querySelector('img'));else range.setStartBefore(editor.querySelector('img'));
    range.collapse(true);window.getSelection().removeAllRanges();window.getSelection().addRange(range);
  }
  function paste(text,html) {
    // Synthetic paste has no native default. Use Chromium's insert command to
    // exercise the actual rich/plain clipboard insertion and undo transaction.
    document.execCommand(html?'insertHTML':'insertText',false,html||text);
  }
  function compositionGuard() {
    editor.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
    const e=new InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertParagraph',isComposing:true});
    editor.dispatchEvent(e);
    const untouched=!e.defaultPrevented;
    editor.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));
    return untouched;
  }
  async function roundTrip() {
    const before=snapshot().text;
    const beforeHtml=editor.innerHTML;
    const card=serializeCardForProject(createCardRecord(collectCardData()));
    applyProjectData(JSON.parse(JSON.stringify({version:1,projectType:'hero',cards:[card]})));
    return {before,after:snapshot().text,beforeHtml,afterHtml:editor.innerHTML};
  }
  function renderFixtures() {
    const families=[['hero-common','hero','single','common'],['hero-uncommon','hero','single','uncommon'],['hero-rare','hero','single','rare'],
      ['multi-common','hero','multicolor','common'],['multi-uncommon','hero','multicolor','uncommon'],['multi-rare','hero','multicolor','rare'],
      ['split-common','hero','split','common'],['split-rare','hero','split','rare'],
      ['villain','villain','villain'],['adversary','villain','adversary'],['location','villain','location'],['trap','villain','trap'],
      ['henchman','henchman','henchman'],['mastermind','mastermind','mastermind'],['tactic','mastermind','tactic'],['scheme-a','scheme','a'],['scheme-b','scheme','b']];
    const fixtures={normal:'Draw <b>a card</b>. You get +2 /a.',single:'Draw a card.<br>You get +2 /a.',
      paragraphs:'<div>Draw a card.</div><div>You get +2 /a.</div>',
      blank:'Draw a card.<br><br>You get +2 /a.',literal:'Draw a card.\nYou get +2 /a.',
      emptyBlock:'<div>Draw a card.</div><div></div><div>You get +2 /a.</div>',
      blockThenText:'<div>Draw a card.</div>You get +2 /a.'};
    const images={};
    for(const [name,type,layout,rarity] of families) {
      projectType=type;projectShared=getDefaultProjectShared(type);st.layout=type==='hero'?layout:'single';st.rar=rarity||'common';st.cls='instinct';st.cls2='tech';
      document.getElementById('v-layout').value=layout;document.getElementById('m-layout').value=layout;document.getElementById('scheme-layout').value=layout;
      for(const [fixture,html] of Object.entries(fixtures)) {
        for(const id of ['f-ability','split-ability-1','split-ability-2'])document.getElementById(id).innerHTML=html;
        for(const id of ['f-flavor','split-flavor-1','split-flavor-2'])document.getElementById(id).innerHTML='';
        const canvas=document.createElement('canvas');renderToCanvas(canvas,1);
        images[`${name}__${fixture}`]=canvas.toDataURL();
      }
    }
    return images;
  }
  function parserChecks() {
    const cases=[['A<br>B','A\nB'],['A<br><br>B','A\n\nB'],['A\n\nB','A\n\nB'],
      ['<div>A</div>B','A\nB'],['A<div>B</div>','A\nB'],['<div></div><div>B</div>','\nB'],
      ['<div>A</div><div></div><div>B</div>','A\n\nB'],['<br>',''],['A<br><br>','A\n']];
    const passed=[];
    for(const [html,expected] of cases){
      setup(html,0);const original=editor.innerHTML;const actual=snapshot().text;
      if(actual!==expected)throw Error('Parser '+html+' expected '+JSON.stringify(expected)+' got '+JSON.stringify(actual));
      if(editor.innerHTML!==original)throw Error('Parsing mutated saved HTML');
      passed.push('Parser preserves HTML: '+html);
    }
    return passed;
  }
  async function phase1Images() { return (await phase1BrowserProbes('baseline')).images; }
  return {setup,snapshot,placeAroundIcon,paste,compositionGuard,roundTrip,renderFixtures,parserChecks,phase1Images};
}
