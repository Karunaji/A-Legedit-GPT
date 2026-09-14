let st = {
  layout:'single',
  cls:'range', rar:'common', team:'none',
  cls2:'tech',
  showRecruit:true, showRPlus:true, showAttack:true, showAPlus:true, showStatNums:true,
  costAsterisk:false,
  classIconOffsetX:0, classIconOffsetY:0, classIconOffsets:{},
  artImg:null, artSrc:null, artScale:100, artX:0, artY:0, customTeams:[], pendingTeamImg:null, pendingTeamSrc:null,
  split:{
    left:{ artImg:null, artSrc:null, artScale:100, artX:0, artY:0 },
    right:{ artImg:null, artSrc:null, artScale:100, artX:0, artY:0 }
  },
  ...(HERO_CONFIG.defaultState || {}),
};
let rareBox = null;
let cards = [];
let activeCardId = null;
let projectType = 'hero';
let _cardCounter = 1;
let _cardOrderCounter = 1;
let isApplyingCard = false;
const CARD_RARITY_ORDER = { common: 0, uncommon: 1, rare: 2 };
let cardSortMode = 'manual';
let draggedCardId = null;
const PROJECT_STORAGE_KEY = 'legedit_project_autosave_v1';
const PROJECT_PATH_KEY = 'legedit_project_path_v1';
const RECENT_PROJECTS_KEY = 'legedit_recent_projects_v1';
const AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000;
let autosaveTimer = null;
let autosaveDirty = false;
let autosaveInFlight = false;
let lastSavedProjectPayload = null;
let currentProjectPath = null;
let projectShared = null;
let projectTabs = [];
let activeProjectTabId = null;
let _projectTabCounter = 1;

// Runtime caches and project-type helpers keep the editor logic readable as
// hero, villain-family, mastermind, and scheme support share more UI.
const cache = {};
const pendingAssetLoads = new Set();
const PROJECT_TYPE_LABELS = {
  hero: 'Hero',
  villain: 'Villain',
  henchman: 'Henchman',
  mastermind: 'Mastermind',
  scheme: 'Scheme',
  bystander: 'Bystander'
};
const LARGE_TITLE_PROJECT_TYPES = new Set(['villain', 'henchman', 'mastermind']);
const VILLAIN_EDITOR_PROJECT_TYPES = new Set(['villain', 'henchman', 'mastermind', 'scheme']);
const SHARED_GROUP_PROJECT_TYPES = new Set(['villain', 'henchman', 'mastermind']);

function showAppChoice({ title = 'Confirm', message = '', choices = [] } = {}) {
  const modal = document.getElementById('app-choice-modal');
  const titleEl = document.getElementById('app-choice-title');
  const messageEl = document.getElementById('app-choice-message');
  const actionsEl = document.getElementById('app-choice-actions');
  if (!modal || !titleEl || !messageEl || !actionsEl) {
    return Promise.resolve(choices[0]?.value ?? true);
  }

  titleEl.textContent = title;
  messageEl.textContent = message;
  actionsEl.innerHTML = '';
  modal.tabIndex = -1;
  modal.classList.add('open');

  return new Promise(resolve => {
    const cleanup = value => {
      modal.classList.remove('open');
      actionsEl.innerHTML = '';
      modal.onkeydown = null;
      resolve(value);
    };
    choices.forEach((choice, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `app-choice-btn${index === 0 ? ' primary' : ''}`;
      btn.textContent = choice.label;
      btn.onclick = () => cleanup(choice.value);
      actionsEl.appendChild(btn);
      if (index === 0) setTimeout(() => btn.focus(), 0);
    });
    modal.onkeydown = event => {
      if (event.key === 'Escape') {
        const fallback = choices[choices.length - 1]?.value ?? false;
        cleanup(fallback);
      }
    };
    modal.focus();
  });
}

function showAppConfirm(message, title = 'Confirm') {
  return showAppChoice({
    title,
    message,
    choices: [
      { label: 'Confirm', value: true },
      { label: 'Cancel', value: false }
    ]
  });
}

function getRecentProjects() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_PROJECTS_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter(Boolean).slice(0, 8) : [];
  } catch (_) {
    return [];
  }
}

function rememberRecentProject(filePath) {
  const normalized = normalizeProjectPath(filePath);
  if (!normalized) return;
  const existing = getRecentProjects().filter(path => normalizeProjectPath(path) !== normalized);
  localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify([filePath, ...existing].slice(0, 8)));
}

function getProjectFileLabel(filePath) {
  return String(filePath || '').split(/[\\/]/).pop() || String(filePath || '');
}

function isProjectType(type, expected) {
  return normalizeProjectType(type) === expected;
}
function isVillainEditorProjectType(type = projectType) {
  return VILLAIN_EDITOR_PROJECT_TYPES.has(normalizeProjectType(type));
}
function usesSharedVillainGroup(type = projectType) {
  return SHARED_GROUP_PROJECT_TYPES.has(normalizeProjectType(type));
}
function getCurrentVillainEditorLayout() {
  if (isProjectType(projectType, 'mastermind')) return document.getElementById('m-layout')?.value || 'mastermind';
  if (isProjectType(projectType, 'henchman')) return 'henchman';
  const layoutValue = document.getElementById('v-layout')?.value || 'villain';
  return layoutValue === 'henchman' ? 'villain' : layoutValue;
}
function getDefaultVillainGroupText(type = projectType) {
  const normalized = normalizeProjectType(type);
  if (normalized === 'mastermind') return 'Mastermind';
  if (normalized === 'henchman') return 'Henchman Villain';
  return 'Villain Group';
}
function getVillainSubtitleBase(value) {
  return String(value || '').trim().replace(/^(Location|Trap)\s*-\s*/i, '').trim();
}
function getDefaultVillainSubtitleForLayout(layoutValue, groupValue = projectShared?.villainGroup) {
  const layout = String(layoutValue || 'villain').toLowerCase();
  const group = getVillainSubtitleBase(groupValue) || getDefaultVillainGroupText('villain');
  if (layout === 'henchman') return getDefaultVillainGroupText('henchman');
  if (layout === 'location') return `Location - ${group}`;
  if (layout === 'trap') return `Trap - ${group}`;
  return group;
}
function isAutoVillainSubtitle(value) {
  const current = String(value || '').trim();
  if (!current) return true;
  const base = getVillainSubtitleBase(current);
  return ['villain', 'adversary', 'henchman', 'location', 'trap']
    .some(layoutValue => current === getDefaultVillainSubtitleForLayout(layoutValue, base));
}
function resolveVillainSubtitle(card = {}) {
  const currentSubtitle = String(card.subtitle || '').trim();
  if (currentSubtitle) return currentSubtitle;
  return getDefaultVillainSubtitleForLayout(card.villainLayout || 'villain');
}
function applyVillainLayoutSubtitleDefault(layoutValue) {
  if (normalizeProjectType(projectType) !== 'villain') return;
  const subtitleInput = document.getElementById('v-subtitle');
  const subtitleSizeInput = document.getElementById('v-subtitle-sz');
  if (!subtitleInput) return;
  const currentValue = String(subtitleInput.value || '').trim();
  if (!isAutoVillainSubtitle(currentValue)) return;
  const nextValue = getDefaultVillainSubtitleForLayout(layoutValue, currentValue || projectShared?.villainGroup);
  subtitleInput.value = nextValue;
  if (String(layoutValue || '').toLowerCase() !== 'henchman') {
    projectShared.villainGroup = getVillainSubtitleBase(nextValue);
  }
  if (subtitleSizeInput && (!subtitleSizeInput.value || +subtitleSizeInput.value === 12 || +subtitleSizeInput.value === 24)) {
    subtitleSizeInput.value = getDefaultVillainGroupSize('villain');
  }
  projectShared.villainGroupSize = +(subtitleSizeInput?.value || getDefaultVillainGroupSize('villain'));
}
function getDefaultVillainGroupSize(type = projectType) {
  const normalized = normalizeProjectType(type);
  return LARGE_TITLE_PROJECT_TYPES.has(normalized) ? 24 : 12;
}
function getDefaultVillainNameSize(type = projectType) {
  const normalized = normalizeProjectType(type);
  return LARGE_TITLE_PROJECT_TYPES.has(normalized) ? 34 : 22;
}
function normalizeVillainFamilyNameSize(value, type = projectType) {
  const normalized = normalizeProjectType(type);
  const parsed = +value;
  if (!Number.isFinite(parsed) || parsed <= 0) return getDefaultVillainNameSize(normalized);
  if ((normalized === 'villain' || normalized === 'henchman') && parsed === 22) return getDefaultVillainNameSize(normalized);
  return parsed;
}
function normalizeVillainFamilyGroupSize(value, type = projectType) {
  const normalized = normalizeProjectType(type);
  const parsed = +value;
  if (!Number.isFinite(parsed) || parsed <= 0) return getDefaultVillainGroupSize(normalized);
  if ((normalized === 'villain' || normalized === 'henchman') && parsed === 12) return getDefaultVillainGroupSize(normalized);
  return parsed;
}
function getDefaultMastermindTacticSubtitle() {
  const savedMastermindName = cards.find(card =>
    card &&
    card.mastermindLayout === 'mastermind' &&
    String(card.name || '').trim()
  )?.name;
  const mastermindName = String(savedMastermindName || 'Card Name').trim() || 'Card Name';
  return `Mastermind Tactic - ${mastermindName}`;
}
function getDefaultMastermindSubtitleForLayout(layoutValue) {
  return layoutValue === 'tactic'
    ? getDefaultMastermindTacticSubtitle()
    : getDefaultVillainGroupText('mastermind');
}
function resolveMastermindSubtitle(card = {}) {
  const layoutValue = card.mastermindLayout || 'mastermind';
  const currentSubtitle = String(card.subtitle || '').trim();
  if (layoutValue === 'tactic') {
    if (!currentSubtitle || currentSubtitle === getDefaultVillainGroupText('mastermind')) {
      return getDefaultMastermindSubtitleForLayout('tactic');
    }
    return currentSubtitle;
  }
  if (!currentSubtitle || /^Mastermind Tactic - /i.test(currentSubtitle)) {
    return getDefaultMastermindSubtitleForLayout('mastermind');
  }
  return currentSubtitle;
}
function applyMastermindLayoutSubtitleDefault(layoutValue) {
  if (normalizeProjectType(projectType) !== 'mastermind') return;
  const subtitleInput = document.getElementById('v-subtitle');
  const subtitleSizeInput = document.getElementById('v-subtitle-sz');
  if (!subtitleInput) return;
  const currentValue = String(subtitleInput.value || projectShared?.villainGroup || '').trim();
  const isAutoMastermind = currentValue === getDefaultVillainGroupText('mastermind');
  const isAutoTactic = /^Mastermind Tactic - /.test(currentValue);
  const isBlank = !currentValue;
  if (layoutValue === 'tactic') {
    if (isAutoMastermind || isAutoTactic || isBlank) {
      const nextValue = getDefaultMastermindSubtitleForLayout('tactic');
      subtitleInput.value = nextValue;
      projectShared.villainGroup = nextValue;
      if (subtitleSizeInput && (!subtitleSizeInput.value || +subtitleSizeInput.value === 12 || +subtitleSizeInput.value === 24)) {
        subtitleSizeInput.value = getDefaultVillainGroupSize('mastermind');
      }
      projectShared.villainGroupSize = +(subtitleSizeInput?.value || getDefaultVillainGroupSize('mastermind'));
    }
    return;
  }
  if (isAutoTactic || isBlank) {
    const nextValue = getDefaultMastermindSubtitleForLayout('mastermind');
    subtitleInput.value = nextValue;
    projectShared.villainGroup = nextValue;
    if (subtitleSizeInput && (!subtitleSizeInput.value || +subtitleSizeInput.value === 12 || +subtitleSizeInput.value === 24)) {
      subtitleSizeInput.value = getDefaultVillainGroupSize('mastermind');
    }
    projectShared.villainGroupSize = +(subtitleSizeInput?.value || getDefaultVillainGroupSize('mastermind'));
  }
}
function syncMastermindTacticSubtitles(mastermindNameValue) {
  if (normalizeProjectType(projectType) !== 'mastermind') return;
  const mastermindName = String(mastermindNameValue || '').trim() || 'Card Name';
  const nextSubtitle = `Mastermind Tactic - ${mastermindName}`;
  cards.forEach(card => {
    if (!card || card.mastermindLayout !== 'tactic') return;
    const currentSubtitle = String(card.subtitle || '').trim();
    if (!currentSubtitle || /^Mastermind Tactic - /i.test(currentSubtitle)) {
      card.subtitle = nextSubtitle;
    }
  });
  const activeCard = cards.find(card => card.id === activeCardId);
  if (activeCard?.mastermindLayout === 'tactic') {
    const subtitleInput = document.getElementById('v-subtitle');
    if (subtitleInput) {
      const currentSubtitle = String(subtitleInput.value || '').trim();
      if (!currentSubtitle || /^Mastermind Tactic - /i.test(currentSubtitle)) {
        subtitleInput.value = nextSubtitle;
      }
    }
  }
}
function onVillainNameInput() {
  if (isApplyingCard) return;
  if (normalizeProjectType(projectType) === 'mastermind' && (document.getElementById('m-layout')?.value || 'mastermind') === 'mastermind') {
    syncMastermindTacticSubtitles(document.getElementById('v-name')?.value || '');
    renderCardList();
  }
  render();
}
function getDefaultProjectShared(type = projectType) {
  const normalized = normalizeProjectType(type);
  const defaults = {
    heroName: 'Hero Name',
    heroNameSize: 24,
    villainGroup: getDefaultVillainGroupText(normalized),
    villainGroupSize: getDefaultVillainGroupSize(normalized),
  };
  if (!usesSharedVillainGroup(normalized)) {
    defaults.villainGroup = getDefaultVillainGroupText('villain');
    defaults.villainGroupSize = getDefaultVillainGroupSize('villain');
  }
  return defaults;
}
function normalizeProjectType(value) {
  const v = String(value || 'hero').toLowerCase();
  return PROJECT_TYPE_LABELS[v] ? v : 'hero';
}
projectShared = getDefaultProjectShared('hero');

