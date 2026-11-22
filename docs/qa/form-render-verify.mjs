// 폼 렌더 검증 — CDP 직결, 의존성 없음.
//
//   pnpm build-storybook
//   pnpm qa --only <이 파일 이름>          (run-all 이 서버를 띄우고 출처를 확인한다)
//   또는 node docs/qa/static-server.mjs 로 띄우고 DS_SB_URL=<주소> node docs/qa/<이 파일>
//   node docs/qa/form-render-verify.mjs ./shots
//
// 스토리 play 는 합성 CompositionEvent 로 "가드 조건문이 막는가"를 본다.
// 여기서는 CDP Input.imeSetComposition 으로 **진짜 IME 조합**을 넣는다.
// 가드 없는 구현은 B 구간에서 ["한글ㅇ","입력"] 이 나온다 (DESIGN.md 11.1).
//
// 이 파일을 고칠 사람에게 — 여기서 실제로 틀렸던 것들이다.
//
//  1. Emulation.setFocusEmulationEnabled 를 켜지 않으면 포커스 검사가 거짓 실패한다.
//  2. #storybook-root 안에서 찾아라. document.querySelector('button') 은
//     스토리북 자체 UI 를 잡는다.
//  3. getComputedStyle 은 라이브 객체다. 상태를 바꾸기 전에 문자열로 복사해라.
//  4. aria-describedby 가 가리키는 요소에 data-slot 이 없을 수 있다
//     (스토리가 일부러 둔 외부 <p>). 실재 여부로 판정해라.
//  5. 검증 시점 검사는 play 가 끝난 뒤라 hasErrored 가 이미 true 다.
//     "첫 오류 전 침묵"은 스토리 play 가 깨끗한 마운트에서 단언한다.
import { writeFileSync, mkdirSync } from 'node:fs';
import { launchBrowser, storybook, storybookBase } from './browser.mjs';

const BASE = await storybookBase(), OUT = process.argv[2] || './shots';
mkdirSync(OUT, { recursive: true });
// GUI Chrome 을 직접 띄우지 않는다 — 샌드박스에서 TransformProcessType 으로
// 크래시한다. 이유와 대안은 browser.mjs 머리말에 있다.
const session = await launchBrowser({ windowSize: '1200,900', outDir: OUT });
const { cdp, ev, shot, sleep } = session;
const evalIn = ev;

async function go(id){
  session.resetErrors();
  await cdp('Page.navigate',{url:`${BASE}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`});
  for(let i=0;i<80;i++){if(await ev('document.readyState').catch(()=>'')==='complete')break; await sleep(150)}
  for(let i=0;i<70;i++){ if(await ev(`!!document.querySelector('[data-play-complete="true"]')`).catch(()=>false)) break; await sleep(200); }
  return {errors:session.errors().filter(m=>!/Warning:|DevTools|favicon|preload/i.test(m)),
    sbError: await ev(`(()=>{const el=document.querySelector('#error-message');return document.body.classList.contains('sb-show-errordisplay')||el?(el?el.textContent.slice(0,300):'errordisplay'):null})()`).catch(()=>null)};
}
const R=[]; const check=(l,pass,d)=>{R.push({l,pass,d});console.log(`  ${pass?'✓':'✗'} ${l}${d?` — ${d}`:''}`)};
const CANVAS=`(document.querySelector('#storybook-root')||document.querySelector('#root'))`;
const S={'한':['ㅎ','하','한'],'글':['ㄱ','그','글'],'입':['ㅇ','이','입'],'력':['ㄹ','려','력']};
// 진짜 IME 조합. 각 글자를 자모 단계로 올린 뒤 커밋한다.
async function imeType(word, perStep){
  for (const chr of word) {
    for (const step of S[chr]) { await cdp('Input.imeSetComposition',{text:step,selectionStart:step.length,selectionEnd:step.length}); await sleep(45); if(perStep) await perStep(); }
    await cdp('Input.insertText',{text:chr}); await sleep(70);
  }
}

console.log('── A. 11개 폼 스토리 렌더·play ──');
const IDS=['기본','오류-레이아웃','검증시점','enter-이동','enter-textarea','enter-비활성건너뜀','한글-자동이동','한글-enter','연속등록','양수-tab순서','제출오류와-네이티브동작'];
const fails=[];
for(const n of IDS){
  const r=await go(`components-form--${n}`);
  const ok=!r.sbError&&r.errors.length===0;
  if(!ok) fails.push({n,e:r.sbError??r.errors[0]});
  console.log(`  ${ok?'✓':'✗'} ${n}${ok?'':` ← ${String(r.sbError??r.errors[0]).slice(0,140)}`}`);
}
check(`폼 스토리 ${IDS.length}개 예외 없음`, fails.length===0, fails.length?fails.map(f=>f.n).join(', '):'전부 통과');

