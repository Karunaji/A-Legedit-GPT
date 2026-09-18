// Historical Hero/icon milestone oracles predate the accepted Scheme A geometry.
// Actual current Scheme A is tested without this wrapper by scheme-a-production.cjs.
module.exports = `const historicalSchemeAdaptive = drawAdaptiveTextBlock;
drawAdaptiveTextBlock = (ctx, options) => historicalSchemeAdaptive(ctx,
  projectType === 'scheme' && document.getElementById('scheme-layout')?.value !== 'b'
    ? {...options, w: 432, maxBottom: 646, clipBottom: 646,
       options: {...options.options, lineAdvanceRatio: undefined}}
    : options);`;