// Shared text fields live at the project level while card-specific values are
// still stored per card. These helpers keep the two in sync.
function syncProjectSharedFromInputs() {
  projectShared.heroName = document.getElementById('f-hero')?.value || projectShared.heroName;
  projectShared.heroNameSize = +(document.getElementById('hero-sz')?.value || projectShared.heroNameSize || 24);
  const villainSubtitleValue = document.getElementById('v-subtitle')?.value || projectShared.villainGroup;
  const villainLayout = getCurrentVillainEditorLayout();
  if (!(normalizeProjectType(projectType) === 'villain' && villainLayout === 'henchman')) {
    projectShared.villainGroup = normalizeProjectType(projectType) === 'villain'
    ? (getVillainSubtitleBase(villainSubtitleValue) || projectShared.villainGroup)
    : villainSubtitleValue;
  }
  projectShared.villainGroupSize = +(document.getElementById('v-subtitle-sz')?.value || projectShared.villainGroupSize || 12);
}
function syncProjectSharedUI() {
  const heroInput = document.getElementById('f-hero');
  const heroSizeInput = document.getElementById('hero-sz');
  const villainGroupInput = document.getElementById('v-subtitle');
  const villainGroupSizeInput = document.getElementById('v-subtitle-sz');
  if (heroInput) heroInput.value = projectShared.heroName || 'Hero Name';
  if (heroSizeInput) heroSizeInput.value = projectShared.heroNameSize ?? 24;
  if (villainGroupInput) villainGroupInput.value = projectShared.villainGroup || getDefaultVillainGroupText(projectType);
  if (villainGroupSizeInput) villainGroupSizeInput.value = projectShared.villainGroupSize ?? getDefaultVillainGroupSize(projectType);
}
function onProjectSharedInput() {
  if (isApplyingCard) return;
  syncProjectSharedFromInputs();
  renderCardList();
  render();
  scheduleAutoSave();
}
function getCanvasDims() {
  return isProjectType(projectType, 'hero') && st.layout === 'split'
    ? { width: CH, height: CW }
    : { width: CW, height: CH };
}
function getSharedHeroNameFallback() {
  return String(projectShared?.heroName || document.getElementById('f-hero')?.value || 'Hero Name').trim() || 'Hero Name';
}
function shouldReplaceDefaultSplitHeroName(value) {
  const text = String(value || '').trim();
  return !text || text === 'Hero Name 1' || text === 'Hero Name 2';
}
function normalizeSplitNameSize(value) {
  const size = +value;
  return !size || size === 18 ? 34 : size;
}
function normalizeSplitHeroSize(value) {
  const size = +value;
  return !size || size === 10 ? 24 : size;
}
function getDefaultSplitHalf(side) {
  const isLeft = side === '1' || side === 1 || side === 'left';
  const heroName = getSharedHeroNameFallback();
  return {
    cls: isLeft ? 'instinct' : 'covert',
    cls2: 'none',
    recruit: isLeft ? 2 : 4,
    attack: isLeft ? 2 : 2,
    cost: 3,
    showRecruit: true,
    showRPlus: false,
    showAttack: true,
    showAPlus: false,
    name: isLeft ? 'Card Title 1' : 'Card Title 2',
    hero: heroName,
    nameSize: 34,
    heroSize: 24,
    abilitySize: 15,
    flavorSize: 10,
    abilityHtml: isLeft ? 'Ability text 1.' : 'Ability text 2.',
    flavorHtml: '',
    artImg: null,
    artSrc: null,
    artScale: 100,
    artX: 0,
    artY: 0,
  };
}
function getSplitSideKey(side) {
  return side === '1' || side === 1 ? 'left' : 'right';
}
function loadI(k) {
  if (cache[k]) return Promise.resolve(cache[k]);
  if (!A[k]) return Promise.resolve(null);
  return new Promise(r => {
    const i = new Image();
    let done = false;
    const finish = (img) => {
      if (done) return;
      done = true;
      r(img);
    };
    const timer = setTimeout(() => {
      console.warn('Asset load timeout:', k, A[k]);
      finish(null);
    }, 10000);
    i.onload = () => {
      clearTimeout(timer);
      cache[k]=i;
      finish(i);
    };
    i.onerror = () => {
      clearTimeout(timer);
      console.warn('Asset load failed:', k, A[k]);
      finish(null);
    };
    i.src = A[k];
  });
}
function syncStartupUI() {
  const isHeroProject = isProjectType(projectType, 'hero');
  const isVillainProject = isProjectType(projectType, 'villain') || isProjectType(projectType, 'henchman');
  const isMastermindProject = isProjectType(projectType, 'mastermind');
  const isSchemeProject = isProjectType(projectType, 'scheme');
  const isVillainFamilyProject = isVillainProject || isMastermindProject;
  const isMulticolor = st.layout === 'multicolor';
  const isSplit = st.layout === 'split';
  const layoutSec = document.getElementById('layout-sec');
  const villainNameSec = document.getElementById('villain-name-sec');
  const villainSubtitleSec = document.getElementById('villain-subtitle-sec');
  const villainTemplateSec = document.getElementById('villain-template-sec');
  const schemeLayoutSec = document.getElementById('scheme-layout-sec');
  const mastermindLayoutSec = document.getElementById('mastermind-layout-sec');
  const villainStatsSec = document.getElementById('villain-stats-sec');
  const raritySec = document.getElementById('rarity-sec');
  const rarePill = document.getElementById('rarity-rare-pill');
  const multiSec = document.getElementById('multicolor-class-sec');
  const teamSec = document.getElementById('team-faction-sec');
  const splitSec = document.getElementById('split-editor-sec');
  const subtitleLabel = document.getElementById('project-subtitle-label');
  const layoutLabel = document.getElementById('project-layout-label');
  const statsLabel = document.getElementById('project-stats-label');
  const mastermindLayoutSel = document.getElementById('m-layout');
  if (layoutSec) layoutSec.style.display = isHeroProject ? '' : 'none';
  if (villainNameSec) villainNameSec.style.display = (isVillainFamilyProject || isSchemeProject) ? '' : 'none';
  if (villainSubtitleSec) villainSubtitleSec.style.display = isVillainFamilyProject ? '' : 'none';
  if (villainTemplateSec) villainTemplateSec.style.display = isProjectType(projectType, 'villain') ? '' : 'none';
  if (schemeLayoutSec) schemeLayoutSec.style.display = isSchemeProject ? '' : 'none';
  if (mastermindLayoutSec) mastermindLayoutSec.style.display = 'none';
  if (villainStatsSec) villainStatsSec.style.display = isVillainFamilyProject ? '' : 'none';
  if (raritySec) raritySec.style.display = isHeroProject ? '' : 'none';
  if (rarePill) rarePill.style.display = isHeroProject ? '' : 'none';
  if (multiSec) multiSec.style.display = (isHeroProject && isMulticolor) ? '' : 'none';
  if (teamSec) teamSec.style.display = (isHeroProject && !isSplit) ? '' : 'none';
  if (splitSec) splitSec.style.display = isSplit ? '' : 'none';
  if (subtitleLabel) subtitleLabel.textContent = isMastermindProject ? 'Mastermind Group' : 'Villain Group';
  if (layoutLabel) layoutLabel.textContent = 'Villain Layout';
  if (statsLabel) statsLabel.textContent = isMastermindProject ? 'Mastermind Stats' : 'Villain Stats';
  ['class-sec','show-stats-sec','stats-sec','title-sec','hero-sec','ability-sec','flavor-sec','card-art-sec']
    .forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id === 'ability-sec' || id === 'flavor-sec' || id === 'card-art-sec') {
        el.style.display = ((isHeroProject && !isSplit) || isVillainFamilyProject || isSchemeProject) ? '' : 'none';
      } else if (id === 'hero-sec') {
        el.style.display = (isHeroProject && !isSplit) ? '' : 'none';
      } else {
        el.style.display = (isHeroProject && !isSplit) ? '' : 'none';
      }
    });
  const layoutSel = document.getElementById('s-layout');
  if (layoutSel) layoutSel.value = st.layout || 'single';
  const schemeLayoutSel = document.getElementById('scheme-layout');
  if (schemeLayoutSel) {
    const active = cards.find(card => card.id === activeCardId);
    schemeLayoutSel.value = active?.schemeLayout || 'a';
  }
  const projectTypeValue = document.getElementById('project-type-value');
  if (projectTypeValue) projectTypeValue.textContent = PROJECT_TYPE_LABELS[projectType] || 'Hero';
  syncProjectSharedUI();
  document.querySelectorAll('[data-cls]').forEach(x => x.classList.toggle('on', x.dataset.cls === st.cls));
  document.querySelectorAll('[data-cls2]').forEach(x => x.classList.toggle('on', x.dataset.cls2 === st.cls2));
  document.querySelectorAll('[data-rar]').forEach(x => x.classList.toggle('on', x.dataset.rar === st.rar));
}

function syncStatButtonsUI() {
  const statStates = {
    recruit: st.showRecruit,
    rplus: st.showRPlus,
    attack: st.showAttack,
    aplus: st.showAPlus
  };
  Object.entries(statStates).forEach(([key, on]) => {
    const btn = document.querySelector(`[data-stat=${key}]`);
    if (btn) btn.classList.toggle('on', !!on);
  });
}

