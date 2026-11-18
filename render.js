function drawI(ctx, key) {
  const i = cache[key];
  if (i) {
    if (key.startsWith('bg_') && i.height === CH + 1) {
      // New single/multicolor templates are 504x701 and some carry a tiny transparent
      // sliver on the bottom/right edges. Crop a hair off the source and overscan.
      const sx = 0;
      const sy = 0;
      const sw = Math.max(1, i.width - 1);
      const sh = Math.max(1, i.height - 1);
      ctx.drawImage(i, sx, sy, sw, sh, 0, 0, CW + 1, CH + 1);
    } else {
      ctx.drawImage(i, 0, 0, CW, CH);
    }
    return;
  }
  if (A[key] && !pendingAssetLoads.has(key)) {
    pendingAssetLoads.add(key);
    loadI(key).finally(() => {
      pendingAssetLoads.delete(key);
      render();
    });
  }
}

const CARD_TITLE_FONT_FAMILY = "'percolator',serif";

function getCardTitleFont(size) {
  return `${size}px ${CARD_TITLE_FONT_FAMILY}`;
}

const BIG_NUMBER_FONT_FAMILIES = {
  matrix: "'matrix'",
  matrix_ii_bold: "'matrix_ii_bold'"
};
const ACTIVE_BIG_NUMBER_FONT = 'matrix_ii_bold';

function getBigNumberFont(size, weight = 'bold') {
  const family = BIG_NUMBER_FONT_FAMILIES[ACTIVE_BIG_NUMBER_FONT] || BIG_NUMBER_FONT_FAMILIES.matrix;
  const prefix = weight ? `${weight} ` : '';
  return `${prefix}${getScaledBigNumberSize(size)}px ${family},serif`;
}

const MATRIX_DIGIT_OVERRIDES_FOR_OT_BOLD = new Set(['0', '1', '2', '4']);
const BIG_NUMBER_FONT_SIZE_SCALES = {
  matrix_ii_bold: 0.78
};
const BIG_NUMBER_ALIGNMENT_DIGITS = ['0', '1', '2', '3', '4', '5', '7', '9'];

function getScaledBigNumberSize(size, fontKey = ACTIVE_BIG_NUMBER_FONT) {
  return size * (BIG_NUMBER_FONT_SIZE_SCALES[fontKey] || 1);
}

function getBigNumberFontForDigit(digit, size, weight = 'bold') {
  if (MATRIX_DIGIT_OVERRIDES_FOR_OT_BOLD.has(String(digit))) {
    return `${weight ? `${weight} ` : ''}${size}px ${BIG_NUMBER_FONT_FAMILIES.matrix},serif`;
  }
  return getBigNumberFont(size, weight);
}

function getBigNumberDigitMetrics(ctx, digit, size, weight = 'bold') {
  ctx.font = getBigNumberFontForDigit(digit, size, weight);
  const m = ctx.measureText(String(digit));
  const left = m.actualBoundingBoxLeft || 0;
  const right = m.actualBoundingBoxRight || m.width || 0;
  const ascent = m.actualBoundingBoxAscent || 0;
  const descent = m.actualBoundingBoxDescent || 0;
  return {
    left,
    right,
    ascent,
    descent,
    width: m.width || (left + right),
    yBaselineForCenter: (ascent - descent) / 2
  };
}

function getBigNumberAlignmentCenter(ctx, size, weight = 'bold') {
  const centers = BIG_NUMBER_ALIGNMENT_DIGITS.map(digit => (
    getBigNumberDigitMetrics(ctx, digit, size, weight).yBaselineForCenter
  )).filter(Number.isFinite);
  if (!centers.length) return 0;
  return centers.reduce((sum, value) => sum + value, 0) / centers.length;
}

function applyBigNumberStrokeStyle(ctx, width = 5.8) {
  ctx.lineWidth = width;
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 12;
}

function measureBigNumberText(ctx, text, size, weight = 'bold') {
  const value = String(text || '');
  let width = 0;
  let left = 0;
  let right = 0;
  let ascent = 0;
  let descent = 0;
  const chars = value.split('');
  chars.forEach((ch, index) => {
    const metrics = getBigNumberDigitMetrics(ctx, ch, size, weight);
    if (index === 0) left = metrics.left;
    right = metrics.right;
    width += metrics.width;
    ascent = Math.max(ascent, metrics.ascent);
    descent = Math.max(descent, metrics.descent);
  });
  return {
    left,
    right,
    ascent,
    descent,
    width,
    xCenterOffset: (width / 2) - left,
    yBaselineForCenter: getBigNumberAlignmentCenter(ctx, size, weight)
  };
}

function drawBigNumberText(ctx, text, x, y, size, weight = 'bold') {
  const value = String(text || '');
  const groupCenterY = y - getBigNumberAlignmentCenter(ctx, size, weight);
  let cursor = x;
  for (const ch of value) {
    ctx.font = getBigNumberFontForDigit(ch, size, weight);
    const metrics = getBigNumberDigitMetrics(ctx, ch, size, weight);
    const digitBaselineY = groupCenterY + metrics.yBaselineForCenter;
    ctx.strokeText(ch, cursor, digitBaselineY);
    ctx.fillText(ch, cursor, digitBaselineY);
    cursor += metrics.width;
  }
}

function measureTrackedText(ctx, text, tracking = 0, wordSpacing = 0) {
  const value = String(text || '');
  if (!tracking || value.length <= 1) return ctx.measureText(value).width;
  let width = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    width += ctx.measureText(ch).width;
    if (ch === ' ') width += wordSpacing;
    if (i < value.length - 1) width += tracking;
  }
  return width;
}

function drawTrackedCenteredText(ctx, text, cx, cy, tracking = 0, wordSpacing = 0) {
  const value = String(text || '');
  if (!tracking || value.length <= 1) {
    ctx.strokeText(value, cx, cy);
    ctx.fillText(value, cx, cy);
    return;
  }
  const totalWidth = measureTrackedText(ctx, value, tracking, wordSpacing);
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  let x = cx - (totalWidth / 2);
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    ctx.strokeText(ch, x, cy);
    ctx.fillText(ch, x, cy);
    x += ctx.measureText(ch).width + (ch === ' ' ? wordSpacing : 0) + (i < value.length - 1 ? tracking : 0);
  }
  ctx.textAlign = prevAlign;
}

function getTitleTracking(kind = 'name') {
  if (kind === 'mastermind') return TITLE_TEXT.mastermindTracking ?? -2.1;
  if (kind === 'villain') return TITLE_TEXT.villainTracking ?? -0.45;
  if (kind === 'subtitle') return TITLE_TEXT.subtitleTracking ?? -0.35;
  return TITLE_TEXT.nameTracking ?? -0.6;
}

function getTitleWordSpacing(kind = 'name') {
  if (kind === 'mastermind') return TITLE_TEXT.mastermindWordSpacing ?? 0;
  if (kind === 'villain') return TITLE_TEXT.villainWordSpacing ?? 0;
  if (kind === 'subtitle') return TITLE_TEXT.subtitleWordSpacing ?? 0;
  return TITLE_TEXT.nameWordSpacing ?? 0;
}

