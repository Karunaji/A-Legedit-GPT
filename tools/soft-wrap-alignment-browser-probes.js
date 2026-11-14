// Focused invariant checks; loaded only by the isolated test runner.
async function softWrapAlignmentChecks() {
  await Promise.all(Object.keys(A).map(loadI));
  await preloadCanvasFonts(); await document.fonts.ready;
  const ctx=document.createElement('canvas').getContext('2d');ctx.textBaseline='top';
  const checks=[];const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
  const size=22;ctx.font=size+"px 'eurostile_ltstd_regular',sans-serif";
  const width=ctx.measureText('Alpha Beta').width-1;
  const layout=(runs,options={})=>layoutRuns(ctx,runs,108,526,width,size,[],options);
  const wrapped=layout([{t:'Alpha Beta Gamma Delta'}]);
  check(wrapped.lines.length>1,'Fixture actually soft wraps');
  for(const line of wrapped.lines){const first=line.items[0];check(first.x===line.left,'Wrapped item starts at line boundary '+line.index);check(!/^[ \t\r\n\f]/.test(first.text),'No wrapped separator '+line.index);}
  const multiple=layout([{t:'Alpha   Beta'}]);
  check(multiple.lines[1].items[0].text==='Beta','Multiple separating spaces discarded at soft wrap');
  const wide=layoutRuns(ctx,[{t:'Alpha   Beta'}],108,526,400,size);
  check(wide.items.map(i=>i.text).join('')==='Alpha   Beta','Interior spaces preserved without wrapping');
  const explicit=layoutRuns(ctx,[{t:'  First'},{br:true,fullLine:true},{t:'  Second'},{br:true,fullLine:true},{br:true,fullLine:true},{t:'Third'}],108,526,400,size);
  check(explicit.lines[0].items[0].text==='  First','Initial deliberate indentation preserved');
  check(explicit.lines[1].items[0].text==='  Second','Indentation after explicit break preserved');
  check(explicit.lines.length===4&&explicit.lines[2].items.length===0,'Explicit empty line retained');
  const nbsp=layout([{t:'Alpha \u00a0Beta'}]);
  check(nbsp.lines[1].items[0].text==='\u00a0Beta','Nonbreaking indentation retained');
  const styled=layoutRuns(ctx,[{t:'Alpha un'},{t:'break',b:true,i:true,u:true},{t:'able'}],108,526,140,size);
  const parts=styled.items.filter(i=>['un','break','able'].includes(i.text));
  check(parts.length===3&&parts.every(i=>i.y===parts[0].y),'Style fragments stay on the same wrapped word');
  check(parts[0].x===styled.lines[1].left,'Styled word loses only separator');
  check(parts[1].underline&&parts[1].font.includes('italic'),'Styles preserved on wrapped fragments');
  const icon=layoutRuns(ctx,[{icon:'attack'},{t:' Alpha Beta'}],108,526,60,size);
  for(const line of icon.lines.slice(1))check(!/^ /.test(line.items[0].text||''),'Icon-adjacent wrapped words align');
  const slope=layoutRuns(ctx,[{t:'Alpha Beta Gamma Delta Epsilon Zeta'}],80,526,190,size,[],{leftLineStart:88,leftLineStep:24});
  check(slope.lines.length>1,'Sloped fixture wraps');
  for(const line of slope.lines){check(line.left===88+line.index*24,'Accepted stepped boundary retained '+line.index);check(line.items[0].x===line.left&&!/^ /.test(line.items[0].text),'Text aligns to its sloped boundary '+line.index);}
  const before=JSON.stringify(styled);const measure=ctx.measureText;ctx.measureText=()=>{throw Error('Drawing remeasured text');};
  try{drawRuns(ctx,styled,'#111');}finally{ctx.measureText=measure;}
  check(JSON.stringify(styled)===before,'Painting consumes final measured layout unchanged');
  return checks;
}
