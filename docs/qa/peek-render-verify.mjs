// Peek · 돌아오기 렌더 검증 — CDP 직결, 의존성 없음.
//
//   pnpm build-storybook
//   pnpm qa --only <이 파일 이름>          (run-all 이 서버를 띄우고 출처를 확인한다)
//   또는 node docs/qa/static-server.mjs 로 띄우고 DS_SB_URL=<주소> node docs/qa/<이 파일>
//   node docs/qa/peek-render-verify.mjs ./shots
//
// 이 파일을 고칠 사람에게 — 여기서 실제로 틀렸던 것들이다.
//
//  1. 행 배경은 <tr> 이 아니라 [data-slot="data-table-cell"] 에
//     --data-table-row-bg 로 적용된다. tr 에서 읽으면 늘 투명이다.
//  2. toBeVisible() 을 쓰지 마라. 말풍선은 @starting-style 로 140ms 페이드인하므로
//     showPopover() 직후에는 opacity 가 0 이라 거짓 실패한다.
//     :popover-open 으로 판정하라 (guide.stories.tsx 와 같은 방식).
//  3. Emulation.setFocusEmulationEnabled 가 없으면 포커스 검사가 거짓 실패한다.
//  4. #storybook-root 안에서 찾아라.
//  5. getComputedStyle 은 라이브 객체다. 상태를 바꾸기 전에 값을 복사해라.
import { writeFileSync, mkdirSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS, storybookBase } from './browser.mjs';

const BASE = await storybookBase(), OUT = process.argv[2] || './shots';
mkdirSync(OUT, { recursive: true });
// GUI Chrome 을 직접 띄우지 않는다 — 샌드박스에서 TransformProcessType 으로
// 크래시한다. 이유와 대안은 browser.mjs 머리말에 있다.
const session = await launchBrowser({ windowSize: '1400,900', outDir: OUT });
const { cdp, ev, shot, sleep } = session;
const evalIn = ev;

async function go(id,extra=''){
  session.resetErrors();
  await cdp('Page.navigate',{url:`${BASE}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story${extra}`});
  for(let i=0;i<80;i++){if(await ev('document.readyState').catch(()=>'')==='complete')break; await sleep(150)}
  for(let i=0;i<70;i++){ if(await ev(`!!document.querySelector('[data-play-complete="true"]')`).catch(()=>false)) break; await sleep(200); }
  return {errors:session.errors().filter(m=>!/Warning:|DevTools|favicon|preload|6줄|요약/i.test(m)),
    sbError: await ev(`(()=>{const el=document.querySelector('#error-message');return document.body.classList.contains('sb-show-errordisplay')||el?(el?el.textContent.slice(0,300):'errordisplay'):null})()`).catch(()=>null)};
}
const R=[]; const check=(l,pass,d)=>{R.push({l,pass,d});console.log(`  ${pass?'✓':'✗'} ${l}${d?` — ${d}`:''}`)};

console.log('── A. 7개 스토리 렌더·play ──');
const IDS=['기본','줄수초과','표에서-요약','다녀온행','다녀온행-선택됨','돌아오기','만료'];
const fails=[];
for(const n of IDS){
  const r=await go(`components-peek--${n}`);
  const ok=!r.sbError&&r.errors.length===0;
  if(!ok) fails.push({n,e:r.sbError??r.errors[0]});
  console.log(`  ${ok?'✓':'✗'} ${n}${ok?'':` ← ${String(r.sbError??r.errors[0]).slice(0,140)}`}`);
}
check(`Peek 스토리 ${IDS.length}개 예외 없음`, fails.length===0, fails.length?fails.map(f=>f.n).join(', '):'전부 통과');

