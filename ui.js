function rebuildTeamDropdown(selectValue) {
  const sel = document.getElementById('s-team');
  const prev = selectValue !== undefined ? selectValue : sel.value;
  sel.innerHTML = '';
  const none = document.createElement('option'); none.value='none'; none.textContent='None'; sel.appendChild(none);
  const cust = document.createElement('option'); cust.value='custom'; cust.textContent='Custom...'; sel.appendChild(cust);
  [...st.customTeams].sort((a,b)=>a.name.localeCompare(b.name)).forEach(ct => {
    const o = document.createElement('option'); o.value=ct.id; o.textContent=ct.name; sel.appendChild(o);
  });
  BUILTIN_TEAMS.forEach(t => {
    const o = document.createElement('option'); o.value=t.value; o.textContent=t.label; sel.appendChild(o);
  });
  sel.value = ([...sel.options].some(o=>o.value===prev)) ? prev : 'none';
  refreshAbilityTeamIconPickers();
}
function getAbilityTeamIconOptions() {
  const custom = [...(st.customTeams || [])]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(team => ({ value: `team:${team.id}`, label: team.name }));
  const builtin = BUILTIN_TEAMS.map(team => ({ value: `team:${team.value}`, label: team.label }));
  return [...custom, ...builtin];
}
function populateAbilityTeamIconPicker(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Team icon...';
  sel.appendChild(placeholder);
  getAbilityTeamIconOptions().forEach(team => {
    const opt = document.createElement('option');
    opt.value = team.value;
    opt.textContent = team.label;
    sel.appendChild(opt);
  });
  sel.value = [...sel.options].some(option => option.value === prev) ? prev : '';
}
function refreshAbilityTeamIconPickers() {
  ['ability-team-icon-select', 'split-ability-team-icon-select-1', 'split-ability-team-icon-select-2']
    .forEach(populateAbilityTeamIconPicker);
}
function setTeam() {
  const team = document.getElementById('s-team').value;
  document.getElementById('team-icon-ctrls').style.display = team === 'custom' ? 'block' : 'none';
  document.getElementById('team-remove-ctrl').style.display = team.startsWith('custom_') ? 'block' : 'none';
  render();
}
function setTeamIconStatus(message = '', type = '') {
  const el = document.getElementById('team-icon-status');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('warn', type === 'warn');
  el.classList.toggle('error', type === 'error');
}
function setPendingTeamButtonEnabled(enabled) {
  const btn = document.getElementById('team-add-btn');
  if (!btn) return;
  btn.disabled = !enabled;
  btn.style.opacity = enabled ? '1' : '0.5';
}
function imageHasTransparentPixels(img) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, img.naturalWidth || img.width || 1);
  canvas.height = Math.max(1, img.naturalHeight || img.height || 1);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  try {
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 250) return true;
    }
  } catch (_) {
    return null;
  }
  return false;
}
function loadTeamIcon(e) {
  const f = e.target.files[0]; if (!f) return;
  const nameEl = document.getElementById('team-icon-name');
  if (!nameEl.value.trim()) nameEl.value = f.name.replace(/\.[^.]+$/, '');
  setPendingTeamButtonEnabled(false);
  setTeamIconStatus('Loading icon...');
  const r = new FileReader();
  r.onload = ev => {
    const i = new Image();
    i.onload = () => {
      st.pendingTeamImg = i;
      st.pendingTeamSrc = ev.target.result;
      setPendingTeamButtonEnabled(true);
      const hasAlpha = imageHasTransparentPixels(i);
      if (hasAlpha === false && /\.png$/i.test(f.name)) {
        setTeamIconStatus('PNG loaded, but no transparent pixels were found. Any checkerboard/background is part of the image.', 'warn');
      } else if (hasAlpha === true) {
        setTeamIconStatus('Transparent image loaded.');
      } else {
        setTeamIconStatus('Image loaded.');
      }
    };
    i.onerror = () => {
      st.pendingTeamImg = null;
      st.pendingTeamSrc = null;
      setPendingTeamButtonEnabled(false);
      setTeamIconStatus('Could not load this image. Try a standard PNG or JPG file.', 'error');
    };
    i.src = ev.target.result;
  };
  r.onerror = () => {
    st.pendingTeamImg = null;
    st.pendingTeamSrc = null;
    setPendingTeamButtonEnabled(false);
    setTeamIconStatus('Could not read this image file.', 'error');
  };
  r.readAsDataURL(f);
}
function addCustomTeam() {
  if (!st.pendingTeamImg) return;
  const name = document.getElementById('team-icon-name').value.trim() || 'Custom Icon';
  const id = `custom_${_customTeamCounter++}`;
  st.customTeams.push({id, name, img: st.pendingTeamImg, src: st.pendingTeamSrc || st.pendingTeamImg.src || null});
  st.pendingTeamImg = null;
  st.pendingTeamSrc = null;
  document.getElementById('team-icon-name').value = '';
  document.getElementById('team-icon-file').value = '';
  setPendingTeamButtonEnabled(false);
  setTeamIconStatus('');
  rebuildTeamDropdown(id);
  setTeam();
  render();
}
function removeCustomTeam() {
  const team = document.getElementById('s-team').value;
  st.customTeams = st.customTeams.filter(t => t.id !== team);
  rebuildTeamDropdown('none');
  setTeam();
  render();
}
document.addEventListener('DOMContentLoaded', refreshAbilityTeamIconPickers);