function drawTitleTextLine(ctx, text, cx, cy, size, kind = 'name', opts = {}) {
  const isSubtitle = kind === 'subtitle';
  const tracking = opts.tracking ?? getTitleTracking(kind);
  const wordSpacing = opts.wordSpacing ?? getTitleWordSpacing(kind);
  const fill = opts.fill || (isSubtitle ? (TITLE_TEXT.subtitleFill || '#c8a040') : (TITLE_TEXT.nameFill || '#e8c040'));
  const stroke = opts.stroke || (isSubtitle ? (TITLE_TEXT.subtitleStrokeColor || 'rgba(0,0,0,0.86)') : (TITLE_TEXT.strokeColor || 'rgba(0,0,0,0.95)'));
  const lineWidth = opts.lineWidth || (isSubtitle ? (TITLE_TEXT.subtitleStrokeWidth || 1.15) : (TITLE_TEXT.nameStrokeWidth || 1.35));

  ctx.font = getCardTitleFont(size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  drawTrackedCenteredText(ctx, text, cx, cy, tracking, wordSpacing);
}

function drawCostAsteriskAsset(ctx, x, y, approxSize) {
  const key = 'cost_asterisk';
  const img = cache[key];
  if (!img) {
    if (A[key] && !pendingAssetLoads.has(key)) {
      pendingAssetLoads.add(key);
      loadI(key).finally(() => {
        pendingAssetLoads.delete(key);
        render();
      });
    }
    return false;
  }
  const bounds = getInlineIconBounds(img, key);
  const aspect = bounds && bounds.sh > 0 ? (bounds.sw / bounds.sh) : 1;
  const h = Math.max(1, Math.round(approxSize));
  const w = Math.max(1, Math.round(h * aspect));
  const dx = x - w / 2;
  const dy = y - h / 2;
  ctx.drawImage(img, bounds.sx, bounds.sy, bounds.sw, bounds.sh, dx, dy, w, h);
  return true;
}

function drawCenteredAssetBounds(ctx, key, cx, cy, opts = {}) {
  const img = cache[key];
  if (!img) {
    if (A[key] && !pendingAssetLoads.has(key)) {
      pendingAssetLoads.add(key);
      loadI(key).finally(() => {
        pendingAssetLoads.delete(key);
        render();
      });
    }
    return false;
  }

  const bounds = getInlineIconBounds(img, key);
  const scale = opts.scale || 1;
  const dw = bounds.sw * scale;
  const dh = bounds.sh * scale;
  const dx = cx - (dw / 2) + (opts.offsetX || 0);
  const dy = cy - (dh / 2) + (opts.offsetY || 0);
  ctx.drawImage(img, bounds.sx, bounds.sy, bounds.sw, bounds.sh, dx, dy, dw, dh);
  return true;
}

function drawOverlayStatNumbers(ctx, { costOnly = false } = {}) {
  ctx.save();
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  const recruitPos = P.recruit;
  const attackPos = P.attack;
  const costPos = P.cost;
  const multicolorStatNumbers = (STAT_NUMBERS.multicolor || {});

  function drawStatGroup(kind, cx, cy, num, showPlus) {
    const cfg = st.layout === 'multicolor'
      ? { ...(STAT_NUMBERS[kind] || {}), ...(multicolorStatNumbers[kind] || {}) }
      : (STAT_NUMBERS[kind] || {});
    const numText = String(num);
    const numSz = cfg.numSize || 84;
    const plusSz = cfg.plusSize || 31;
    const gap = cfg.gap || 1;
    const groupOffsetX = cfg.groupOffsetX || 0;
    const groupOffsetY = cfg.groupOffsetY || 2;
    const plusCenterAdjustY = cfg.plusOffsetY || 15;

    ctx.textAlign = 'left';
    const numBox = measureBigNumberText(ctx, numText, numSz);
    const numW = numBox.width;

    let totalW = numW;
    let plusLeft = 0;
    if (showPlus) {
      ctx.font = `bold ${plusSz}px 'eurostile_bold',sans-serif`;
      const plusMetrics = ctx.measureText('+');
      plusLeft = plusMetrics.actualBoundingBoxLeft || 0;
      const plusRight = plusMetrics.actualBoundingBoxRight || plusMetrics.width;
      totalW += gap + plusLeft + plusRight;
    }

    const soloOffsetX = cfg.soloOffsetX || 0;
    const appliedOffsetX = showPlus ? groupOffsetX : soloOffsetX;
    const startX = cx - totalW / 2 + appliedOffsetX;
    const baseY = cy + groupOffsetY;

    ctx.strokeStyle='rgba(0,0,0,0.88)';
    applyBigNumberStrokeStyle(ctx);
    ctx.fillStyle='#fff';
    drawBigNumberText(ctx, numText, startX, baseY, numSz);

    if (showPlus) {
      ctx.font = `bold ${plusSz}px 'eurostile_bold',sans-serif`;
      ctx.strokeStyle='rgba(0,0,0,0.92)';
      ctx.lineWidth=5.2;
      ctx.lineJoin='round';
      const plusX = startX + numBox.width + gap + plusLeft;
      const plusY = baseY + plusCenterAdjustY;
      ctx.strokeText('+', plusX, plusY);
      ctx.fillStyle='#fff';
      ctx.fillText('+', plusX, plusY);
    }

    ctx.textAlign = 'center';
  }

  if (!costOnly && st.showRecruit) {
    const recEl = document.getElementById('f-rec');
    const rec = recEl ? (+recEl.value || 0) : 0;
    drawStatGroup('recruit', recruitPos.cx, recruitPos.cy, rec, st.showRPlus);
  }

  if (!costOnly && st.showAttack) {
    const atkEl = document.getElementById('f-atk');
    const atk = atkEl ? (+atkEl.value || 0) : 0;
    drawStatGroup('attack', attackPos.cx, attackPos.cy, atk, st.showAPlus);
  }

  if (true) {
    const costEl = document.getElementById('f-cost');
    const cost = costEl ? (+costEl.value || 0) : 0;
    const cp = costPos;
    const numText = String(cost);
    const costCfg = st.layout === 'multicolor'
      ? { ...(STAT_NUMBERS.cost || {}), ...(multicolorStatNumbers.cost || {}) }
      : (STAT_NUMBERS.cost || {});
    const numSz = costCfg.numSize || 88;
    const astSz = costCfg.astSize || 78;
    const gap = costCfg.gap || 1;
    const coinCX = (cp.x0 + cp.x1) / 2;
    const coinCY = (cp.y0 + cp.y1) / 2;
    const costOffsetX = costCfg.offsetX || 0;
    const costOffsetY = costCfg.offsetY || 0;

    ctx.strokeStyle='rgba(0,0,0,0.88)';
    ctx.fillStyle='#fff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    applyBigNumberStrokeStyle(ctx);

    const numBox = measureBigNumberText(ctx, numText, numSz);

    if (!st.costAsterisk) {
      const numX = coinCX - (numBox.width / 2) + costOffsetX;
      const numY = coinCY + numBox.yBaselineForCenter + costOffsetY;
      applyBigNumberStrokeStyle(ctx);
      drawBigNumberText(ctx, numText, numX, numY, numSz);
    } else {
      const astBox = { width: astSz, xCenterOffset: 0 };
      const astGap = Math.max(0, gap - 6);
      const totalW = numBox.width + astGap + astBox.width;
      const groupLeft = coinCX - totalW / 2 + costOffsetX;
      const numX = groupLeft;
      const astCenterX = groupLeft + numBox.width + astGap + (astBox.width / 2);
      const numY = coinCY + numBox.yBaselineForCenter + costOffsetY;
      const astCenterY = coinCY + costOffsetY - 2;

      applyBigNumberStrokeStyle(ctx);
      drawBigNumberText(ctx, numText, numX, numY, numSz);

      if (!drawCostAsteriskAsset(ctx, astCenterX, astCenterY, astSz)) {
        const astGlyph = '\u2731';
        const astFont = `bold ${astSz}px 'century',sans-serif`;
        ctx.font = astFont;
        const fallbackMetrics = ctx.measureText(astGlyph);
        const fallbackBox = {
          xCenterOffset: ((fallbackMetrics.actualBoundingBoxRight || fallbackMetrics.width || 0) - (fallbackMetrics.actualBoundingBoxLeft || 0)) / 2,
          yBaselineForCenter: ((fallbackMetrics.actualBoundingBoxAscent || 0) - (fallbackMetrics.actualBoundingBoxDescent || 0)) / 2
        };
        const astX = astCenterX - fallbackBox.xCenterOffset;
        const astY = astCenterY + fallbackBox.yBaselineForCenter;
        ctx.font = astFont;
        ctx.lineWidth = 4.5;
        ctx.strokeText(astGlyph, astX, astY);
        ctx.fillText(astGlyph, astX, astY);
      }
    }
  }

  ctx.restore();
}

// Draw a stat icon (recruit/attack) scaled up, keeping its visual center fixed on the canvas.
// pngCX/pngCY = where the icon's center sits in the source PNG; canvasCX/CY = target canvas position.
const STAT_ICON_SCALE = STAT_ICONS.scale || 1.35;
function drawStatIcon(ctx, key, pngCX, pngCY, canvasCX, canvasCY, opts = {}) {
  const img = cache[key];
  if (!img) return;
  const baseS = (opts.scaleMultiplier || 1) * STAT_ICON_SCALE;
  const prevRecruitS = baseS * (STAT_ICONS.recruitLegacyScale || 0.95);
  const s = key.includes("recruit")
    ? baseS * (STAT_ICONS.recruitScaleMultiplier || 0.84)
    : key.includes("attack")
      ? baseS * (STAT_ICONS.attackScaleMultiplier || 1)
      : baseS;
  const dx = canvasCX - pngCX * s;
  const dy = key.includes("recruit")
    ? (canvasCY - pngCY * prevRecruitS + (STAT_ICONS.recruitYOffset || 21))
    : (canvasCY - pngCY * s);
  const dw = CW * s, dh = CH * s;

  ctx.save();

  if (key.includes('recruit')) {
    const sc = document.createElement('canvas');
    sc.width = Math.max(1, Math.ceil(dw));
    sc.height = Math.max(1, Math.ceil(dh));
    const sctx = sc.getContext('2d');

    sctx.drawImage(img, 0, 0, sc.width, sc.height);
    sctx.globalCompositeOperation = 'source-in';
    sctx.fillStyle = 'rgba(0,0,0,1)';
    sctx.fillRect(0, 0, sc.width, sc.height);
    sctx.globalCompositeOperation = 'source-over';

    // Build the star border in two layers:
    // a soft outer fade plus a denser inner contour, which matches
    // the reference better than a uniformly hard outline.
    const softOutlineOffsets = [
      [-5, 0], [5, 0], [0, -5], [0, 5],
      [-4, -4], [4, -4], [-4, 4], [4, 4],
      [-2, 0], [2, 0], [0, -2], [0, 2],
    ];
    const crispOutlineOffsets = [
      [-1, -1], [1, -1], [-1, 1], [1, 1],
      [-1, 0], [1, 0], [0, -1], [0, 1],
    ];
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.filter = 'blur(5px)';
    for (const [ox, oy] of softOutlineOffsets) {
      ctx.drawImage(sc, dx + ox, dy + oy, dw, dh);
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.filter = 'blur(2px)';
    for (const [ox, oy] of crispOutlineOffsets) {
      ctx.drawImage(sc, dx + ox, dy + oy, dw, dh);
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.filter = 'blur(4px)';
    ctx.drawImage(sc, dx + 2, dy + 5, dw, dh);
    ctx.restore();
  } else {
    ctx.shadowColor = 'rgba(0,0,0,0.88)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;
  }

  // Draw icon
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}


function computeRareCurveBox() {
  const curveCfg = RARE_BOX.curve || {};
  return {
    x: curveCfg.x || 90,
    y: curveCfg.y || 430,
    w: curveCfg.w || 388,
    h: curveCfg.h || 214,
    textX: curveCfg.textX || P.rareTextX,
    textY: curveCfg.textY || P.rareTextY,
    textW: curveCfg.textW || P.rareTextW,
    alpha: curveCfg.alpha || 0.96,
    fillColor: curveCfg.fillColor || 'rgba(255, 250, 242, 0.90)',
    highlightColor: curveCfg.highlightColor || 'rgba(255, 252, 247, 0.28)',
    topLeftY: curveCfg.topLeftY,
    topRightY: curveCfg.topRightY,
    topCurveDip: curveCfg.topCurveDip,
    bottomLeftY: curveCfg.bottomLeftY,
    bottomRightY: curveCfg.bottomRightY,
    rightInsetTop: curveCfg.rightInsetTop,
    rightInsetBottom: curveCfg.rightInsetBottom,
    fadeLeft: curveCfg.fadeLeft,
    fadeRight: curveCfg.fadeRight,
    fadeBottom: curveCfg.fadeBottom,
    blur: curveCfg.blur,
    haloBlur: curveCfg.haloBlur,
    haloColor: curveCfg.haloColor,
    style: 'curve'
  };
}

function buildRareCurvePath(ctx, box) {
  const x = box.x;
  const y = box.y;
  const w = box.w;
  const h = box.h;
  const topLeftY = box.topLeftY ?? y + 32;
  const topRightY = box.topRightY ?? y;
  const topCurveDip = box.topCurveDip ?? 18;
  const bottomLeftY = box.bottomLeftY ?? (y + h);
  const bottomRightY = box.bottomRightY ?? (y + h - 14);
  const rightInsetTop = box.rightInsetTop ?? 8;
  const rightInsetBottom = box.rightInsetBottom ?? 10;

  ctx.beginPath();
  ctx.moveTo(x, topLeftY);
  ctx.quadraticCurveTo(x + (w * 0.42), topLeftY + topCurveDip, x + w - rightInsetTop, topRightY);
  ctx.lineTo(x + w - rightInsetBottom, bottomRightY);
  ctx.lineTo(x, bottomLeftY);
  ctx.closePath();
}



function getPreviewScale() {
  return Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
}

function prepareCanvas(cv, scale, dims = { width: CW, height: CH }) {
  cv.width = Math.round(dims.width * scale);
  cv.height = Math.round(dims.height * scale);
  const ctx = cv.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, dims.width, dims.height);
  return ctx;
}

function getSplitHalfFormData(side) {
  const key = getSplitSideKey(side);
  const artState = st.split?.[key] || getDefaultSplitHalf(side);
  return {
    cls: document.getElementById(`split-cls-${side}`)?.value || 'instinct',
    cls2: document.getElementById(`split-cls2-${side}`)?.value || 'none',
    recruit: +(document.getElementById(`split-rec-${side}`)?.value || 0),
    attack: +(document.getElementById(`split-atk-${side}`)?.value || 0),
    cost: +(document.getElementById(`split-cost-${side}`)?.value || 0),
    showRecruit: !!document.getElementById(`split-show-rec-${side}`)?.classList.contains('on'),
    showRPlus: !!document.getElementById(`split-rplus-${side}`)?.classList.contains('on'),
    showAttack: !!document.getElementById(`split-show-atk-${side}`)?.classList.contains('on'),
    showAPlus: !!document.getElementById(`split-aplus-${side}`)?.classList.contains('on'),
    name: document.getElementById(`split-name-${side}`)?.value || '',
    hero: document.getElementById(`split-hero-${side}`)?.value || '',
    nameSize: +(document.getElementById(`split-name-sz-${side}`)?.value || 34),
    heroSize: +(document.getElementById(`split-hero-sz-${side}`)?.value || 24),
    abilitySize: +(document.getElementById(`split-ab-sz-${side}`)?.value || 15),
    flavorSize: +(document.getElementById(`split-fl-sz-${side}`)?.value || 10),
    abilityEl: document.getElementById(`split-ability-${side}`),
    flavorEl: document.getElementById(`split-flavor-${side}`),
    artImg: artState.artImg || null,
    artScale: artState.artScale ?? 100,
    artX: artState.artX ?? 0,
    artY: artState.artY ?? 0,
  };
}

function isSplitHalfMulticolor(half) {
  return half?.cls2 && half.cls2 !== 'none' && half.cls2 !== half.cls;
}

function drawSplitHalfClassIconOverlay(ctx, half, rarity, index = 0) {
  if (rarity !== 'rare') return;
  const cls = index === 0 ? half.cls : half.cls2;
  if (!cls || cls === 'none' || cls === 'grey') return;
  const img = cache[`power_${cls}`];
  if (!img) return;
  const size = (TITLE_TEXT.classIconOverlaySize || 37) * (TITLE_TEXT.classIconOverlayScales?.[cls] || 1);
  const gap = TITLE_TEXT.classIconOverlayGap ?? 8;
  const topGap = TITLE_TEXT.classIconOverlayTopGap ?? 8;
  const offsets = TITLE_TEXT.classIconOverlayOffsets?.[cls] || {};
  const cx = (TITLE_TEXT.classIconOverlayX || 49) + (offsets.x || 0);
  const barBottom = typeof TITLE_BAR.heroBottomY === 'number' ? TITLE_BAR.heroBottomY : (P.heroCY || 76);
  const cy = barBottom + topGap + (size / 2) + (index * (size + gap)) + (offsets.y || 0);
  const bounds = getInlineIconBounds(img, `power_${cls}`);
  const aspect = bounds && bounds.sh > 0 ? bounds.sw / bounds.sh : 1;
  const w = aspect >= 1 ? size : size * aspect;
  const h = aspect >= 1 ? size / aspect : size;
  ctx.drawImage(img, bounds.sx, bounds.sy, bounds.sw, bounds.sh, cx - w / 2, cy - h / 2, w, h);
}

function drawSplitHalfText(ctx, half, rarity) {
  const name = half.name || '';
  const hero = half.hero || '';
  let tsz = half.nameSize || 18;
  let hsz = half.heroSize || 10;
  const nameTracking = getTitleTracking('name');
  const subtitleTracking = getTitleTracking('subtitle');
  const nameWordSpacing = getTitleWordSpacing('name');
  const subtitleWordSpacing = getTitleWordSpacing('subtitle');
  const titleY = P.titleCY + (TITLE_TEXT.nameOffsetY ?? -1);
  const heroY = P.heroCY + (TITLE_TEXT.subtitleOffsetY ?? -2);
  ctx.font = getCardTitleFont(tsz);
  while (measureTrackedText(ctx, name.toUpperCase(), nameTracking, nameWordSpacing) > P.titleMaxW && tsz > 9) { tsz -= 0.5; ctx.font = getCardTitleFont(tsz); }
  const titleW = measureTrackedText(ctx, name.toUpperCase(), nameTracking, nameWordSpacing);
  ctx.font = getCardTitleFont(hsz);
  while (measureTrackedText(ctx, hero.toUpperCase(), subtitleTracking, subtitleWordSpacing) > P.titleMaxW && hsz > 6) { hsz -= 0.5; ctx.font = getCardTitleFont(hsz); }
  const heroW = measureTrackedText(ctx, hero.toUpperCase(), subtitleTracking, subtitleWordSpacing);
  const titleBgW = Math.max(
    TITLE_BAR.minWidth || 340,
    Math.min(CW - (TITLE_BAR.maxInsetX || 12), Math.ceil(Math.max(titleW, heroW) + (TITLE_BAR.widthPadding || 170)))
  );
  const explicitTitleBar = typeof TITLE_BAR.heroTopY === 'number' && typeof TITLE_BAR.heroBottomY === 'number';
  const titleBgTop = explicitTitleBar
    ? TITLE_BAR.heroTopY
    : Math.max(TITLE_BAR.topMinY || 15, Math.round(titleY - (tsz * (TITLE_BAR.topSizeFactor || 0.48))));
  const titleBgBottom = explicitTitleBar
    ? TITLE_BAR.heroBottomY
    : Math.min(TITLE_BAR.bottomMaxY || 97, Math.round(heroY + (hsz * (TITLE_BAR.bottomSizeFactor || 0.48))));
  const titleBgH = explicitTitleBar
    ? Math.max(1, titleBgBottom - titleBgTop)
    : Math.max(TITLE_BAR.minHeight || 54, titleBgBottom - titleBgTop);
  drawTitleBg(ctx, titleBgW, titleBgH, titleBgTop);

  drawTitleTextLine(ctx, name.toUpperCase(), P.titleCX, titleY, tsz, 'name', { tracking: nameTracking, wordSpacing: nameWordSpacing });
  drawTitleTextLine(ctx, hero.toUpperCase(), P.titleCX, heroY, hsz, 'subtitle', { tracking: subtitleTracking, wordSpacing: subtitleWordSpacing });

  const abRuns = parseRTE(half.abilityEl);
  const flRuns = parseRTE(half.flavorEl);
  const txtX = P.commonTextX;
  const txtY = rarity === 'rare' ? 526 : (rarity === 'uncommon' ? P.uncommonTextY : P.commonTextY);
  const txtW = rarity === 'rare' ? 360 : (rarity === 'uncommon' ? P.uncommonTextW : P.commonTextW);
  ctx.textAlign='left';
  ctx.textBaseline='top';
  const avoidZones = [{ y0: P.cost.y0, y1: P.cost.y1, x: P.cost.x0 - 8 }];
  drawAdaptiveTextBlock(ctx, {
    abRuns,
    flRuns,
    x: txtX,
    y: txtY,
    w: txtW,
    abSz: half.abilitySize || 15,
    flSz: half.flavorSize || 10,
    avoidZones,
    preferredFlavorGap: 42,
    minFlavorGap: 6,
    maxBottom: 666,
    minAbilitySize: Math.max(13, (half.abilitySize || 15) - 1),
    abilityAbsoluteMinimum: 13,
    minFlavorSize: Math.max(9, (half.abilitySize || 15) * 0.55),
    flavorSizeRatio: 0.62,
    clipBottom: 666
  });
}

function drawSplitHalfStatNumbers(ctx, half) {
  ctx.save();
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  function drawStatGroup(kind, cx, cy, num, showPlus) {
    const cfg = STAT_NUMBERS[kind] || {};
    const numText = String(num);
    const numSz = cfg.numSize || 84;
    const plusSz = cfg.plusSize || 31;
    const gap = cfg.gap || 1;
    const groupOffsetX = cfg.groupOffsetX || 0;
    const groupOffsetY = cfg.groupOffsetY || 2;
    const plusCenterAdjustY = cfg.plusOffsetY || 15;
    ctx.textAlign = 'left';
    const numBox = measureBigNumberText(ctx, numText, numSz);
    const numW = numBox.width;
    let totalW = numW;
    let plusLeft = 0;
    if (showPlus) {
      ctx.font = `bold ${plusSz}px 'eurostile_bold',sans-serif`;
      const plusMetrics = ctx.measureText('+');
      plusLeft = plusMetrics.actualBoundingBoxLeft || 0;
      const plusRight = plusMetrics.actualBoundingBoxRight || plusMetrics.width;
      totalW += gap + plusLeft + plusRight;
    }
    const soloOffsetX = cfg.soloOffsetX || 0;
    const appliedOffsetX = showPlus ? groupOffsetX : soloOffsetX;
    const startX = cx - totalW / 2 + appliedOffsetX;
    const baseY = cy + groupOffsetY;
    ctx.strokeStyle='rgba(0,0,0,0.88)';
    applyBigNumberStrokeStyle(ctx);
    ctx.fillStyle='#fff';
    drawBigNumberText(ctx, numText, startX, baseY, numSz);
    if (showPlus) {
      ctx.font = `bold ${plusSz}px 'eurostile_bold',sans-serif`;
      ctx.strokeStyle='rgba(0,0,0,0.92)';
      ctx.lineWidth=5.2;
      ctx.lineJoin='round';
      const plusX = startX + numBox.width + gap + plusLeft;
      const plusY = baseY + plusCenterAdjustY;
      ctx.strokeText('+', plusX, plusY);
      ctx.fillStyle='#fff';
      ctx.fillText('+', plusX, plusY);
    }
    ctx.textAlign = 'center';
  }
  if (half.showRecruit !== false) drawStatGroup('recruit', P.recruit.cx, P.recruit.cy, half.recruit, half.showRPlus);
  if (half.showAttack !== false) drawStatGroup('attack', P.attack.cx, P.attack.cy, half.attack, half.showAPlus);

  const costCfg = STAT_NUMBERS.cost || {};
  const numText = String(half.cost);
  const numSz = costCfg.numSize || 88;
  const cp = P.cost;
  const coinCX = (cp.x0 + cp.x1) / 2;
  const coinCY = (cp.y0 + cp.y1) / 2;
  const costOffsetX = costCfg.offsetX || 0;
  const costOffsetY = costCfg.offsetY || 0;
  ctx.strokeStyle='rgba(0,0,0,0.88)';
  ctx.fillStyle='#fff';
  ctx.textAlign='left';
  ctx.textBaseline='alphabetic';
  applyBigNumberStrokeStyle(ctx);
  const numBox = measureBigNumberText(ctx, numText, numSz);
  const numX = coinCX - (numBox.width / 2) + costOffsetX;
  const numY = coinCY + numBox.yBaselineForCenter + costOffsetY;
  applyBigNumberStrokeStyle(ctx);
  drawBigNumberText(ctx, numText, numX, numY, numSz);
  ctx.restore();
}

function renderSplitHalfPortrait(ctx, half, rarity) {
  const safeRarity = rarity === 'rare' ? 'rare' : (rarity === 'uncommon' ? 'uncommon' : 'common');
  const isRare = safeRarity === 'rare';
  const isMulti = isSplitHalfMulticolor(half);
  if (half.artImg) {
    const fitS = (CW / half.artImg.width) * ((half.artScale || 100) / 100);
    const fw = half.artImg.width * fitS;
    const fh = half.artImg.height * fitS;
    const ax = (CW - fw) / 2 + (half.artX || 0);
    const ay = (isRare ? (CH - fh) / 2 : (CH - fh) / 2 - 30) + (half.artY || 0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, CW, CH);
    ctx.clip();
    ctx.drawImage(half.artImg, ax, ay, fw, fh);
    ctx.restore();
  } else {
    ctx.save();
    ctx.fillStyle = '#b5b5b5';
    ctx.fillRect(0, 0, CW, CH);
    ctx.restore();
  }

  if (isRare) {
    drawI(ctx, 'bg_hero_rare_template');
  } else if (isMulti) {
    const multiKey = getMulticolorTemplateKey(safeRarity, half.cls, half.cls2);
    if (multiKey) drawI(ctx, multiKey);
    else drawI(ctx, `bg_${half.cls}_${safeRarity}`);
  } else {
    drawI(ctx, `bg_${half.cls}_${safeRarity}`);
  }
  if (half.showRecruit !== false) {
    drawStatIcon(ctx, `recruit_${safeRarity}`, STAT_ICONS.recruitCenterX || 68, P.recruit.cy, P.recruit.cx + (STAT_ICONS.recruitCanvasOffsetX || -1), P.recruit.cy + (STAT_ICONS.recruitCanvasOffsetY || 34));
  }
  if (half.showAttack !== false) {
    drawStatIcon(ctx, `attack_${safeRarity}`, P.attack.cx, P.attack.cy, P.attack.cx + (STAT_ICONS.attackCanvasOffsetX || -6), P.attack.cy + (STAT_ICONS.attackCanvasOffsetY || 6));
  }
  if (isRare) {
    const cp = P.cost;
    drawCenteredAssetBounds(ctx, 'cost_rare', (cp.x0 + cp.x1) / 2, (cp.y0 + cp.y1) / 2);
    drawSplitHalfClassIconOverlay(ctx, half, safeRarity, 0);
    if (isMulti) drawSplitHalfClassIconOverlay(ctx, half, safeRarity, 1);
  }
  drawSplitHalfText(ctx, half, safeRarity);
  drawSplitHalfStatNumbers(ctx, half);
}

function renderSplitToCanvas(cv, scale = 1) {
  const dims = getCanvasDims();
  const ctx = prepareCanvas(cv, scale, dims);
  const halfScale = Math.min((dims.width / 2) / CW, dims.height / CH);
  const drawW = CW * halfScale;
  const drawH = CH * halfScale;
  const top = Math.round((dims.height - drawH) / 2);
  const leftHalf = getSplitHalfFormData('1');
  const rightHalf = getSplitHalfFormData('2');
  const safeRarity = st.rar === 'rare' ? 'rare' : (st.rar === 'uncommon' ? 'uncommon' : 'common');

  ctx.save();
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, dims.width, dims.height);
  ctx.restore();

  [
    { x: 0, half: leftHalf },
    { x: Math.round(dims.width / 2), half: rightHalf }
  ].forEach(({ x, half }) => {
    ctx.save();
    ctx.translate(x, top);
    ctx.scale(halfScale, halfScale);
    renderSplitHalfPortrait(ctx, half, safeRarity);
    ctx.restore();
  });
}

function renderVillainToCanvas(cv, scale = 1) {
  const ctx = prepareCanvas(cv, scale, { width: CW, height: CH });
  const isMastermindProject = projectType === 'mastermind';
  const isHenchmanProject = projectType === 'henchman';
  const villainLayout = isMastermindProject
    ? (document.getElementById('m-layout')?.value || 'mastermind')
    : (isHenchmanProject ? 'henchman' : (document.getElementById('v-layout')?.value || 'villain'));
  const useMastermindCloneLayout = isMastermindProject && (villainLayout === 'mastermind' || villainLayout === 'tactic');
  const useVillainMatchedAssembly = !isMastermindProject && (villainLayout === 'villain' || villainLayout === 'adversary');
  const useAdversaryMatchedAssembly = !isMastermindProject && villainLayout === 'adversary';
  const useHenchmanMatchedAssembly = !isMastermindProject && villainLayout === 'henchman';
  const useLocationMatchedAssembly = !isMastermindProject && villainLayout === 'location';
  const useTrapMatchedAssembly = !isMastermindProject && villainLayout === 'trap';
  const villainBgKey = isMastermindProject
    ? 'bg_mastermind_matched'
    : (useHenchmanMatchedAssembly
        ? 'bg_henchman_ability_matched'
        : useLocationMatchedAssembly
          ? 'bg_trap_location_textbox_matched'
          : useTrapMatchedAssembly
            ? 'bg_trap_location_textbox_matched'
            : (useAdversaryMatchedAssembly ? 'bg_adversary_matched' : 'bg_villain_matched'));
  const bg = cache[villainBgKey];

  // Villain-family cards share one art-placement model; the layout differences
  // come from frame assembly plus text/stat geometry below.
  if (st.artImg) {
    const fitS = (CW / st.artImg.width) * (st.artScale / 100);
    const fw = st.artImg.width * fitS;
    const fh = st.artImg.height * fitS;
    const ax = (CW - fw) / 2 + st.artX;
    const ay = (CH - fh) / 2 - 30 + st.artY;
    ctx.drawImage(st.artImg, ax, ay, fw, fh);
  } else {
    ctx.save();
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, CW, CH);
    ctx.restore();
  }

  if (bg) {
    drawI(ctx, villainBgKey);
  }
  if (useHenchmanMatchedAssembly) {
    drawI(ctx, 'bg_henchman_matched');
    drawI(ctx, 'overlay_henchman_vp_matched');
  }
  if (useLocationMatchedAssembly) {
    drawI(ctx, 'bg_location_matched');
    drawI(ctx, 'overlay_henchman_vp_matched');
  }
  if (useTrapMatchedAssembly) {
    drawI(ctx, 'bg_trap_matched');
    drawI(ctx, 'overlay_henchman_vp_matched');
  }
  if (useVillainMatchedAssembly) {
    drawI(ctx, 'bg_mastermind_matched');
    drawI(ctx, 'overlay_mastermind_vp_matched');
  }
  if (useMastermindCloneLayout) {
    drawI(ctx, 'overlay_mastermind_vp_matched');
  }

  const name = document.getElementById('v-name')?.value || '';
  const subtitle = document.getElementById('v-subtitle')?.value || '';
  const villainNameSize = +document.getElementById('v-name-sz')?.value || 22;
  const villainSubtitleSize = +document.getElementById('v-subtitle-sz')?.value || 12;
  const abSz = +document.getElementById('ab-sz')?.value || 22;
  const flSz = +document.getElementById('fl-sz')?.value || 11;
  const attack = +(document.getElementById('v-atk')?.value || 0);
  const vp = +(document.getElementById('v-vp')?.value || 0);
  const showAttackNumber = !!document.getElementById('villain-show-atk-num')?.classList.contains('on');
  const showVP = !!document.getElementById('villain-show-vp')?.classList.contains('on');
  const showPlus = !!document.getElementById('villain-atk-plus')?.classList.contains('on');
  const showAttackAst = !!document.getElementById('villain-atk-asterisk')?.classList.contains('on');
  const showVpPlus = !!document.getElementById('villain-vp-plus')?.classList.contains('on');
  const showVpAst = !!document.getElementById('villain-vp-asterisk')?.classList.contains('on');
  const showAttackDisplay = showAttackNumber;
  const useTunedMastermindLayout = useMastermindCloneLayout || useVillainMatchedAssembly;

  // Henchman, Location, and Trap all use the same left curve baseline.
  // Trap only relaxes the right side because it has no lower-right stat block.
  const curvedVillainFamilyTextLayout = {
    x: 80,
    y: 526,
    w: 390,
    leftLineStart: 88,
    leftLineStep: 24,
    avoidZones: [
      { y0: 526, y1: 690, x: 470 },
    ],
    flavorGap: 18,
    lineHeightScale: 0.82,
    blankLineScale: 0.26,
  };
  const useHenchmanAttackWrap = true;
  const villainFamilyAttackWrapZones = [
    { y0: 526, y1: 562, x: 456 },
    { y0: 563, y1: 586, x: 442 },
    { y0: 587, y1: 625, x: 368 },
    { y0: 626, y1: 664, x: 360 },
    { y0: 665, y1: 690, x: 386 },
  ];
  const curvedVillainFamilyStatLayout = {
    attackIconX: 432,
    attackIconY: 599,
    attackNumberX: 438,
    attackNumberY: 642,
    attackNumberSize: 113,
    attackPlusGap: 6,
    attackPlusScale: 1,
    attackPlusCenterX: null,
    vpX: 460,
    vpY: 468,
  };

  let villainTextLayout = {
    villain: {
      x: 78,
      y: 548,
      w: 356,
      avoidZones: [{ y0: 544, y1: 688, x: 386 }],
      flavorGap: 28,
    },
    adversary: {
      x: 78,
      y: 548,
      w: 356,
      avoidZones: [{ y0: 544, y1: 688, x: 386 }],
      flavorGap: 28,
    },
    henchman: {
      ...curvedVillainFamilyTextLayout,
      avoidZones: useHenchmanAttackWrap
        ? villainFamilyAttackWrapZones
        : curvedVillainFamilyTextLayout.avoidZones,
    },
    location: {
      ...curvedVillainFamilyTextLayout,
      y: curvedVillainFamilyTextLayout.y + 5,
      x: curvedVillainFamilyTextLayout.x + 8,
      leftLineStart: curvedVillainFamilyTextLayout.leftLineStart + 8,
      avoidZones: villainFamilyAttackWrapZones,
    },
    trap: null,
    mastermind: {
      x: 78,
      y: 548,
      w: 356,
      avoidZones: [{ y0: 544, y1: 688, x: 386 }],
      flavorGap: 28,
    },
    tactic: {
      x: 78,
      y: 548,
      w: 356,
      avoidZones: [{ y0: 544, y1: 688, x: 386 }],
      flavorGap: 28,
    },
  }[villainLayout] || {
    x: 78,
    y: 548,
    w: 356,
    avoidZones: [{ y0: 544, y1: 688, x: 386 }],
    flavorGap: 28,
  };
  if (useTunedMastermindLayout) {
    villainTextLayout = {
      x: 62,
      y: 526,
      w: 408,
      avoidZones: [
        { y0: 526, y1: 590, x: 448 },
        { y0: 591, y1: 626, x: 388 },
        { y0: 627, y1: 688, x: 384 },
      ],
      flavorGap: 14,
      lineHeightScale: 0.82,
      blankLineScale: 0.26,
    };
  }
  if (villainLayout === 'trap') {
    villainTextLayout = {
      ...curvedVillainFamilyTextLayout,
      avoidZones: curvedVillainFamilyTextLayout.avoidZones.map(zone => ({ ...zone, x: 476 })),
      x: curvedVillainFamilyTextLayout.x + 8,
      y: curvedVillainFamilyTextLayout.y + 5,
      leftLineStart: curvedVillainFamilyTextLayout.leftLineStart + 8,
    };
  }
  const villainStatLayout = villainLayout === 'henchman' || villainLayout === 'location' || villainLayout === 'trap'
    ? curvedVillainFamilyStatLayout
    : useTunedMastermindLayout
    ? {
        attackIconX: 440,
        attackIconY: 587,
        attackNumberX: 432,
        attackNumberY: 630,
        attackNumberSize: 114,
        attackPlusGap: 3,
        attackPlusScale: 1.05,
        attackPlusCenterX: 460,
        vpX: 460,
        vpY: 470,
      }
    : {
        attackIconX: 432,
        attackIconY: 599,
        attackNumberX: 438,
        attackNumberY: 642,
        attackNumberSize: 113,
        attackPlusGap: 6,
        attackPlusScale: 1,
        attackPlusCenterX: null,
        vpX: 457,
        vpY: 472,
      };

  ctx.save();
  const titleCenterY = P.titleCY + (TITLE_TEXT.nameOffsetY ?? -1);
  const subtitleCenterY = P.heroCY + (TITLE_TEXT.subtitleOffsetY ?? -2);

  let titleSize = villainNameSize;
  const titleTracking = useTunedMastermindLayout ? getTitleTracking('mastermind') : getTitleTracking('villain');
  const subtitleTracking = useTunedMastermindLayout ? getTitleTracking('mastermind') : getTitleTracking('subtitle');
  const titleWordSpacing = useTunedMastermindLayout ? getTitleWordSpacing('mastermind') : getTitleWordSpacing('villain');
  const subtitleWordSpacing = useTunedMastermindLayout ? getTitleWordSpacing('mastermind') : getTitleWordSpacing('subtitle');
  ctx.font = getCardTitleFont(titleSize);
  while (measureTrackedText(ctx, name.toUpperCase(), titleTracking, titleWordSpacing) > 360 && titleSize > 12) {
    titleSize -= 0.5;
    ctx.font = getCardTitleFont(titleSize);
  }
  let subSize = villainSubtitleSize;
  const subtitleMaxWidth = P.titleMaxW || 380;
  ctx.font = getCardTitleFont(subSize);
  while (measureTrackedText(ctx, subtitle.toUpperCase(), subtitleTracking, subtitleWordSpacing) > subtitleMaxWidth && subSize > 8) {
    subSize -= 0.5;
    ctx.font = getCardTitleFont(subSize);
  }
  const titleW = measureTrackedText(ctx, name.toUpperCase(), titleTracking, titleWordSpacing);
  const subtitleW = measureTrackedText(ctx, subtitle.toUpperCase(), subtitleTracking, subtitleWordSpacing);
  const titleBgW = Math.max(
    TITLE_BAR.minWidth || 340,
    Math.min(CW - (TITLE_BAR.maxInsetX || 12), Math.ceil(Math.max(titleW, subtitleW) + (TITLE_BAR.widthPadding || 170)))
  );
  const explicitTitleBar = typeof TITLE_BAR.heroTopY === 'number' && typeof TITLE_BAR.heroBottomY === 'number';
  const titleBgTop = explicitTitleBar
    ? TITLE_BAR.heroTopY
    : Math.max(TITLE_BAR.topMinY || 15, Math.round(titleCenterY - (titleSize * (TITLE_BAR.topSizeFactor || 0.48))));
  const titleBgBottom = explicitTitleBar
    ? TITLE_BAR.heroBottomY
    : Math.min(TITLE_BAR.bottomMaxY || 97, Math.round(subtitleCenterY + (subSize * (TITLE_BAR.bottomSizeFactor || 0.48))));
  const titleBgH = explicitTitleBar
    ? Math.max(1, titleBgBottom - titleBgTop)
    : Math.max(TITLE_BAR.minHeight || 54, titleBgBottom - titleBgTop);
  drawTitleBg(ctx, titleBgW, titleBgH, titleBgTop);

  drawTitleTextLine(ctx, name.toUpperCase(), 252, titleCenterY, titleSize, useTunedMastermindLayout ? 'mastermind' : 'villain', { tracking: titleTracking });
  drawTitleTextLine(ctx, subtitle.toUpperCase(), 252, subtitleCenterY, subSize, 'subtitle', { tracking: subtitleTracking });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const txtX = villainTextLayout.x;
  const txtY = villainTextLayout.y;
  const txtW = villainTextLayout.w;
  const abRuns = parseRTE(document.getElementById('f-ability'));
  const avoidZones = villainTextLayout.avoidZones || [];
  const textOptions = {
    lineHeightScale: villainTextLayout.lineHeightScale ?? 0.86,
    blankLineScale: villainTextLayout.blankLineScale ?? 0.32,
    leftBoundary: villainTextLayout.leftBoundary || null,
    leftLineStart: villainTextLayout.leftLineStart,
    leftLineStep: villainTextLayout.leftLineStep
  };
  const flRuns = parseRTE(document.getElementById('f-flavor'));
  drawAdaptiveTextBlock(ctx, {
    abRuns,
    flRuns,
    x: txtX,
    y: txtY,
    w: txtW,
    abSz,
    flSz,
    avoidZones,
    options: textOptions,
    preferredFlavorGap: villainTextLayout.flavorGap,
    minFlavorGap: 6,
    maxBottom: villainTextLayout.maxBottom || 648,
    minAbilitySize: Math.max(14, abSz - 1),
    abilityAbsoluteMinimum: 14,
    minFlavorSize: Math.max(9, abSz * 0.55),
    flavorSizeRatio: 0.62,
    clipBottom: villainTextLayout.maxBottom || 648
  });

  if (showAttackDisplay) {
    drawStatIcon(ctx, 'attack_common', P.attack.cx, P.attack.cy, villainStatLayout.attackIconX, villainStatLayout.attackIconY, { scaleMultiplier: 1.16 });
  }

  if (showAttackNumber && showAttackDisplay) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.strokeStyle='rgba(0,0,0,0.88)';
    ctx.fillStyle='#fff';
    applyBigNumberStrokeStyle(ctx);
    const numSz = villainStatLayout.attackNumberSize ?? 113;
    const plusSz = 31 * (villainStatLayout.attackPlusScale ?? 1);
    const astSz = 30;
    const gap = villainStatLayout.attackPlusGap ?? 6;
    const attackCX = villainStatLayout.attackNumberX;
    const attackCY = villainStatLayout.attackNumberY;
    const getGlyphBox = (font, textValue) => {
      ctx.font = font;
      const m = ctx.measureText(textValue);
      const left = m.actualBoundingBoxLeft || 0;
      const right = m.actualBoundingBoxRight || m.width || 0;
      const ascent = m.actualBoundingBoxAscent || 0;
      const descent = m.actualBoundingBoxDescent || 0;
      return {
        left, right, ascent, descent,
        width: left + right,
        xCenterOffset: (right - left) / 2,
        yBaselineForCenter: (ascent - descent) / 2
      };
    };
    const numText = String(attack);
    const numBox = measureBigNumberText(ctx, numText, numSz);
    const plusBox = showPlus ? getGlyphBox(`bold ${plusSz}px 'eurostile_bold',sans-serif`, '+') : null;
    const astBox = showAttackAst ? { width: astSz } : null;
    let totalW = numBox.width;
    if (showPlus) totalW += gap + plusBox.width;
    if (showAttackAst) totalW += gap + astBox.width;
    const groupLeft = showPlus && !showAttackAst && villainStatLayout.attackPlusCenterX != null
      ? (villainStatLayout.attackPlusCenterX - (numBox.width + gap + (plusBox.width / 2)))
      : (attackCX - totalW / 2);
    const numX = groupLeft;
    const numY = attackCY + numBox.yBaselineForCenter;
    applyBigNumberStrokeStyle(ctx);
    drawBigNumberText(ctx, numText, numX, numY, numSz);
    let cursorX = groupLeft + numBox.width;
    if (showPlus) {
      const plusX = cursorX + gap + plusBox.left;
      const plusY = attackCY + (plusBox.yBaselineForCenter || 0);
      ctx.font = `bold ${plusSz}px 'eurostile_bold',sans-serif`;
      ctx.lineWidth = 5.2;
      ctx.strokeText('+', plusX, plusY);
      ctx.fillText('+', plusX, plusY);
      cursorX += gap + plusBox.width;
    }
    if (showAttackAst) {
      const astCenterX = cursorX + gap + (astSz / 2);
      const astCenterY = attackCY - 3;
      if (!drawCostAsteriskAsset(ctx, astCenterX, astCenterY, astSz)) {
        const astGlyph = '\u2731';
        const fallbackBox = getGlyphBox(`bold ${astSz}px 'century',sans-serif`, astGlyph);
        const astX = astCenterX - fallbackBox.xCenterOffset;
        const astY = astCenterY + fallbackBox.yBaselineForCenter;
        ctx.font = `bold ${astSz}px 'century',sans-serif`;
        ctx.lineWidth = 4.5;
        ctx.strokeText(astGlyph, astX, astY);
        ctx.fillText(astGlyph, astX, astY);
      }
    }
  }

  if (showVP) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.strokeStyle='rgba(0,0,0,0.88)';
    ctx.fillStyle='#fff';
    applyBigNumberStrokeStyle(ctx);
    const vpSz = 34;
    const vpPlusSz = 15;
    const vpAstSz = 15;
    const vpGap = 2;
    const vpCX = villainStatLayout.vpX;
    const vpCY = villainStatLayout.vpY;
    const getGlyphBox = (font, textValue) => {
      ctx.font = font;
      const m = ctx.measureText(textValue);
      const left = m.actualBoundingBoxLeft || 0;
      const right = m.actualBoundingBoxRight || m.width || 0;
      const ascent = m.actualBoundingBoxAscent || 0;
      const descent = m.actualBoundingBoxDescent || 0;
      return {
        left, right, ascent, descent,
        width: left + right,
        xCenterOffset: (right - left) / 2,
        yBaselineForCenter: (ascent - descent) / 2
      };
    };
    const vpText = String(vp);
    const vpBox = measureBigNumberText(ctx, vpText, vpSz, '');
    const vpPlusBox = showVpPlus ? getGlyphBox(`bold ${vpPlusSz}px 'eurostile_bold',sans-serif`, '+') : null;
    const vpAstBox = showVpAst ? { width: vpAstSz } : null;
    let vpTotalW = vpBox.width;
    if (showVpPlus) vpTotalW += vpGap + vpPlusBox.width;
    if (showVpAst) vpTotalW += vpGap + vpAstBox.width;
    const vpGroupLeft = vpCX - vpTotalW / 2;
    const vpX = vpGroupLeft;
    const vpY = vpCY + vpBox.yBaselineForCenter;
    ctx.lineWidth = 4.8;
    drawBigNumberText(ctx, vpText, vpX, vpY, vpSz, '');
    let vpCursorX = vpGroupLeft + vpBox.width;
    if (showVpPlus) {
      const plusX = vpCursorX + vpGap + vpPlusBox.left;
      const plusY = vpCY + (vpPlusBox.yBaselineForCenter || 0);
      ctx.font = `bold ${vpPlusSz}px 'eurostile_bold',sans-serif`;
      ctx.lineWidth = 3.6;
      ctx.strokeText('+', plusX, plusY);
      ctx.fillText('+', plusX, plusY);
      vpCursorX += vpGap + vpPlusBox.width;
    }
    if (showVpAst) {
      const astCenterX = vpCursorX + vpGap + (vpAstSz / 2);
      const astCenterY = vpCY - 1;
      if (!drawCostAsteriskAsset(ctx, astCenterX, astCenterY, vpAstSz)) {
        const astGlyph = '\u2731';
        const fallbackBox = getGlyphBox(`bold ${vpAstSz}px 'century',sans-serif`, astGlyph);
        const astX = astCenterX - fallbackBox.xCenterOffset;
        const astY = astCenterY + fallbackBox.yBaselineForCenter;
        ctx.font = `bold ${vpAstSz}px 'century',sans-serif`;
        ctx.lineWidth = 3.2;
        ctx.strokeText(astGlyph, astX, astY);
        ctx.fillText(astGlyph, astX, astY);
      }
    }
  }
  ctx.restore();
}