function syncCostAsteriskUI() {
  const btn = document.getElementById('cost-asterisk');
  if (!btn) return;
  btn.textContent = st.costAsterisk ? 'Cost * On' : 'Cost * Off';
  btn.classList.toggle('on', st.costAsterisk);
}

function syncDeleteCardButtonUI() {
  const btn = document.getElementById('delete-card-btn');
  if (!btn) return;
  const canDelete = cards.length > 1;
  btn.disabled = !canDelete;
  btn.style.opacity = canDelete ? '1' : '0.5';
  btn.style.cursor = canDelete ? 'pointer' : 'not-allowed';
}

function syncCardSortUI() {
  const sel = document.getElementById('card-sort-mode');
  if (!sel) return;
  const rarityOption = sel.querySelector('option[value="rarity"], option[value="vp"]');
  if (rarityOption) {
    if (usesSharedVillainGroup()) {
      rarityOption.value = 'vp';
      rarityOption.textContent = 'VP';
      if (cardSortMode === 'rarity') cardSortMode = 'vp';
    } else {
      rarityOption.value = 'rarity';
      rarityOption.textContent = 'Rarity';
      if (cardSortMode === 'vp') cardSortMode = 'rarity';
    }
  }
  sel.value = cardSortMode;
}

function syncArtControlsUI() {
  document.getElementById('art-ctrls').style.display = st.artImg ? 'block' : 'none';
  document.getElementById('sc-s').value = document.getElementById('sc-sv').value = st.artScale ?? 100;
  document.getElementById('sc-x').value = document.getElementById('sc-xv').value = st.artX ?? 0;
  document.getElementById('sc-y').value = document.getElementById('sc-yv').value = st.artY ?? 0;
}
function syncSplitArtControlsUI() {
  ['1','2'].forEach(side => {
    const key = getSplitSideKey(side);
    const data = st.split?.[key] || getDefaultSplitHalf(side);
    const ctrls = document.getElementById(`split-art-ctrls-${side}`);
    if (ctrls) ctrls.style.display = data.artImg ? 'block' : 'none';
    const s = data.artScale ?? 100;
    const x = data.artX ?? 0;
    const y = data.artY ?? 0;
    const ids = {
      s:[`split-sc-s-${side}`,`split-sc-sv-${side}`],
      x:[`split-sc-x-${side}`,`split-sc-xv-${side}`],
      y:[`split-sc-y-${side}`,`split-sc-yv-${side}`]
    };
    Object.entries({ s, x, y }).forEach(([axis, value]) => {
      ids[axis].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = value;
      });
    });
  });
}

function setProjectStatus(msg, isError = false) {
  const el = document.getElementById('project-status');
  if (!el) return;
  el.textContent = msg || '';
  el.style.color = isError ? '#fca5a5' : '#9ca3af';
}

function createImageFromSrc(src) {
  if (!src) return null;
  const img = new Image();
  img.onload = () => { if (!isApplyingCard) render(); };
  img.src = src;
  return img;
}

function hasDesktopBridge() {
  return !!window.legendaryDesktop;
}

function serializeCustomTeams() {
  return (st.customTeams || []).map(team => ({
    id: team.id,
    name: team.name,
    src: team.src || team.img?.src || null
  }));
}

function serializeCardForProject(card) {
  const next = { ...card };
  delete next.artImg;
  if (next.layout === 'split' && next.split) {
    next.split = {
      left: { ...(next.split.left || {}) },
      right: { ...(next.split.right || {}) }
    };
    delete next.split.left.artImg;
    delete next.split.right.artImg;
  }
  return next;
}

function deserializeCustomTeams(list) {
  const teams = (list || []).map(team => ({
    id: team.id,
    name: team.name,
    src: team.src || null,
    img: createImageFromSrc(team.src || null)
  }));
  const maxId = teams.reduce((max, team) => {
    const n = parseInt(String(team.id || '').replace('custom_', ''), 10);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, -1);
  _customTeamCounter = maxId + 1;
  return teams;
}

function snapshotProject() {
  saveActiveCardFromUI();
  syncProjectSharedFromInputs();
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    projectType,
    shared: { ...projectShared },
    cardSortMode,
    activeCardId,
    cards: cards.map(serializeCardForProject),
    customTeams: serializeCustomTeams()
  };
}

function getProjectFileName(filePath) {
  return String(filePath || '').split(/[\\/]/).filter(Boolean).pop() || '';
}

function normalizeProjectPath(filePath) {
  return String(filePath || '').trim().toLowerCase();
}

function getProjectTabLabel(project = null, filePath = null) {
  const type = normalizeProjectType(project?.projectType || projectType);
  const typeLabel = PROJECT_TYPE_LABELS[type] || 'Project';
  const fileName = getProjectFileName(filePath);
  if (fileName) return fileName.replace(/\.legendary\.json$/i, '').replace(/\.json$/i, '') || typeLabel;
  if (type === 'hero') {
    const heroName = project?.shared?.heroName || projectShared?.heroName || '';
    return `${typeLabel}: ${String(heroName || 'Hero Name').trim()}`;
  }
  if (type === 'villain' || type === 'henchman' || type === 'mastermind') {
    const group = project?.shared?.villainGroup || projectShared?.villainGroup || '';
    return `${typeLabel}: ${String(group || typeLabel).trim()}`;
  }
  const firstCard = project?.cards?.find(card => card.id === project.activeCardId) || project?.cards?.[0] || cards.find(card => card.id === activeCardId) || cards[0];
  return `${typeLabel}: ${String(firstCard?.name || typeLabel).trim()}`;
}

function getLiveProjectTabLabel() {
  return getProjectTabLabel(null, currentProjectPath);
}

function renderProjectTabs() {
  const root = document.getElementById('project-tabs');
  if (!root) return;
  root.innerHTML = '';
  projectTabs.forEach(tab => {
    const btn = document.createElement('div');
    btn.setAttribute('role', 'button');
    btn.tabIndex = 0;
    btn.className = `project-tab${tab.id === activeProjectTabId ? ' active' : ''}`;
    btn.title = tab.filePath || tab.label || 'Unsaved project';
    btn.onclick = () => activateProjectTab(tab.id);
    btn.onkeydown = event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activateProjectTab(tab.id);
      }
    };

    const label = document.createElement('span');
    label.className = 'project-tab-label';
    label.textContent = tab.id === activeProjectTabId ? getLiveProjectTabLabel() : tab.label;
    btn.appendChild(label);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'project-tab-close';
    close.textContent = 'x';
    close.title = 'Close project tab';
    close.onclick = event => {
      event.stopPropagation();
      closeProjectTab(tab.id);
    };
    btn.appendChild(close);

    root.appendChild(btn);
  });
}

function captureCurrentProjectTab() {
  if (!activeProjectTabId || !cards.length) return;
  const tab = projectTabs.find(x => x.id === activeProjectTabId);
  if (!tab) return;
  tab.project = snapshotProject();
  tab.filePath = currentProjectPath || null;
  tab.label = getProjectTabLabel(tab.project, tab.filePath);
}

function createProjectTab(project, filePath = null, options = {}) {
  if (!project || !Array.isArray(project.cards) || !project.cards.length) return null;
  if (filePath) rememberRecentProject(filePath);
  const tab = {
    id: `project_tab_${_projectTabCounter++}`,
    project,
    filePath: filePath || null,
    label: getProjectTabLabel(project, filePath)
  };
  projectTabs.push(tab);
  if (options.activate !== false) {
    activeProjectTabId = tab.id;
    currentProjectPath = tab.filePath;
    applyProjectData(tab.project);
  }
  renderProjectTabs();
  return tab;
}

function ensureProjectTabForCurrentProject() {
  if (activeProjectTabId && projectTabs.some(tab => tab.id === activeProjectTabId)) {
    captureCurrentProjectTab();
    renderProjectTabs();
    return;
  }
  createProjectTab(snapshotProject(), currentProjectPath, { activate: false });
  activeProjectTabId = projectTabs[projectTabs.length - 1]?.id || null;
  renderProjectTabs();
}

function activateProjectTab(tabId) {
  if (tabId === activeProjectTabId) return;
  const next = projectTabs.find(tab => tab.id === tabId);
  if (!next) return;
  captureCurrentProjectTab();
  activeProjectTabId = next.id;
  currentProjectPath = next.filePath || null;
  if (currentProjectPath) {
    localStorage.setItem(PROJECT_PATH_KEY, currentProjectPath);
    rememberRecentProject(currentProjectPath);
  }
  applyProjectData(next.project);
  setProjectStatus(next.filePath ? 'Project tab loaded' : 'Unsaved project tab loaded');
  renderProjectTabs();
}

async function closeProjectTab(tabId) {
  if (projectTabs.length <= 1) return;
  const tab = projectTabs.find(x => x.id === tabId);
  const label = tab?.id === activeProjectTabId ? getLiveProjectTabLabel() : tab?.label || 'this project';
  const shouldClose = await showAppChoice({
    title: 'Close Project?',
    message: `"${label}"\n\nMake sure anything important has been saved first.`,
    choices: [
      { label: 'Close', value: true },
      { label: 'Keep Open', value: false }
    ]
  });
  if (!shouldClose) return;
  if (tabId === activeProjectTabId) captureCurrentProjectTab();
  const index = projectTabs.findIndex(tab => tab.id === tabId);
  if (index === -1) return;
  const wasActive = projectTabs[index].id === activeProjectTabId;
  projectTabs.splice(index, 1);
  if (wasActive) {
    const next = projectTabs[Math.max(0, index - 1)] || projectTabs[0];
    activeProjectTabId = null;
    if (next) activateProjectTab(next.id);
  } else {
    renderProjectTabs();
  }
}

function updateActiveProjectTabFromCurrentProject() {
  captureCurrentProjectTab();
  renderProjectTabs();
}

function openProjectInTab(project, filePath = null, status = 'Project loaded') {
  const normalizedPath = normalizeProjectPath(filePath);
  const existing = normalizedPath
    ? projectTabs.find(tab => normalizeProjectPath(tab.filePath) === normalizedPath)
    : null;
  if (existing) {
    activateProjectTab(existing.id);
    setProjectStatus('Project is already open');
    return;
  }
  captureCurrentProjectTab();
  if (filePath) {
    localStorage.setItem(PROJECT_PATH_KEY, filePath);
    rememberRecentProject(filePath);
  }
  const tab = createProjectTab(project, filePath, { activate: true });
  if (!tab) throw new Error('Invalid project file');
  setProjectStatus(status);
  if (filePath) resetAutoSaveBaseline();
}

function scheduleAutoSave() {
  if (isApplyingCard) return;
  autosaveDirty = true;
  if (autosaveTimer) return;
  autosaveTimer = setTimeout(runAutoSave, AUTOSAVE_INTERVAL_MS);
}

function clearAutoSaveTimer() {
  clearTimeout(autosaveTimer);
  autosaveTimer = null;
}

function resetAutoSaveBaseline(payload = null) {
  try {
    lastSavedProjectPayload = payload || JSON.stringify(snapshotProject());
  } catch (_) {
    lastSavedProjectPayload = null;
  }
  autosaveDirty = false;
  clearAutoSaveTimer();
}

