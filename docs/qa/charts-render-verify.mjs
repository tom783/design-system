// 차트 렌더 검증 — CDP 직결. 브라우저는 browser.mjs 가 해석한다.
//
//   pnpm build-storybook
//   pnpm qa --only <이 파일 이름>          (run-all 이 서버를 띄우고 출처를 확인한다)
//   또는 node docs/qa/static-server.mjs 로 띄우고 DS_SB_URL=<주소> node docs/qa/<이 파일>
//   node docs/qa/charts-render-verify.mjs ./shots
//
// 확인하는 것: 16개 스토리 play, 로딩/완료 치수 일치(13쌍), 로딩 중 summary 가
// 읽히지 않는지, 불릿 스켈레톤이 축 상자가 아닌지, 오류와 비어있음이 구별되는지.
//
// 이 파일을 고칠 사람에게:
//  · 스토리 play 는 열었다가 닫고 끝난다. 사후 상태를 믿지 마라.
//  · #storybook-root 안에서 찾아라. document.querySelector 는 스토리북 UI 를 잡는다.
//  · getComputedStyle 은 라이브 객체다. 상태를 바꾸기 전에 값을 복사해라.

import { writeFileSync, mkdirSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS, storybookBase } from './browser.mjs';

const BASE = await storybookBase(), OUT = process.argv[2] || './shots';
mkdirSync(OUT, { recursive: true });
// GUI Chrome 을 직접 띄우지 않는다 — 샌드박스에서 TransformProcessType 으로
// 크래시한다. 이유와 대안은 browser.mjs 머리말에 있다.
const session = await launchBrowser({ windowSize: '1440,1000', outDir: OUT });
const { cdp, ev, shot, sleep } = session;

async function go(id,extra=''){
  session.resetErrors();
  await cdp('Page.navigate',{url:`${BASE}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story${extra}`});
  for(let i=0;i<80;i++){if(await ev('document.readyState').catch(()=>'')==='complete')break; await sleep(150)}
  let prev=-1,stable=0;
  for(let i=0;i<60&&stable<3;i++){const t=await ev('document.body.innerHTML.length').catch(()=>0);stable=t===prev?stable+1:0;prev=t;await sleep(200)}
  return {errors:session.errors().filter(m=>!/Warning:|DevTools|favicon|preload/i.test(m)),
    sbError: await ev(`(()=>{const el=document.querySelector('#error-message');return document.body.classList.contains('sb-show-errordisplay')||el?(el?el.textContent.slice(0,300):'errordisplay'):null})()`).catch(()=>null)};
}
const R=[]; const check=(l,pass,d)=>{R.push({l,pass,d});console.log(`  ${pass?'✓':'✗'} ${l}${d?` — ${d}`:''}`)};


console.log('── A. 16개 차트 스토리 렌더·play ──');
const IDS=['추이밴드','추이밴드-선만','추이밴드-축기준','추이밴드-음수','추이밴드-엣지','불릿','구성변화','구성변화-절대값','반응형','구성변화-엣지','로딩-추이밴드','로딩-불릿','로딩-치수일치','오류','비어있음','지연로딩'];
const fails=[];
for(const n of IDS){
  const r=await go(`components-charts--${n}`);
  const ok=!r.sbError&&r.errors.length===0;
  if(!ok) fails.push({n,e:r.sbError??r.errors[0]});
  const info=await ev(`({svg:document.querySelectorAll('svg[role="img"]').length, sk:document.querySelectorAll('[data-slot="chart-skeleton"]').length, err:document.querySelectorAll('[data-slot="chart-error"]').length})`);
  console.log(`  ${ok?'✓':'✗'} ${n.padEnd(14)} svg ${String(info.svg).padStart(2)} · 스켈레톤 ${String(info.sk).padStart(2)} · 오류 ${info.err}${ok?'':` ← ${String(r.sbError??r.errors[0]).slice(0,130)}`}`);
}
check(`차트 스토리 ${IDS.length}개 예외 없음`, fails.length===0, fails.length?fails.map(f=>f.n).join(', '):'전부 통과');

