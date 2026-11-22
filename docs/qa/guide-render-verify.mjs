// 안내(Tooltip·Hint·Tour) 렌더 검증 — CDP 직결, 의존성 없음.
//
//   pnpm build-storybook
//   pnpm qa --only <이 파일 이름>          (run-all 이 서버를 띄우고 출처를 확인한다)
//   또는 node docs/qa/static-server.mjs 로 띄우고 DS_SB_URL=<주소> node docs/qa/<이 파일>
//   node docs/qa/guide-render-verify.mjs ./shots
//
// 이 파일을 고칠 사람에게 — 여기서 실제로 틀렸던 것들이다.
//
//  1. Emulation.setFocusEmulationEnabled 를 켜지 않으면 헤드리스에서
//     포커스 검사가 전부 거짓 실패한다.
//  2. 스토리의 play 는 열었다가 전부 닫고 끝난다. 사후 상태를 "열려 있다"고
//     가정하지 마라. 필요한 상태는 직접 만들어라. (1차에서 7건이 이걸로 실패)
//  3. document.querySelector('button') 은 스토리북 자체 UI 를 잡는다.
//     반드시 #storybook-root 안에서 찾아라.
//  4. getComputedStyle 은 라이브 객체다. 상태를 바꾸기 전에 문자열로 복사해라.
//     (2차에서 "링이 안 그려진다"는 오진을 이걸로 했다)
//  5. React 는 mouseover/mouseout 위임으로 enter/leave 를 합성한다.
//     mouseleave 만 보내면 React 핸들러가 안 돈다.
import { writeFileSync, mkdirSync } from 'node:fs';
import { launchBrowser, storybook, storybookBase } from './browser.mjs';

const BASE = await storybookBase(), OUT = process.argv[2] || './shots3';
mkdirSync(OUT, { recursive: true });
// GUI Chrome 을 직접 띄우지 않는다 — 샌드박스에서 TransformProcessType 으로
// 크래시한다. 이유와 대안은 browser.mjs 머리말에 있다.
const session = await launchBrowser({ windowSize: '1440,900', outDir: OUT });
const { cdp, ev, shot, sleep } = session;
const evalIn = ev;

await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`
  window.__opens=[]; window.__clicks=0;
  addEventListener('click',()=>{window.__clicks++},{capture:true});
  const real=HTMLElement.prototype.showPopover;
  HTMLElement.prototype.showPopover=function(...a){
    window.__opens.push({slot:this.dataset?.slot??null, clicksBefore:window.__clicks, t:Math.round(performance.now())});
    return real.apply(this,a);
  };`});

async function go(id,waitPlay=true){
  session.resetErrors();
  await cdp('Page.navigate',{url:`${BASE}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`});
  for(let i=0;i<80;i++){if(await ev('document.readyState').catch(()=>'')==='complete')break; await sleep(150)}
  if(waitPlay) for(let i=0;i<70;i++){ if(await ev(`!!document.querySelector('[data-play-complete="true"]')`).catch(()=>false)) break; await sleep(200);}
  return {errors:session.errors().filter(m=>!/Warning:|DevTools|favicon|preload|3단계를 권장/i.test(m))};
}
const R=[]; const check=(l,pass,d)=>{R.push({l,pass,d});console.log(`  ${pass?'✓':'✗'} ${l}${d?` — ${d}`:''}`)};
// 캔버스 안에서만 찾는다
const CANVAS=`(document.querySelector('#storybook-root')||document.querySelector('#root'))`;
const HOVER=`(el)=>{for(const t of ['pointerover','mouseover','pointerenter','mouseenter'])el.dispatchEvent(new MouseEvent(t,{bubbles:t.includes('over')}))}`;
const UNHOVER=`(el)=>{for(const t of ['pointerout','mouseout','pointerleave','mouseleave'])el.dispatchEvent(new MouseEvent(t,{bubbles:t.includes('out'),relatedTarget:document.body}))}`;