async function runAutoSave() {
  autosaveTimer = null;
  if (isApplyingCard || !autosaveDirty) return;
  if (autosaveInFlight) {
    autosaveTimer = setTimeout(runAutoSave, AUTOSAVE_INTERVAL_MS);
    return;
  }

  autosaveInFlight = true;
  autosaveDirty = false;
  try {
    const payload = JSON.stringify(snapshotProject());
    if (payload === lastSavedProjectPayload) return;
    localStorage.setItem(PROJECT_STORAGE_KEY, payload);
    if (currentProjectPath && hasDesktopBridge()) {
      const result = await window.legendaryDesktop.saveProject({ content: payload, filePath: currentProjectPath });
      if (result?.ok) setProjectStatus('Autosaved to project file');
      else setProjectStatus('Autosaved recovery only');
    } else {
      setProjectStatus('Autosaved locally');
    }
    lastSavedProjectPayload = payload;
  } catch (err) {
    console.warn('Autosave failed:', err);
    setProjectStatus('Autosave failed', true);
  } finally {
    autosaveInFlight = false;
    if (autosaveDirty && !autosaveTimer) {
      autosaveTimer = setTimeout(runAutoSave, AUTOSAVE_INTERVAL_MS);
    }
  }
}

function downloadProjectBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function getProjectSuggestedFilename(project = null) {
  const active = project?.cards?.find(card => card.id === project.activeCardId)
    || project?.cards?.[0]
    || cards.find(card => card.id === activeCardId)
    || cards[0];
  const baseName = (active?.name || getProjectTabLabel(project, null) || 'legendary-project')
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/^_+|_+$/g, '') || 'legendary-project';
  return `${baseName}.legendary.json`;
}

async function saveAllOpenProjects() {
  captureCurrentProjectTab();
  if (!projectTabs.length) ensureProjectTabForCurrentProject();
  let savedCount = 0;

  for (const tab of projectTabs) {
    tab.project.savedAt = new Date().toISOString();
    const json = JSON.stringify(tab.project, null, 2);
    const result = await window.legendaryDesktop.saveProject({
      content: json,
      suggestedName: getProjectSuggestedFilename(tab.project),
      filePath: tab.filePath || null
    });
    if (result?.canceled) {
      setProjectStatus('Save canceled');
      return;
    }
    if (!result?.ok) {
      throw new Error(`Could not save ${tab.label || 'project'}`);
    }
    tab.filePath = result.filePath || tab.filePath;
    tab.label = getProjectTabLabel(tab.project, tab.filePath);
    savedCount += 1;
  }

  const activeTab = projectTabs.find(tab => tab.id === activeProjectTabId);
  currentProjectPath = activeTab?.filePath || currentProjectPath;
  if (currentProjectPath) {
    localStorage.setItem(PROJECT_PATH_KEY, currentProjectPath);
    rememberRecentProject(currentProjectPath);
  }
  lastSavedProjectPayload = activeTab ? JSON.stringify(activeTab.project) : null;
  resetAutoSaveBaseline(lastSavedProjectPayload);
  renderProjectTabs();
  setProjectStatus(`Saved ${savedCount} project${savedCount === 1 ? '' : 's'}`);
}

async function saveCurrentProjectOnly() {
  try {
    const project = snapshotProject();
    const filename = getProjectSuggestedFilename(project);
    const json = JSON.stringify(project, null, 2);
    if (hasDesktopBridge()) {
      const result = await window.legendaryDesktop.saveProject({
        content: json,
        suggestedName: filename,
        filePath: currentProjectPath || null
      });
      if (!result?.canceled && result?.ok) {
        currentProjectPath = result.filePath || currentProjectPath;
        if (currentProjectPath) {
          localStorage.setItem(PROJECT_PATH_KEY, currentProjectPath);
          rememberRecentProject(currentProjectPath);
        }
      } else {
        return;
      }
    } else if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'Legendary Project',
          accept: { 'application/json': ['.json', '.legendary.json'] }
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
    } else {
      downloadProjectBlob(new Blob([json], { type: 'application/json' }), filename);
    }
    setProjectStatus('Project saved');
    updateActiveProjectTabFromCurrentProject();
    resetAutoSaveBaseline(json);
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    console.warn('Save project failed:', err);
    setProjectStatus('Save failed', true);
  }
}

async function saveProject() {
  if (hasDesktopBridge() && projectTabs.length) {
    try {
      await saveAllOpenProjects();
    } catch (err) {
      console.warn('Save all projects failed:', err);
      setProjectStatus('Save failed', true);
    }
    return;
  }
  await saveCurrentProjectOnly();
}

function triggerLoadProject() {
  if (hasDesktopBridge()) {
    loadProjectFromDesktop();
    return;
  }
  const input = document.getElementById('project-load-file');
  if (!input) return;
  input.value = '';
  input.click();
}

async function shareProject() {
  try {
    const project = snapshotProject();
    const baseName = (cards.find(card => card.id === activeCardId)?.name || 'legendary-project')
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/^_+|_+$/g, '') || 'legendary-project';
    const filename = `${baseName}.legendary.json`;
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const file = typeof File !== 'undefined'
      ? new File([blob], filename, { type: 'application/json' })
      : null;
    if (hasDesktopBridge()) {
      const result = await window.legendaryDesktop.shareProject({
        content: JSON.stringify(project, null, 2),
        suggestedName: filename
      });
      if (result?.canceled) return;
      setProjectStatus(result?.revealed ? 'Project exported and revealed' : 'Project exported for sharing');
    } else if (navigator.share && file && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({ files: [file], title: 'Legendary Project' });
      setProjectStatus('Project shared');
    } else {
      downloadProjectBlob(blob, filename);
      setProjectStatus('Project exported for sharing');
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    console.warn('Share project failed:', err);
    setProjectStatus('Share failed', true);
  }
}

async function loadProjectFromDesktop() {
  try {
    const result = await window.legendaryDesktop.loadProject();
    if (!result || result.canceled || !result.content) return;
    const project = JSON.parse(result.content);
    openProjectInTab(project, result.filePath || null);
  } catch (err) {
    console.warn('Desktop project load failed:', err);
    setProjectStatus('Load failed', true);
  }
}

function hydrateSplitHalf(half, side) {
  const next = { ...getDefaultSplitHalf(side), ...(half || {}) };
  next.artImg = next.artImg || createImageFromSrc(next.artSrc || null);
  return next;
}

function applyProjectData(project) {
  if (!project || !Array.isArray(project.cards) || !project.cards.length) {
    throw new Error('Invalid project file');
  }
  projectType = normalizeProjectType(project.projectType);
  const defaults = getDefaultProjectShared(projectType);
  const fallbackCard = Array.isArray(project.cards) && project.cards.length ? project.cards[0] : {};
  projectShared = {
    ...defaults,
    ...(project.shared || {}),
    heroName: project.shared?.heroName ?? fallbackCard.hero ?? defaults.heroName,
    heroNameSize: +(project.shared?.heroNameSize ?? fallbackCard.heroSize ?? defaults.heroNameSize),
    villainGroup: project.shared?.villainGroup ?? fallbackCard.subtitle ?? defaults.villainGroup,
    villainGroupSize: normalizeVillainFamilyGroupSize(project.shared?.villainGroupSize ?? fallbackCard.subtitleSize ?? defaults.villainGroupSize, projectType)
  };
  st.customTeams = deserializeCustomTeams(project.customTeams);
  cardSortMode = project.cardSortMode || 'manual';
  cards = project.cards.map((card, index) => {
    const next = { ...card };
    next.artImg = next.artImg || createImageFromSrc(next.artSrc || null);
    if (next.layout === 'split') {
      next.split = {
        left: hydrateSplitHalf(next.split?.left, '1'),
        right: hydrateSplitHalf(next.split?.right, '2')
      };
    }
    next.id = next.id || `card_${index + 1}`;
    next.sortOrder = next.sortOrder ?? (index + 1);
    return next;
  });
  const maxCardId = cards.reduce((max, card) => {
    const n = parseInt(String(card.id || '').replace('card_', ''), 10);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  const maxSortOrder = cards.reduce((max, card) => Math.max(max, card.sortOrder || 0), 0);
  _cardCounter = maxCardId + 1;
  _cardOrderCounter = maxSortOrder + 1;
  activeCardId = cards.some(card => card.id === project.activeCardId) ? project.activeCardId : cards[0].id;
  syncCardSortUI();
  syncProjectSharedUI();
  renderCardList();
  const active = cards.find(card => card.id === activeCardId) || cards[0];
  if (active) applyCard(active);
}

function loadProjectFromObject(project, source = 'Project loaded') {
  try {
    applyProjectData(project);
    setProjectStatus(source);
    resetAutoSaveBaseline();
  } catch (err) {
    console.warn('Load project failed:', err);
    setProjectStatus('Load failed', true);
  }
}

function handleProjectLoad(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const project = JSON.parse(reader.result);
      openProjectInTab(project, null);
    } catch (err) {
      console.warn('Project parse failed:', err);
      setProjectStatus('Invalid project file', true);
    }
  };
  reader.readAsText(file);
}

function restoreAutosaveProject() {
  try {
    const raw = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (!raw) return false;
    const project = JSON.parse(raw);
    currentProjectPath = localStorage.getItem(PROJECT_PATH_KEY) || null;
    applyProjectData(project);
    setProjectStatus('Restored autosave');
    resetAutoSaveBaseline();
    return true;
  } catch (err) {
    console.warn('Autosave restore failed:', err);
    setProjectStatus('Autosave restore failed', true);
    return false;
  }
}

function hasAutosaveProject() {
  try {
    return !!localStorage.getItem(PROJECT_STORAGE_KEY);
  } catch (_) {
    return false;
  }
}

const PROJECT_CHOOSER_TYPES = ['hero', 'villain', 'henchman', 'mastermind', 'scheme', 'bystander'];
const PROJECT_ICON_OFFSETS_KEY = 'legedit_project_icon_offsets_v1';

function getProjectIconOffsets() {
  try {
    return JSON.parse(localStorage.getItem(PROJECT_ICON_OFFSETS_KEY) || '{}') || {};
  } catch (_) {
    return {};
  }
}

function applyProjectIconOffsets() {
  const offsets = getProjectIconOffsets();
  document.querySelectorAll('[data-project-choice]').forEach(tile => {
    const key = tile.dataset.projectChoice;
    const offset = offsets[key] || {};
    tile.style.setProperty('--project-icon-offset-x', `${Math.round(offset.x || 0)}px`);
    tile.style.setProperty('--project-icon-offset-y', `${Math.round(offset.y || 0)}px`);
    tile.style.setProperty('--project-icon-scale', `${+(offset.scale || 1).toFixed(2)}`);
  });
}

function showProjectChooser(options = {}) {
  return new Promise(resolve => {
    const modal = document.getElementById('project-chooser-modal');
    if (!modal) return resolve({ action: 'cancel' });
    const title = document.getElementById('project-chooser-title');
    const subtitle = document.getElementById('project-chooser-subtitle');
    const reopen = document.getElementById('project-chooser-reopen');
    const lastPathEl = document.getElementById('project-chooser-last-path');
    const openBtn = document.getElementById('project-chooser-open');
    const cancelBtn = document.getElementById('project-chooser-cancel');
    const lastPath = options.lastPath || null;
    const isStartup = !!options.startup;
    let settled = false;
    const recentProjects = getRecentProjects();

    if (title) title.textContent = isStartup ? 'Choose project' : 'New project';
    if (subtitle) subtitle.textContent = 'Choose the kind of Legendary project you want to create.';
    if (reopen) reopen.style.display = isStartup && recentProjects.length ? 'flex' : 'none';
    if (lastPathEl) lastPathEl.textContent = recentProjects.length
      ? `${recentProjects.length} recent project${recentProjects.length === 1 ? '' : 's'}`
      : '';
    if (openBtn) openBtn.style.display = isStartup ? '' : 'none';
    if (cancelBtn) cancelBtn.textContent = isStartup ? 'Skip for now' : 'Cancel';

    const finish = value => {
      if (settled) return;
      settled = true;
      modal.classList.remove('open');
      modal.querySelectorAll('[data-project-choice]').forEach(btn => { btn.onclick = null; });
      if (reopen) reopen.onclick = null;
      if (openBtn) openBtn.onclick = null;
      if (cancelBtn) cancelBtn.onclick = null;
      resolve(value);
    };

    modal.querySelectorAll('[data-project-choice]').forEach(btn => {
      btn.onclick = () => finish({ action: 'new', projectType: btn.dataset.projectChoice });
    });
    if (reopen) reopen.onclick = async () => {
      const choices = recentProjects.map((filePath, index) => ({
        label: getProjectFileLabel(filePath),
        value: filePath
      }));
      choices.push({ label: 'Cancel', value: null });
      const filePath = await showAppChoice({
        title: 'Recent Projects',
        message: 'Choose a recent project to open.',
        choices
      });
      if (filePath) finish({ action: 'reopen', filePath });
    };
    if (openBtn) openBtn.onclick = () => finish({ action: 'open' });
    if (cancelBtn) cancelBtn.onclick = () => finish({ action: 'cancel' });
    applyProjectIconOffsets();
    modal.classList.add('open');
  });
}