console.log('\n── B. 진짜 IME · 자동이동에서 글자가 쪼개지지 않는가 (1.2 회귀) ──');
await go('components-form--한글-자동이동');
const split=await ev(`(()=>{const f=[...${CANVAS}.querySelectorAll('input')];f.forEach(i=>{const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(i,'');i.dispatchEvent(new Event('input',{bubbles:true}))});f[0].focus();return f.length})()`);
await imeType('한글입력');
const auto=await ev(`(()=>{const f=[...${CANVAS}.querySelectorAll('input')];return {칸:f.map(i=>i.value), 포커스:f.indexOf(document.activeElement)}})()`);
await shot('b-auto');
const joined = auto.칸.join('');
// 자모(ㄱ-ㅎ, ㅏ-ㅣ)가 단독으로 남아 있으면 쪼개진 것이다
const hasOrphanJamo = /[ㄱ-ㆎ]/.test(joined);
check('입력한 글자가 모두 완성형이다 (자모 단독 없음)', !hasOrphanJamo, `칸 ${JSON.stringify(auto.칸)}`);
check('"한글"+"입"이 한 칸에 온전히 들어갔다', auto.칸[0]==='한글입', `첫 칸 "${auto.칸[0]}"`);
check('나머지가 다음 칸으로 갔다', auto.칸[1]==='력', `둘째 칸 "${auto.칸[1]}"`);
console.log(`     ← 가드 없는 구현은 여기서 ["한글ㅇ","입력"] 이 나온다 (내가 측정한 값)`);