console.log('── A. anchor-name 이 대상에 정확히 1개 ──');
await go('components-guide--툴팁-기본');
const anc=await ev(`(async()=>{
  const btn=${CANVAS}.querySelector('button');
  btn.focus(); await new Promise(r=>setTimeout(r,250));
  const bub=[...document.querySelectorAll('[data-slot="guide-bubble"]')].find(b=>b.matches(':popover-open'));
  if(!bub) return {열림:false, 버튼:btn?.textContent};
  const want=bub.style.getPropertyValue('--guide-anchor').trim();
  const pa=getComputedStyle(bub).getPropertyValue('position-anchor').trim();
  const owners=[...document.querySelectorAll('*')].filter(e=>getComputedStyle(e).getPropertyValue('anchor-name').trim().includes(want));
  const b=bub.getBoundingClientRect(), a=btn.getBoundingClientRect();
  return {열림:true, place:bub.dataset.place, pa, want, 보유수:owners.length,
    대상이_유일보유: owners.length===1&&owners[0]===btn,
    중심편차: Math.round(Math.abs((b.left+b.width/2)-(a.left+a.width/2))),
    간격: Math.round(a.top-b.bottom),
    describedby: btn.getAttribute('aria-describedby'), 말풍선id: bub.id};
})()`);
await shot('a-anchor');
check('포커스로 툴팁이 열린다', anc.열림===true, `place=${anc.place} 버튼="${anc.버튼??''}"`);
check('data-place 가 css 경로', anc.place==='css');
check('position-anchor 가 --guide-anchor 를 가리킨다', anc.pa===anc.want&&!!anc.want, `${anc.pa}`);
check('anchor-name 보유 요소가 대상 하나뿐 (이중 설정 충돌 없음)', anc.대상이_유일보유===true, `${anc.보유수}개`);
check('말풍선이 대상 중심에 정렬 (편차 ≤ 8px)', anc.중심편차<=8, `편차 ${anc.중심편차}px · 간격 ${anc.간격}px`);
check('aria-describedby 가 말풍선 id 를 가리킨다', anc.describedby===anc.말풍선id&&!!anc.말풍선id, `${anc.describedby} / ${anc.말풍선id}`);

console.log('\n── B. 호버 지연 / 해제 ──');
await go('components-guide--툴팁-기본');
const hv=await ev(`(async()=>{
  const hover=${HOVER}, unhover=${UNHOVER};
  const btn=${CANVAS}.querySelector('button');
  const isOpen=()=>!![...document.querySelectorAll('[data-slot="guide-bubble"]')].find(b=>b.matches(':popover-open'));
  const w=ms=>new Promise(r=>setTimeout(r,ms));
  btn.blur(); for(const b of document.querySelectorAll('[data-slot="guide-bubble"]')) if(b.matches(':popover-open')) b.hidePopover();
  await w(300);
  const base=isOpen();
  hover(btn); const a=await w(150).then(isOpen); const b=await w(500).then(isOpen);
  unhover(btn); const c=await w(400).then(isOpen);
  return {기준:base, 호버150:a, 호버650:b, 해제후:c};
})()`);
check('시작 시 닫혀 있다', hv.기준===false, JSON.stringify(hv));
check('호버 150ms 에는 안 뜬다 (지연 400ms)', hv.호버150===false);
check('호버 650ms 에는 뜬다', hv.호버650===true);
check('호버를 떼면 닫힌다', hv.해제후===false);

console.log('\n── C. 투어 — 링·포커스·모달아님·Escape (값을 먼저 복사한다) ──');
await go('components-guide--투어-3단계');
const t=await ev(`(async()=>{
  const w=ms=>new Promise(r=>setTimeout(r,ms));
  const openBub=()=>[...document.querySelectorAll('[data-slot="guide-bubble"]')].find(b=>b.matches(':popover-open'));
  const start=[...${CANVAS}.querySelectorAll('button')].find(b=>b.textContent.trim()==='둘러보기');
  if(!start) return {오류:'트리거 없음'};
  const opensBeforeClick=window.__opens.filter(o=>o.clicksBefore===0&&o.slot==='guide-bubble').length;
  start.click();
  for(let i=0;i<40&&!openBub();i++) await w(100);
  const bub=openBub(); if(!bub) return {오류:'열리지 않음'};
  const ringEl=document.querySelector('[data-guide-target="active"]');
  // ── 값을 즉시 복사한다. getComputedStyle 은 라이브 객체다 (2차의 실패 원인) ──
  const ring = ringEl ? (()=>{const c=getComputedStyle(ringEl);
    return {w:c.outlineWidth, s:c.outlineStyle, c:c.outlineColor, off:c.outlineOffset, el:ringEl.id};})() : null;
  const 단계 = bub.innerText.match(/(\\d+)\\s*\\/\\s*(\\d+)/)?.[0] ?? null;
  // 포커스는 레이아웃 이펙트에서 옮겨진다. 열린 직후에는 아직 안 와 있을 수 있다
  // (CI 에서 peek 쪽이 실제로 거짓 실패했다). 조건을 기다린다.
  for(let i=0;i<40 && document.activeElement!==bub; i++) await w(50);
  const 포커스가_말풍선 = document.activeElement===bub;
  // 링이 레이아웃을 미는가 — 다른 형제 좌표 비교
  const sib=document.querySelector('#guide-step-2');
  const s1=sib?Math.round(sib.getBoundingClientRect().left):null;
  ringEl?.removeAttribute('data-guide-target');
  const s2=sib?Math.round(sib.getBoundingClientRect().left):null;
  ringEl?.setAttribute('data-guide-target','active');
  // 모달이 아님 — 전체 덮는 고정 오버레이 없음 + 배경이 집힘
  const overlay=[...document.querySelectorAll('div,section')].some(e=>{
    const r=e.getBoundingClientRect(), c=getComputedStyle(e);
    return r.width>=innerWidth*0.95&&r.height>=innerHeight*0.95&&c.position==='fixed'&&c.backgroundColor!=='rgba(0, 0, 0, 0)';});
  const bg=document.querySelector('#guide-step-3');
  const hit=bg?document.elementFromPoint(bg.getBoundingClientRect().left+5,bg.getBoundingClientRect().top+5):null;
  // Escape
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  await w(350);
  return {열림:true, 단계, place:bub.dataset.place, 포커스가_말풍선, ring,
    링이_레이아웃안밂:s1===s2, 형제:[s1,s2], 전체오버레이:overlay,
    배경히트: hit?hit.tagName+'#'+hit.id:null,
    Escape후열림: !!openBub(), Escape후링: document.querySelectorAll('[data-guide-target="active"]').length,
    자동열림_클릭전: opensBeforeClick};
})()`);
await shot('c-tour');
check('트리거 클릭으로 열린다', t.열림===true, `${t.단계} place=${t.place}`);
check('포커스가 말풍선으로 이동한다', t.포커스가_말풍선===true);
check('링이 그려진다 (outline-style solid)', t.ring?.s==='solid', `${t.ring?.w} ${t.ring?.s} ${t.ring?.c} offset ${t.ring?.off} on #${t.ring?.el}`);
check('링 색이 --hint-ring 으로 해소됐다', t.ring?.c==='rgb(211, 62, 88)', t.ring?.c);
check('링이 레이아웃을 밀지 않는다', t.링이_레이아웃안밂===true, `형제 left ${JSON.stringify(t.형제)}`);
check('화면을 덮는 모달 오버레이가 없다 (10.4)', t.전체오버레이===false);
check('배경 요소가 여전히 집힌다 (차단 없음)', /BUTTON/.test(t.배경히트??''), `elementFromPoint → ${t.배경히트}`);
check('Escape 로 닫힌다', t.Escape후열림===false);
check('닫으면 링이 제거된다', t.Escape후링===0, `${t.Escape후링}개`);
check('클릭 전에 스스로 열린 적이 없다 (자동 실행 금지)', t.자동열림_클릭전===0, `클릭 전 열림 ${t.자동열림_클릭전}회`);