function renderSchemeToCanvas(cv, scale = 1) {
  const ctx = prepareCanvas(cv, scale, { width: CW, height: CH });
  const schemeLayout = document.getElementById('scheme-layout')?.value || 'a';
  const bgKey = schemeLayout === 'b' ? 'bg_scheme_layout_b' : 'bg_scheme_layout_a';
  const bg = cache[bgKey];

  if (st.artImg) {
    const fitS = (CW / st.artImg.width) * (st.artScale / 100);
    const fw = st.artImg.width * fitS;
    const fh = st.artImg.height * fitS;
    const ax = (CW - fw) / 2 + st.artX;
    const ay = (CH - fh) / 2 - 30 + st.artY;
    ctx.drawImage(st.artImg, ax, ay, fw, fh);
  } else {
    ctx.save();
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, CW, CH);
    ctx.restore();
  }

  if (bg) drawI(ctx, bgKey);

  const name = document.getElementById('v-name')?.value || '';
  const titleSizeBase = +document.getElementById('v-name-sz')?.value || 34;
  const abSz = +document.getElementById('ab-sz')?.value || 22;
  const flSz = +document.getElementById('fl-sz')?.value || 11;

  ctx.save();
  let titleSize = titleSizeBase;
  const titleTracking = getTitleTracking('villain');
  const titleWordSpacing = getTitleWordSpacing('villain');
  const titleCenterY = P.titleCY + (TITLE_TEXT.nameOffsetY ?? -1);
  ctx.font = getCardTitleFont(titleSize);
  while (measureTrackedText(ctx, name.toUpperCase(), titleTracking, titleWordSpacing) > 400 && titleSize > 12) {
    titleSize -= 0.5;
    ctx.font = getCardTitleFont(titleSize);
  }
  const explicitTitleBar = typeof TITLE_BAR.heroTopY === 'number' && typeof TITLE_BAR.heroBottomY === 'number';
  const titleBgTop = explicitTitleBar
    ? TITLE_BAR.heroTopY
    : Math.max(TITLE_BAR.topMinY || 15, Math.round(titleCenterY - (titleSize * (TITLE_BAR.topSizeFactor || 0.48))));
  const titleBgBottom = explicitTitleBar
    ? TITLE_BAR.heroBottomY
    : Math.min(TITLE_BAR.bottomMaxY || 97, Math.round(titleCenterY + (titleSize * (TITLE_BAR.bottomSizeFactor || 0.48))));
  const titleBgH = explicitTitleBar
    ? Math.max(1, titleBgBottom - titleBgTop)
    : Math.max(TITLE_BAR.minHeight || 54, titleBgBottom - titleBgTop);
  drawTitleBg(ctx, 420, titleBgH, titleBgTop);

  drawTitleTextLine(ctx, name.toUpperCase(), 252, titleCenterY, titleSize, 'villain', {
    tracking: titleTracking,
    fill: '#f3f4f6',
    lineWidth: 1.35
  });

  const layoutCfg = schemeLayout === 'b'
    ? { x: 22, y: 370, w: 432, bottom: 650, flavorGap: 16, options: {} }
    : { x: 22, y: 525, w: 460, bottom: 670, flavorGap: 16, options: { lineAdvanceRatio: 1.1 } };
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const abRuns = parseRTE(document.getElementById('f-ability'));
  const flRuns = parseRTE(document.getElementById('f-flavor'));
  drawAdaptiveTextBlock(ctx, {
    abRuns,
    flRuns,
    x: layoutCfg.x,
    y: layoutCfg.y,
    w: layoutCfg.w,
    abSz,
    flSz,
    options: {
      lineHeightScale: 0.82,
      blankLineScale: 0.26,
      ...layoutCfg.options
    },
    preferredFlavorGap: layoutCfg.flavorGap,
    minFlavorGap: 6,
    maxBottom: layoutCfg.bottom,
    minAbilitySize: Math.max(14, abSz - 1),
    abilityAbsoluteMinimum: 14,
    minFlavorSize: Math.max(9, abSz * 0.55),
    flavorSizeRatio: 0.62,
    clipBottom: layoutCfg.bottom
  });
  ctx.restore();
}