async function createNewProjectByType(projectType) {
  if (!hasDesktopBridge()) return { mode: 'skip' };
  return window.legendaryDesktop.newProject({ projectType });
}

async function initializeProjectSession() {
  if (hasDesktopBridge()) {
    try {
      const lastPath = localStorage.getItem(PROJECT_PATH_KEY) || null;
      const choice = await showProjectChooser({ startup: true, lastPath });
      if (!choice || choice.action === 'cancel') {
        currentProjectPath = null;
        setProjectStatus('No project file selected');
        return false;
      }
      let result = null;
      if (choice.action === 'reopen') {
        result = await window.legendaryDesktop.openProjectPath({ filePath: choice.filePath });
        if (result?.canceled) {
          currentProjectPath = null;
          setProjectStatus('Last project could not be reopened', true);
          return false;
        }
        result = { mode: 'open', filePath: result.filePath, content: result.content };
      } else if (choice.action === 'open') {
        await loadProjectFromDesktop();
        return true;
      } else if (choice.action === 'new') {
        result = await createNewProjectByType(choice.projectType);
      }
      if (!result || result.mode === 'skip') {
        currentProjectPath = null;
        setProjectStatus('No project file selected');
        return false;
      }
      if (result.filePath) {
        currentProjectPath = result.filePath;
        localStorage.setItem(PROJECT_PATH_KEY, currentProjectPath);
        rememberRecentProject(currentProjectPath);
      }
      if (result.mode === 'open' && result.content) {
        const project = JSON.parse(result.content);
        openProjectInTab(project, result.filePath || currentProjectPath || null, 'Project loaded');
        return true;
      }
      if (result.mode === 'unsupported') {
        currentProjectPath = null;
        setProjectStatus(`${PROJECT_TYPE_LABELS[normalizeProjectType(result.projectType)] || 'That'} projects are not set up yet`);
        return false;
      }
      if (result.mode === 'new') {
        projectType = normalizeProjectType(result.projectType);
        projectShared = getDefaultProjectShared(projectType);
        syncStartupUI();
        setProjectStatus(`Autosaving to new ${PROJECT_TYPE_LABELS[projectType]} project file`);
        return false;
      }
    } catch (err) {
      console.warn('Desktop project init failed:', err);
      setProjectStatus('Project setup failed', true);
      return false;
    }
    return false;
  }
  const shouldRestore = hasAutosaveProject()
    ? await showAppChoice({
        title: 'Restore Session?',
        message: 'Restore your previous autosaved session?',
        choices: [
          { label: 'Restore', value: true },
          { label: 'Skip', value: false }
        ]
      })
    : false;
  if (shouldRestore) {
    return restoreAutosaveProject();
  }
  if (hasAutosaveProject()) setProjectStatus('Autosave available to load later');
  return false;
}

async function newProject() {
  if (!hasDesktopBridge()) {
    setProjectStatus('New project is only available in the desktop app', true);
    return;
  }
  try {
    const choice = await showProjectChooser({ startup: false });
    if (!choice || choice.action !== 'new') return;
    captureCurrentProjectTab();
    const result = await createNewProjectByType(choice.projectType);
    if (!result || result.mode === 'skip') return;
    if (result.mode === 'unsupported') {
      setProjectStatus(`${PROJECT_TYPE_LABELS[normalizeProjectType(result.projectType)] || 'That'} projects are not set up yet`);
      return;
    }
    if (result.mode !== 'new') return;
    currentProjectPath = result.filePath || null;
    if (currentProjectPath) {
      localStorage.setItem(PROJECT_PATH_KEY, currentProjectPath);
      rememberRecentProject(currentProjectPath);
    }
    projectType = normalizeProjectType(result.projectType);
    projectShared = getDefaultProjectShared(projectType);
    cards = [];
    activeCardId = null;
    const firstCard = createCardRecord(buildFreshCardOverrides(collectCardData(), { unique: false }));
    cards = [firstCard];
    activeCardId = firstCard.id;
    syncCardSortUI();
    renderCardList();
    await applyCard(firstCard);
    createProjectTab(snapshotProject(), currentProjectPath, { activate: false });
    activeProjectTabId = projectTabs[projectTabs.length - 1]?.id || activeProjectTabId;
    renderProjectTabs();
    setProjectStatus(`Autosaving to new ${PROJECT_TYPE_LABELS[projectType]} project file`);
  } catch (err) {
    console.warn('New project failed:', err);
    setProjectStatus('New project failed', true);
  }
}

function getCardDisplayTitle(card) {
  if (card.layout === 'split' && card.split) {
    const left = (card.split.left?.name || '').trim();
    const right = (card.split.right?.name || '').trim();
    const joined = [left, right].filter(Boolean).join(' / ');
    if (joined) return joined;
  }
  const title = (card.name || '').trim();
  return title || `Untitled ${capitalize(card.rar || 'common')} Card`;
}

function getCardListMetaLabel(card) {
  if (isProjectType(projectType, 'hero')) {
    const rarityLabel = capitalize(card.rar || 'common');
    const heroLabel = card.layout === 'split' && card.split
      ? [card.split.left?.hero, card.split.right?.hero].map(v => String(v || '').trim()).filter(Boolean).join(' / ')
      : String(card.hero || projectShared.heroName || '').trim();
    return `${rarityLabel}${heroLabel ? ` - ${heroLabel}` : ''}`;
  }
  if (isProjectType(projectType, 'villain')) {
    const layoutValue = card.villainLayout === 'henchman' ? 'villain' : (card.villainLayout || 'villain');
    const layoutLabel = capitalize(layoutValue);
    const secondaryLabel = getVillainSubtitleBase(card.subtitle || projectShared.villainGroup);
    return `${layoutLabel}${secondaryLabel ? ` - ${secondaryLabel}` : ''}`;
  }
  if (isProjectType(projectType, 'henchman')) return 'Henchman';
  if (isProjectType(projectType, 'scheme')) return (card.schemeLayout || 'a') === 'b' ? 'Scheme Layout B' : 'Scheme Layout A';
  if (isProjectType(projectType, 'mastermind')) return card.mastermindLayout === 'tactic' ? 'Mastermind Tactic' : 'Mastermind';
  return card.layout === 'split' ? 'Split' : capitalize(card.rar);
}

