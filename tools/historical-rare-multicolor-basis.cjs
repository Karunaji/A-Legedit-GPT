// These historical milestone oracles predate rare-multicolor routing.
// Preserve that route's historical baseline only; the new permanent runner
// validates actual rare-multicolor production against saved Candidate B.
module.exports = `const historicalAdaptiveTextBlock = drawAdaptiveTextBlock;
drawAdaptiveTextBlock = (ctx, options) => historicalAdaptiveTextBlock(ctx,
  projectType === 'hero' && st.layout === 'multicolor' && st.rar === 'rare'
    ? {...options, abilityLayout: null, finalFlavorLayout: null}
    : options);`;