console.log('\n── C. 진짜 IME · 조합 중 Enter 가 칸을 옮기지 않는가 (1.3 회귀) ──');
await go('components-form--한글-enter');
const enter=await ev(`(()=>{const f=[...${CANVAS}.querySelectorAll('input')];f[0].focus();return f.length})()`);
// '한' 을 조합 중인 상태로 만든 뒤 Enter
for (const s of S['한']) { await cdp('Input.imeSetComposition',{text:s,selectionStart:s.length,selectionEnd:s.length}); await sleep(45); }
await cdp('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
await sleep(150);
const during=await ev(`(()=>{const f=[...${CANVAS}.querySelectorAll('input')];return {포커스:f.indexOf(document.activeElement), 값:f.map(i=>i.value)}})()`);
check('조합 중 Enter 로는 칸이 바뀌지 않는다', during.포커스===0, `포커스 index ${during.포커스} · 값 ${JSON.stringify(during.값)}`);
// 커밋한 뒤 Enter
await cdp('Input.insertText',{text:'한'}); await sleep(80);
await cdp('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
await sleep(150);
const after=await ev(`(()=>{const f=[...${CANVAS}.querySelectorAll('input')];return {포커스:f.indexOf(document.activeElement), 값:f.map(i=>i.value)}})()`);
await shot('c-enter');
check('조합이 끝난 뒤 Enter 는 다음 칸으로 간다', after.포커스===1, `포커스 index ${after.포커스} · 값 ${JSON.stringify(after.값)}`);

console.log('\n── D. 오류가 떴다 사라져도 레이아웃이 안 밀리는가 ──');
await go('components-form--오류-레이아웃');
const shift=await ev(`(async()=>{
  const w=ms=>new Promise(r=>setTimeout(r,ms));
  const fields=[...${CANVAS}.querySelectorAll('[data-slot="field"]')];
  const btn=[...${CANVAS}.querySelectorAll('button')].find(b=>/오류|토글|보이/.test(b.textContent));
  const pos=()=>fields.map(f=>Math.round(f.getBoundingClientRect().top));
  const a=pos(); btn?.click(); await w(250);
  const b=pos(); btn?.click(); await w(250);
  const c=pos();
  const errEl=${CANVAS}.querySelector('[data-slot="field-error"]');
  return {오류없음:a, 오류있음:b, 다시없음:c, 버튼:!!btn,
    예약높이: errEl?Math.round(errEl.getBoundingClientRect().height):null};
})()`);
await shot('d-shift');
check('오류 토글 버튼이 있다', shift.버튼===true);
check('오류가 떠도 필드 위치가 안 변한다', JSON.stringify(shift.오류없음)===JSON.stringify(shift.오류있음),
  `${JSON.stringify(shift.오류없음)} → ${JSON.stringify(shift.오류있음)}`);
check('오류가 사라져도 되돌아온다', JSON.stringify(shift.오류없음)===JSON.stringify(shift.다시없음));
check('오류 자리가 미리 예약돼 있다 (높이 > 0)', (shift.예약높이??0)>0, `${shift.예약높이}px`);

console.log('\n── E. Field 접근성 배선 ──');
await go('components-form--기본');
const a11y=await ev(`(()=>{
  const inp=${CANVAS}.querySelector('[data-slot="field"] input');
  const lbl=${CANVAS}.querySelector('[data-slot="field-label"]');
  const ids=(inp.getAttribute('aria-describedby')||'').split(/\\s+/).filter(Boolean);
  return {id:inp.id, htmlFor:lbl.getAttribute('for'), 연결됨:lbl.getAttribute('for')===inp.id,
    describedby:ids, 실재:ids.map(i=>!!document.getElementById(i)),
    내용: ids.map(i=>(document.getElementById(i)?.textContent||'').trim().slice(0,16)),
    required:inp.required, ariaInvalid:inp.getAttribute('aria-invalid'),
    설명이위: (()=>{const d=${CANVAS}.querySelector('[data-slot="field-description"]');
      return d ? Math.round(d.getBoundingClientRect().bottom) <= Math.round(inp.getBoundingClientRect().top) : null})(),
    순서: (()=>{const d=${CANVAS}.querySelector('[data-slot="field-description"]');
      return d?[Math.round(d.getBoundingClientRect().bottom),Math.round(inp.getBoundingClientRect().top)]:null})(),
    라이브영역: ${CANVAS}.querySelector('[data-slot="field-error"]')?.getAttribute('aria-live')};
})()`);
check('label[for] 이 input.id 와 연결된다', a11y.연결됨===true, `${a11y.htmlFor} / ${a11y.id}`);
check('aria-describedby 의 모든 id 가 실재한다', a11y.실재.length>0&&a11y.실재.every(Boolean), JSON.stringify(a11y.내용));
check('자식이 이미 갖고 있던 aria-describedby 가 지워지지 않았다', a11y.describedby.includes('existing-help'), a11y.describedby.join(' '));
check('설명이 입력칸 위에 있다 (DESIGN 11.4)', a11y.설명이위===true, `설명 bottom ${a11y.순서?.[0]} ≤ 입력 top ${a11y.순서?.[1]}`);
check('오류 영역이 aria-live 다', a11y.라이브영역==='polite', `aria-live=${a11y.라이브영역}`);

console.log('\n── F. 검증 시점 — 타이핑 중엔 안 혼내고 blur 에서 혼낸다 ──');
await go('components-form--검증시점');
const timing=await ev(`(async()=>{
  const w=ms=>new Promise(r=>setTimeout(r,ms));
  const inp=${CANVAS}.querySelector('[data-slot="field"] input');
  const setV=(v)=>{const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(inp,v);inp.dispatchEvent(new Event('input',{bubbles:true}))};
  const err=()=>(${CANVAS}.querySelector('[data-slot="field-error"]')?.textContent||'').trim();
  // 규칙은 "세 글자 이상". play 가 이미 한 번 오류를 냈으므로 hasErrored 는 true 다 —
  // 첫 오류 전 동작(타이핑 중 침묵)은 스토리 play 가 깨끗한 마운트에서 단언한다.
  inp.focus(); setV('김'); await w(180);
  const 오류난뒤_change=err();        // 이미 틀린 뒤이므로 change 에서도 본다
  setV('김철수'); await w(180);
  const 고친직후=err();               // blur 없이 즉시 풀린다
  inp.blur(); await w(200); setV(''); inp.blur(); await w(200);
  const blur후=err();
  return {오류난뒤_change, 고친직후, blur후};
})()`);
await shot('f-timing');
check('한 번 틀린 뒤에는 change 에서도 검증한다', timing.오류난뒤_change.length>0, `"${timing.오류난뒤_change}"`);
check('고치면 blur 를 기다리지 않고 즉시 풀린다', timing.고친직후==='', `"${timing.고친직후}"`);
check('blur 에서 오류가 뜬다', timing.blur후.length>0, `"${timing.blur후}"`);

console.log('\n── G. textarea 에서 Enter 는 줄바꿈 ──');
await go('components-form--enter-textarea');
const ta=await ev(`(async()=>{
  const w=ms=>new Promise(r=>setTimeout(r,ms));
  const t=${CANVAS}.querySelector('textarea'); t.focus();
  const setV=(v)=>{const s=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;s.call(t,v);t.dispatchEvent(new Event('input',{bubbles:true}))};
  setV('첫줄'); await w(80);
  return {포커스전:document.activeElement===t};
})()`);
await cdp('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
await cdp('Input.dispatchKeyEvent',{type:'char',text:'\n'});
await sleep(150);
const taAfter=await ev(`(()=>{const t=${CANVAS}.querySelector('textarea');return {값:JSON.stringify(t.value), 포커스유지:document.activeElement===t}})()`);
check('textarea 에서 Enter 후에도 포커스가 유지된다 (이동 안 함)', taAfter.포커스유지===true, `값 ${taAfter.값}`);

session.close();
const f=R.filter(x=>!x.pass);
console.log('\n'+'═'.repeat(64));
console.log(`검사 ${R.length}건 · 통과 ${R.length-f.length} · 실패 ${f.length}`);
if(f.length){console.log('\n실패:');for(const x of f)console.log(`  ✗ ${x.l} — ${x.d??''}`)}
writeFileSync(`${OUT}/results.json`,JSON.stringify(R,null,2));
process.exit(f.length?1:0);