function capitalize(v) {
  const s = String(v || '');
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
function formatMastermindTemplateLabel(value) {
  if (value === 'vpfix') return 'VP Fix';
  return capitalize(value || 'main');
}
function getDefaultAbilityHtml() {
  return 'Ability text goes here.';
}
function getDefaultFlavorHtml() {
  return '';
}

// New cards start from the currently active layout so adding variants feels
// like duplication of the current card, not a reset to some global default.
function getNewCardBaseLabel(base = {}) {
  if (isProjectType(projectType, 'villain')) return capitalize(base.villainLayout || (document.getElementById('v-layout')?.value || 'villain'));
  if (isProjectType(projectType, 'henchman')) return 'Henchman';
  if (isProjectType(projectType, 'mastermind')) return (base.mastermindLayout || getCurrentVillainEditorLayout()) === 'tactic' ? 'Mastermind Tactic' : 'Mastermind';
  if (isProjectType(projectType, 'scheme')) return (base.schemeLayout || (document.getElementById('scheme-layout')?.value || 'a')) === 'b' ? 'Scheme Layout B' : 'Scheme Layout A';
  if ((base.layout || st.layout) === 'split') return 'Split';
  return capitalize(base.rar || st.rar || 'common');
}
function buildFreshCardOverrides(base = collectCardData(), options = {}) {
  const unique = options.unique !== false;
  const nextName = unique ? ensureUniqueCardTitle(getNewCardBaseLabel(base)) : getNewCardBaseLabel(base);
  const overrides = {
    ...base,
    name: nextName
  };
  if (isVillainEditorProjectType()) {
    if (!cards.length && !activeCardId) {
      overrides.nameSize = getDefaultVillainNameSize(projectType);
    }
    if (isProjectType(projectType, 'henchman')) {
      overrides.villainLayout = 'henchman';
      overrides.subtitle = getDefaultVillainGroupText('henchman');
      overrides.subtitleSize = getDefaultVillainGroupSize('henchman');
    }
    overrides.abilityHtml = getDefaultAbilityHtml();
    overrides.flavorHtml = getDefaultFlavorHtml();
  } else if ((base.layout || st.layout) === 'split') {
    const left = getDefaultSplitHalf('1');
    const right = getDefaultSplitHalf('2');
    left.cls = base.split?.left?.cls || left.cls;
    right.cls = base.split?.right?.cls || right.cls;
    left.hero = shouldReplaceDefaultSplitHeroName(base.split?.left?.hero) ? left.hero : base.split.left.hero;
    right.hero = shouldReplaceDefaultSplitHeroName(base.split?.right?.hero) ? right.hero : base.split.right.hero;
    overrides.split = { left, right };
    overrides.hero = getSharedHeroNameFallback();
  } else {
    overrides.abilityHtml = getDefaultAbilityHtml();
    overrides.flavorHtml = getDefaultFlavorHtml();
  }
  return overrides;
}

// Persistence helpers split cleanly between villain-family cards, split hero
// cards, and regular hero cards.
function collectCardData() {
  if (isVillainEditorProjectType()) {
    const isMastermindProject = isProjectType(projectType, 'mastermind');
    const isSchemeProject = isProjectType(projectType, 'scheme');
    const currentMastermindLayout = document.getElementById('m-layout')?.value || 'mastermind';
    return {
      projectType,
      villainLayout: isMastermindProject ? 'villain' : getCurrentVillainEditorLayout(),
      schemeLayout: isSchemeProject ? (document.getElementById('scheme-layout')?.value || 'a') : undefined,
      mastermindLayout: isMastermindProject ? currentMastermindLayout : undefined,
      subtitle: isMastermindProject ? resolveMastermindSubtitle({
        mastermindLayout: currentMastermindLayout,
        subtitle: document.getElementById('v-subtitle')?.value || ''
      }) : (isSchemeProject ? undefined : (document.getElementById('v-subtitle')?.value || '')),
      subtitleSize: isSchemeProject ? undefined : +(document.getElementById('v-subtitle-sz')?.value || getDefaultVillainGroupSize(isMastermindProject ? 'mastermind' : projectType)),
      name: document.getElementById('v-name').value,
      nameSize: +(document.getElementById('v-name-sz').value || getDefaultVillainNameSize(projectType)),
      attack: +(document.getElementById('v-atk').value || 0),
      vp: +(document.getElementById('v-vp').value || 0),
      showAttackNumber: !!document.getElementById('villain-show-atk-num')?.classList.contains('on'),
      showVP: !!document.getElementById('villain-show-vp')?.classList.contains('on'),
      attackPlus: !!document.getElementById('villain-atk-plus')?.classList.contains('on'),
      attackAsterisk: !!document.getElementById('villain-atk-asterisk')?.classList.contains('on'),
      vpPlus: !!document.getElementById('villain-vp-plus')?.classList.contains('on'),
      vpAsterisk: !!document.getElementById('villain-vp-asterisk')?.classList.contains('on'),
      artImg: st.artImg || null,
      artSrc: st.artSrc || st.artImg?.src || null,
      artScale: st.artScale ?? 100,
      artX: st.artX ?? 0,
      artY: st.artY ?? 0,
      abilitySize: document.getElementById('ab-sz').value,
      flavorSize: document.getElementById('fl-sz').value,
      abilityHtml: document.getElementById('f-ability').innerHTML,
      flavorHtml: document.getElementById('f-flavor').innerHTML
    };
  }
  if (st.layout === 'split') {
    const left = collectSplitHalfData('1');
    const right = collectSplitHalfData('2');
    return {
      layout: 'split',
      rar: st.rar,
      split: { left, right },
      name: [left.name, right.name].filter(Boolean).join(' / '),
      hero: [left.hero, right.hero].filter(Boolean).join(' / ')
    };
  }
  return {
    layout: st.layout,
    cls: st.cls,
    cls2: st.cls2,
    rar: st.rar,
    team: document.getElementById('s-team').value || 'none',
    showRecruit: st.showRecruit,
    showRPlus: st.showRPlus,
    showAttack: st.showAttack,
    showAPlus: st.showAPlus,
    showStatNums: st.showStatNums,
    costAsterisk: st.costAsterisk,
    classIconOffsetX: st.classIconOffsetX ?? 0,
    classIconOffsetY: st.classIconOffsetY ?? 0,
    classIconOffsets: st.classIconOffsets || {},
    artImg: st.artImg || null,
    artSrc: st.artSrc || st.artImg?.src || null,
    artScale: st.artScale ?? 100,
    artX: st.artX ?? 0,
    artY: st.artY ?? 0,
    name: document.getElementById('f-name').value,
    recruit: document.getElementById('f-rec').value,
    attack: document.getElementById('f-atk').value,
    cost: document.getElementById('f-cost').value,
    nameSize: document.getElementById('name-sz').value,
    abilitySize: document.getElementById('ab-sz').value,
    flavorSize: document.getElementById('fl-sz').value,
    abilityHtml: document.getElementById('f-ability').innerHTML,
    flavorHtml: document.getElementById('f-flavor').innerHTML
  };
}
function collectSplitHalfData(side) {
  const key = getSplitSideKey(side);
  const artState = st.split?.[key] || getDefaultSplitHalf(side);
  return {
    cls: document.getElementById(`split-cls-${side}`).value,
    cls2: document.getElementById(`split-cls2-${side}`)?.value || 'none',
    recruit: document.getElementById(`split-rec-${side}`).value,
    attack: document.getElementById(`split-atk-${side}`).value,
    cost: document.getElementById(`split-cost-${side}`).value,
    showRecruit: !!document.getElementById(`split-show-rec-${side}`).classList.contains('on'),
    showRPlus: !!document.getElementById(`split-rplus-${side}`).classList.contains('on'),
    showAttack: !!document.getElementById(`split-show-atk-${side}`).classList.contains('on'),
    showAPlus: !!document.getElementById(`split-aplus-${side}`).classList.contains('on'),
    name: document.getElementById(`split-name-${side}`).value,
    hero: document.getElementById(`split-hero-${side}`).value,
    nameSize: document.getElementById(`split-name-sz-${side}`).value || 34,
    heroSize: document.getElementById(`split-hero-sz-${side}`).value || 24,
    abilitySize: document.getElementById(`split-ab-sz-${side}`).value,
    flavorSize: document.getElementById(`split-fl-sz-${side}`).value,
      abilityHtml: document.getElementById(`split-ability-${side}`).innerHTML,
      flavorHtml: document.getElementById(`split-flavor-${side}`).innerHTML,
      artImg: artState.artImg || null,
      artSrc: artState.artSrc || artState.artImg?.src || null,
      artScale: artState.artScale ?? 100,
    artX: artState.artX ?? 0,
    artY: artState.artY ?? 0,
  };
}
function applySplitHalfData(side, data) {
  const key = getSplitSideKey(side);
  const next = { ...getDefaultSplitHalf(side), ...(data || {}) };
  if (!st.split) st.split = { left: getDefaultSplitHalf('1'), right: getDefaultSplitHalf('2') };
  st.split[key] = {
    artImg: next.artImg || createImageFromSrc(next.artSrc || null),
    artSrc: next.artSrc || next.artImg?.src || null,
    artScale: +next.artScale || 100,
    artX: +next.artX || 0,
    artY: +next.artY || 0,
  };
  document.getElementById(`split-cls-${side}`).value = next.cls;
  const cls2El = document.getElementById(`split-cls2-${side}`);
  if (cls2El) cls2El.value = next.cls2 || 'none';
  document.getElementById(`split-rec-${side}`).value = next.recruit ?? 0;
  document.getElementById(`split-atk-${side}`).value = next.attack ?? 0;
  document.getElementById(`split-cost-${side}`).value = next.cost ?? 0;
  document.getElementById(`split-show-rec-${side}`).classList.toggle('on', next.showRecruit !== false);
  document.getElementById(`split-rplus-${side}`).classList.toggle('on', !!next.showRPlus);
  document.getElementById(`split-show-atk-${side}`).classList.toggle('on', next.showAttack !== false);
  document.getElementById(`split-aplus-${side}`).classList.toggle('on', !!next.showAPlus);
  document.getElementById(`split-name-${side}`).value = next.name || '';
  document.getElementById(`split-hero-${side}`).value = shouldReplaceDefaultSplitHeroName(next.hero) ? getSharedHeroNameFallback() : next.hero;
  document.getElementById(`split-name-sz-${side}`).value = normalizeSplitNameSize(next.nameSize);
  document.getElementById(`split-hero-sz-${side}`).value = normalizeSplitHeroSize(next.heroSize);
  document.getElementById(`split-ab-sz-${side}`).value = next.abilitySize ?? 15;
  document.getElementById(`split-fl-sz-${side}`).value = next.flavorSize ?? 10;
  document.getElementById(`split-ability-${side}`).innerHTML = next.abilityHtml || '';
  document.getElementById(`split-flavor-${side}`).innerHTML = next.flavorHtml || '';
  autoFormatAbilityEditorById(`split-ability-${side}`);
}

function createCardRecord(overrides = {}) {
  return {
    id: overrides.id || `card_${_cardCounter++}`,
    sortOrder: overrides.sortOrder ?? _cardOrderCounter++,
    ...collectCardData(),
    ...overrides
  };
}

function ensureUniqueCardTitle(baseTitle) {
  const trimmed = (baseTitle || '').trim();
  const seed = trimmed || `Card ${cards.length + 1}`;
  const existing = new Set(cards.map(card => (card.name || '').trim()).filter(Boolean));
  if (!existing.has(seed)) return seed;
  let i = 2;
  while (existing.has(`${seed} ${i}`)) i++;
  return `${seed} ${i}`;
}

function getCardListSignature(card) {
  if (!card) return '';
  return `${getCardDisplayTitle(card)}\n${getCardListMetaLabel(card)}`;
}

function didCardDataChange(previous, next) {
  if (!previous || !next) return true;
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  keys.delete('artImg');
  keys.delete('split');
  for (const key of keys) {
    if (previous[key] !== next[key]) return true;
  }
  const prevSplit = previous.split || {};
  const nextSplit = next.split || {};
  for (const side of ['left', 'right']) {
    const a = prevSplit[side] || {};
    const b = nextSplit[side] || {};
    const sideKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    sideKeys.delete('artImg');
    for (const key of sideKeys) {
      if (a[key] !== b[key]) return true;
    }
  }
  return false;
}

function saveActiveCardFromUI(options = {}) {
  if (isApplyingCard || !activeCardId) return false;
  syncProjectSharedFromInputs();
  const card = cards.find(x => x.id === activeCardId);
  if (!card) return false;
  const previous = { ...card, split: card.split ? { left: { ...(card.split.left || {}) }, right: { ...(card.split.right || {}) } } : undefined };
  const previousListSignature = getCardListSignature(card);
  const next = collectCardData();
  Object.assign(card, next);
  const listChanged = previousListSignature !== getCardListSignature(card);
  if (options.forceList || listChanged) renderCardList();
  return didCardDataChange(previous, card);
}

function getManualSortedCards() {
  return [...cards].sort((a, b) => a.sortOrder - b.sortOrder);
}

function getDisplaySortedCards() {
  if (cardSortMode === 'az') {
    return [...cards].sort((a, b) => {
      const titleDelta = getCardDisplayTitle(a).localeCompare(getCardDisplayTitle(b), undefined, { sensitivity: 'base' });
      return titleDelta || a.sortOrder - b.sortOrder;
    });
  }
  if (cardSortMode === 'vp') {
    return [...cards].sort((a, b) => {
      const vpDelta = (+a.vp || 0) - (+b.vp || 0);
      const titleDelta = getCardDisplayTitle(a).localeCompare(getCardDisplayTitle(b), undefined, { sensitivity: 'base' });
      return vpDelta || titleDelta || a.sortOrder - b.sortOrder;
    });
  }
  if (cardSortMode === 'rarity') {
    return [...cards].sort((a, b) => {
      const rarityDelta = (CARD_RARITY_ORDER[a.rar] ?? 99) - (CARD_RARITY_ORDER[b.rar] ?? 99);
      const titleDelta = getCardDisplayTitle(a).localeCompare(getCardDisplayTitle(b), undefined, { sensitivity: 'base' });
      return rarityDelta || titleDelta || a.sortOrder - b.sortOrder;
    });
  }
  return getManualSortedCards();
}

function setCardSortMode(mode) {
  cardSortMode = mode || 'manual';
  syncCardSortUI();
  renderCardList();
}

function reorderManualCards(dragId, targetId) {
  const ordered = getManualSortedCards();
  const fromIndex = ordered.findIndex(card => card.id === dragId);
  const toIndex = ordered.findIndex(card => card.id === targetId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

  const [moved] = ordered.splice(fromIndex, 1);
  ordered.splice(toIndex, 0, moved);
  ordered.forEach((card, index) => {
    card.sortOrder = index + 1;
  });
  cards = ordered;
}

function onCardDragStart(e, cardId) {
  if (cardSortMode !== 'manual') return;
  draggedCardId = cardId;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', cardId);
  }
}

function onCardDragOver(e, targetId) {
  if (cardSortMode !== 'manual' || !draggedCardId || draggedCardId === targetId) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
}

function onCardDrop(e, targetId) {
  if (cardSortMode !== 'manual' || !draggedCardId || draggedCardId === targetId) return;
  e.preventDefault();
  saveActiveCardFromUI();
  reorderManualCards(draggedCardId, targetId);
  draggedCardId = null;
  renderCardList();
}

function onCardDragEnd() {
  draggedCardId = null;
}

function renderCardList() {
  const root = document.getElementById('card-list');
  if (!root) return;
  root.innerHTML = '';
  syncDeleteCardButtonUI();
  syncCardSortUI();
  renderProjectTabs();

  const sorted = getDisplaySortedCards();
  const groups = cardSortMode === 'rarity'
    ? ['common', 'uncommon', 'rare']
        .map(rarity => ({ label: capitalize(rarity), cards: sorted.filter(card => card.rar === rarity) }))
        .filter(group => group.cards.length)
    : cardSortMode === 'vp'
    ? [...new Set(sorted.map(card => +card.vp || 0))]
        .sort((a, b) => a - b)
        .map(vp => ({ label: `VP ${vp}`, cards: sorted.filter(card => (+card.vp || 0) === vp) }))
    : [{ label: '', cards: sorted }];

  groups.forEach(groupData => {
    const group = document.createElement('div');
    group.className = 'card-group';

    if (groupData.label) {
      const label = document.createElement('div');
      label.className = 'card-group-label';
      label.textContent = groupData.label;
      group.appendChild(label);
    }

    groupData.cards.forEach(card => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `card-item${card.id === activeCardId ? ' active' : ''}`;
      btn.onclick = () => selectCard(card.id);
      btn.draggable = cardSortMode === 'manual';
      if (cardSortMode === 'manual') {
        btn.ondragstart = e => onCardDragStart(e, card.id);
        btn.ondragover = e => onCardDragOver(e, card.id);
        btn.ondrop = e => onCardDrop(e, card.id);
        btn.ondragend = () => onCardDragEnd();
      }

      const title = document.createElement('div');
      title.className = 'card-item-title';
      title.textContent = getCardDisplayTitle(card);
      btn.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 'card-item-meta';
      meta.textContent = getCardListMetaLabel(card);
      btn.appendChild(meta);

      group.appendChild(btn);
    });

    root.appendChild(group);
  });
}