console.log('\n── D. 모든 스토리에서 자동 실행이 없는가 ──');
for(const n of ['투어-3단계','투어-건너뛰기','투어-대상없음','투어-중앙대체','투어-단계초과','투어-스크롤후표시']){
  await go(`components-guide--${n}`);
  const o=await ev(`({클릭전: window.__opens.filter(x=>x.clicksBefore===0&&x.slot==='guide-bubble'), 전체: window.__opens.length, 클릭수: window.__clicks})`);
  check(`${n}: 클릭 전 자동 열림 없음`, o.클릭전.length===0, `열림 ${o.전체}회 · 클릭 ${o.클릭수}회 · 클릭전 ${JSON.stringify(o.클릭전)}`);
}

console.log('\n── E. 힌트 — role/이름/포커스 복귀 ──');
await go('components-guide--힌트');
const h=await ev(`(async()=>{
  const w=ms=>new Promise(r=>setTimeout(r,ms));
  // play 가 닫아버렸으므로 스토리를 다시 마운트하는 대신 접근성 구조만 본다
  const d=document.querySelector('[role="dialog"]');
  const trig=[...${CANVAS}.querySelectorAll('button')].find(b=>b.textContent.trim()==='내보내기');
  return {dialog존재: !!d, labelledby: d?.getAttribute('aria-labelledby'),
    이름: d?.getAttribute('aria-labelledby') ? document.getElementById(d.getAttribute('aria-labelledby'))?.textContent : null,
    tabindex: d?.getAttribute('tabindex'), popover: d?.getAttribute('popover'),
    트리거포커스: document.activeElement===trig, 트리거링: trig?.hasAttribute('data-guide-target')};
})()`);
check('Hint 가 role="dialog" 다', h.dialog존재===true, `popover=${h.popover} tabindex=${h.tabindex}`);
check('aria-labelledby 가 제목을 가리킨다', !!h.이름&&h.이름.length>3, `"${h.이름}"`);
check('닫은 뒤 포커스가 트리거로 돌아왔다', h.트리거포커스===true);
check('닫은 뒤 링이 제거됐다', h.트리거링===false);

session.close();
const f=R.filter(x=>!x.pass);
console.log('\n'+'═'.repeat(64));
console.log(`검사 ${R.length}건 · 통과 ${R.length-f.length} · 실패 ${f.length}`);
if(f.length){console.log('\n실패:');for(const x of f)console.log(`  ✗ ${x.l} — ${x.d??''}`)}
writeFileSync(`${OUT}/results.json`,JSON.stringify(R,null,2));
process.exit(f.length?1:0);