function renderToCanvas(cv, scale = 1) {
  if (projectType === 'villain' || projectType === 'mastermind' || projectType === 'henchman') {
    renderVillainToCanvas(cv, scale);
    return;
  }
  if (projectType === 'scheme') {
    renderSchemeToCanvas(cv, scale);
    return;
  }
  if (st.layout === 'split') {
    renderSplitToCanvas(cv, scale);
    return;
  }
  const ctx = prepareCanvas(cv, scale, { width: CW, height: CH });
  const r=st.rar, c=st.cls, isRare=(r==='rare');
  const isMulticolorLayout = st.layout === 'multicolor';
  const isMulticolorTemplate = isMulticolorLayout && !isRare;
  const isMulticolorRare = isMulticolorLayout && isRare;
  const multicolorKey = isMulticolorTemplate ? getMulticolorTemplateKey(r, st.cls, st.cls2) : null;
  rareBox = null;

  // 1. ART â€” absolute bottom layer, no clipping (fills whole card)
  if (st.artImg) {
    const fitS = (CW / st.artImg.width) * (st.artScale / 100);
    const fw = st.artImg.width * fitS;
    const fh = st.artImg.height * fitS;
    const ax = (CW - fw) / 2 + st.artX;
    const ay = (isRare ? (CH-fh)/2 : (CH-fh)/2 - 30) + st.artY;
    ctx.drawImage(st.artImg, ax, ay, fw, fh);
  } else {
    ctx.save();
    ctx.fillStyle = '#b5b5b5';
    ctx.fillRect(0, 0, CW, CH);
    ctx.restore();
  }

  if (isMulticolorTemplate && multicolorKey) {
    drawI(ctx, multicolorKey);
  }


  // 2. TEXT BOX
  if (isRare) {
    rareBox = computeRareCurveBox();
    drawI(ctx, 'bg_hero_rare_template');
  }
  // 4. STAT ICONS â€” at natural alpha (attack already drawn behind box for rare)
  if (!isRare && !isMulticolorTemplate) {
    drawI(ctx, `bg_${c}_${r==='uncommon'?'uncommon':'common'}`);
  }
  if (st.showRecruit) {
      drawStatIcon(
        ctx,
        `recruit_${r}`,
        STAT_ICONS.recruitCenterX || 68,
      P.recruit.cy,
      P.recruit.cx + (STAT_ICONS.recruitCanvasOffsetX || -1),
      P.recruit.cy + (STAT_ICONS.recruitCanvasOffsetY || 34)
    );
  }
  if (st.showAttack) {
    drawStatIcon(
      ctx,
      `attack_${r}`,
      P.attack.cx,
      P.attack.cy,
      P.attack.cx + (STAT_ICONS.attackCanvasOffsetX || -6),
      P.attack.cy + (STAT_ICONS.attackCanvasOffsetY || 6)
    );
  }
  if (isRare) {
    const cp = P.cost;
    const costCfg = STAT_NUMBERS.cost || {};
    const costOffsetX = costCfg.offsetX || 0;
    const costOffsetY = costCfg.offsetY || 0;
    const badgeCX = ((cp.x0 + cp.x1) / 2) + costOffsetX;
    const badgeCY = ((cp.y0 + cp.y1) / 2) + costOffsetY;
    drawCenteredAssetBounds(ctx, 'cost_rare', badgeCX, badgeCY);
  }

  // 5. ICONS
  drawIcons(ctx);

  // 6. TEXT
  try {
    drawText(ctx);
  } catch (err) {
    console.error('drawText failed', err);
  }
  drawOverlayStatNumbers(ctx);
}

function drawIcons(ctx) {
  const team = document.getElementById('s-team').value;
  if (team !== 'none') {
    const ti = team.startsWith('custom_') ? (st.customTeams.find(t=>t.id===team)?.img||null) : cache[`team_${team}`];
    if (ti) {
      drawTeamIcon(ctx, ti);
    }
  }
  if (st.rar !== 'rare') return;
  const classStack = st.layout === 'multicolor'
    ? (normalizeMulticolorClasses(st.cls, st.cls2) || [st.cls, st.cls2])
    : [st.cls];
  classStack.forEach((cls, index) => drawClassIconOverlay(ctx, cls, index));
}

function drawTitleBg(ctx, barW, barH, barY) {
  const img = cache.title_bg;
  if (!img) return;

  const sx = TITLE_BAR.sourceX || 73;
  const sy = TITLE_BAR.sourceY || 65;
  const sw = TITLE_BAR.sourceW || 675;
  const sh = TITLE_BAR.sourceH || 73;
  const sourceCap = TITLE_BAR.sourceCap || 122;
  const leftX = typeof TITLE_BAR.leftX === 'number' ? TITLE_BAR.leftX : null;
  const rightX = typeof TITLE_BAR.rightX === 'number' ? TITLE_BAR.rightX : null;
  const dx = leftX ?? (P.titleCX - (barW / 2));
  const resolvedBarW = leftX != null && rightX != null ? Math.max(1, rightX - leftX) : barW;
  const dy = barY;
  const destCap = Math.min(sourceCap, Math.max(TITLE_BAR.minCap || 36, Math.floor(resolvedBarW * (TITLE_BAR.capRatio || 0.28))));
  const destMidW = Math.max(1, resolvedBarW - (destCap * 2));
  const sourceMidW = Math.max(1, sw - (sourceCap * 2));

  ctx.save();
  ctx.drawImage(img, sx, sy, sourceCap, sh, dx, dy, destCap, barH);
  ctx.drawImage(img, sx + sourceCap, sy, sourceMidW, sh, dx + destCap, dy, destMidW, barH);
  ctx.drawImage(img, sx + sw - sourceCap, sy, sourceCap, sh, dx + resolvedBarW - destCap, dy, destCap, barH);
  ctx.restore();
}

function drawTeamIcon(ctx, img) {
  if (!img) return;
  const t = P.team || { cx: 43, cy: 34, r: 22 };
  const size = TITLE_TEXT.teamIconSize || ((t.r || 22) * 2);
  const bounds = getInlineIconBounds(img, img.src || img);
  const aspect = bounds && bounds.sh > 0 ? bounds.sw / bounds.sh : 1;
  const w = aspect >= 1 ? size : size * aspect;
  const h = aspect >= 1 ? size / aspect : size;
  ctx.drawImage(
    img,
    bounds.sx,
    bounds.sy,
    bounds.sw,
    bounds.sh,
    t.cx - w / 2,
    t.cy - h / 2,
    w,
    h
  );
}

function drawClassIconOverlay(ctx, cls, index = 0) {
  if (!cls || cls === 'grey') return;
  const key = getClassIconOverlayAssetKey(cls, index);
  const img = cache[key];
  if (!img) return;
  const placement = getClassIconOverlayPlacement(cls, index, key);
  if (!placement) return;
  const { cx, cy, w, h, bounds } = placement;
  ctx.drawImage(img, bounds.sx, bounds.sy, bounds.sw, bounds.sh, cx - w / 2, cy - h / 2, w, h);
}

function getClassIconOverlayAssetKey(cls, index = 0) {
  if (st.layout === 'multicolor' && st.rar === 'rare') {
    const slot = index === 0 ? 'top' : 'bottom';
    const rareKey = `power_${cls}_${slot}`;
    if (cache[rareKey]) return rareKey;
  }
  return `power_${cls}`;
}