console.log('\n── B. 치수 일치 (로딩 ↔ 완료) ──');
await go('components-charts--로딩-치수일치');
const dim=await ev(`(()=>{
  const g=[...${CANVAS}.querySelectorAll('[data-compare]')];
  const out=[];
  for(let i=0;i<g.length;i+=2){
    const a=g[i].querySelector('[data-slot="chart-plot"]'), b=g[i+1].querySelector('[data-slot="chart-plot"]');
    out.push({쌍:g[i].dataset.compare.replace('-loading',''),
      플롯:[Math.round(a.getBoundingClientRect().height),Math.round(b.getBoundingClientRect().height)],
      카드:[Math.round(g[i].getBoundingClientRect().height),Math.round(g[i+1].getBoundingClientRect().height)]});
  }
  return out;
})()`);
await shot('b-dim');
let worstPlot=0, worstCard=0;
for(const d of dim){
  const dp=Math.abs(d.플롯[0]-d.플롯[1]), dc=Math.abs(d.카드[0]-d.카드[1]);
  worstPlot=Math.max(worstPlot,dp); worstCard=Math.max(worstCard,dc);
  console.log(`  · ${d.쌍.padEnd(16)} 플롯 ${String(d.플롯[0]).padStart(3)}/${String(d.플롯[1]).padStart(3)} (Δ${dp})  카드 ${String(d.카드[0]).padStart(3)}/${String(d.카드[1]).padStart(3)} (Δ${dc})`);
}
check(`${dim.length}쌍 전부 플롯 높이 차 ≤ 2px`, worstPlot<=2, `최대 Δ${worstPlot}px`);
check(`${dim.length}쌍 전부 카드 높이 차 ≤ 2px`, worstCard<=2, `최대 Δ${worstCard}px`);
check('NaN 높이가 섞여도 유한한 치수가 나온다', dim.every(d=>d.플롯.every(Number.isFinite)&&d.플롯.every(h=>h>0)), dim.map(d=>d.플롯[0]).join(','));

console.log('\n── C. 로딩 중 접근성 — summary 가 읽히면 안 된다 ──');
await go('components-charts--로딩-추이밴드');
const a11y=await ev(`(()=>{
  const fig=${CANVAS}.querySelector('[data-slot="chart-frame"]');
  const sr=fig.querySelector('[data-slot="chart-loading"] .sr-only');
  const svg=fig.querySelector('svg[role="img"]');
  return {ariaBusy:fig.getAttribute('aria-busy'), 상태역할:!!fig.querySelector('[role="status"]'),
    읽히는문구:sr?sr.textContent:null, svg존재:!!svg,
    스켈레톤aria:fig.querySelector('[data-slot="chart-skeleton"]')?.closest('[aria-hidden="true"]')?.getAttribute('aria-hidden')
              ?? fig.querySelector('[data-slot="chart-skeleton"]')?.getAttribute('aria-hidden'),
    제목:fig.querySelector('[data-slot="chart-title"]')?.textContent,
    범례:[...fig.querySelectorAll('[data-slot="chart-legend"] li')].map(l=>l.textContent.trim())};
})()`);
await shot('c-loading');
check('aria-busy="true"', a11y.ariaBusy==='true');
check('role=status 로 로딩을 알린다', a11y.상태역할===true);
check('읽히는 문구가 결론(summary)이 아니라 로딩 문구다', a11y.읽히는문구==='불러오는 중', `"${a11y.읽히는문구}"`);
check('로딩 중에는 데이터 svg 가 없다', a11y.svg존재===false);
check('제목은 진짜가 그대로 보인다', !!a11y.제목&&a11y.제목.length>0, `"${a11y.제목}"`);
check('스켈레톤은 콘텐츠로 읽히지 않는다', a11y.스켈레톤aria==='true', `aria-hidden=${a11y.스켈레톤aria}`);