// Applying a card back into the UI mirrors collectCardData above: villain
// editor projects first, then standard hero/split editor state.
async function applyCard(card) {
  if (!card) return;
  isApplyingCard = true;
  activeCardId = card.id;

  if (isVillainEditorProjectType()) {
    st.artSrc = card.artSrc || card.artImg?.src || null;
    st.artImg = card.artImg || createImageFromSrc(st.artSrc);
    st.artScale = +card.artScale || 100;
    st.artX = +card.artX || 0;
    st.artY = +card.artY || 0;
    document.getElementById('v-name').value = card.name || '';
    const layoutSel = document.getElementById('v-layout');
    if (layoutSel) {
      const layoutValue = card.villainLayout === 'henchman' && projectType !== 'henchman'
        ? 'villain'
        : (card.villainLayout || (projectType === 'henchman' ? 'henchman' : 'villain'));
      layoutSel.value = layoutValue === 'henchman' ? 'villain' : layoutValue;
    }
    const schemeLayoutSel = document.getElementById('scheme-layout');
    if (schemeLayoutSel) schemeLayoutSel.value = card.schemeLayout || 'a';
    const mastermindLayoutSel = document.getElementById('m-layout');
    if (mastermindLayoutSel) mastermindLayoutSel.value = card.mastermindLayout || 'mastermind';
    document.getElementById('v-name-sz').value = normalizeVillainFamilyNameSize(card.nameSize, projectType);
    document.getElementById('v-atk').value = card.attack ?? 0;
    document.getElementById('v-vp').value = card.vp ?? 0;
    document.getElementById('ab-sz').value = card.abilitySize ?? 22;
    document.getElementById('fl-sz').value = card.flavorSize ?? 11;
    document.getElementById('f-ability').innerHTML = card.abilityHtml || '';
    document.getElementById('f-flavor').innerHTML = card.flavorHtml || '';
    const showAtkNumBtn = document.getElementById('villain-show-atk-num');
    const showVPBtn = document.getElementById('villain-show-vp');
    const plusBtn = document.getElementById('villain-atk-plus');
    const atkAstBtn = document.getElementById('villain-atk-asterisk');
    const vpPlusBtn = document.getElementById('villain-vp-plus');
    const vpAstBtn = document.getElementById('villain-vp-asterisk');
    if (showAtkNumBtn) showAtkNumBtn.classList.toggle('on', card.showAttackNumber !== false);
    if (showVPBtn) showVPBtn.classList.toggle('on', card.showVP !== false);
    if (plusBtn) plusBtn.classList.toggle('on', !!card.attackPlus);
    if (atkAstBtn) atkAstBtn.classList.toggle('on', !!card.attackAsterisk);
    if (vpPlusBtn) vpPlusBtn.classList.toggle('on', !!card.vpPlus);
    if (vpAstBtn) vpAstBtn.classList.toggle('on', !!card.vpAsterisk);
    syncStartupUI();
    const subtitleValue = isProjectType(projectType, 'mastermind')
      ? resolveMastermindSubtitle(card)
      : (isProjectType(projectType, 'henchman')
        ? (card.subtitle || getDefaultVillainGroupText('henchman'))
        : resolveVillainSubtitle(card));
    if (isProjectType(projectType, 'mastermind')) card.subtitle = subtitleValue;
    if (!isProjectType(projectType, 'scheme')) {
      document.getElementById('v-subtitle').value = subtitleValue;
      document.getElementById('v-subtitle-sz').value = isProjectType(projectType, 'mastermind')
        ? (card.subtitleSize ?? getDefaultVillainGroupSize('mastermind'))
        : normalizeVillainFamilyGroupSize(card.subtitleSize ?? projectShared.villainGroupSize, projectType);
    }
    syncArtControlsUI();
    autoFormatAbilityEditor();
    renderCardList();
    await render();
    isApplyingCard = false;
    return;
  }

  st.cls = card.cls;
  st.layout = card.layout || 'single';
  st.cls2 = card.cls2 || 'tech';
  st.rar = card.rar;
  st.showRecruit = !!card.showRecruit;
  st.showRPlus = !!card.showRPlus;
  st.showAttack = !!card.showAttack;
  st.showAPlus = !!card.showAPlus;
  st.showStatNums = !!card.showStatNums;
  st.costAsterisk = !!card.costAsterisk;
  st.classIconOffsetX = +card.classIconOffsetX || 0;
  st.classIconOffsetY = +card.classIconOffsetY || 0;
  st.classIconOffsets = card.classIconOffsets || {};
  st.artSrc = card.artSrc || card.artImg?.src || null;
  st.artImg = card.artImg || createImageFromSrc(st.artSrc);
  st.artScale = +card.artScale || 100;
  st.artX = +card.artX || 0;
  st.artY = +card.artY || 0;
  st.split = { left: getDefaultSplitHalf('1'), right: getDefaultSplitHalf('2') };

  document.getElementById('f-name').value = card.name || '';
  document.getElementById('f-rec').value = card.recruit ?? 0;
  document.getElementById('f-atk').value = card.attack ?? 0;
  document.getElementById('f-cost').value = card.cost ?? 0;
  document.getElementById('name-sz').value = card.nameSize ?? 34;
  document.getElementById('ab-sz').value = card.abilitySize ?? 22;
  document.getElementById('fl-sz').value = card.flavorSize ?? 11;
  document.getElementById('f-ability').innerHTML = card.abilityHtml || '';
  document.getElementById('f-flavor').innerHTML = card.flavorHtml || '';
  if (card.layout === 'split' && card.split) {
    applySplitHalfData('1', card.split.left);
    applySplitHalfData('2', card.split.right);
  } else {
    applySplitHalfData('1', getDefaultSplitHalf('1'));
    applySplitHalfData('2', getDefaultSplitHalf('2'));
  }

  rebuildTeamDropdown(card.team || 'none');
  document.getElementById('s-team').value = card.team || 'none';
  document.getElementById('team-icon-ctrls').style.display = (card.team || 'none') === 'custom' ? 'block' : 'none';
  document.getElementById('team-remove-ctrl').style.display = (card.team || 'none').startsWith('custom_') ? 'block' : 'none';

  syncStartupUI();
  syncStatButtonsUI();
  syncCostAsteriskUI();
  syncArtControlsUI();
  syncSplitArtControlsUI();
  syncDeleteCardButtonUI();
  autoFormatAbilityEditor();
  renderCardList();
  await render();
  isApplyingCard = false;
}

function selectCard(cardId) {
  saveActiveCardFromUI();
  const card = cards.find(x => x.id === cardId);
  if (card) applyCard(card);
}

async function newCard() {
  saveActiveCardFromUI();
  const base = collectCardData();
  let nextBase = { ...base };
  if (isProjectType(projectType, 'mastermind')) {
    const nextLayout = await showAppChoice({
      title: 'New Mastermind Card',
      message: 'What kind of Mastermind card do you want to create?',
      choices: [
        { label: 'Tactic', value: 'tactic' },
        { label: 'Mastermind', value: 'mastermind' }
      ]
    });
    nextBase = {
      ...nextBase,
      mastermindLayout: nextLayout,
      subtitle: getDefaultMastermindSubtitleForLayout(nextLayout),
      subtitleSize: getDefaultVillainGroupSize('mastermind')
    };
  }
  const nextName = ensureUniqueCardTitle(getNewCardBaseLabel(nextBase));
  const overrides = {
    ...nextBase,
    name: nextName
  };
  if (usesSharedVillainGroup()) {
    overrides.abilityHtml = getDefaultAbilityHtml();
    overrides.flavorHtml = getDefaultFlavorHtml();
  } else if ((base.layout || st.layout) === 'split') {
    const left = getDefaultSplitHalf('1');
    const right = getDefaultSplitHalf('2');
    left.cls = base.split?.left?.cls || left.cls;
    right.cls = base.split?.right?.cls || right.cls;
    left.hero = shouldReplaceDefaultSplitHeroName(base.split?.left?.hero) ? left.hero : base.split.left.hero;
    right.hero = shouldReplaceDefaultSplitHeroName(base.split?.right?.hero) ? right.hero : base.split.right.hero;
    overrides.split = { left, right };
    overrides.hero = getSharedHeroNameFallback();
  } else {
    overrides.abilityHtml = getDefaultAbilityHtml();
    overrides.flavorHtml = getDefaultFlavorHtml();
  }
  const next = createCardRecord(overrides);
  cards.push(next);
  applyCard(next);
}

function setVillainLayout(v) {
  const sel = document.getElementById('v-layout');
  if (sel && sel.value !== v) sel.value = v;
  applyVillainLayoutSubtitleDefault(v || 'villain');
  saveActiveCardFromUI();
  render();
}
function setMastermindLayout(v) {
  const sel = document.getElementById('m-layout');
  if (sel && sel.value !== v) sel.value = v;
  applyMastermindLayoutSubtitleDefault(v || 'mastermind');
  syncStartupUI();
  saveActiveCardFromUI();
  render();
}
function setSchemeLayout(v) {
  const sel = document.getElementById('scheme-layout');
  if (sel && sel.value !== v) sel.value = v;
  saveActiveCardFromUI();
  render();
}

async function deleteCard() {
  if (cards.length <= 1 || !activeCardId) return;
  if (!(await showAppChoice({
    title: 'Delete Card?',
    message: 'Delete the currently selected card?',
    choices: [
      { label: 'Delete', value: true },
      { label: 'Cancel', value: false }
    ]
  }))) return;
  saveActiveCardFromUI();
  const currentIndex = cards.findIndex(card => card.id === activeCardId);
  if (currentIndex === -1) return;

  cards.splice(currentIndex, 1);
  const fallback = cards[Math.max(0, currentIndex - 1)] || cards[0];
  if (fallback) applyCard(fallback);
}

async function preloadCanvasFonts() {
  if (!document.fonts || !document.fonts.load) return;
  const fontSpecs = [
    "12px 'eurostile_ltstd_regular'",
    "bold 12px 'eurostile_ltstd_bold'",
    "italic 12px 'eurostile_ltstd_regular'",
    "bold 23px 'percolator_expert'",
    "12px 'percolator_expert'",
    "bold 23px 'percolator'",
    "12px 'percolator'",
    "bold 84px 'matrix'",
    "bold 84px 'matrix_ii_bold'",
    "bold 31px 'eurostile_bold'"
  ];
  try {
    await Promise.all(fontSpecs.map(spec => document.fonts.load(spec)));
  } catch (_) {}
}