function getClassIconOverlayPlacement(cls, index = 0, assetKey = null) {
  if (!cls || cls === 'grey') return null;
  const img = cache[assetKey || `power_${cls}`];
  if (!img) return null;
  const scale = TITLE_TEXT.classIconOverlayScales?.[cls] || 1;
  const size = (TITLE_TEXT.classIconOverlaySize || 37) * scale;
  const gap = TITLE_TEXT.classIconOverlayGap ?? 8;
  const topGap = TITLE_TEXT.classIconOverlayTopGap ?? 8;
  const offsets = TITLE_TEXT.classIconOverlayOffsets?.[cls] || {};
  const useRareMulticolorDefaults = st.layout === 'multicolor' && st.rar === 'rare';
  const rareAssetScale = useRareMulticolorDefaults ? (TITLE_TEXT.classIconOverlayRareAssetScale || 1) : 1;
  const rareStackOffset = useRareMulticolorDefaults ? (TITLE_TEXT.classIconOverlayRareStackOffset || {}) : {};
  const rarePerIconOffset = useRareMulticolorDefaults ? (TITLE_TEXT.classIconOverlayRareOffsets?.[index] || {}) : {};
  const perIconOffset = st.classIconOffsets?.[index] || {};
  const cx = (TITLE_TEXT.classIconOverlayX || 49) + (offsets.x || 0) + (rareStackOffset.x || 0) + (st.classIconOffsetX || 0) + (rarePerIconOffset.x || 0) + (perIconOffset.x || 0);
  const barBottom = typeof TITLE_BAR.heroBottomY === 'number'
    ? TITLE_BAR.heroBottomY
    : (P.heroCY || 76);
  const cy = barBottom + topGap + (size / 2) + (index * (size + gap)) + (offsets.y || 0) + (rareStackOffset.y || 0) + (st.classIconOffsetY || 0) + (rarePerIconOffset.y || 0) + (perIconOffset.y || 0);
  const bounds = getInlineIconBounds(img, assetKey || `power_${cls}`);
  const aspect = bounds && bounds.sh > 0 ? bounds.sw / bounds.sh : 1;
  const w = (aspect >= 1 ? size : size * aspect) * rareAssetScale;
  const h = (aspect >= 1 ? size / aspect : size) * rareAssetScale;
  return { cx, cy, w, h, bounds };
}


const ICON_TOKEN_RE = /\/(recruit|attack|cost|instinct|covert|strength|range|in|st|ra|r|a|c|t)/gi;
const AUTO_BOLD_TERMS = [
  'Cross-Dimensional Rampage',
  'Man/Woman Out of Time',
  'Microscopic Size-Changing',
  'Uru-Enchanted Weapons',
  'Weapon X Sequence',
  'Contest of Champions',
  'Rise of the Living Dead',
  'Tactical Formation',
  'Hunt for Victims',
  'Cheering Crowds',
  'Circle of Kung-fu',
  'Demonic Bargain',
  'Excessive Violence',
  'Fateful Resurrection',
  'Hidden Witnesses',
  'Villainous Weapon',
  'Wounded Fury',
  'Cosmic Threat',
  'Cyber-Mod',
  'Danger Sense',
  'Dark Memories',
  'Double-Cross',
  'Human Shields',
  'Last Stand',
  'Lightshow',
  'Ritual Artifact',
  'Shield Clearance',
  'Shield Level',
  'Size-Changing',
  'Soulbind',
  'Spectrum',
  'Sunlight',
  'Switcheroo',
  'Symbiote Bonds',
  'Teleport',
  'Throne of Kings',
  'Thrown Artifacts',
  'Undercover',
  'Unleashed',
  'Versatile',
  'Waking Nightmare',
  'Wall Crawl',
  'What If?',
  'Worthy',
  'X-Treme Attack',
  'Abomination',
  'Ambush',
  'Antics',
  'Astral Plane',
  'Berserk',
  'Blood Frenzy',
  'Bribe',
  'Burn Shards',
  'Burrow',
  'Charge',
  'Chivalrous Duel',
  'Clone',
  'Command',
  'Conqueror',
  'Coordinate',
  'Demolish',
  'Digest',
  'Dominate',
  'Elusive',
  'Empowered',
  'Endgame',
  'Explore',
  'Fated Future',
  'Feast',
  'Finish the Prey',
  'Focus',
  'Fortify',
  'Haunt',
  'Heist',
  'Hydra Level',
  'Hyperspeed',
  'Indigestion',
  'Investigate',
  'Liberate X',
  'Momentum',
  'Outwit',
  'Patrol',
  'Phasing',
  'Piercing Energy',
  'Prey',
  'Revenge',
  'Sacrifice',
  'Savior',
  'Shatter',
  'Smash',
  'Soaring Flight',
  'Striker',
  'X-Gene',
];
const AUTO_BOLD_KEYWORD_TERMS = [
  ...new Set(globalThis.MASTER_STRIKE_KEYWORD_AUTO_BOLD_TERMS || [])
];
const AUTO_BOLD_SECTION_HEADER_RE = '\\b(?:Fight|Ambush|Escape|KO|Always Leads|Master Strike|Mastermind Tactic|Evil Wins|Setup|Special Setup|When Recruited|Transform|Twist|Twists\\s+[\\d-]+)\\s*:';
const AUTO_BOLD_KEYWORD_PHRASE_RES = [
  '\\b(?:Focus|Versatile)\\s+\\d+(?:\\s*\\/(?:recruit|attack|r|a)\\b)?',
  '\\bBurn\\s+\\d+\\s+Shards?\\b',
  '\\b(?:Sewers|Bank|Rooftops|Streets|Bridge)\\s+Conqueror\\s+\\d+\\b',
  '\\b(?:Sewers|Bank|Rooftops|Streets|Bridge)\\s+Abomination\\b',
  '\\b(?:Highest|Ultimate|Double)\\s+Abomination\\b',
  '\\bS\\.H\\.I\\.E\\.L\\.D\\.\\s+(?:Level|Clearance)\\b',
];
const AUTO_BOLD_RE = new RegExp(
  [
    '\\+\\d*',
    '\\b\\d+\\b(?=\\s*\\/(?:recruit|attack|r|a)\\b)',
    AUTO_BOLD_SECTION_HEADER_RE,
    // A colon belongs to its header/keyword expression, never to punctuation alone.
    ...AUTO_BOLD_KEYWORD_PHRASE_RES.map(pattern => `(?:${pattern})(?:[ \\t]*:)?`),
    ...AUTO_BOLD_TERMS
      .concat(AUTO_BOLD_KEYWORD_TERMS)
      .sort((a, b) => b.length - a.length)
      .map(x => `(?<![A-Za-z])${x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z])(?:[ \\t]*:)?`),
  ].join('|'),
  'gi'
);
function getIconCacheKey(key) {
  const r = st ? (st.rar || 'common') : 'common';
  const m = {
    r:`recruit_${r}`, recruit:`recruit_${r}`,
    a:`attack_${r}`,  attack:`attack_${r}`,
    cost:`cost_${r}`,
    in:'power_instinct', instinct:'power_instinct',
    c:'power_covert',    covert:'power_covert',
    st:'power_strength', strength:'power_strength',
    ra:'power_range',    range:'power_range',
    t:'power_tech',      tech:'power_tech',
  };
  return m[key] || key;
}
function resolveInlineIconAsset(iconKey) {
  const key = String(iconKey || '').toLowerCase();
  if (key.startsWith('team:')) {
    const teamId = key.slice(5);
    if (teamId.startsWith('custom_')) {
      const team = st?.customTeams?.find(t => t.id === teamId);
      return {
        img: team?.img || null,
        cacheKey: `team_custom_${teamId}`
      };
    }
    return {
      img: cache[`team_${teamId}`] || null,
      cacheKey: `team_${teamId}`
    };
  }
  const cacheKey = getIconCacheKey(key);
  return {
    img: cache[cacheKey] || null,
    cacheKey
  };
}
function pushAutoBoldText(text, b, i, u, runs) {
  AUTO_BOLD_RE.lastIndex = 0;
  let last = 0, m;
  while ((m = AUTO_BOLD_RE.exec(text)) !== null) {
    if (m.index > last) runs.push({t: text.slice(last, m.index), b, i, u});
    runs.push({t: m[0], b: true, i, u});
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push({t: text.slice(last), b, i, u});
}
function splitTokens(text, b, i, u, runs) {
  ICON_TOKEN_RE.lastIndex = 0;
  let last = 0, m;
  while ((m = ICON_TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) pushAutoBoldText(text.slice(last, m.index), b, i, u, runs);
    runs.push({icon: m[1].toLowerCase()});
    last = m.index + m[0].length;
  }
  if (last < text.length) pushAutoBoldText(text.slice(last), b, i, u, runs);
}

function unwrapNode(el) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function saveSelectionMarkers(root) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;

  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const startId = `sel_start_${stamp}`;
  const endId = `sel_end_${stamp}`;

  const makeMarker = id => {
    const span = document.createElement('span');
    span.id = id;
    span.setAttribute('data-sel-marker', '1');
    span.style.display = 'inline-block';
    span.style.width = '0';
    span.style.overflow = 'hidden';
    span.textContent = '\u200b';
    return span;
  };

  if (range.collapsed) {
    const marker = makeMarker(startId);
    range.insertNode(marker);
    return { collapsed: true, startId };
  }

  const endRange = range.cloneRange();
  endRange.collapse(false);
  endRange.insertNode(makeMarker(endId));

  const startRange = range.cloneRange();
  startRange.collapse(true);
  startRange.insertNode(makeMarker(startId));

  return { collapsed: false, startId, endId };
}

function restoreSelectionMarkers(root, markers) {
  if (!markers) return;
  const sel = window.getSelection();
  if (!sel) return;
  const start = document.getElementById(markers.startId);
  const end = markers.endId ? document.getElementById(markers.endId) : null;
  if (!start) return;

  const range = document.createRange();
  if (markers.collapsed || !end) {
    range.setStartAfter(start);
    range.collapse(true);
  } else {
    range.setStartAfter(start);
    range.setEndBefore(end);
  }
  sel.removeAllRanges();
  sel.addRange(range);

  if (start.parentNode) start.parentNode.removeChild(start);
  if (end && end.parentNode) end.parentNode.removeChild(end);
}

function suppressAutoBoldInSelectionById(targetId) {
  const root = document.getElementById(targetId);
  if (!root) return false;
  const markers = saveSelectionMarkers(root);
  if (!markers || markers.collapsed) return false;

  const start = document.getElementById(markers.startId);
  const end = markers.endId ? document.getElementById(markers.endId) : null;
  if (!start || !end) return false;

  const range = document.createRange();
  range.setStartAfter(start);
  range.setEndBefore(end);
  const text = range.toString();
  AUTO_BOLD_RE.lastIndex = 0;
  if (!AUTO_BOLD_RE.test(text)) {
    restoreSelectionMarkers(root, markers);
    return false;
  }

  const wrapper = root.ownerDocument.createElement('span');
  wrapper.setAttribute('data-noautobold', '1');
  wrapper.appendChild(range.extractContents());
  wrapper.querySelectorAll('b[data-autobold="1"]').forEach(unwrapNode);
  range.insertNode(wrapper);
  wrapper.after(createFormatBoundaryNode(root.ownerDocument));
  restoreSelectionMarkers(root, markers);
  return true;
}

function selectionHasAutoBoldById(targetId) {
  const root = document.getElementById(targetId);
  const sel = window.getSelection();
  if (!root || !sel || !sel.rangeCount) return false;
  const range = sel.getRangeAt(0);
  if (range.collapsed || !root.contains(range.commonAncestorContainer)) return false;
  const container = range.commonAncestorContainer.nodeType === 1
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentElement;
  if (!container) return false;
  return Array.from(root.querySelectorAll('b[data-autobold="1"]')).some(node => range.intersectsNode(node));
}

function selectionHasNoAutoBoldById(targetId) {
  const root = document.getElementById(targetId);
  const sel = window.getSelection();
  if (!root || !sel || !sel.rangeCount) return false;
  const range = sel.getRangeAt(0);
  if (range.collapsed || !root.contains(range.commonAncestorContainer)) return false;
  return Array.from(root.querySelectorAll('[data-noautobold="1"]')).some(node => range.intersectsNode(node));
}

// Test the selected characters, not merely whether an auto-bold node is touched.
// A mixed selection (e.g. "KO: Draw") should become bold as a whole.
function selectionIsEntirelyBold(targetId) {
  const root = document.getElementById(targetId);
  const selection = window.getSelection();
  if (!root || !selection?.rangeCount) return false;
  const range = selection.getRangeAt(0);
  if (range.collapsed || !root.contains(range.commonAncestorContainer)) return false;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let found = false;
  let node;
  while ((node = walker.nextNode())) {
    if (!range.intersectsNode(node) || node.parentElement.closest('[data-format-boundary], [data-sel-marker]')) continue;
    const start = range.startContainer === node ? range.startOffset : 0;
    const end = range.endContainer === node ? range.endOffset : node.length;
    if (!node.textContent.slice(start, end).trim()) continue;
    found = true;
    const weight = getComputedStyle(node.parentElement).fontWeight;
    if (weight !== 'bold' && Number(weight) < 600) return false;
  }
  return found;
}

function toggleAbilityBold(targetId) {
  const root = document.getElementById(targetId);
  const selection = window.getSelection();
  if (!root || !selection?.rangeCount || selection.isCollapsed) return false;
  if (!root.contains(selection.getRangeAt(0).commonAncestorContainer)) return false;
  root.focus();
  if (selectionIsEntirelyBold(targetId)) {
    // Remove manual formatting first, then remember the explicit override so
    // keyword parsing and a subsequent save/load cannot reapply it.
    document.execCommand('bold', false, null);
    suppressAutoBoldInSelectionById(targetId);
  } else {
    if (selectionHasNoAutoBoldById(targetId)) restoreAutoBoldInSelectionById(targetId);
    document.execCommand('bold', false, null);
  }
  return true;
}

function restoreAutoBoldInSelectionById(targetId) {
  const root = document.getElementById(targetId);
  if (!root) return false;
  const markers = saveSelectionMarkers(root);
  if (!markers || markers.collapsed) return false;
  const start = document.getElementById(markers.startId);
  const end = markers.endId ? document.getElementById(markers.endId) : null;
  if (!start || !end) return false;

  const range = document.createRange();
  range.setStartAfter(start);
  range.setEndBefore(end);
  const wrappers = Array.from(root.querySelectorAll('[data-noautobold="1"]'))
    .filter(node => range.intersectsNode(node));
  if (!wrappers.length) {
    restoreSelectionMarkers(root, markers);
    return false;
  }
  wrappers.forEach(unwrapNode);
  root.querySelectorAll('[data-format-boundary="1"]').forEach(node => {
    const prev = node.previousSibling;
    const next = node.nextSibling;
    if (!prev || !next || node.textContent === '\u200b') node.remove();
  });
  restoreSelectionMarkers(root, markers);
  return true;
}

function buildAutoBoldFragment(text, doc) {
  const frag = doc.createDocumentFragment();
  AUTO_BOLD_RE.lastIndex = 0;
  let last = 0, m;
  while ((m = AUTO_BOLD_RE.exec(text)) !== null) {
    if (m.index > last) frag.appendChild(doc.createTextNode(text.slice(last, m.index)));
    const b = doc.createElement('b');
    b.setAttribute('data-autobold', '1');
    b.textContent = m[0];
    frag.appendChild(b);
    last = m.index + m[0].length;
  }
  if (last < text.length) frag.appendChild(doc.createTextNode(text.slice(last)));
  return frag;
}

const MANUAL_BOLD_TOKEN_RE = /(?:\/b"([^"\n]+)"([\s.,;:!?)]))|(?:\/b([^\s"']+)([\s.,;:!?)]))/g;

function appendAutoBoldText(frag, text, doc) {
  if (!text) return;
  const autoFrag = buildAutoBoldFragment(text, doc);
  frag.appendChild(autoFrag);
}

function createFormatBoundaryNode(doc) {
  const span = doc.createElement('span');
  span.setAttribute('data-format-boundary', '1');
  span.setAttribute('contenteditable', 'false');
  span.style.display = 'inline-block';
  span.style.width = '0';
  span.style.overflow = 'hidden';
  span.textContent = '\u200b';
  return span;
}

function buildAbilityMarkupFragment(text, doc) {
  const frag = doc.createDocumentFragment();
  MANUAL_BOLD_TOKEN_RE.lastIndex = 0;
  let last = 0;
  let match;

  while ((match = MANUAL_BOLD_TOKEN_RE.exec(text)) !== null) {
    if (match.index > last) appendAutoBoldText(frag, text.slice(last, match.index), doc);
    const boldNode = doc.createElement('b');
    boldNode.textContent = match[1] || match[3] || '';
    frag.appendChild(boldNode);
    frag.appendChild(createFormatBoundaryNode(doc));
    const trailingSeparator = match[2] || match[4] || '';
    if (trailingSeparator) frag.appendChild(doc.createTextNode(trailingSeparator));
    last = match.index + match[0].length;
  }

  if (last < text.length) appendAutoBoldText(frag, text.slice(last), doc);
  return frag;
}