console.log('\n── D. 불릿 스켈레톤이 불릿 모양인가 (축 상자가 아님) ──');
await go('components-charts--로딩-불릿');
const bl=await ev(`(()=>{
  const sk=${CANVAS}.querySelector('[data-slot="chart-skeleton"]');
  const rows=[...sk.querySelectorAll('[data-slot="chart-skeleton-bullet-row"]')];
  return {variant:sk.dataset.variant, 줄수:rows.length,
    줄높이:rows.map(r=>Math.round(r.getBoundingClientRect().height)),
    축상자있음: !!sk.querySelector('.ds-loading-chart-axis'),
    범례있음: !!sk.querySelector('.ds-loading-chart-legend')};
})()`);
await shot('d-bullet');
check('variant=bullet', bl.variant==='bullet');
check('축 상자를 그리지 않는다 (올 것을 거짓말하지 않음)', bl.축상자있음===false);
check('ChartFrame 안이므로 스켈레톤 자체 범례는 없다', bl.범례있음===false);
check('줄 높이가 실제 BulletRow 와 같은 44px', bl.줄높이.every(h=>h===44), `${bl.줄수}줄 · ${JSON.stringify(bl.줄높이)}`);

console.log('\n── E. 오류와 비어있음이 다르게 보이는가 ──');
await go('components-charts--오류');
const er=await ev(`(()=>{
  const al=[...${CANVAS}.querySelectorAll('[role="alert"]')];
  const c=al[0]?getComputedStyle(al[0]):null;
  return {개수:al.length, 문구:al.map(a=>a.textContent.trim()),
    배경:c?c.backgroundColor:null, 색:c?c.color:null, 아이콘:!!al[0]?.querySelector('svg')};
})()`);
await shot('e-error');
await go('components-charts--비어있음');
const em=await ev(`(()=>{
  const p=${CANVAS}.querySelector('[data-slot="chart-empty"]');
  const c=p?getComputedStyle(p):null;
  return {있음:!!p, 문구:p?p.textContent.trim():null, 배경:c?c.backgroundColor:null, 알림역할:!!${CANVAS}.querySelector('[role="alert"]')};
})()`);
await shot('e-empty');
check('오류가 role=alert 로 알려진다', er.개수===3, `${er.개수}개`);
check('오류 문구가 "데이터 없음"과 다르다', er.문구.every(t=>t!==em.문구), `오류 "${er.문구[0]}" vs 비어있음 "${em.문구}"`);
check('오류에 아이콘이 있다 (색 외 신호)', er.아이콘===true);
check('오류에는 배경 틴트가 있고 비어있음에는 없다', er.배경!==em.배경, `${er.배경} vs ${em.배경}`);
check('비어있음은 alert 가 아니다', em.알림역할===false);

console.log('\n── F. 지연 로딩 — 빠른 응답에 스켈레톤이 안 뜬다 ──');
{
  const r=await go('components-charts--지연로딩');
  check('지연로딩 스토리 play 통과', r.errors.length===0&&!r.sbError, r.sbError??r.errors[0]??'예외 없음');
}

console.log('\n── G. 다크 테마 ──');
for(const n of ['로딩-추이밴드','오류']){
  await go(`components-charts--${n}`,'&globals=theme:dark');
  const d=await ev(`(()=>{
    const el=${CANVAS}.querySelector('[data-slot="chart-skeleton"] [data-slot], [data-slot="chart-error"]');
    const c=el?getComputedStyle(el):null;
    const probe=[...${CANVAS}.querySelectorAll('*')].map(e=>getComputedStyle(e).backgroundColor).filter(b=>b&&b!=='rgba(0, 0, 0, 0)');
    return {색:c?c.color:null, 배경표본:probe.slice(0,3)};
  })()`);
  await shot(`g-dark-${n}`);
  check(`dark ${n}: 색이 토큰으로 해소됨 (var 잔존 없음)`, !JSON.stringify(d).includes('var('), JSON.stringify(d.배경표본));
}

session.close();
const f=R.filter(x=>!x.pass);
console.log('\n'+'═'.repeat(64));
console.log(`검사 ${R.length}건 · 통과 ${R.length-f.length} · 실패 ${f.length}`);
if(f.length){console.log('\n실패:');for(const x of f)console.log(`  ✗ ${x.l} — ${x.d??''}`)}
writeFileSync(`${OUT}/results.json`,JSON.stringify(R,null,2));
process.exit(f.length?1:0);