async function preload() {
  rebuildTeamDropdown('none');
  renderKeywordList();
  syncStartupUI();
  autoFormatAbilityEditor();
  if (!(await initializeProjectSession())) {
    const firstCard = createCardRecord(buildFreshCardOverrides(collectCardData(), { unique: false }));
    cards = [firstCard];
    activeCardId = firstCard.id;
    renderCardList();
    render();
    if (hasDesktopBridge() && currentProjectPath) scheduleAutoSave();
  }
  ensureProjectTabForCurrentProject();
  await Promise.allSettled(Object.keys(A).map(loadI));
  await preloadCanvasFonts();
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (_) {}
  }
  render();
}

function setCls(b) {
  document.querySelectorAll('[data-cls]').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');
  st.cls=b.dataset.cls;
  if (st.layout === 'multicolor') {
    if (!MULTICOLOR_ALLOWED_CLASSES.has(st.cls)) st.cls = 'strength';
    if (st.cls2 === st.cls || !MULTICOLOR_ALLOWED_CLASSES.has(st.cls2)) {
      const fallback = MULTICOLOR_CLASS_ORDER.find(cls => cls !== st.cls) || 'tech';
      st.cls2 = fallback;
    }
    syncStartupUI();
  }
  render();
}
function setCls2(b) {
  document.querySelectorAll('[data-cls2]').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');
  st.cls2=b.dataset.cls2;
  if (st.cls2 === st.cls) {
    const fallback = MULTICOLOR_CLASS_ORDER.find(cls => cls !== st.cls2) || 'tech';
    st.cls2 = fallback;
    syncStartupUI();
  }
  render();
}
function setLayout(v) {
  const previousLayout = st.layout;
  st.layout = v || 'single';
  if (st.layout === 'multicolor') {
    if (!MULTICOLOR_ALLOWED_CLASSES.has(st.cls)) st.cls = 'strength';
    if (!MULTICOLOR_ALLOWED_CLASSES.has(st.cls2) || st.cls2 === st.cls) {
      st.cls2 = MULTICOLOR_CLASS_ORDER.find(cls => cls !== st.cls) || 'tech';
    }
  }
  if (st.layout === 'split' && previousLayout !== 'split') {
    const left = st.split?.left || getDefaultSplitHalf('1');
    const right = st.split?.right || getDefaultSplitHalf('2');
    const sharedHero = getSharedHeroNameFallback();
    if (shouldReplaceDefaultSplitHeroName(left.hero)) left.hero = sharedHero;
    if (shouldReplaceDefaultSplitHeroName(right.hero)) right.hero = sharedHero;
    left.nameSize = normalizeSplitNameSize(left.nameSize);
    left.heroSize = normalizeSplitHeroSize(left.heroSize);
    right.nameSize = normalizeSplitNameSize(right.nameSize);
    right.heroSize = normalizeSplitHeroSize(right.heroSize);
    st.split = { left, right };
    applySplitHalfData('1', left);
    applySplitHalfData('2', right);
  }
  syncStartupUI();
  syncSplitArtControlsUI();
  render();
}
function setRar(b) {
  document.querySelectorAll('[data-rar]').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');
  st.rar=b.dataset.rar;
  render();
}
function togStat(b) {
  b.classList.toggle('on');
  st.showRecruit  = !!document.querySelector('[data-stat=recruit].on');
  st.showRPlus    = !!document.querySelector('[data-stat=rplus].on');
  st.showAttack   = !!document.querySelector('[data-stat=attack].on');
  st.showAPlus    = !!document.querySelector('[data-stat=aplus].on');
  st.showStatNums = true;
  render();
}
function togCostAst() {
  st.costAsterisk = !st.costAsterisk;
  const btn = document.getElementById('cost-asterisk');
  btn.textContent = st.costAsterisk ? 'Cost * On' : 'Cost * Off';
  btn.classList.toggle('on', st.costAsterisk);
  render();
}

function syncArt(axis, src) {
  const ids = { s:['sc-s','sc-sv'], x:['sc-x','sc-xv'], y:['sc-y','sc-yv'] };
  const [rid, nid] = ids[axis];
  if (src==='r') document.getElementById(nid).value = document.getElementById(rid).value;
  else           document.getElementById(rid).value = document.getElementById(nid).value;
  st.artScale = +document.getElementById('sc-sv').value || 100;
  st.artX     = +document.getElementById('sc-xv').value || 0;
  st.artY     = +document.getElementById('sc-yv').value || 0;
  render();
}
function resetArt() {
  ['sc-s','sc-sv'].forEach(id => document.getElementById(id).value = 100);
  ['sc-x','sc-xv','sc-y','sc-yv'].forEach(id => document.getElementById(id).value = 0);
  st.artScale=100; st.artX=0; st.artY=0; render();
}

function fmt(cmd)   {
  if (cmd === 'bold' && toggleAbilityBold('f-ability')) {
    autoFormatAbilityEditor();
    render();
    return;
  }
  if (cmd === 'removeFormat' && suppressAutoBoldInSelectionById('f-ability')) {
    render();
    return;
  }
  document.execCommand(cmd, false, null);
  autoFormatAbilityEditor();
  render();
}
function fmtFl(cmd) { document.getElementById('f-flavor').focus(); document.execCommand(cmd, false, null); render(); }
function fmtTarget(targetId, cmd) {
  const el = document.getElementById(targetId);
  if (!el) return;
  if (targetId.includes('ability') && cmd === 'bold' && toggleAbilityBold(targetId)) {
    autoFormatAbilityEditorById(targetId);
    render();
    return;
  }
  if (targetId.includes('ability') && cmd === 'removeFormat' && suppressAutoBoldInSelectionById(targetId)) {
    render();
    return;
  }
  el.focus();
  document.execCommand(cmd, false, null);
  if (targetId.includes('ability')) autoFormatAbilityEditorById(targetId);
  render();
}
function abilityEditorNeedsAutoFormat(targetId) {
  const root = document.getElementById(targetId);
  if (!root) return false;
  if (root.querySelector('b[data-autobold="1"], [data-format-boundary="1"]')) return true;
  const text = root.textContent || '';
  MANUAL_BOLD_TOKEN_RE.lastIndex = 0;
  if (MANUAL_BOLD_TOKEN_RE.test(text)) return true;
  AUTO_BOLD_RE.lastIndex = 0;
  return AUTO_BOLD_RE.test(text);
}
const abilityAutoFormatTimers = new Map();
function cancelAbilityAutoFormat(targetId) {
  clearTimeout(abilityAutoFormatTimers.get(targetId));
  abilityAutoFormatTimers.delete(targetId);
}
function scheduleAbilityAutoFormat(targetId) {
  cancelAbilityAutoFormat(targetId);
  if (document.getElementById(targetId)?.dataset.composing === 'true') return;
  if (!abilityEditorNeedsAutoFormat(targetId)) return;
  abilityAutoFormatTimers.set(targetId, setTimeout(() => {
    abilityAutoFormatTimers.delete(targetId);
    autoFormatAbilityEditorById(targetId);
    render();
  }, 350));
}
function scheduleAbilityInputFormat(targetId, event) {
  cancelAbilityAutoFormat(targetId);
  // A break/history edit must not be followed by a DOM rewrite that invalidates
  // its native editing transaction. Rendering still resolves automatic bold.
  if (event?.isComposing || (typeof insertingAbilityBreak !== 'undefined' && insertingAbilityBreak)
      || /^(insertParagraph|insertLineBreak|historyUndo|historyRedo)$/.test(event?.inputType || '')) return;
  scheduleAbilityAutoFormat(targetId);
}
function onAbilityInput(event) {
  scheduleAbilityInputFormat('f-ability', event);
  render();
}
function onSplitAbilityInput(side, event) {
  const targetId = `split-ability-${side}`;
  scheduleAbilityInputFormat(targetId, event);
  render();
}
function openLegendaryNotes() { document.getElementById('legendary-notes-modal').classList.add('open'); }
function closeLegendaryNotes() { document.getElementById('legendary-notes-modal').classList.remove('open'); }
function renderKeywordList() {
  const body = document.getElementById('keyword-list-body');
  if (!body) return;
  const keywords = Array.isArray(globalThis.MASTER_STRIKE_KEYWORDS) ? globalThis.MASTER_STRIKE_KEYWORDS : [];
  body.innerHTML = keywords.map(keyword => `<div class="keyword-list-item">${keyword}</div>`).join('');
}
function setKeywordView(view = 'list') {
  const isReference = view === 'reference';
  const listPanel = document.getElementById('keyword-list-panel');
  const referencePanel = document.getElementById('keyword-reference-panel');
  const listBtn = document.getElementById('keyword-view-list-btn');
  const refBtn = document.getElementById('keyword-view-reference-btn');
  if (listPanel) listPanel.style.display = isReference ? 'none' : '';
  if (referencePanel) referencePanel.style.display = isReference ? '' : 'none';
  if (listBtn) listBtn.classList.toggle('active', !isReference);
  if (refBtn) refBtn.classList.toggle('active', isReference);
}
function openKeywordList() {
  renderKeywordList();
  setKeywordView('list');
  document.getElementById('keyword-list-modal').classList.add('open');
}
function closeKeywordList() { document.getElementById('keyword-list-modal').classList.remove('open'); }
function insertIcon(tokenKey) {
  insertIconInto('f-ability', tokenKey);
}
function getEditorInlineIconSrc(iconKey) {
  const key = String(iconKey || '').toLowerCase();
  if (key.startsWith('team:')) {
    const teamId = key.slice(5);
    if (teamId.startsWith('custom_')) {
      return st?.customTeams?.find(t => t.id === teamId)?.src
        || st?.customTeams?.find(t => t.id === teamId)?.img?.src
        || '';
    }
    return cache[`team_${teamId}`]?.src || (typeof A !== 'undefined' ? A[`team_${teamId}`] : '') || '';
  }
  const assetKey = getIconCacheKey(key);
  return cache[assetKey]?.src || (typeof A !== 'undefined' ? A[assetKey] : '') || '';
}
function insertInlineIconNodeInto(targetId, iconKey, label = '') {
  const el = document.getElementById(targetId);
  if (!el) return;
  const src = getEditorInlineIconSrc(iconKey);
  if (!src) return;
  el.focus();
  const img = document.createElement('img');
  img.src = src;
  img.alt = label || iconKey;
  img.setAttribute('data-icon', iconKey);
  img.setAttribute('contenteditable', 'false');
  img.style.height = '1em';
  img.style.width = 'auto';
  img.style.verticalAlign = 'middle';
  img.style.margin = '0 2px';
  const sel = window.getSelection();
  if (sel && sel.rangeCount) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(img);
    range.setStartAfter(img);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    el.appendChild(img);
  }
  if (targetId.includes('ability')) autoFormatAbilityEditorById(targetId);
  render();
}
function insertTeamIconFromPicker(targetId, selectId) {
  const sel = document.getElementById(selectId);
  if (!sel || !sel.value) return;
  const option = sel.options[sel.selectedIndex];
  insertInlineIconNodeInto(targetId, sel.value, option?.textContent || 'Team');
}
function insertIconInto(targetId, tokenKey) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.focus();
  const token = document.createTextNode(`/${tokenKey}`);
  const sel = window.getSelection();
  if (sel && sel.rangeCount) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(token);
    range.setStartAfter(token);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    el.appendChild(token);
  }
  if (targetId.includes('ability')) autoFormatAbilityEditorById(targetId);
  render();
}
function toggleSplitStat(side, field, btn) {
  btn.classList.toggle('on');
  render();
}
function toggleVillainMod(btn) {
  btn.classList.toggle('on');
  render();
}