function autoFormatAbilityEditorById(targetId) {
  const root = document.getElementById(targetId);
  if (!root) return;

  const markers = saveSelectionMarkers(root);

  root.querySelectorAll('b[data-autobold="1"]').forEach(unwrapNode);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.length) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest('[data-sel-marker="1"]')) return NodeFilter.FILTER_REJECT;
      if (parent.closest('[data-format-boundary="1"]')) return NodeFilter.FILTER_REJECT;
      if (parent.closest('[data-noautobold="1"]')) return NodeFilter.FILTER_REJECT;
      const manualBold = parent.closest('b');
      if (manualBold && !manualBold.hasAttribute('data-autobold')) return NodeFilter.FILTER_REJECT;
      MANUAL_BOLD_TOKEN_RE.lastIndex = 0;
      if (MANUAL_BOLD_TOKEN_RE.test(node.nodeValue)) return NodeFilter.FILTER_ACCEPT;
      AUTO_BOLD_RE.lastIndex = 0;
      return AUTO_BOLD_RE.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });

  const nodes = [];
  let current;
  while ((current = walker.nextNode())) nodes.push(current);

  nodes.forEach(node => {
    const frag = buildAbilityMarkupFragment(node.nodeValue, root.ownerDocument);
    node.parentNode.replaceChild(frag, node);
  });

  restoreSelectionMarkers(root, markers);
}
function autoFormatAbilityEditor() {
  autoFormatAbilityEditorById('f-ability');
}

function getInlineIconMetrics(iconKey, textSize, ability = false) {
  const key = String(iconKey || '').toLowerCase();
  const isStat = key === 'recruit' || key === 'r' || key === 'attack' || key === 'a';
  const scale = isStat
    ? ((ability ? TEXTBOX_ICONS.abilityStatScale : null) ?? TEXTBOX_ICONS.statScale ?? 2.15)
    : (TEXTBOX_ICONS.classScale ?? 1.45);
  const gap = isStat
    ? (TEXTBOX_ICONS.statGap ?? 4)
    : (TEXTBOX_ICONS.classGap ?? 3);
  const offsetY = isStat
    ? (TEXTBOX_ICONS.statOffsetY ?? 1)
    : (TEXTBOX_ICONS.classOffsetY ?? 1);
  return {
    size: Math.round(textSize * scale),
    gap,
    offsetY
  };
}

function getInlineIconPlacement(iconKey, textSize, reference = null) {
  const { img, cacheKey } = resolveInlineIconAsset(iconKey);
  const metrics = getInlineIconMetrics(iconKey, textSize, !!reference);
  // Ability icons share the regular font's capital-height center at every size.
  // Other inline consumers retain their existing alignment.
  if (reference) metrics.offsetY = (reference.top + reference.bottom - metrics.size) / 2;
  if (!img) {
    return { width: metrics.size, height: metrics.size, gap: metrics.gap, offsetY: metrics.offsetY };
  }

  const bounds = getInlineIconBounds(img, cacheKey);
  const aspect = bounds && bounds.sh > 0 ? (bounds.sw / bounds.sh) : 1;
  const height = metrics.size;
  const width = Math.max(1, Math.round(height * aspect));
  return { width, height, gap: metrics.gap, offsetY: metrics.offsetY, bounds, img, cacheKey };
}

const MANUAL_INLINE_BOUNDS = {
  recruit_common: { sx: 23, sy: 462, sw: 86, sh: 87 },
  recruit_uncommon: { sx: 23, sy: 462, sw: 86, sh: 87 },
  recruit_rare: { sx: 23, sy: 462, sw: 86, sh: 87 },
  attack_common: { sx: 22, sy: 576, sw: 76, sh: 70 },
  attack_uncommon: { sx: 22, sy: 576, sw: 76, sh: 70 },
  attack_rare: { sx: 22, sy: 576, sw: 76, sh: 70 },
  power_instinct: { sx: 19, sy: 14, sw: 134, sh: 143 },
  power_covert: { sx: 20, sy: 17, sw: 139, sh: 142 },
  power_strength: { sx: 12, sy: 18, sw: 150, sh: 144 },
  power_range: { sx: 5, sy: 47, sw: 237, sh: 144 },
  power_tech: { sx: 25, sy: 15, sw: 111, sh: 138 },
};

function getRunLineHeight(textSize) {
  const base = textSize + 2;
  const classSize = getInlineIconPlacement('range', textSize).height;
  const statSize = Math.max(textSize + 2, getInlineIconPlacement('attack', textSize).height - 2);
  return Math.max(base, classSize, statSize);
}

function getInlineIconBounds(img, cacheKey) {
  if (!img) return null;
  const key = cacheKey || img.src || img;
  if (INLINE_ICON_BOUNDS.has(key)) return INLINE_ICON_BOUNDS.get(key);
  if (cacheKey && MANUAL_INLINE_BOUNDS[cacheKey]) {
    const manual = MANUAL_INLINE_BOUNDS[cacheKey];
    INLINE_ICON_BOUNDS.set(key, manual);
    return manual;
  }

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let width = canvas.width;
  let height = canvas.height;
  let data;

  try {
    ctx.drawImage(img, 0, 0);
    ({ data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height));
  } catch (_) {
    const fallback = { sx: 0, sy: 0, sw: width, sh: height };
    INLINE_ICON_BOUNDS.set(key, fallback);
    return fallback;
  }

  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const bounds = maxX >= minX && maxY >= minY
    ? { sx: minX, sy: minY, sw: maxX - minX + 1, sh: maxY - minY + 1 }
    : { sx: 0, sy: 0, sw: width, sh: height };

  INLINE_ICON_BOUNDS.set(key, bounds);
  return bounds;
}

function parseRTE(el) {
  if (el.id === 'f-ability' || /^split-ability-[12]$/.test(el.id)) return parseAbilityRTE(el);
  const runs = [];
  function walk(node, b, i, u, noAutoBold = false) {
    if (node.nodeType === 3) {
      if (node.textContent) {
        if (noAutoBold) runs.push({ t: node.textContent, b, i, u });
        else splitTokens(node.textContent, b, i, u, runs);
      }
    } else if (node.nodeType === 1) {
      const tag = node.tagName.toLowerCase();
      if (tag === 'br') { runs.push({br:true}); return; }
      if (tag === 'img') { const ic = node.getAttribute('data-icon'); if (ic) runs.push({icon: ic.toLowerCase()}); return; }
      if (node.hasAttribute && node.hasAttribute('data-format-boundary')) return;
      const nb=b||tag==='b'||tag==='strong', ni=i||tag==='i'||tag==='em', nu=u||tag==='u';
      const nextNoAutoBold = noAutoBold || !!node.closest?.('[data-noautobold="1"]');
      if ((tag==='div'||tag==='p') && runs.length > 0 && !runs[runs.length-1].br) runs.push({br:true});
      node.childNodes.forEach(ch => walk(ch, nb, ni, nu, nextNoAutoBold));
    }
  }
  el.childNodes.forEach(ch => walk(ch, false, false, false, false));
  return runs;
}

// Interpret browser blocks and line breaks without rewriting the saved HTML.
// A terminal <br> is Chromium's caret placeholder; block boundaries represent
// their own line transition. Empty blocks still occupy a line.
function parseAbilityRTE(root) {
  const hardBreak = () => ({ br: true, fullLine: true });
  const isBlock = node => node.nodeType === 1 && /^(DIV|P|HR)$/.test(node.tagName);
  function inline(node, marks) {
    if (node.nodeType === 3) {
      const result = [];
      node.textContent.replace(/\r\n?/g, '\n').split('\n').forEach((text, index) => {
        // With pre-wrap Chromium may use a final newline instead of <br> as
        // its caret placeholder. Treat both spellings identically.
        if (index) result.push({ ...hardBreak(), domBreak: true });
        if (marks.noAutoBold) { if (text) result.push({ t: text, ...marks }); }
        else splitTokens(text, marks.b, marks.i, marks.u, result);
      });
      return result;
    }
    if (node.nodeType !== 1 || node.matches('[data-format-boundary], [data-sel-marker]')) return [];
    if (node.tagName === 'BR') return [{ ...hardBreak(), domBreak: true }];
    if (node.tagName === 'IMG') {
      const icon = node.getAttribute('data-icon');
      return icon ? [{ icon: icon.toLowerCase() }] : [];
    }
    const next = {
      b: marks.b || /^(B|STRONG)$/.test(node.tagName),
      i: marks.i || /^(I|EM)$/.test(node.tagName),
      u: marks.u || node.tagName === 'U',
      noAutoBold: marks.noAutoBold || node.getAttribute('data-noautobold') === '1'
    };
    return children(node, next, false);
  }
  function children(container, marks, trimPlaceholder) {
    const result = [];
    let occupied = false, previousBlock = false;
    for (const node of container.childNodes) {
      const block = isBlock(node);
      const content = node.nodeName === 'HR' ? [{ divider: true }]
        : block ? children(node, marks, true) : inline(node, marks);
      if (!block && !content.length) continue;
      if (occupied && (previousBlock || (block && !result[result.length - 1]?.br))) result.push(hardBreak());
      result.push(...content);
      occupied = true;
      previousBlock = block;
    }
    if (trimPlaceholder && result[result.length - 1]?.domBreak) result.pop();
    return result;
  }
  return children(root, { b: false, i: false, u: false, noAutoBold: false }, true)
    .map(({ domBreak, ...run }) => run);
}