function loadArt(e) {
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=ev=>{ const i=new Image(); i.onload=()=>{ st.artImg=i; st.artSrc=ev.target.result; document.getElementById('art-ctrls').style.display='block'; render(); }; i.src=ev.target.result; };
  r.readAsDataURL(f);
}
function clearArt() { st.artImg=null; st.artSrc=null; document.getElementById('art-ctrls').style.display='none'; resetArt(); render(); }
function loadSplitArt(e, side) {
  const f = e.target.files[0]; if (!f) return;
  const key = getSplitSideKey(side);
  const r = new FileReader();
  r.onload = ev => {
    const i = new Image();
    i.onload = () => {
      if (!st.split) st.split = { left: getDefaultSplitHalf('1'), right: getDefaultSplitHalf('2') };
      st.split[key] = { ...(st.split[key] || {}), artImg: i, artSrc: ev.target.result };
      syncSplitArtControlsUI();
      render();
    };
    i.src = ev.target.result;
  };
  r.readAsDataURL(f);
}
function syncSplitArt(side, axis, src) {
  const key = getSplitSideKey(side);
  if (!st.split) st.split = { left: getDefaultSplitHalf('1'), right: getDefaultSplitHalf('2') };
  const ids = {
    s:[`split-sc-s-${side}`,`split-sc-sv-${side}`],
    x:[`split-sc-x-${side}`,`split-sc-xv-${side}`],
    y:[`split-sc-y-${side}`,`split-sc-yv-${side}`]
  };
  const [rid, nid] = ids[axis];
  if (src === 'r') document.getElementById(nid).value = document.getElementById(rid).value;
  else document.getElementById(rid).value = document.getElementById(nid).value;
  st.split[key] = {
    ...(st.split[key] || {}),
    artScale: +document.getElementById(`split-sc-sv-${side}`).value || 100,
    artX: +document.getElementById(`split-sc-xv-${side}`).value || 0,
    artY: +document.getElementById(`split-sc-yv-${side}`).value || 0,
  };
  render();
}
function resetSplitArt(side) {
  [`split-sc-s-${side}`,`split-sc-sv-${side}`].forEach(id => document.getElementById(id).value = 100);
  [`split-sc-x-${side}`,`split-sc-xv-${side}`,`split-sc-y-${side}`,`split-sc-yv-${side}`].forEach(id => document.getElementById(id).value = 0);
  const key = getSplitSideKey(side);
  if (!st.split) st.split = { left: getDefaultSplitHalf('1'), right: getDefaultSplitHalf('2') };
  st.split[key] = { ...(st.split[key] || {}), artScale:100, artX:0, artY:0 };
  render();
}
function clearSplitArt(side) {
  const key = getSplitSideKey(side);
  if (!st.split) st.split = { left: getDefaultSplitHalf('1'), right: getDefaultSplitHalf('2') };
  st.split[key] = { ...(st.split[key] || {}), artImg:null, artSrc:null };
  const ctrls = document.getElementById(`split-art-ctrls-${side}`);
  if (ctrls) ctrls.style.display = 'none';
  resetSplitArt(side);
}

function safeExportName(value, fallback = 'card') {
  return (String(value || fallback)
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '') || fallback);
}

function getExportCardTitle(card) {
  if (!card) return 'card';
  if (card.layout === 'split' && card.split) {
    return [card.split.left?.name, card.split.right?.name].filter(Boolean).join('_') || card.name || 'split_card';
  }
  return card.name || getCardDisplayTitle(card) || 'card';
}