console.log('\n── B. Peek 을 직접 열어 구조·접근성 확인 ──');
await go('components-peek--기본');
const peek=await ev(`(async()=>{
  const w=ms=>new Promise(r=>setTimeout(r,ms));
  const open=()=>document.querySelector('[data-slot="guide-bubble"]:popover-open, [data-slot="peek"]:popover-open');
  // 닫혀 있으면 트리거를 눌러 연다
  if(!open()){ const t=${CANVAS}.querySelector('button'); t.click(); for(let i=0;i<30&&!open();i++) await w(100); }
  const p=open(); if(!p) return {열림:false};
  // 포커스는 useAnchored 의 레이아웃 이펙트에서 옮겨진다. popover 가 열린 직후에는
  // 아직 안 와 있을 수 있다 — 부하가 걸린 CI 러너에서 실제로 거짓 실패했다.
  // 조건을 기다린다. 끝까지 안 오면 그때 실패로 잡힌다.
  for(let i=0;i<40 && !(document.activeElement===p||p.contains(document.activeElement)); i++) await w(50);
  const dl=p.querySelector('dl');
  const trigger=${CANVAS}.querySelector('button');
  return {열림:true, popover:p.getAttribute('popover'), role:p.getAttribute('role'),
    labelledby: p.getAttribute('aria-labelledby'),
    이름: p.getAttribute('aria-labelledby') ? (document.getElementById(p.getAttribute('aria-labelledby'))?.textContent||'').trim() : null,
    dl구조: !!dl, dt수: dl?dl.querySelectorAll('dt').length:0, dd수: dl?dl.querySelectorAll('dd').length:0,
    포커스가_peek: document.activeElement===p || p.contains(document.activeElement),
    자체포커스링: (()=>{const c=getComputedStyle(p);return c.outlineStyle})(),
    배경덮개: [...document.querySelectorAll('div')].some(e=>{const r=e.getBoundingClientRect(),c=getComputedStyle(e);
      return r.width>=innerWidth*0.95&&r.height>=innerHeight*0.95&&c.position==='fixed'&&c.backgroundColor!=='rgba(0, 0, 0, 0)'}),
    트리거태그: trigger.tagName};
})()`);
await shot('b-peek');
check('Peek 이 열린다', peek.열림===true, `popover=${peek.popover}`);
check('role="dialog" 다', peek.role==='dialog');
check('aria-labelledby 가 제목을 가리킨다', !!peek.이름&&peek.이름.length>2, `"${peek.이름}"`);
check('dl/dt/dd 구조로 라벨-값 관계가 마크업에 있다', peek.dl구조&&peek.dt수>0&&peek.dt수===peek.dd수, `dt ${peek.dt수} · dd ${peek.dd수}`);
check('포커스가 Peek 으로 옮겨진다', peek.포커스가_peek===true);
check('Peek 자신은 포커스 링을 그리지 않는다 (R07-B 와 같은 규칙)', peek.자체포커스링==='none', `outline-style=${peek.자체포커스링}`);
check('화면을 덮는 모달 오버레이가 없다', peek.배경덮개===false);

console.log('\n── C. Escape · 포커스 복귀 ──');
const esc=await ev(`(async()=>{
  const w=ms=>new Promise(r=>setTimeout(r,ms));
  const open=()=>document.querySelector('[popover]:popover-open');
  const trig=${CANVAS}.querySelector('button');
  const before=!!open();
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  await w(350);
  // 복귀도 비동기다. 고정 sleep 대신 조건을 기다린다.
  for(let i=0;i<40 && document.activeElement!==trig; i++) await w(50);
  return {전:before, 후:!!open(), 트리거로복귀:document.activeElement===trig};
})()`);
check('Escape 로 닫힌다', esc.전===true&&esc.후===false, JSON.stringify(esc));
check('닫으면 포커스가 트리거로 돌아온다', esc.트리거로복귀===true);

console.log('\n── D. 표 안에서 — 스크롤 컨테이너 밖으로 온전히 보이는가 ──');
await go('components-peek--표에서-요약');
const intable=await ev(`(async()=>{
  const w=ms=>new Promise(r=>setTimeout(r,ms));
  const open=()=>document.querySelector('[popover]:popover-open');
  if(!open()){ const t=${CANVAS}.querySelector('tbody button, [data-slot="data-table-row"] button'); t?.click(); for(let i=0;i<30&&!open();i++) await w(100); }
  const p=open(); if(!p) return {열림:false};
  const sc=${CANVAS}.querySelector('[data-slot="data-table-scroll"], [data-slot="data-table"] div[style*="overflow"], .overflow-auto')
        ?? [...${CANVAS}.querySelectorAll('div')].find(e=>{const c=getComputedStyle(e);return /auto|scroll/.test(c.overflowY+c.overflowX)&&e.querySelector('table')});
  const b=p.getBoundingClientRect(), s=sc?sc.getBoundingClientRect():null;
  return {열림:true, 말풍선:{t:Math.round(b.top),b:Math.round(b.bottom),l:Math.round(b.left),r:Math.round(b.right)},
    컨테이너: s?{t:Math.round(s.top),b:Math.round(s.bottom)}:null,
    컨테이너찾음:!!sc, 화면안: b.top>=0&&b.bottom<=innerHeight&&b.left>=0&&b.right<=innerWidth};
})()`);
await shot('d-table');
check('표 안에서 Peek 이 열린다', intable.열림===true);
check('Peek 이 화면 안에 온전히 들어온다', intable.화면안===true, JSON.stringify(intable.말풍선));