// Classification is a rendering hint only; never rewrite saved HTML or runs.
function classifyAbilityBlock(runs) {
  if (runs.some(run => run.divider)) return { eligible: false, reason: 'divider' };
  let text = runs.map(run => run.icon ? '\uFFFC' : (run.t || '')).join('').trim();
  if (!text) return { eligible: false, reason: 'empty' };
  let ambiguousAcronym = false;
  text = text.replace(/\bWhat If(?:\.\.\.|…)\?/gi, 'What If')
    .replace(/\b(?:[A-Za-z]\.){2,}/g, (match, offset, source) => {
      const following = source.slice(offset + match.length).trimStart();
      // An acronym's final dot may also end a sentence. Known keyword suffixes
      // are safe; otherwise a following capital makes the boundary uncertain.
      if (/^[A-Z]/.test(following) && !(match === 'S.H.I.E.L.D.' && /^(?:Clearance|Level)\b/.test(following))) ambiguousAcronym = true;
      return match.replace(/\./g, '');
    })
    .replace(/(\d)\.(?=\d)/g, '$1');
  // Abbreviations and ellipses can conceal a sentence boundary: prefer prose.
  if (ambiguousAcronym || /\b(?:Mr|Mrs|Ms|Dr|Prof|St|Jr|Sr|vs|etc|approx|No)\.|\b[A-Za-z]\.|\.{2,}|…/i.test(text)) {
    return { eligible: false, reason: 'ambiguous' };
  }
  const endings = text.match(/[.!?]+/g) || [];
  const tail = text.replace(/[.!?]+["'”’\)\]]*\s*$/, '');
  const count = endings.length + (tail === text ? 1 : 0);
  return { eligible: count === 1, reason: count === 1 ? 'single' : 'multiple' };
}

function getAbilityBlocks(runs) {
  const blocks = [{ runs: [] }];
  for (const run of runs) {
    if (run.br) {
      blocks.at(-1).breakAfter = run;
      blocks.push({ runs: [] });
    } else blocks.at(-1).runs.push(run);
  }
  return blocks.map((block, index) => ({ ...block, index, ...classifyAbilityBlock(block.runs) }));
}

// Keep fragments of one word together even when markup splits its style runs.
// Whitespace advances retain the legacy policy (including trailing run spaces).
function getLayoutUnits(runs) {
  const units = [];
  let word = [];
  const flush = () => {
    if (word.length) units.push({ fragments: word });
    word = [];
  };
  for (const run of runs) {
    if (run.br || run.icon || run.divider) {
      flush();
      units.push(run);
      continue;
    }
    const parts = run.t.match(/\s+|\S+/g) || [];
    let space = '';
    for (const part of parts) {
      if (/^\s+$/.test(part)) {
        flush();
        space += part;
      } else {
        word.push({ ...run, t: space + part });
        space = '';
      }
    }
    if (space) {
      flush();
      units.push({ space: { ...run, t: space } });
    }
    if (!parts.length) units.push({ empty: true });
  }
  flush();
  return units;
}

// A contour is measured from the same badge asset and number painter used by
// the card. Rebuild per render so asset/font loads and cost edits cannot stale it.
function getHeroCostContour() {
  const canvas = document.createElement('canvas');
  canvas.width = CW; canvas.height = CH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const cp = P.cost, cfg = STAT_NUMBERS.cost || {};
  drawCenteredAssetBounds(ctx, 'cost_rare', (cp.x0 + cp.x1) / 2 + (cfg.offsetX || 0),
    (cp.y0 + cp.y1) / 2 + (cfg.offsetY || 0));
  drawOverlayStatNumbers(ctx, { costOnly: true });
  const pixels = ctx.getImageData(0, 0, CW, CH).data;
  const rows = new Float64Array(CH); rows.fill(Infinity);
  for (let y = 0; y < CH; y++) {
    for (let x = 0; x < CW; x++) {
      if (pixels[(y * CW + x) * 4 + 3] > 64) { rows[y] = x; break; }
    }
  }
  return { rows, clearance: 3 };
}

// Common/Uncommon templates have a baked badge with the same solid rim but a
// broader shadow. This conservative envelope was measured on all ten frames;
// it is not a recovered alpha matte. Transform only the badge witness, never
// the actual image or the cost number/asterisk drawn on the card.
function getEmbeddedHeroCostContour() {
  const canvas = document.createElement('canvas');
  canvas.width = CW; canvas.height = CH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const cp = P.cost, cfg = STAT_NUMBERS.cost || {};
  const cx = (cp.x0 + cp.x1) / 2 + (cfg.offsetX || 0);
  const cy = (cp.y0 + cp.y1) / 2 + (cfg.offsetY || 0);
  drawCenteredAssetBounds(ctx, 'cost_rare', cx, cy);
  const pixels = ctx.getImageData(0, 0, CW, CH).data;
  const badgeRows = new Float64Array(CH); badgeRows.fill(Infinity);
  for (let y = 0; y < CH; y++) {
    for (let x = 0; x < CW; x++) {
      if (pixels[(y * CW + x) * 4 + 3] > 64) { badgeRows[y] = x; break; }
    }
  }
  ctx.clearRect(0, 0, CW, CH);
  drawOverlayStatNumbers(ctx, { costOnly: true });
  const numbers = ctx.getImageData(0, 0, CW, CH).data;
  const rows = new Float64Array(CH);
  for (let y = 0; y < CH; y++) {
    const sourceY = (y - cy) / 1.06 + cy;
    const edge = Math.min(badgeRows[Math.floor(sourceY)] ?? Infinity,
      badgeRows[Math.ceil(sourceY)] ?? Infinity);
    rows[y] = cx + (edge - cx) * 1.06 - 2;
    for (let x = 0; x < CW; x++) {
      if (numbers[(y * CW + x) * 4 + 3] > 64) { rows[y] = Math.min(rows[y], x); break; }
    }
  }
  return { rows, clearance: 3 };
}

function contourRightForBand(contour, top, bottom) {
  const { rows, clearance } = contour;
  let right = Infinity;
  // Include every pixel row touched by the expanded fractional painted band.
  for (let y = Math.max(0, Math.floor(top - clearance)); y < Math.min(rows.length, Math.ceil(bottom + clearance)); y++) {
    right = Math.min(right, rows[y] - clearance);
  }
  return right;
}

function layoutRuns(ctx, runs, x, y, maxW, sz, avoidZones=[], options={}) {
  if (!options.rightContour) return layoutRunsWithIconSpacing(ctx, runs, x, y, maxW, sz, avoidZones, options);
  const rights = [];
  for (let pass = 1; pass <= 128; pass++) {
    const result = layoutRunsWithIconSpacing(ctx, runs, x, y, maxW, sz, avoidZones,
      { ...options, lineRightLimits: rights });
    let changed = false;
    for (const line of result.lines) {
      if (!line.paintedBounds) continue;
      const bandRight = contourRightForBand(options.rightContour, line.paintedBounds.top, line.paintedBounds.bottom);
      // Glyph ink can overhang its advance width. If that ink enters the badge
      // margin, reserve the overhang and let the same wrapping engine reflow.
      // Unbreakable overflow remains reported; it must not cause endless tightening.
      const advanceRight = Math.max(...line.items.map(item => item.x + item.width));
      const overhang = line.paintedRight > bandRight + 0.001
        ? Math.max(0, line.paintedRight - advanceRight) : 0;
      const right = bandRight - overhang;
      if (right < (rights[line.index] ?? Infinity) - 0.001) {
        rights[line.index] = right;
        changed = true;
      }
    }
    // Retain conservative limits when membership changes, as in calibration.
    // Both wrapping and icon clearance are resolved again before accepting it.
    if (!changed && result.spacingResolved !== false) {
      result.contourResolved = true;
      result.contourPasses = pass;
      return result;
    }
  }
  throw new Error('Hero ability contour layout did not converge');
}

// Resolve spacing inside layout, rerunning wrapping/boundary sampling at the
// resolved origins. Never translate an already-wrapped drawing after the fact.
function layoutRunsWithIconSpacing(ctx, runs, x, y, maxW, sz, avoidZones=[], options={}) {
  if (!options.abilityBlocks || !runs.some(run => run.icon || run.divider)) {
    return layoutRunsAtOrigins(ctx, runs, x, y, maxW, sz, avoidZones, options);
  }
  const savedFont = ctx.font;
  ctx.font = sz + "px 'eurostile_ltstd_regular',sans-serif";
  const cap = ctx.measureText('H');
  ctx.font = savedFont;
  const reference = { top: -cap.actualBoundingBoxAscent, bottom: cap.actualBoundingBoxDescent };
  const clearance = Math.max(1, sz * 0.08);
  const origins = [];
  let result;
  // Origins only move forward. Once a boundary changes line membership, the
  // next pass rechecks actual contents; retained clearance prevents oscillation
  // at a narrow/wide boundary. The limit is a defensive diagnostic, not clipping.
  for (let pass = 1; pass <= 128; pass++) {
    result = layoutRunsAtOrigins(ctx, runs, x, y, maxW, sz, avoidZones,
      { ...options, iconReference: reference, lineOrigins: origins });
    result.iconReference = reference;
    result.minimumIconClearance = clearance;
    result.layoutPasses = pass;
    let previous = null, extra = 0, changed = false;
    for (const line of result.lines) {
      const paint = line.paintedBounds;
      if (paint && previous && (line.hasIcon || previous.hasIcon)) {
        extra = Math.max(extra, previous.bottom + clearance - paint.top);
      }
      if (extra > 0.001) {
        origins[line.index] = line.y + extra;
        changed = true;
      }
      if (paint) previous = { bottom: paint.bottom + extra, hasIcon: line.hasIcon };
    }
    if (!changed) {
      result.spacingResolved = true;
      return result;
    }
  }
  result.spacingResolved = false;
  return result;
}

function layoutRunsAtOrigins(ctx, runs, x, y, maxW, sz, avoidZones=[], options={}) {
  let cx=x, cy=y;
  const lh = Math.round(typeof options.lineAdvanceRatio === 'number'
    ? sz * options.lineAdvanceRatio
    : getRunLineHeight(sz) * (options.lineHeightScale ?? 0.86));
  const blankExtra = Math.round(lh * (options.blankLineScale ?? 0.32));
  let drewText = false;
  let prevWasBr = false;
  let lineIndex = 0;
  function boundaryXAt(sampleY) {
    if (typeof options.leftLineStep === 'number') {
      return (typeof options.leftLineStart === 'number' ? options.leftLineStart : x) + (lineIndex * options.leftLineStep);
    }
    const points = options.leftBoundary;
    if (!Array.isArray(points) || !points.length) return x;
    if (sampleY <= points[0].y) return points[0].x;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const next = points[i];
      if (sampleY <= next.y) {
        const span = Math.max(1, next.y - prev.y);
        const t = (sampleY - prev.y) / span;
        return prev.x + ((next.x - prev.x) * t);
      }
    }
    return points[points.length - 1].x;
  }
  function curBounds() {
    let left = x;
    let right = x + maxW;
    const sampleY = cy + (sz * (options.boundarySample ?? 0.5));
    left = Math.max(left, boundaryXAt(sampleY));
    for (const z of avoidZones) {
      if (sampleY >= z.y0 && sampleY <= z.y1) {
        if (typeof z.x0 === 'number') left = Math.max(left, z.x0);
        if (typeof z.x1 === 'number') right = Math.min(right, z.x1);
        if (typeof z.x === 'number') right = Math.min(right, z.x);
      }
    }
    right = Math.min(right, options.lineRightLimits?.[lineIndex] ?? Infinity);
    if (right - left < 40 && !options.rightContour) right = left + 40;
    return { left, right, width: right - left };
  }
  const items = [];
  const lines = [];
  const missingIcons = new Set();
  let paintedBounds = null;
  let horizontalOverflow = 0;
  function line() {
    if (!lines[lineIndex]) lines[lineIndex] = { index: lineIndex, y: cy, ...curBounds(), items: [], paintedBounds: null, hasIcon: false };
    return lines[lineIndex];
  }
  function nextLine(advance) {
    cy += advance;
    lineIndex += 1;
    cy = Math.max(cy, options.lineOrigins?.[lineIndex] ?? cy);
    cx = curBounds().left;
    line();
  }
  function includeBounds(left, top, right, bottom) {
    const current = line();
    if (options.rightContour) current.paintedRight = Math.max(current.paintedRight ?? -Infinity, right);
    current.paintedBounds = current.paintedBounds
      ? { top: Math.min(current.paintedBounds.top, top), bottom: Math.max(current.paintedBounds.bottom, bottom) }
      : { top, bottom };
    const bounds = curBounds();
    horizontalOverflow = Math.max(horizontalOverflow, bounds.left - left, right - bounds.right);
    paintedBounds = paintedBounds
      ? { left: Math.min(paintedBounds.left, left), top: Math.min(paintedBounds.top, top),
          right: Math.max(paintedBounds.right, right), bottom: Math.max(paintedBounds.bottom, bottom) }
      : { left, top, right, bottom };
  }
  function measureFragment(fragment) {
    const family = fragment.b ? 'eurostile_ltstd_bold' : 'eurostile_ltstd_regular';
    const font = (fragment.i ? 'italic ' : '') + sz + "px '" + family + "',sans-serif";
    ctx.font = font;
    return { ...fragment, font, metrics: ctx.measureText(fragment.t) };
  }
  cx = curBounds().left;
  line();
  const blocks = options.abilityBlocks;
  const blockDiagnostics = [];
  const units = blocks ? blocks.flatMap(block => [
    { block }, ...getLayoutUnits(block.runs), ...(block.breakAfter ? [block.breakAfter] : [])
  ]) : getLayoutUnits(runs);
  let protect = false;
  for (const unit of units) {
    if (unit.block) {
      const block = unit.block;
      let advance = 0, width = 0;
      for (const part of getLayoutUnits(block.runs)) {
        if (part.icon) {
          const icon = getInlineIconPlacement(part.icon, sz, options.iconReference);
          width = Math.max(width, advance + icon.width);
          advance += icon.width + icon.gap;
        } else if (part.space) {
          advance += measureFragment(part.space).metrics.width;
        } else if (part.fragments) {
          advance += part.fragments.reduce((sum, fragment) => sum + measureFragment(fragment).metrics.width, 0);
          width = Math.max(width, advance);
        }
      }
      const availableWidth = curBounds().right - cx;
      protect = block.eligible && width <= availableWidth;
      blockDiagnostics.push({ index: block.index, eligible: block.eligible, reason: block.reason,
        protected: protect, fallback: block.eligible && !protect, measuredWidth: width, availableWidth });
      continue;
    }
    if (unit.br) {
      nextLine(unit.fullLine ? lh : (prevWasBr ? blankExtra : lh));
      prevWasBr = true;
      continue;
    }
    prevWasBr = false;
    if (unit.empty) continue;
    if (unit.divider) {
      const bounds = curBounds();
      const item = { type: 'divider', x: bounds.left, y: cy + lh * 0.45,
        width: Math.max(0, bounds.width), height: 1 };
      items.push(item);
      line().items.push(item);
      // Include the rule in painted-band contour and neighboring-line clearance.
      line().hasIcon = true;
      includeBounds(item.x, item.y, item.x + item.width, item.y + item.height);
      drewText = true;
      continue;
    }
    if (unit.space) {
      cx += measureFragment(unit.space).metrics.width;
      continue;
    }
    if (unit.icon) {
      const icon = getInlineIconPlacement(unit.icon, sz, options.iconReference);
      const bounds = curBounds();
      if (!protect && cx + icon.width > bounds.right && cx > bounds.left) nextLine(lh);
      line().hasIcon = true;
      const item = { type: 'icon', key: unit.icon, x: cx, y: cy + icon.offsetY, ...icon };
      items.push(item);
      line().items.push(item);
      includeBounds(cx, item.y, cx + icon.width, item.y + icon.height);
      if (!icon.img || !icon.bounds) missingIcons.add(unit.icon);
      cx += icon.width + icon.gap;
      drewText = true;
      continue;
    }
    let fragments = unit.fragments.map(measureFragment);
    const width = fragments.reduce((sum, fragment) => sum + fragment.metrics.width, 0);
    const bounds = curBounds();
    if (!protect && cx + width > bounds.right && cx > bounds.left) {
      nextLine(lh);
      // A word carries its preceding separator so inter-word spacing is measured
      // with its style. On a soft wrap that separator belongs to the old line,
      // not to the new line's indentation. Preserve explicit-break indentation
      // and nonbreaking spaces; remeasure the trimmed fragment for exact painting.
      fragments = unit.fragments.map((fragment, index) => measureFragment(index === 0
        ? { ...fragment, t: fragment.t.replace(/^[ \t\r\n\f]+/, '') }
        : fragment));
    }
    for (const fragment of fragments) {
      const m = fragment.metrics;
      const item = { type: 'text', text: fragment.t, font: fragment.font, underline: fragment.u,
        x: cx, y: cy, width: m.width, size: sz };
      items.push(item);
      line().items.push(item);
      // Canvas metrics use the caller's text baseline (the card uses 'top').
      includeBounds(cx - (m.actualBoundingBoxLeft || 0), cy - (m.actualBoundingBoxAscent || 0),
        cx + Math.max(m.width, m.actualBoundingBoxRight || 0), cy + (m.actualBoundingBoxDescent ?? lh));
      if (fragment.u) includeBounds(cx, cy + sz * 0.12, cx + m.width, cy + sz * 0.12 + 1);
      cx += m.width;
      drewText = true;
    }
  }
  const bottomY = drewText ? cy + lh : y;
  const finalBottom = Math.max(bottomY, paintedBounds?.bottom ?? y);
  const verticalOverflow = Number.isFinite(options.maxBottom) ? Math.max(0, finalBottom - options.maxBottom) : 0;
  return {
    items, lines, lastY: cy, bottomY, lineH: lh, paintedBounds, blocks: blockDiagnostics,
    bounds: { top: Math.min(y, paintedBounds?.top ?? y), bottom: finalBottom },
    requestedFontSize: options.requestedFontSize ?? sz, effectiveFontSize: sz,
    overflow: { vertical: verticalOverflow, horizontal: Math.max(0, horizontalOverflow),
      belowRegion: verticalOverflow > 0, missingIcons: [...missingIcons] }
  };
}

// Drawing consumes the final measured positions; it never measures or wraps again.
function drawRuns(ctx, layout, color) {
  for (const item of layout.items) {
    if (item.type === 'divider') {
      ctx.fillStyle = color;
      ctx.fillRect(item.x, item.y, item.width, item.height);
    } else if (item.type === 'icon') {
      if (item.img && item.bounds) {
        const b = item.bounds;
        ctx.drawImage(item.img, b.sx, b.sy, b.sw, b.sh, item.x, item.y, item.width, item.height);
      }
    } else {
      ctx.font = item.font;
      ctx.fillStyle = color;
      ctx.fillText(item.text, item.x, item.y);
      if (item.underline) ctx.fillRect(item.x, item.y + item.size * 0.12, item.width, 1);
    }
  }
  return layout.lastY;
}

function runsHaveVisibleContent(runs) {
  return runs.some(run => (run.t && run.t.trim()) || run.icon || run.divider);
}

// Final placement only: do not feed this layout back into rules/font selection.
function layoutHeroFlavor(ctx, cfg, rules, size) {
  const { targetBottom, minPaintedGap, rightContour } = cfg.finalFlavorLayout;
  const layoutAt = y => layoutRuns(ctx, cfg.flRuns, cfg.x, y, cfg.w, size, [],
    { ...cfg.options, maxBottom: cfg.maxBottom, requestedFontSize: cfg.flSz, rightContour });
  let y = cfg.y;
  let layout = layoutAt(y);
  let best = { y, layout };
  const seen = new Set();
  let targetConverged = false;
  let iterations = 0;
  // Each trial already has a fully converged contour layout. A line-count jump
  // can make an exact bottom unattainable; retain the closest measured trial
  // instead of oscillating, changing font size, or altering the rules.
  for (; iterations < 128; iterations++) {
    const error = targetBottom - layout.paintedBounds.bottom;
    if (Math.abs(error) < Math.abs(targetBottom - best.layout.paintedBounds.bottom)) best = { y, layout };
    if (Math.abs(error) < 0.001) { targetConverged = true; best = { y, layout }; break; }
    const key = y.toFixed(6);
    if (seen.has(key)) break;
    seen.add(key);
    y += error;
    layout = layoutAt(y);
  }
  ({ y, layout } = best);
  const minimumTop = (rules.paintedBounds?.bottom ?? cfg.y) + minPaintedGap;
  const gapFallback = layout.paintedBounds.top < minimumTop - 0.001;
  let gapPasses = 0;
  while (layout.paintedBounds.top < minimumTop - 0.001) {
    if (++gapPasses > 128) throw new Error('Hero flavor gap layout did not converge');
    y += minimumTop - layout.paintedBounds.top;
    layout = layoutAt(y);
  }
  const clipEdge = typeof cfg.clipBottom === 'number'
    ? cfg.y - 2 + Math.max(1, cfg.clipBottom - cfg.y) : null;
  return { flavorY: y, flavorLayout: layout, flavorPlacement: {
    targetBottom, minPaintedGap, targetConverged, targetIterations: iterations + 1,
    gapFallback, gapPasses, targetReached: Math.abs(layout.paintedBounds.bottom - targetBottom) < 0.001,
    clipEdge, paintedBottomBeyondClip: clipEdge === null ? 0 : Math.max(0, layout.paintedBounds.bottom - clipEdge),
    fullyClipped: clipEdge !== null && layout.paintedBounds.top >= clipEdge
  } };
}

function drawAdaptiveTextBlock(ctx, cfg) {
  const {
    abRuns,
    flRuns,
    x,
    y,
    w,
    abSz,
    flSz,
    abilityColor = '#111',
    flavorColor = '#333',
    avoidZones = [],
    options = {},
    abilityLayout = null,
    preferredFlavorGap = 42,
    minFlavorGap = 8,
    maxBottom = CH - 28,
    minAbilitySize = Math.max(12, abSz - 2),
    abilityAbsoluteMinimum = 12,
    minFlavorSize = Math.max(9, flSz - 1),
    flavorSizeRatio = null,
    clipBottom = null
  } = cfg;

  const abilityBlocks = getAbilityBlocks(abRuns);
  const hasFlavor = runsHaveVisibleContent(flRuns || []);
  let abilitySize = abSz;
  let flavorSize = flavorSizeRatio
    ? Math.min(flSz, Math.max(minFlavorSize, abSz * flavorSizeRatio))
    : flSz;
  let flavorGap = hasFlavor ? preferredFlavorGap : 0;

  function measure() {
    const rules = layoutRuns(ctx, abRuns, x, y, abilityLayout?.width ?? w, abilitySize,
      abilityLayout?.avoidZones ?? avoidZones,
      { ...options, ...abilityLayout?.options, abilityBlocks, maxBottom, requestedFontSize: abSz });
    if (!hasFlavor) return { abilityLayout: rules, flavorLayout: null, flavorY: null, overflow: Math.max(0, rules.bottomY - maxBottom) };
    const flavorY = rules.bottomY + flavorGap;
    const flavorLayout = layoutRuns(ctx, flRuns, x, flavorY, w, flavorSize, avoidZones, { ...options, maxBottom, requestedFontSize: flSz });
    return {
      abilityLayout: rules,
      flavorLayout,
      flavorY,
      overflow: Math.max(0, flavorLayout.bottomY - maxBottom)
    };
  }

  let measured = measure();
  if (hasFlavor && measured.overflow > 0) {
    flavorGap = Math.max(minFlavorGap, flavorGap - measured.overflow - 2);
    measured = measure();
  }
  while (hasFlavor && measured.overflow > 0 && flavorSize > minFlavorSize) {
    flavorSize -= 0.5;
    measured = measure();
  }
  while (measured.overflow > 0 && abilitySize > minAbilitySize) {
    abilitySize -= 0.5;
    measured = measure();
  }

  // Preserve normal vertical fitting first. Only a protection gain can justify
  // the additional allowance; impossible long phrases cannot drive shrinking.
  // Common/Uncommon only: a short final soft-wrapped line can sometimes be
  // removed using the normal fitting allowance. Never collapse a paragraph to
  // one line, cross explicit breaks, or worsen any measured overflow.
  if (cfg.balanceShortLastLine && abilityBlocks.length === 1 && measured.abilityLayout.lines.length >= 3) {
    const original = measured;
    const last = original.abilityLayout.lines.at(-1);
    const occupied = last.items.length ? Math.max(...last.items.map(item => item.x + item.width)) - last.left : 0;
    if (occupied > 0 && occupied < (last.right - last.left) * 0.3) {
      const amounts = result => [result.overflow, result.abilityLayout.overflow.vertical,
        result.abilityLayout.overflow.horizontal, result.flavorLayout?.overflow.vertical || 0,
        result.flavorLayout?.overflow.horizontal || 0];
      const limits = amounts(original);
      for (let size = abilitySize - 0.5; size >= minAbilitySize; size -= 0.5) {
        abilitySize = size;
        const trial = measure();
        if (trial.abilityLayout.lines.length >= 2 && trial.abilityLayout.lines.length < original.abilityLayout.lines.length
            && amounts(trial).every((value, index) => value <= limits[index] + 0.001)) {
          measured = trial;
          break;
        }
      }
      abilitySize = measured.abilityLayout.effectiveFontSize;
    }
  }

  const baseline = measured;
  const protectedCount = result => result.abilityLayout.blocks.filter(block => block.protected).length;
  const overflowAmounts = result => [result.overflow, result.abilityLayout.overflow.vertical,
    result.abilityLayout.overflow.horizontal, result.flavorLayout?.overflow.vertical || 0,
    result.flavorLayout?.overflow.horizontal || 0];
  const baselineOverflow = overflowAmounts(baseline);
  const floor = Math.min(abilitySize, Math.max(abilityAbsoluteMinimum, abSz - 3));
  if (measured.abilityLayout.blocks.some(block => block.fallback)) {
    for (let candidate = abilitySize - 0.5; candidate >= floor; candidate -= 0.5) {
      abilitySize = candidate;
      const trial = measure();
      if (protectedCount(trial) > protectedCount(measured)
          && overflowAmounts(trial).every((amount, index) => amount <= baselineOverflow[index] + 0.001)) {
        measured = trial;
      }
    }
  }

  if (hasFlavor && cfg.finalFlavorLayout) {
    // Preserve the existing fitter, including flavor-driven rules shrinking and
    // the selected flavor floor. Only the final flavor positions change.
    const flavorFitting = { flavorY: measured.flavorY, overflow: measured.overflow,
      flavorSize: measured.flavorLayout.effectiveFontSize };
    const placed = layoutHeroFlavor(ctx, cfg, measured.abilityLayout, flavorFitting.flavorSize);
    measured = { ...measured, ...placed, flavorFitting,
      overflow: placed.flavorLayout.overflow.vertical };
  }
  drawRuns(ctx, measured.abilityLayout, abilityColor);
  if (hasFlavor) {
    if (typeof clipBottom === 'number') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 2, y - 2, w + 4, Math.max(1, clipBottom - y));
      ctx.clip();
      drawRuns(ctx, measured.flavorLayout, flavorColor);
      ctx.restore();
    } else {
      drawRuns(ctx, measured.flavorLayout, flavorColor);
    }
  }
  // Opt-in developer hook; no retained canvas/images or production logging.
  if (typeof globalThis.onAbilityLayoutDiagnostics === 'function') {
    globalThis.onAbilityLayoutDiagnostics(measured);
  }
  return measured;
}