function getExportProjectGroupName(card) {
  if (isProjectType(projectType, 'hero')) {
    if (card?.layout === 'split' && card.split) {
      const heroNames = [card.split.left?.hero, card.split.right?.hero]
        .map(v => String(v || '').trim())
        .filter(Boolean);
      if (heroNames.length) return heroNames.join(' / ');
    }
    return String(card?.hero || projectShared?.heroName || 'Hero').trim() || 'Hero';
  }
  if (isProjectType(projectType, 'villain')) {
    return getVillainSubtitleBase(card?.subtitle || projectShared?.villainGroup || 'Villain') || 'Villain';
  }
  if (isProjectType(projectType, 'henchman')) {
    return String(card?.name || projectShared?.villainGroup || 'Henchman Villain').trim() || 'Henchman Villain';
  }
  if (isProjectType(projectType, 'mastermind')) {
    return String(projectShared?.villainGroup || card?.subtitle || card?.name || 'Mastermind').trim() || 'Mastermind';
  }
  if (isProjectType(projectType, 'scheme')) {
    return String(card?.name || 'Scheme').trim() || 'Scheme';
  }
  return String(projectShared?.heroName || 'Project').trim() || 'Project';
}

function getExportCardTypeLabel(card) {
  if (isProjectType(projectType, 'hero')) return capitalize(card?.rar || 'common');
  if (isProjectType(projectType, 'villain')) return capitalize(card?.villainLayout || 'villain');
  if (isProjectType(projectType, 'henchman')) return 'Henchman';
  if (isProjectType(projectType, 'mastermind')) return card?.mastermindLayout === 'tactic' ? 'Mastermind Tactic' : 'Mastermind';
  if (isProjectType(projectType, 'scheme')) return (card?.schemeLayout || 'a') === 'b' ? 'Scheme Layout B' : 'Scheme Layout A';
  return card?.layout === 'split' ? 'Split' : capitalize(card?.rar || 'card');
}

function getExportFilenameBase(card, fallback = 'card') {
  const group = safeExportName(getExportProjectGroupName(card), 'Project');
  const type = safeExportName(getExportCardTypeLabel(card), 'Card');
  const title = safeExportName(getExportCardTitle(card), fallback);
  return `${group} - ${type} - ${title}`;
}

function downloadCanvasPng(dataUrl, filename) {
  const a=document.createElement('a');
  a.download=filename;
  a.href=dataUrl;
  a.click();
}

function getExportPixelDims() {
  const dims = getCanvasDims();
  return dims.width > dims.height
    ? { width: 1050, height: 750 }
    : { width: 750, height: 1050 };
}

function renderCurrentCardDataUrl() {
  const source = document.createElement('canvas');
  renderToCanvas(source, EXPORT_SCALE);
  const targetDims = getExportPixelDims();
  const output = document.createElement('canvas');
  output.width = targetDims.width;
  output.height = targetDims.height;
  const ctx = output.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, output.width, output.height);
  return output.toDataURL('image/png');
}

async function chooseExportMode() {
  if (window.legendaryDesktop?.chooseExportMode) {
    const result = await window.legendaryDesktop.chooseExportMode();
    return result?.canceled ? null : result?.mode;
  }
  return showAppChoice({
    title: 'Export Cards',
    message: 'Which cards do you want to export?',
    choices: [
      { label: 'Every Card', value: 'all' },
      { label: 'Current Card', value: 'current' }
    ]
  });
}

async function exportCurrentCard() {
  saveActiveCardFromUI();
  const card = cards.find(x => x.id === activeCardId);
  const filename = `${getExportFilenameBase(card)}_legendary.png`;
  downloadCanvasPng(renderCurrentCardDataUrl(), filename);
  setProjectStatus('Card exported');
}

