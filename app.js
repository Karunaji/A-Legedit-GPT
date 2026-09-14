document.addEventListener('mousedown', event => {
  if (event.target.closest?.('.rte-bar button')) event.preventDefault();
});

function getClosestNonEditableNode(node, editor) {
  const el = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
  const locked = el?.closest?.('[contenteditable="false"]');
  return locked && editor.contains(locked) ? locked : null;
}

function moveRangeOutOfNonEditable(range, editor, clientX) {
  const locked = getClosestNonEditableNode(range.startContainer, editor);
  if (!locked) return range;

  const rect = locked.getBoundingClientRect();
  const next = document.createRange();
  if (clientX > rect.left + rect.width / 2) next.setStartAfter(locked);
  else next.setStartBefore(locked);
  next.collapse(true);
  return next;
}

function ensureEditableCaretRange(editor, range, clientX) {
  if (!range || !editor.contains(range.startContainer)) {
    const fallback = document.createRange();
    fallback.selectNodeContents(editor);
    fallback.collapse(false);
    return fallback;
  }
  const safeRange = moveRangeOutOfNonEditable(range, editor, clientX);
  return editor.contains(safeRange.startContainer) || safeRange.startContainer === editor
    ? safeRange
    : null;
}

function applyCaretRange(editor, range) {
  if (!editor || !range) return;
  editor.focus({ preventScroll: true });
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
}

function placeCaretAtEnd(editor) {
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  applyCaretRange(editor, range);
}

document.addEventListener('click', event => {
  const editor = event.target.closest?.('.rte[contenteditable="true"]');
  if (!editor) return;
  const locked = getClosestNonEditableNode(event.target, editor);
  if (locked) {
    const range = document.createRange();
    const rect = locked.getBoundingClientRect();
    if (event.clientX > rect.left + rect.width / 2) range.setStartAfter(locked);
    else range.setStartBefore(locked);
    range.collapse(true);
    applyCaretRange(editor, range);
    return;
  }
  if (document.activeElement !== editor) placeCaretAtEnd(editor);
});

document.addEventListener('beforeinput', event => {
  const editor = event.target.closest?.('.rte[contenteditable="true"]');
  if (!editor) return;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) {
    placeCaretAtEnd(editor);
    return;
  }
  const range = ensureEditableCaretRange(editor, sel.getRangeAt(0), editor.getBoundingClientRect().left);
  if (!range) return;
  applyCaretRange(editor, range);
});

window.addEventListener('resize',scaleCanvas);
initCardPreviewDrag();
scaleCanvas();
preload();

async function runLagTest(options = {}) {
  const iterations = Math.max(1, +(options.iterations || 120));
  const chunk = options.chunk || ' Fight a Villain. You get +2 Attack. Unleashed. ';
  const targetId = options.targetId || 'f-ability';
  const target = document.getElementById(targetId);
  if (!target) {
    console.warn(`Lag test could not find ${targetId}`);
    return null;
  }

  const originalHtml = target.innerHTML;
  const times = [];
  target.innerHTML = '';
  target.focus();

  for (let i = 0; i < iterations; i++) {
    target.appendChild(document.createTextNode(chunk));
    const start = performance.now();
    if (targetId.startsWith('split-ability-')) {
      const side = targetId.endsWith('-2') ? '2' : '1';
      onSplitAbilityInput(side);
    } else {
      onAbilityInput();
    }
    await new Promise(resolve => requestAnimationFrame(resolve));
    times.push(performance.now() - start);
  }

  const total = times.reduce((sum, value) => sum + value, 0);
  const avg = total / times.length;
  const worst = Math.max(...times);
  const sorted = [...times].sort((a, b) => a - b);
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  const result = {
    iterations,
    averageMs: +avg.toFixed(2),
    p95Ms: +p95.toFixed(2),
    worstMs: +worst.toFixed(2),
    totalMs: +total.toFixed(2)
  };

  target.innerHTML = originalHtml;
  if (targetId.startsWith('split-ability-')) {
    onSplitAbilityInput(targetId.endsWith('-2') ? '2' : '1');
  } else {
    onAbilityInput();
  }
  console.table(result);
  return result;
}

window.runLagTest = runLagTest;
