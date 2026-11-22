// R33: 브라우저 실행은 사용자가 한다. 기존 단정은 바꾸지 않고 V1–V3를 별도로 검증한다.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, storybook } from './browser.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const OUT = resolve(process.argv[2] || '.qa-shots/input-consistency');
mkdirSync(OUT, { recursive: true });
// 실제 공개 CSS 두 경로를 검사한다. source(none)으로 유틸리티의 내부 사용처 의존도 제거한다.
execFileSync('pnpm', ['--filter', '@s2life/ui', 'build'], { cwd: root, stdio: 'inherit' });
writeFileSync(`${OUT}/tailwind-input.css`, `@import "${root}/node_modules/tailwindcss/index.css" source(none);
@import "${root}/packages/ui/dist/tailwind.css";\n`);
execFileSync('pnpm', ['exec', 'tailwindcss', '-i', `${OUT}/tailwind-input.css`, '-o', `${OUT}/tailwind-output.css`], { cwd: root, stdio: 'inherit' });
const results = [];
const browser = await launchBrowser({ windowSize: '1200,900', outDir: OUT });
const { ev, cdp, sleep } = browser;
const { open } = storybook(browser);
const q = selector => `document.querySelector(${JSON.stringify(selector)})`;
async function wait(expression) {
  for (let i = 0; i < 100; i++) { if (await ev(expression)) return; await sleep(40); }
  throw new Error(`조건 대기 실패: ${expression}`);
}
async function load(id, theme = 'light') {
  const result = await open(id, { waitPlay: false, extra: `&globals=theme:${theme}` });
  assert.equal(result.sbError, null); assert.deepEqual(result.errors, []);
  await wait(`document.documentElement.dataset.theme === '${theme}'`);
  await ev(`document.fonts.load('14px "Pretendard Variable"', '사업장 선택 게시글')`);
  await ev('document.fonts.ready');
}
async function check(label, run) {
  try {
    const measurements = await run();
    results.push({ label, pass: true, measurements }); console.log(`✓ ${label}`);
  } catch (error) {
    results.push({ label, pass: false, error: error.message }); console.error(`✗ ${label}: ${error.message}`);
    await browser.shot(`failure-${results.length}`);
  }
}
const colorHelpers = `
 const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently:true });
 const rgb = color => { ctx.clearRect(0,0,1,1); ctx.fillStyle=color; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data]; };
 const lum = a => a.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 const contrast = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
`;
try {
  for (const theme of ['light', 'dark']) {
    await check(`검색 아이콘: 바탕 위 페인트·16px·글자 간격·Field 배선 ${theme}`, async () => {
      await load('components-input--검색기본아이콘', theme);
      const m = await ev(`(() => { ${colorHelpers}
        const input=${q('#article-search')}, icon=input.parentElement.querySelector('[data-slot="input-leading-icon"]');
        const s=getComputedStyle(input), i=getComputedStyle(icon), r=icon.getBoundingClientRect(), b=input.getBoundingClientRect();
        const x=r.x+r.width/2, y=r.y+r.height/2;
        // pointer-events만 잠시 켜서 hit-test로 페인트 순서를 확인한다. 쌓임 순서는 바꾸지 않는다.
        const before=icon.style.pointerEvents; icon.style.pointerEvents='auto';
        const paintedAbove=icon.contains(document.elementFromPoint(x,y)); icon.style.pointerEvents=before;
        return { id:input.id, describedBy:input.getAttribute('aria-describedby'),
          descriptions:input.getAttribute('aria-describedby')?.split(/\\s+/).map(id=>!!document.getElementById(id)),
          wrapperId:input.parentElement.id, wrapperDescription:input.parentElement.getAttribute('aria-describedby'),
          ariaHidden:icon.getAttribute('aria-hidden'), search:!!icon.querySelector('.lucide-search'),
          follows:!!(input.compareDocumentPosition(icon)&Node.DOCUMENT_POSITION_FOLLOWING), sameParent:input.parentElement===icon.parentElement,
          inputPosition:s.position, inputZ:s.zIndex, inputTransform:s.transform, iconPosition:i.position, iconZ:i.zIndex,
          paintedAbove, pointer:i.pointerEvents, width:r.width, height:r.height, display:i.display, visibility:i.visibility, opacity:i.opacity,
          color:rgb(i.color), tokenColor:rgb(i.getPropertyValue('--text-tertiary')),
          gap:b.left+parseFloat(s.borderLeftWidth)+parseFloat(s.paddingLeft)-r.right, x,y };
      })()`);
      assert.equal(m.id, 'article-search'); assert.ok(m.describedBy); assert.ok(m.descriptions.every(Boolean));
      assert.equal(m.wrapperId, ''); assert.equal(m.wrapperDescription, null);
      assert.equal(m.ariaHidden, 'true'); assert.ok(m.search && m.follows && m.sameParent && m.paintedAbove);
      assert.equal(m.inputPosition, 'static'); assert.equal(m.inputZ, 'auto'); assert.equal(m.inputTransform, 'none');
      assert.equal(m.iconPosition, 'absolute'); assert.equal(m.iconZ, 'auto'); assert.equal(m.pointer, 'none');
      assert.equal(m.width,16); assert.equal(m.height,16); assert.equal(m.visibility,'visible'); assert.equal(m.opacity,'1');
      assert.deepEqual(m.color,m.tokenColor);
      assert.ok(m.gap>=8,JSON.stringify(m));
      // 아이콘 중심의 실제 포인터 통과가 검증 대상이므로 이 클릭만 좌표를 사용한다.
      await cdp('Input.dispatchMouseEvent', { type:'mousePressed', x:m.x, y:m.y, button:'left', clickCount:1 });
      await cdp('Input.dispatchMouseEvent', { type:'mouseReleased', x:m.x, y:m.y, button:'left', clickCount:1 });
      assert.equal(await ev('document.activeElement.id'), 'article-search');
      await browser.shot(`search-${theme}`); return m;
    });
    await check(`사용자 아이콘·null·지우기·비밀번호 보기 공존 ${theme}`, async () => {
      await load('components-input--아이콘과지우기',theme);
      const m=await ev(`(() => {
        const controls=[...document.querySelectorAll('[data-slot="input-control"]')];
        return controls.map(c=>({icon:!!c.querySelector('[data-slot="input-leading-icon"]'), mail:!!c.querySelector('.lucide-mail'),
          clear:!!c.querySelector('[aria-label="검색어 지우기"]'), reveal:!!c.querySelector('[aria-label="비밀번호 표시"]')}));
      })()`);
      assert.deepEqual(m,[{icon:true,mail:true,clear:true,reveal:false},{icon:false,mail:false,clear:true,reveal:false},{icon:true,mail:false,clear:false,reveal:true}]);
      await ev(`${q('[aria-label="검색어 지우기"]')}.click()`);
      await wait(`${q('[data-slot="input"]')}.value === '' && document.activeElement === ${q('[data-slot="input"]')}`);
      await ev(`${q('[aria-label="비밀번호 표시"]')}.click()`);
      await wait(`${q('[aria-label="비밀번호 숨기기"]')} !== null`);
      assert.equal(await ev(`document.querySelectorAll('[data-slot="input"]')[2].type`),'text'); return m;
    });
    await check(`일반 타입 앞쪽 아이콘·비활성 검색 ${theme}`, async () => {
      await load('components-input--앞쪽아이콘',theme);
      assert.ok(await ev(`!!${q('[data-slot="input-leading-icon"] .lucide-mail')}`));
      assert.equal(await ev(`${q('input')}.type`),'email');
      await load('components-input--아이콘비활성',theme);
      assert.ok(await ev(`${q('input')}.disabled`));
      assert.ok(await ev(`!!${q('[data-slot="input-leading-icon"]')}`));
      assert.equal(await ev(`${q('[aria-label="검색어 지우기"]')}`),null);
    });
    await check(`검색 Input 폭 클래스는 래퍼에 붙어 툴바가 한 줄 ${theme}`, async () => {
      // 2026-11-22 화면 시안: className="w-80" 이 안쪽 input 에만 붙어 래퍼(width:100%)가 줄을 차지했다.
      await load('components-input--검색툴바폭', theme);
      const m = await ev(`(() => { const bar=${q('[data-probe="search-toolbar"]')}, control=bar.querySelector('[data-slot="input-control"]'), input=control.querySelector('input');
        const items=[...bar.children].map(el=>el.getBoundingClientRect());
        return { wrapperClass:control.className, inputClass:input.className, wrapperWidth:control.getBoundingClientRect().width, inputWidth:input.getBoundingClientRect().width,
          tops:items.map(r=>Math.round(r.top)), numeric:getComputedStyle(input).fontVariantNumeric, items:items.length }; })()`);
      assert.match(m.wrapperClass, /(^|\s)w-80(\s|$)/); assert.doesNotMatch(m.inputClass, /(^|\s)w-80(\s|$)/);
      // 폭이 아닌 입력칸 자체의 클래스(tabular)는 안쪽 input 에 남는다.
      assert.match(m.inputClass, /(^|\s)tabular(\s|$)/); assert.match(m.numeric, /tabular-nums/);
      assert.equal(m.wrapperWidth, 320); assert.equal(m.inputWidth, 320); assert.equal(m.items, 3);
      assert.equal(new Set(m.tops).size, 1, JSON.stringify(m)); return m;
    });
    await check(`CardBody 단독과 헤더 제목의 시작선 ±1px ${theme}`, async () => {
      await load('components-card--본문만',theme);
      const m=await ev(`['body-only','with-header'].map(probe=>{
        const c=document.querySelector('[data-probe="'+probe+'"]');
        return { gap:c.querySelector('[data-slot="card-title"]').getBoundingClientRect().top-c.getBoundingClientRect().top,
          padding:getComputedStyle(c.querySelector('[data-slot="card-body"]')).paddingTop };
      })`);
      assert.ok(Math.abs(m[0].gap-m[1].gap)<=1,JSON.stringify(m));
      assert.equal(m[0].padding,'16px'); assert.equal(m[1].padding,'0px'); return m;
    });
    await check(`선택 트리거 4종: 표면·경계·38px·꺾쇠·빈 글자 시작 ${theme}`, async () => {
      await load(`qa-inputconsistency--${theme==='light'?'라이트':'다크'}`,theme);
      const m=await ev(`(() => { ${colorHelpers}
        return ['select-trigger','combobox-trigger','combobox-multiple-control','multi-select-trigger'].map(slot=>{
          const el=document.querySelector('[data-slot="'+slot+'"]'), s=getComputedStyle(el), r=el.getBoundingClientRect();
          const icon=el.querySelector('.ds-select-chevron'), i=getComputedStyle(icon), ir=icon.getBoundingClientRect();
          const input=el.querySelector('input'); let start;
          if(input){const t=getComputedStyle(input);start=input.getBoundingClientRect().left+parseFloat(t.borderLeftWidth)+parseFloat(t.paddingLeft);}
          else {const span=el.querySelector('span'), range=document.createRange(); range.selectNodeContents(span);start=range.getBoundingClientRect().left;}
          return { slot, background:s.backgroundColor, surface:rgb(s.getPropertyValue('--bg-surface')), border:s.borderLeftColor,
            borderToken:rgb(s.getPropertyValue('--border-input')), borderRgb:rgb(s.borderLeftColor), borderWidth:s.borderLeftWidth, borderStyle:s.borderLeftStyle,
            height:r.height, color:i.color, tertiary:rgb(s.getPropertyValue('--text-tertiary')), opacity:i.opacity,
            width:ir.width, iconHeight:ir.height, right:r.right-ir.right, start:start-r.left,
            contrast:contrast(rgb(i.color),rgb(s.backgroundColor)), backgroundRgb:rgb(s.backgroundColor), colorRgb:rgb(i.color),
            chevron:icon.classList.contains('lucide-chevron-down') };
        }); })()`);
      assert.equal(m.length,4);
      for(const item of m){
        assert.deepEqual(item.backgroundRgb,item.surface); assert.deepEqual(item.colorRgb,item.tertiary);
        assert.deepEqual(item.borderRgb,item.borderToken);
        assert.equal(item.height,38); assert.equal(item.borderWidth,'1px'); assert.equal(item.borderStyle,'solid');
        assert.equal(item.opacity,'1'); assert.equal(item.width,16); assert.equal(item.iconHeight,16); assert.ok(item.chevron);
        assert.ok(Math.abs(item.right-13)<=.5,JSON.stringify(item)); assert.ok(Math.abs(item.start-13)<=.5,JSON.stringify(item));
        assert.ok(item.contrast>=3,JSON.stringify(item));
        for(const key of ['background','border','height','color','opacity','width','iconHeight','right','start'])
          assert.equal(item[key],m[0][key],key+' '+item.slot);
      }
      // 채워진 다중 모드에서도 꺾쇠의 끝 여백은 유지한다.
      await ev(`${q('[data-slot="combobox-multiple-control"] input')}.click()`);
      await wait(`${q('[data-slot="combobox-option"]')} !== null`);
      await ev(`${q('[data-slot="combobox-option"]')}.click()`);
      await wait(`${q('[data-slot="combobox-chip"]')} !== null`);
      assert.equal(await ev(`(() => {const c=${q('[data-slot="combobox-multiple-control"]')}; return c.getBoundingClientRect().right-c.querySelector('.ds-select-chevron').getBoundingClientRect().right;})()`),13);
      await browser.shot(`triggers-${theme}`); return m;
    });
  }
  for(const [name,path] of [['기본',`${root}/packages/ui/dist/styles.css`],['Tailwind',`${OUT}/tailwind-output.css`]]) {
    await check(`공개 유틸리티 ${name}: sr-only·tabular 계산 스타일`,async()=>{
      await cdp('Page.navigate',{url:'about:blank'});
      await wait(`document.readyState === 'complete' && !!document.body`);
      await ev(`(() => {const style=document.createElement('style');style.textContent=${JSON.stringify(readFileSync(path,'utf8'))};document.head.append(style);
        document.body.innerHTML='<p>주문 금액 <span class="sr-only">한국 원</span><span class="tabular">1,234</span></p>';})()`);
      const m=await ev(`(() => {const h=document.querySelector('.sr-only'),s=getComputedStyle(h),n=getComputedStyle(document.querySelector('.tabular'));
        return {position:s.position,width:s.width,height:s.height,overflow:s.overflow,whiteSpace:s.whiteSpace,clip:s.clip,clipPath:s.clipPath,
          display:s.display,visibility:s.visibility,ariaHidden:h.getAttribute('aria-hidden'),text:h.textContent,numeric:n.fontVariantNumeric};})()`);
      assert.equal(m.position,'absolute'); assert.equal(m.width,'1px'); assert.equal(m.height,'1px'); assert.equal(m.overflow,'hidden');
      assert.equal(m.whiteSpace,'nowrap'); assert.ok(m.clip==='rect(0px, 0px, 0px, 0px)'||m.clipPath==='inset(50%)');
      assert.notEqual(m.display,'none'); assert.equal(m.visibility,'visible'); assert.equal(m.ariaHidden,null); assert.equal(m.text,'한국 원');
      assert.equal(m.numeric,'tabular-nums'); return m;
    });
  }
  await check('콘솔 오류·페이지 예외 0건',()=>assert.deepEqual(browser.errors().filter(m=>!/Warning:|DevTools|favicon|preload/i.test(m)),[]));
} finally {
  browser.close(); writeFileSync(`${OUT}/results.json`,JSON.stringify(results,null,2));
}
const passed=results.filter(r=>r.pass).length;
console.log(`검사 ${results.length}건 · 통과 ${passed} · 실패 ${results.length-passed}`);
process.exitCode=passed===results.length?0:1;