async function exportAllCards() {
  saveActiveCardFromUI();
  const exportCards = getDisplaySortedCards();
  if (!exportCards.length) return;
  const originalActiveId = activeCardId;
  const nameCounts = new Map();
  let exportedCount = 0;
  const desktopFolder = window.legendaryDesktop?.chooseExportFolder
    ? await window.legendaryDesktop.chooseExportFolder()
    : null;
  if (desktopFolder?.canceled) return;

  for (let i = 0; i < exportCards.length; i++) {
    const card = exportCards[i];
    await applyCard(card);
    const base = getExportFilenameBase(card, `card_${i + 1}`);
    const seen = (nameCounts.get(base) || 0) + 1;
    nameCounts.set(base, seen);
    const filename = `${base}${seen > 1 ? `_${seen}` : ''}_legendary.png`;
    const dataUrl = renderCurrentCardDataUrl();
    if (desktopFolder?.folderPath && window.legendaryDesktop?.savePng) {
      await window.legendaryDesktop.savePng({ folderPath: desktopFolder.folderPath, filename, dataUrl });
    } else {
      downloadCanvasPng(dataUrl, filename);
      await new Promise(resolve => setTimeout(resolve, 120));
    }
    exportedCount += 1;
  }

  const restoreCard = cards.find(card => card.id === originalActiveId) || exportCards[0];
  await applyCard(restoreCard);
  const label = `${exportedCount} card${exportedCount === 1 ? '' : 's'}`;
  setProjectStatus(`Exported ${label}`);
  if (desktopFolder?.folderPath && window.legendaryDesktop?.openFolder) {
    const openFolder = await showAppChoice({
      title: 'Export Complete',
      message: `Exported ${label} successfully.`,
      choices: [
        { label: 'Open Folder', value: true },
        { label: 'Done', value: false }
      ]
    });
    if (openFolder) await window.legendaryDesktop.openFolder({ folderPath: desktopFolder.folderPath });
  } else {
    await showAppChoice({
      title: 'Export Complete',
      message: `Exported ${label} successfully.`,
      choices: [
        { label: 'Done', value: true }
      ]
    });
  }
}

async function exportCard() {
  const mode = await chooseExportMode();
  if (!mode) return;
  if (mode === 'all') await exportAllCards();
  else await exportCurrentCard();
}

let previewZoom = 1;
let centerPreviewAfterScale = true;
let classIconDrag = null;
let cardArtDrag = null;

function canDragClassIcons() {
  return false;
}

function getPreviewCanvasPoint(event) {
  const cv = document.getElementById('card');
  const rect = cv.getBoundingClientRect();
  const dims = getCanvasDims();
  return {
    x: ((event.clientX - rect.left) / rect.width) * dims.width,
    y: ((event.clientY - rect.top) / rect.height) * dims.height
  };
}

function clampArtCoord(value) {
  return Math.max(-300, Math.min(300, Math.round(value)));
}

function getSplitHalfScale() {
  const dims = getCanvasDims();
  return Math.min((dims.width / 2) / CW, dims.height / CH);
}

function getCardArtDragTarget(point) {
  if (st.layout === 'split') {
    if (!st.split) st.split = { left: getDefaultSplitHalf('1'), right: getDefaultSplitHalf('2') };
    const dims = getCanvasDims();
    const side = point.x < dims.width / 2 ? '1' : '2';
    const key = getSplitSideKey(side);
    const half = st.split[key];
    if (!half?.artImg) return null;
    return {
      type: 'split',
      side,
      key,
      scale: getSplitHalfScale(),
      artX: half.artX || 0,
      artY: half.artY || 0
    };
  }
  if (!st.artImg) return null;
  return {
    type: 'card',
    scale: 1,
    artX: st.artX || 0,
    artY: st.artY || 0
  };
}

function syncDraggedArtControls(target) {
  if (target.type === 'split') syncSplitArtControlsUI();
  else syncArtControlsUI();
}

function beginCardArtDrag(event) {
  const point = getPreviewCanvasPoint(event);
  const target = getCardArtDragTarget(point);
  if (!target) return false;
  event.preventDefault();
  cardArtDrag = {
    pointerId: event.pointerId,
    startX: point.x,
    startY: point.y,
    ...target
  };
  event.currentTarget.setPointerCapture?.(event.pointerId);
  event.currentTarget.style.cursor = 'grabbing';
  return true;
}

function moveCardArtDrag(event) {
  const cv = document.getElementById('card');
  if (!cardArtDrag) {
    const target = getCardArtDragTarget(getPreviewCanvasPoint(event));
    if (cv) cv.style.cursor = target ? 'grab' : '';
    return false;
  }
  event.preventDefault();
  const point = getPreviewCanvasPoint(event);
  const nextX = clampArtCoord(cardArtDrag.artX + ((point.x - cardArtDrag.startX) / cardArtDrag.scale));
  const nextY = clampArtCoord(cardArtDrag.artY + ((point.y - cardArtDrag.startY) / cardArtDrag.scale));
  if (cardArtDrag.type === 'split') {
    st.split[cardArtDrag.key] = {
      ...(st.split[cardArtDrag.key] || {}),
      artX: nextX,
      artY: nextY
    };
  } else {
    st.artX = nextX;
    st.artY = nextY;
  }
  syncDraggedArtControls(cardArtDrag);
  render();
  return true;
}

function endCardArtDrag(event) {
  if (!cardArtDrag) return false;
  event.currentTarget.releasePointerCapture?.(cardArtDrag.pointerId);
  cardArtDrag = null;
  event.currentTarget.style.cursor = getCardArtDragTarget(getPreviewCanvasPoint(event)) ? 'grab' : '';
  saveActiveCardFromUI();
  scheduleAutoSave();
  return true;
}

