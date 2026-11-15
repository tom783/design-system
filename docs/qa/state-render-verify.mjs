// 상태·아바타·썸네일 렌더 검증 — CDP 직결.
//
//   pnpm qa                       (전체)
//   node docs/qa/state-render-verify.mjs ./shots   (단독, 서버가 떠 있을 때)
//
// 이 파일을 고칠 사람에게:
//  · 컴포넌트의 계약까지만 검사하라. "필터 초기화를 누르면 데이터가 돌아온다"는
//    앱의 몫이고 스토리 play 가 목으로 호출을 단언한다. 여기서는 버튼이
//    도달 가능하고 눌리는지만 본다 — 처음에 이걸 혼동해 거짓 실패를 냈다.
//  · 빈 404 페이지는 "오류 없음"으로 보인다. browser.mjs 의 storybook.open 이
//    캔버스가 비면 던지도록 해뒀다. 그 가드를 지우지 마라.
import { launchBrowser, storybook, CANVAS } from './browser.mjs';
const OUT = process.argv[2] || './shots';
const s = await launchBrowser({ port: 9613, windowSize: '1200,900', outDir: OUT });
const sb = storybook(s);
const { ev, shot } = s;
const R=[]; const check=(l,p,d)=>{R.push({l,p});console.log(`  ${p?'✓':'✗'} ${l}${d?` — ${d}`:''}`)};

console.log('── A. 12개 신규 스토리 렌더·play ──');
const IDS=['state--빈상태-기본','state--빈상태-액션','state--오류-재시도','state--표-빈상태','state--차트-높이일치','state--차트-재시도',
           'avatar--아바타-이니셜','avatar--아바타-이미지실패','avatar--크기와-장식',
           'thumbnail--썸네일-실패','thumbnail--썸네일-빈src','thumbnail--썸네일-성공'];
const fails=[];
for(const n of IDS){
  const r=await sb.open(`components-${n}`);
  const ok=!r.sbError&&r.errors.length===0;
  if(!ok) fails.push(n);
  console.log(`  ${ok?'✓':'✗'} ${n}${ok?'':` ← ${String(r.sbError??r.errors[0]).slice(0,110)}`}`);
}
check(`${IDS.length}개 예외 없음`, fails.length===0, fails.join(', ')||'전부 통과');

console.log('\n── B. 비어있음과 오류가 구별되는가 ──');
await sb.open('components-state--빈상태-기본');
const e1=await ev(`(()=>{const el=${CANVAS}.querySelector('[data-slot="empty-state"]');const c=getComputedStyle(el);
  return JSON.stringify({role:el.getAttribute('role'),배경:c.backgroundColor,색:c.color,높이:Math.round(el.getBoundingClientRect().height),
    그래픽:!!el.querySelector('[data-slot="state-graphic"] svg'), 버튼:el.querySelectorAll('button').length})})()`);
await shot('b-empty');
await sb.open('components-state--오류-재시도');
const e2=await ev(`(()=>{const el=${CANVAS}.querySelector('[data-slot="error-state"]');const c=getComputedStyle(el);
  return JSON.stringify({role:el.getAttribute('role'),배경:c.backgroundColor,색:c.color,높이:Math.round(el.getBoundingClientRect().height),
    그래픽:!!el.querySelector('[data-slot="state-graphic"] svg'), 버튼:el.querySelectorAll('button').length})})()`);
await shot('b-error');
const a=JSON.parse(e1), b=JSON.parse(e2);
console.log(`     비어있음 ${e1}\n     오류     ${e2}`);
check('비어있음은 role=status', a.role==='status');
check('오류는 role=alert', b.role==='alert');
check('오류에만 틴트 배경이 있다', a.배경!==b.배경, `${a.배경} vs ${b.배경}`);
check('둘 다 아이콘(graphic 슬롯 기본값)이 있다', a.그래픽&&b.그래픽);
check('최소 높이 192px 를 지킨다', a.높이>=192&&b.높이>=192, `${a.높이} / ${b.높이}`);
check('오류에 재시도 버튼이 있다', b.버튼>=1, `${b.버튼}개`);

console.log('\n── C. 표 빈 상태 — 액션이 동작하고 h-48 하드코딩이 없는가 ──');
await sb.open('components-state--표-빈상태');
const t=await ev(`(async()=>{
  const w=ms=>new Promise(r=>setTimeout(r,ms));
  const cell=${CANVAS}.querySelector('tbody td');
  const es=${CANVAS}.querySelector('[data-slot="empty-state"]');
  const before={높이:Math.round(cell.getBoundingClientRect().height), 행수:${CANVAS}.querySelectorAll('[data-slot="data-table-row"]').length};
  const btn=es?.querySelector('button');
  // 컴포넌트 계약은 "버튼을 그리고 onClick 을 부른다" 까지다. 데이터 복구는 앱의 몫이고
  // 스토리 play 가 목으로 호출 횟수를 단언한다. 여기서는 눌릴 수 있는지만 본다.
  btn?.focus();
  const 포커스됨 = document.activeElement===btn;
  let threw=false; try { btn?.click(); } catch { threw=true; }
  await w(300);
  return JSON.stringify({before, 액션라벨:btn?.textContent?.trim(), 포커스됨, threw,
    접근이름: btn?.getAttribute('aria-label') ?? btn?.textContent?.trim(),
    타입: btn?.getAttribute('type'),
    h48클래스:/\\bh-48\\b/.test(cell.className)})})()`);