function drawText(ctx) {
  ctx.save();
  const isRare = st.rar==='rare';
  const useRareHeroTextLayout = isRare || (st.layout === 'single' && (st.rar === 'common' || st.rar === 'uncommon'));
  const hasLeft = st.showRecruit || st.showAttack;

  // â”€â”€ TITLE â”€â”€
  const name = document.getElementById('f-name').value || '';
  const hero = document.getElementById('f-hero').value || '';
  let tsz = +document.getElementById('name-sz').value || 23;
  let hsz = +document.getElementById('hero-sz').value || 12;
  const nameTracking = getTitleTracking('name');
  const subtitleTracking = getTitleTracking('subtitle');
  const nameWordSpacing = getTitleWordSpacing('name');
  const subtitleWordSpacing = getTitleWordSpacing('subtitle');
  const titleY = P.titleCY + (TITLE_TEXT.nameOffsetY ?? -1);
  const heroY = P.heroCY + (TITLE_TEXT.subtitleOffsetY ?? -2);
  ctx.font = getCardTitleFont(tsz);
  while (measureTrackedText(ctx, name.toUpperCase(), nameTracking, nameWordSpacing) > P.titleMaxW && tsz > 11) { tsz-=0.5; ctx.font = getCardTitleFont(tsz); }
  const titleW = measureTrackedText(ctx, name.toUpperCase(), nameTracking, nameWordSpacing);
  ctx.font = getCardTitleFont(hsz);
  while (measureTrackedText(ctx, hero.toUpperCase(), subtitleTracking, subtitleWordSpacing) > P.titleMaxW && hsz > 8) { hsz-=0.5; ctx.font = getCardTitleFont(hsz); }
  const heroW = measureTrackedText(ctx, hero.toUpperCase(), subtitleTracking, subtitleWordSpacing);
  const titleBgW = Math.max(
    TITLE_BAR.minWidth || 340,
    Math.min(CW - (TITLE_BAR.maxInsetX || 12), Math.ceil(Math.max(titleW, heroW) + (TITLE_BAR.widthPadding || 170)))
  );
  const explicitTitleBar = typeof TITLE_BAR.heroTopY === 'number' && typeof TITLE_BAR.heroBottomY === 'number';
  const titleBgTop = explicitTitleBar
    ? TITLE_BAR.heroTopY
    : Math.max(
        TITLE_BAR.topMinY || 15,
        Math.round(titleY - (tsz * (TITLE_BAR.topSizeFactor || 0.48)))
      );
  const titleBgBottom = explicitTitleBar
    ? TITLE_BAR.heroBottomY
    : Math.min(
        TITLE_BAR.bottomMaxY || 97,
        Math.round(heroY + (hsz * (TITLE_BAR.bottomSizeFactor || 0.48)))
      );
  const titleBgH = explicitTitleBar
    ? Math.max(1, titleBgBottom - titleBgTop)
    : Math.max(TITLE_BAR.minHeight || 54, titleBgBottom - titleBgTop);
  drawTitleBg(ctx, titleBgW, titleBgH, titleBgTop);

  drawTitleTextLine(ctx, name.toUpperCase(), P.titleCX, titleY, tsz, 'name', { tracking: nameTracking });
  drawTitleTextLine(ctx, hero.toUpperCase(), P.titleCX, heroY, hsz, 'subtitle', { tracking: subtitleTracking });

  // â”€â”€ ABILITY + FLAVOR TEXT â”€â”€
  const abSz = +document.getElementById('ab-sz').value || 13;
  const isMulticolor = st.layout === 'multicolor';
  const baseTextX = useRareHeroTextLayout
    ? 108
    : (isRare
      ? (rareBox ? rareBox.textX : P.rareTextX)
      : (st.rar==='uncommon' ? P.uncommonTextX : P.commonTextX));
  const baseTextW = useRareHeroTextLayout
    ? 360
    : (isRare
      ? (rareBox ? rareBox.textW : P.rareTextW)
      : (st.rar==='uncommon' ? P.uncommonTextW : P.commonTextW));
  const txtX = useRareHeroTextLayout
    ? baseTextX
    : (st.rar==='uncommon' ? P.uncommonTextX : P.commonTextX);
  const txtW = useRareHeroTextLayout
    ? baseTextW
    : (isRare ? baseTextW : (baseTextW + (hasLeft ? 0 : 22)));
  const txtY = useRareHeroTextLayout
    ? 526
    : (isRare
      ? (rareBox ? rareBox.textY : P.rareTextY)
      : (st.rar==='uncommon' ? P.uncommonTextY : P.commonTextY));
  const resolvedTxtX = (!useRareHeroTextLayout && !isRare && !hasLeft) ? (txtX - 22) : txtX;
  const resolvedTxtW = (!useRareHeroTextLayout && !isRare) ? (baseTextW + (hasLeft ? 0 : 22)) : txtW;
  const resolvedTxtY = txtY;
  const avoidZones = useRareHeroTextLayout
    ? [
        { y0: 526, y1: 590, x: 452 },
        { y0: 591, y1: 688, x: 374 },
      ]
    : [{ y0: P.cost.y0, y1: P.cost.y1, x: P.cost.x0 - 8 }];
  ctx.textAlign='left'; ctx.textBaseline='top';
  const abRuns = parseRTE(document.getElementById('f-ability'));
  const flSz = +document.getElementById('fl-sz').value || 11;
  const flRuns = parseRTE(document.getElementById('f-flavor'));
  const useCalibratedRareText = isRare && (st.layout === 'single' || st.layout === 'multicolor');
  const rareHeroContour = useCalibratedRareText ? getHeroCostContour() : null;
  const useEmbeddedHeroText = st.layout === 'single' && (st.rar === 'common' || st.rar === 'uncommon');
  const heroTextContour = useEmbeddedHeroText ? getEmbeddedHeroCostContour() : rareHeroContour;
  drawAdaptiveTextBlock(ctx, {
    abRuns,
    flRuns,
    x: resolvedTxtX,
    y: resolvedTxtY,
    w: resolvedTxtW,
    abSz,
    flSz,
    avoidZones: useEmbeddedHeroText ? [] : avoidZones,
    options: useEmbeddedHeroText ? { rightContour: heroTextContour } : {},
    balanceShortLastLine: useEmbeddedHeroText,
    // Single-color and multicolor rare Heroes share the same cost composition.
    abilityLayout: heroTextContour ? {
      width: useEmbeddedHeroText ? 344 : 330,
      avoidZones: [],
      options: { lineAdvanceRatio: (useEmbeddedHeroText ? 26 : 27) / 22, rightContour: heroTextContour }
    } : null,
    finalFlavorLayout: heroTextContour ? {
      targetBottom: 648, minPaintedGap: 6, rightContour: heroTextContour
    } : null,
    preferredFlavorGap: 68,
    minFlavorGap: 6,
    maxBottom: useRareHeroTextLayout ? 668 : 666,
    minAbilitySize: Math.max(16, abSz - 1),
    abilityAbsoluteMinimum: 16,
    minFlavorSize: Math.max(11, abSz * 0.55),
    flavorSizeRatio: 0.62,
    clipBottom: useRareHeroTextLayout ? 668 : 666
  });

  ctx.restore();
  return;
  // Stat number placement centers the whole glyph group on the icon, which
  // keeps plain numbers and number-plus-symbol variants aligned the same way.
  // Center the whole glyph group on each icon, not just the number.
  // This keeps number-only and number+symbol versions both visually centered.
  ctx.textAlign='center'; ctx.textBaseline='middle';

  function drawStatGroup(kind, cx, cy, num, showPlus) {
    const cfg = STAT_NUMBERS[kind] || {};
    const numText = String(num);
    const numSz = cfg.numSize || 84;
    const plusSz = cfg.plusSize || 31;
    const gap = cfg.gap || 1;
    const groupOffsetX = cfg.groupOffsetX || 0;
    const groupOffsetY = cfg.groupOffsetY || 2;
    const plusCenterAdjustY = cfg.plusOffsetY || 15;

    ctx.textAlign = 'left';
    ctx.font = getBigNumberFont(numSz);
    const numMetrics = ctx.measureText(numText);
    const numLeft = numMetrics.actualBoundingBoxLeft || 0;
    const numRight = numMetrics.actualBoundingBoxRight || numMetrics.width;
    const numW = numLeft + numRight;

    let totalW = numW;
    let plusW = 0;
    let plusLeft = 0;
    let plusRight = 0;
    if (showPlus) {
      ctx.font = `bold ${plusSz}px 'eurostile_bold',sans-serif`;
      const plusMetrics = ctx.measureText('+');
      plusLeft = plusMetrics.actualBoundingBoxLeft || 0;
      plusRight = plusMetrics.actualBoundingBoxRight || plusMetrics.width;
      plusW = plusLeft + plusRight;
      totalW += gap + plusW;
    }

    const soloOffsetX = cfg.soloOffsetX || 0;
    const appliedOffsetX = showPlus ? groupOffsetX : soloOffsetX;
    const startX = cx - totalW / 2 + numLeft + appliedOffsetX;
    const baseY = cy + groupOffsetY;

    ctx.font = getBigNumberFont(numSz);
    ctx.strokeStyle='rgba(0,0,0,0.88)';
    applyBigNumberStrokeStyle(ctx);
    ctx.strokeText(numText, startX, baseY);
    ctx.fillStyle='#fff';
    ctx.fillText(numText, startX, baseY);

    if (showPlus) {
      ctx.font = `bold ${plusSz}px 'eurostile_bold',sans-serif`;
      ctx.strokeStyle='rgba(0,0,0,0.92)';
      ctx.lineWidth=5.2;
      ctx.lineJoin='round';
      const plusX = startX + numRight + gap + plusLeft;
      const plusY = baseY + plusCenterAdjustY;
      ctx.strokeText('+', plusX, plusY);
      ctx.fillStyle='#fff';
      ctx.fillText('+', plusX, plusY);
    }

    ctx.textAlign = 'center';
  }

  if (st.showRecruit) {
    const rec = +document.getElementById('f-rec').value || 0;
    drawStatGroup('recruit', P.recruit.cx, P.recruit.cy, rec, st.showRPlus);
  }

  if (st.showAttack) {
    const atk = +document.getElementById('f-atk').value || 0;
    drawStatGroup('attack', P.attack.cx, P.attack.cy, atk, st.showAPlus);
  }

  // Cost uses glyph-bound centering instead of hand-tuned offsets so template
  // changes do not immediately throw the badge off.
  {
    const cost = +document.getElementById('f-cost').value || 0;
    const cp = P.cost;
    const numText = String(cost);
    const costCfg = STAT_NUMBERS.cost || {};
    const numSz = costCfg.numSize || 88;
      const astSz = costCfg.astSize || 78;
      const gap = costCfg.gap || 1;
    const coinCX = (cp.x0 + cp.x1) / 2;
    const coinCY = (cp.y0 + cp.y1) / 2;
    const costOffsetX = costCfg.offsetX || 0;
    const costOffsetY = costCfg.offsetY || 0;

    ctx.strokeStyle='rgba(0,0,0,0.88)';
    ctx.fillStyle='#fff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    applyBigNumberStrokeStyle(ctx);

    const getGlyphBox = (font, textValue) => {
      ctx.font = font;
      const m = ctx.measureText(textValue);
      const left = m.actualBoundingBoxLeft || 0;
      const right = m.actualBoundingBoxRight || m.width || 0;
      const ascent = m.actualBoundingBoxAscent || 0;
      const descent = m.actualBoundingBoxDescent || 0;
      return {
        left, right, ascent, descent,
        width: left + right,
        xCenterOffset: (right - left) / 2,
        yBaselineForCenter: (ascent - descent) / 2
      };
    };

    const numFont = getBigNumberFont(numSz);
      const numBox = getGlyphBox(numFont, numText);

      if (!st.costAsterisk) {
      const numX = coinCX - numBox.xCenterOffset + costOffsetX;
      const numY = coinCY + numBox.yBaselineForCenter + costOffsetY;

      ctx.font = numFont;
      applyBigNumberStrokeStyle(ctx);
      ctx.strokeText(numText, numX, numY);
      ctx.fillText(numText, numX, numY);
      } else {
        const astBox = { width: astSz, xCenterOffset: 0 };

      const astGap = Math.max(0, gap - 6);
      const totalW = numBox.width + astGap + astBox.width;
      const groupLeft = coinCX - totalW / 2 + costOffsetX;

      const numX = groupLeft + numBox.left;
      const astCenterX = groupLeft + numBox.width + astGap + (astBox.width / 2);

        // Both glyphs share the same visual vertical center.
        const numY = coinCY + numBox.yBaselineForCenter + costOffsetY;
        const astCenterY = coinCY + costOffsetY - 2;

        ctx.font = numFont;
        applyBigNumberStrokeStyle(ctx);
        ctx.strokeText(numText, numX, numY);
        ctx.fillText(numText, numX, numY);

        if (!drawCostAsteriskAsset(ctx, astCenterX, astCenterY, astSz)) {
          const astGlyph = '\u2731';
          const astFont = `bold ${astSz}px 'century',sans-serif`;
          const fallbackBox = getGlyphBox(astFont, astGlyph);
          const astX = astCenterX - fallbackBox.xCenterOffset;
          const astY = astCenterY + fallbackBox.yBaselineForCenter;
          ctx.font = astFont;
          ctx.lineWidth = 4.5;
          ctx.strokeText(astGlyph, astX, astY);
          ctx.fillText(astGlyph, astX, astY);
        }
      }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  }

  ctx.restore();
}

let lastCanvasLayoutKey = '';

async function render() {
  const changed = saveActiveCardFromUI();
  if (changed && typeof scheduleAutoSave === 'function') scheduleAutoSave();
  const cv = document.getElementById('card');
  renderToCanvas(cv, getPreviewScale());
  const dims = getCanvasDims();
  const layoutKey = `${dims.width}x${dims.height}:${getPreviewScale()}`;
  if (layoutKey !== lastCanvasLayoutKey && typeof scaleCanvas === 'function') {
    lastCanvasLayoutKey = layoutKey;
    scaleCanvas();
  }
}