function getCurrentClassStack() {
  return st.layout === 'multicolor'
    ? (normalizeMulticolorClasses(st.cls, st.cls2) || [st.cls, st.cls2])
    : [st.cls];
}

function getClassIconAtPoint(point) {
  if (!canDragClassIcons()) return false;
  for (const [index, cls] of getCurrentClassStack().entries()) {
    const p = getClassIconOverlayPlacement(cls, index);
    if (!p) continue;
    if (point.x >= p.cx - p.w / 2 - 4 &&
      point.x <= p.cx + p.w / 2 + 4 &&
      point.y >= p.cy - p.h / 2 - 4 &&
      point.y <= p.cy + p.h / 2 + 4) {
      return { index, cls };
    }
  }
  return null;
}

function beginClassIconDrag(event) {
  if (beginCardArtDrag(event)) return;
  if (!canDragClassIcons()) return;
  const point = getPreviewCanvasPoint(event);
  const hit = getClassIconAtPoint(point);
  if (!hit) return;
  event.preventDefault();
  const currentOffset = st.classIconOffsets?.[hit.index] || {};
  classIconDrag = {
    pointerId: event.pointerId,
    index: hit.index,
    startX: point.x,
    startY: point.y,
    offsetX: currentOffset.x || 0,
    offsetY: currentOffset.y || 0
  };
  event.currentTarget.setPointerCapture?.(event.pointerId);
}

function moveClassIconDrag(event) {
  if (moveCardArtDrag(event)) return;
  const cv = document.getElementById('card');
  if (!classIconDrag) {
    if (cv && canDragClassIcons()) {
      cv.style.cursor = getClassIconAtPoint(getPreviewCanvasPoint(event)) ? 'move' : '';
    }
    return;
  }
  event.preventDefault();
  const point = getPreviewCanvasPoint(event);
  if (!st.classIconOffsets) st.classIconOffsets = {};
  st.classIconOffsets[classIconDrag.index] = {
    x: Math.round(classIconDrag.offsetX + point.x - classIconDrag.startX),
    y: Math.round(classIconDrag.offsetY + point.y - classIconDrag.startY)
  };
  render();
}

function endClassIconDrag(event) {
  if (endCardArtDrag(event)) return;
  if (!classIconDrag) return;
  event.currentTarget.releasePointerCapture?.(classIconDrag.pointerId);
  classIconDrag = null;
  saveActiveCardFromUI();
  scheduleAutoSave();
}

function initClassIconDrag() {
  const cv = document.getElementById('card');
  if (!cv) return;
  cv.addEventListener('pointerdown', beginClassIconDrag);
  cv.addEventListener('pointermove', moveClassIconDrag);
  cv.addEventListener('pointerup', endClassIconDrag);
  cv.addEventListener('pointercancel', endClassIconDrag);
}

function initCardPreviewDrag() {
  initClassIconDrag();
  const cv = document.getElementById('card');
  if (cv) cv.style.touchAction = 'none';
}

function syncPreviewZoomLabel() {
  const el = document.getElementById('preview-zoom-label');
  if (el) el.textContent = `${Math.round(previewZoom * 100)}%`;
}
function adjustPreviewZoom(delta) {
  previewZoom = Math.max(0.6, Math.min(2.5, Math.round((previewZoom + delta) * 100) / 100));
  centerPreviewAfterScale = true;
  scaleCanvas();
}
function resetPreviewZoom() {
  previewZoom = 1;
  centerPreviewAfterScale = true;
  scaleCanvas();
}

function scaleCanvas() {
  const cv=document.getElementById('card');
  const stage = cv.closest('.canvas-stage');
  if (!cv || !stage) return;
  const dims = getCanvasDims();
  const padX = 48;
  const padY = 48;
  const s=Math.min((stage.clientWidth-padX)/dims.width,(stage.clientHeight-padY)/dims.height);
  const scaled = s * previewZoom;
  cv.style.width=Math.round(dims.width*scaled)+'px'; cv.style.height=Math.round(dims.height*scaled)+'px';
  if (centerPreviewAfterScale) {
    requestAnimationFrame(() => {
      stage.scrollLeft = Math.max(0, (stage.scrollWidth - stage.clientWidth) / 2);
      stage.scrollTop = Math.max(0, (stage.scrollHeight - stage.clientHeight) / 2);
      centerPreviewAfterScale = false;
    });
  }
  syncPreviewZoomLabel();
}
