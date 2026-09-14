// Evaluated only by phase1-probe.cjs, in the same scope as the app scripts.
async function phase1BrowserProbes(version, skipImages = false) {
  const checks = [];
  function check(condition, message) {
    if (!condition) throw new Error(message);
    checks.push(message);
  }
  await Promise.all(Object.keys(A).map(loadI));
  await preloadCanvasFonts();
  await document.fonts.ready;
  check(Object.keys(A).every(key => cache[key]), 'All template/icon assets loaded');
  check(document.fonts.check("22px 'eurostile_ltstd_regular'"), 'Card font loaded');
  projectShared = getDefaultProjectShared('hero');
  rebuildTeamDropdown('none');
  // Inline HTML handlers cannot see this probe's isolated lexical scope.
  document.getElementById('f-ability').oninput = onAbilityInput;
  for (const side of ['1', '2']) {
    document.getElementById(`split-ability-${side}`).oninput = () => onSplitAbilityInput(side);
  }
  const images = {};
  const families = [
    ['hero-common', 'hero', 'single', 'common'],
    ['hero-uncommon', 'hero', 'single', 'uncommon'],
    ['hero-rare', 'hero', 'single', 'rare'],
    ['multi-common', 'hero', 'multicolor', 'common'],
    ['multi-uncommon', 'hero', 'multicolor', 'uncommon'],
    ['multi-rare', 'hero', 'multicolor', 'rare'],
    ['split-common', 'hero', 'split', 'common'],
    ['split-rare', 'hero', 'split', 'rare'],
    ['villain', 'villain', 'villain'], ['adversary', 'villain', 'adversary'],
    ['location', 'villain', 'location'], ['trap', 'villain', 'trap'],
    ['henchman', 'henchman', 'henchman'],
    ['mastermind', 'mastermind', 'mastermind'], ['tactic', 'mastermind', 'tactic'],
    ['scheme-a', 'scheme', 'a'], ['scheme-b', 'scheme', 'b']
  ];
  // Avoid the intentionally corrected punctuation/mid-word wrap cases here.
  // These fixtures exercise the actual full-card drawing/fitting paths.
  const fixtures = [
    'Draw a card. Then choose another card from your hand and discard it.',
    'Ambush: Draw a card.<br><br><b>Choose one</b> <i><u>additional card</u></i>.<br>You get +2 /a and /cost.',
    'Draw a card. '.repeat(12)
  ];
  for (const [name, type, layout, rarity] of skipImages ? [] : families) {
    projectType = type;
    projectShared = getDefaultProjectShared(type);
    st.layout = type === 'hero' ? layout : 'single';
    st.rar = rarity || 'common';
    st.cls = 'instinct'; st.cls2 = 'tech';
    document.getElementById('v-layout').value = layout;
    document.getElementById('m-layout').value = layout;
    document.getElementById('scheme-layout').value = layout;
    for (let n = 0; n < fixtures.length; n++) {
      for (const id of ['f-ability', 'split-ability-1', 'split-ability-2']) {
        document.getElementById(id).innerHTML = fixtures[n];
      }
      for (const id of ['f-flavor', 'split-flavor-1', 'split-flavor-2']) {
        document.getElementById(id).innerHTML = n === 2 ? '<i>A little more to say.</i>' : '';
      }
      for (const scale of [1, 3]) {
        const canvas = document.createElement('canvas');
        renderToCanvas(canvas, scale);
        images[`${name}-${n}-${scale}`] = canvas.toDataURL();
      }
    }
  }
  if (version === 'baseline') return { images, checks };

  projectType = 'hero'; projectShared = getDefaultProjectShared('hero');
  st.layout = 'single'; st.rar = 'common';
  syncStartupUI();
  const editor = document.getElementById('f-ability');
  function selectText(start = 0, end = editor.textContent.length) {
    editor.focus();
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let offset = 0, node, first, last;
    while ((node = walker.nextNode())) {
      if (node.parentElement.closest('[data-format-boundary], [data-sel-marker]')) continue;
      if (!first && start <= offset + node.length) first = [node, Math.max(0, start - offset)];
      if (end <= offset + node.length) { last = [node, Math.max(0, end - offset)]; break; }
      offset += node.length;
    }
    const range = document.createRange();
    range.setStart(...first); range.setEnd(...last);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
  }
  function setText(html) {
    window.getSelection().removeAllRanges();
    editor.innerHTML = html;
    autoFormatAbilityEditor();
  }
  function visibleRuns() { return parseRTE(editor).filter(run => run.t?.trim()); }
  function allBold() { return visibleRuns().every(run => run.b); }
  for (const header of ['Fight:', 'Ambush:', 'Escape:', 'KO:', 'Versatile 2:']) {
    setText(header);
    check(allBold() && editor.querySelector('b[data-autobold]')?.textContent === header, `Complete header: ${header}`);
  }
  for (const phrase of ['KO', 'Choose one: Draw a card.']) {
    setText(phrase);
    check(visibleRuns().every(run => !run.b), `No automatic punctuation bold: ${phrase}`);
    selectText(0, phrase.length); fmt('bold');
    check(allBold(), `Manual bold on: ${phrase}`);
    selectText(0, phrase.length); fmt('bold');
    check(visibleRuns().every(run => !run.b), `Manual bold off: ${phrase}`);
  }
  setText('KO: Draw');
  selectText(0, 8); fmt('bold');
  check(allBold(), 'Mixed KO: Draw selection becomes entirely bold');
  selectText(0, 8); fmt('bold');
  check(visibleRuns().every(run => !run.b), 'Mixed KO: Draw selection turns entirely off');
  const saved = JSON.parse(JSON.stringify({ abilityHtml: editor.innerHTML }));
  setText(saved.abilityHtml);
  check(visibleRuns().every(run => !run.b), 'Explicit bold-off survives HTML save/load and auto-format');
  setText('KO:'); selectText(0, 3); fmt('bold');
  check(visibleRuns().every(run => !run.b), 'Selected KO: suppresses automatic bold');
  selectText(0, 3);
  check(restoreAutoBoldInSelectionById('f-ability'), 'Automatic keyword suppression can be restored');
  autoFormatAbilityEditor();
  check(allBold(), 'Restored KO: is automatically bold');
  setText('<b>Choose one:</b> Draw a card.');
  check(visibleRuns()[0].b, 'Explicit manual colon formatting survives load');
  setText('KO:'); selectText(0, 3); fmt('bold');
  selectText(0, 3); fmt('bold');
  check(allBold(), 'Bold button can rebold a suppressed header');
  const storedCard = serializeCardForProject(createCardRecord(collectCardData()));
  const storedProject = JSON.parse(JSON.stringify({version:1,projectType:'hero',cards:[storedCard]}));
  applyProjectData(storedProject);
  await new Promise(resolve => setTimeout(resolve, 400));
  check(allBold(), 'Actual project/card load retains bold after the delayed formatter');
  setText('KO: Draw'); selectText(0, 3); fmt('bold');
  check(visibleRuns().every(run => !run.b), 'Header-only selection leaves unselected Draw unchanged');
  st.layout = 'split';
  syncStartupUI();
  for (const side of ['1','2']) {
    const split = document.getElementById(`split-ability-${side}`);
    split.innerHTML = 'Choose one: Draw a card.';
    split.focus();
    const range = document.createRange(); range.selectNodeContents(split);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
    fmtTarget(split.id, 'bold');
    check(parseRTE(split).filter(run => run.t?.trim()).every(run => run.b), `Split half ${side} manual bold`);
  }

  const ctx = document.createElement('canvas').getContext('2d');
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  const fragmented = layoutRuns(ctx, [{t:'prefix '}, {t:'un'}, {t:'break',b:true}, {t:'able'}], 0,0,75,22);
  const word = fragmented.items.filter(item => ['un','break','able'].includes(item.text));
  check(word.length === 3 && word.every(item => item.y === word[0].y), 'Style changes inside a word do not add wrap opportunities');
  const breaks = layoutRuns(ctx, [{t:'A'},{br:true},{br:true},{t:'B'}],80,526,390,22,[],{leftLineStart:88,leftLineStep:24,lineHeightScale:0.82,blankLineScale:0.26});
  check(breaks.items[1].y === 526 + breaks.lineH + Math.round(breaks.lineH * 0.26)
    && breaks.items[1].x === 136, 'Consecutive breaks retain tuned spacing and slanted line progression');
  const styled = layoutRuns(ctx,[{t:'styled',b:true,i:true,u:true}],0,0,200,22);
  check(styled.items[0].font.includes('italic') && styled.items[0].underline && styled.items[0].font.includes('bold'), 'Combined bold/italic/underline retained');
  const realIcon = layoutRuns(ctx,[{icon:'cost'},{icon:'team:avengers'}],0,0,200,22);
  check(realIcon.items.every(item=>item.img && item.bounds) && !realIcon.overflow.missingIcons.length, 'Cost and team icon placements resolve real assets');
  const overflow = layoutRuns(ctx, [{t:'X'.repeat(100)}, {br:true}, {icon:'missing-team'}], 0,0,50,22,[],{maxBottom:10,requestedFontSize:24});
  check(overflow.overflow.horizontal > 0 && overflow.overflow.belowRegion, 'Horizontal and vertical overflow reported');
  check(overflow.overflow.missingIcons.includes('missing-team'), 'Missing icon reported');
  check(overflow.requestedFontSize === 24 && overflow.effectiveFontSize === 22, 'Requested and effective font sizes reported');
  const originalMeasure = ctx.measureText;
  ctx.measureText = () => { throw new Error('Drawing attempted to measure again'); };
  drawRuns(ctx, fragmented, '#111');
  ctx.measureText = originalMeasure;
  check(true, 'Drawing performs no remeasurement');
  let diagnostic;
  globalThis.onAbilityLayoutDiagnostics = result => { diagnostic = result; };
  const fitted = drawAdaptiveTextBlock(ctx, {abRuns:[{t:'Draw a card. '.repeat(5)}],flRuns:[],x:0,y:0,w:100,abSz:22,flSz:12,maxBottom:80,minAbilitySize:21});
  check(diagnostic === fitted && fitted.abilityLayout.effectiveFontSize === 21, 'Fitting reports and draws its final layout');
  delete globalThis.onAbilityLayoutDiagnostics;
  return { images, checks };
}