console.log('\n── E. 다녀온 행 마커가 레이아웃을 밀지 않는가 ──');
await go('components-peek--다녀온행');
const marker=await ev(`(()=>{
  const row=${CANVAS}.querySelector('[data-slot="data-table-row"][data-revisited]');
  if(!row) return {마커:false};
  const cells=[...row.querySelectorAll('td')];
  const before=cells.map(c=>Math.round(c.getBoundingClientRect().left));
  const cs=getComputedStyle(row), cs0=getComputedStyle(cells[0]);
  const snap={shadow:cs.boxShadow, cellShadow:cs0.boxShadow, borderLeft:cs.borderLeftWidth};
  row.removeAttribute('data-revisited');
  const after=cells.map(c=>Math.round(c.getBoundingClientRect().left));
  row.setAttribute('data-revisited','');
  const again=cells.map(c=>Math.round(c.getBoundingClientRect().left));
  return {마커:true, ...snap, before, after, again,
    안밀림: JSON.stringify(before)===JSON.stringify(after)&&JSON.stringify(before)===JSON.stringify(again)};
})()`);
await shot('e-marker');
check('다녀온 행에 마커가 붙는다', marker.마커===true);
check('box-shadow inset 으로 그린다 (border 아님)', /inset/.test(marker.shadow||marker.cellShadow||''), `tr "${(marker.shadow||'').slice(0,40)}" · td "${(marker.cellShadow||'').slice(0,40)}"`);
check('border-left 를 쓰지 않는다', marker.borderLeft==='0px'||!marker.borderLeft, `${marker.borderLeft}`);
check('마커 유무로 셀 좌표가 변하지 않는다', marker.안밀림===true, `${JSON.stringify(marker.before)} / ${JSON.stringify(marker.after)}`);
const rgbMarker = (marker.shadow||marker.cellShadow||'').match(/rgb\([^)]+\)/)?.[0];
check('마커 색이 토큰으로 해소됨 (info 계열)', !!rgbMarker&&!/var\(/.test(marker.shadow||''), `${rgbMarker}`);

console.log('\n── F. 선택 + 다녀옴이 동시에 보이는가 ──');
await go('components-peek--다녀온행-선택됨');
const both=await ev(`(()=>{
  const row=${CANVAS}.querySelector('[data-slot="data-table-row"][data-revisited][data-selected]')
         ?? ${CANVAS}.querySelector('[data-slot="data-table-row"][data-revisited]');
  if(!row) return {행:false};
  const cs=getComputedStyle(row);
  const plain=${CANVAS}.querySelector('[data-slot="data-table-row"]:not([data-revisited]):not([data-selected])');
  // 행 배경은 <tr> 이 아니라 [data-slot="data-table-cell"] 에 --data-table-row-bg 로 적용된다.
  const cellBg=e=>{const c=e?.querySelector('[data-slot="data-table-cell"]');return c?getComputedStyle(c).backgroundColor:null};
  return {행:true, 선택됨:row.hasAttribute('data-selected'), 다녀옴:row.hasAttribute('data-revisited'),
    배경:cellBg(row), 마커:(cs.boxShadow||'').slice(0,50), 기본행배경:cellBg(plain)};
})()`);
await shot('f-both');
check('선택 + 다녀옴이 한 행에 공존한다', both.선택됨===true&&both.다녀옴===true, `선택 ${both.선택됨} · 다녀옴 ${both.다녀옴}`);
check('선택 배경이 기본 행과 다르다', both.배경!==both.기본행배경, `${both.배경} vs ${both.기본행배경}`);
check('그 위에 마커도 함께 보인다', /inset|rgb/.test(both.마커), both.마커);

console.log('\n── G. 다크 ──');
for (const n of ['기본','다녀온행']) {
  await go(`components-peek--${n}`,'&globals=theme:dark');
  const d=await ev(`(()=>{
    const el=${CANVAS}.querySelector('[data-slot="data-table-row"][data-revisited]')??document.querySelector('[popover]');
    const c=getComputedStyle(el);
    return {색:c.color, 배경:c.backgroundColor, 그림자:(c.boxShadow||'').slice(0,60)};
  })()`);
  await shot(`g-dark-${n}`);
  check(`dark ${n}: var() 잔존 없음`, !JSON.stringify(d).includes('var('), JSON.stringify(d).slice(0,110));
}

session.close();
const f=R.filter(x=>!x.pass);
console.log('\n'+'═'.repeat(64));
console.log(`검사 ${R.length}건 · 통과 ${R.length-f.length} · 실패 ${f.length}`);
if(f.length){console.log('\n실패:');for(const x of f)console.log(`  ✗ ${x.l} — ${x.d??''}`)}
writeFileSync(`${OUT}/results.json`,JSON.stringify(R,null,2));
process.exit(f.length?1:0);