await shot('c-table');
const tt=JSON.parse(t);
console.log(`     ${t}`);
check('빈 상태에 액션 버튼이 있다', !!tt.액션라벨, tt.액션라벨);
check('액션 버튼이 키보드로 도달 가능하다', tt.포커스됨===true);
check('눌러도 예외가 나지 않는다', tt.threw===false);
check('버튼 type=button (표 안에서 폼 제출 방지)', tt.타입==='button', `type=${tt.타입}`);
check('h-48 하드코딩이 없다', tt.h48클래스===false);
check('빈 상태 높이가 192px 이상', tt.before.높이>=192, `${tt.before.높이}px`);

console.log('\n── D. 아바타 ──');
await sb.open('components-avatar--아바타-이니셜');
const av=await ev(`(()=>{
  const fb=[...${CANVAS}.querySelectorAll('[data-slot="avatar-fallback"]')].map(e=>e.textContent);
  const first=${CANVAS}.querySelector('[data-slot="avatar"]');
  const c=getComputedStyle(first), f=getComputedStyle(first.querySelector('[data-slot="avatar-fallback"]')??first);
  return JSON.stringify({이니셜:fb, 배경:c.backgroundColor, 글자:f.color, 원형:c.borderRadius})})()`);
await shot('d-avatar');
const avv=JSON.parse(av);
console.log(`     ${av}`);
check('한글 3자 → 이름 두 글자', avv.이니셜[0]==='철수', avv.이니셜[0]);
check('한글 2자 → 그대로', avv.이니셜[1]==='김연', avv.이니셜[1]);
check('라틴 2단어 → 이니셜 두 자', avv.이니셜[2]==='JD', avv.이니셜[2]);
check('이모지가 깨지지 않는다 (서로게이트 페어)', avv.이니셜[4]==='😀', JSON.stringify(avv.이니셜[4]));
check('빈 이름은 빈 문자열', avv.이니셜[5]==='', JSON.stringify(avv.이니셜[5]));
check('색이 사람마다 바뀌지 않는다 (모두 같은 배경)', await ev(`new Set([...${CANVAS}.querySelectorAll('[data-slot="avatar"]')].map(e=>getComputedStyle(e).backgroundColor)).size`)===1);
check('원형이다', parseFloat(avv.원형)>=16||avv.원형.includes('%'), avv.원형);

console.log('\n── E. 썸네일 — 실패해도 레이아웃이 안 밀리는가 ──');
await sb.open('components-thumbnail--썸네일-실패');
const th=await ev(`(()=>{
  const t=${CANVAS}.querySelector('[data-slot="thumbnail"]');
  const sib=t?.nextElementSibling;
  const r=t.getBoundingClientRect();
  return JSON.stringify({크기:[Math.round(r.width),Math.round(r.height)],
    비율유지: Math.abs(r.width-r.height)<=1,
    폴백아이콘:!!t.querySelector('svg'), img태그:!!t.querySelector('img'),
    role:t.querySelector('[role="img"]')?.getAttribute('aria-label') ?? t.getAttribute('aria-label'),
    형제top: sib?Math.round(sib.getBoundingClientRect().top):null})})()`);
await shot('e-thumb');
const thh=JSON.parse(th);
console.log(`     ${th}`);
check('실패해도 자리를 지킨다 (크기 > 0)', thh.크기[0]>0&&thh.크기[1]>0, thh.크기.join('×'));
check('aspect-ratio 1/1 이 유지된다', thh.비율유지===true);
check('깨진 img 대신 아이콘 폴백', thh.폴백아이콘===true&&thh.img태그===false);
check('폴백에도 접근 가능한 이름이 있다', !!thh.role, thh.role);

console.log('\n── F. 다크 테마 ──');
for(const [id,sel,label] of [['components-state--오류-재시도','[data-slot="error-state"]','오류'],
                             ['components-avatar--아바타-이니셜','[data-slot="avatar"]','아바타']]){
  await sb.open(id,{extra:'&globals=theme:dark'});
  const d=await ev(`(()=>{const e=${CANVAS}.querySelector('${sel}');const c=getComputedStyle(e);
    return JSON.stringify({배경:c.backgroundColor,색:c.color})})()`);
  await shot(`f-dark-${label}`);
  check(`dark ${label}: var() 잔존 없음`, !d.includes('var('), d);
}

s.close();
const f=R.filter(x=>!x.p);
console.log('\n'+'═'.repeat(62));
console.log(`검사 ${R.length}건 · 통과 ${R.length-f.length} · 실패 ${f.length}`);
if(f.length){console.log('\n실패:');for(const x of f)console.log(`  ✗ ${x.l}`)}
process.exit(f.length?1:0);
