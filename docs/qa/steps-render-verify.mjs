// R43 작성 전용. 실제 실행은 pnpm qa. 브라우저는 공통 headless-shell만 사용한다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, actions } from './browser.mjs';
const OUT = process.argv[2] || '.qa-shots/steps';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ outDir: OUT });
const { cdp, ev, sleep } = browser;
const { open } = storybook(browser);
const results = [], measurements = [], errors = [];
const root = '[data-slot="steps"]', item = '[data-slot="steps-item"]';
const q = selector => `document.querySelector(${JSON.stringify(selector)})`;
const all = selector => `[...document.querySelectorAll(${JSON.stringify(selector)})]`;
async function wait(expression) {
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) { if (await ev(expression)) return; await sleep(30); }
  throw new Error(`조건 대기 실패: ${expression}`);
}
async function story(name) {
  errors.push(...browser.errors());
  const state = await open(`components-steps--${name}`, { waitPlay: false });
  assert.equal(state.sbError, null); assert.deepEqual(state.errors, []);
  await wait(`!!${q(root)}`); await ev('document.fonts.ready');
}
async function check(label, run) {
  try { await run(); results.push({ label, pass: true }); console.log(`✓ ${label}`); }
  catch (error) { results.push({ label, pass: false, error: error.message }); console.error(`✗ ${label}: ${error.message}`); await browser.shot(`failure-${results.length}`); }
}
const act = actions(browser);
const key = (name) => act.key(name);
async function indexIs(index) {
  await wait(`${q(`${item}[aria-current="step"]`)}?.getAttribute('aria-label').startsWith('${index + 1}단계 ')`);
  assert.equal(await ev(`${all(`${item}[aria-current="step"]`)}.length`), 1);
}
async function fill(values) {
  for (let index = 0; index < values.length; index++) {
    await ev(`${all('form input')}[${index}].focus()`);
    await cdp('Input.insertText', { text: values[index] });
  }
}
try {
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await check('ol·현재 단계 하나·모든 단계의 번호/이름/상태·선택 설명', async () => {
    await story('기본'); await indexIs(1);
    assert.equal(await ev(`${q('[data-slot="steps-list"]')}.tagName`), 'OL');
    const entries = await ev(`${all(item)}.map(n=>({name:n.getAttribute('aria-label'),status:n.dataset.status,text:n.querySelector('[data-slot="steps-status"]').textContent}))`);
    assert.deepEqual(entries.map(n=>n.status), ['complete','current','upcoming','upcoming']);
    assert.deepEqual(entries.map(n=>n.text), ['완료','진행 중','예정','예정']);
    for (const [i,n] of entries.entries()) { assert.ok(n.name.startsWith(`${i+1}단계 `)); assert.ok(n.name.endsWith(n.text)); }
    const tree = (await cdp('Accessibility.getFullAXTree')).nodes;
    for (const entry of entries) assert.ok(tree.some(n=>n.role?.value==='listitem' && n.name?.value===entry.name));
    assert.equal(await ev(`${q('[data-slot="steps-description"]')}.textContent`), '상품명과 분류');
    assert.equal(await ev(`${all(`${root} button`)}.length`), 0);
  });
  await check('첫·중간·마지막 단계 자동 계산', async () => {
    for (const [name,index] of [['첫단계',0],['중간단계',2],['마지막단계',3]]) {
      await story(name); await indexIs(index);
      assert.equal(await ev(`${all(`${item}[data-status="complete"]`)}.length`), index);
      assert.equal(await ev(`${all(`${item}[data-status="upcoming"]`)}.length`), 3-index);
    }
  });
  await check('1000px·4단계 연결선: 글 끝/다음 표식과 8px·표식 중앙·완료 색', async () => {
    for (const name of ['기본', '중간단계', '완료단계클릭']) {
      await story(name); await ev(`${q(root)}.style.width='1000px'`);
      // ::after는 마지막 flex 항목이다. 계산된 선 폭과 칸의 오른쪽 끝으로 실제 선 상자를 복원한다.
      const lines = await ev(`${all(item)}.slice(0,-1).map(n=>{
        const line=getComputedStyle(n,'::after'),r=n.getBoundingClientRect(),width=parseFloat(line.width),
          right=r.right-parseFloat(line.marginRight),top=r.top+parseFloat(line.marginTop),
          marker=n.querySelector('[data-slot="steps-marker"]').getBoundingClientRect(),
          next=n.nextElementSibling.querySelector('[data-slot="steps-marker"]').getBoundingClientRect(),
          text=[...n.querySelectorAll('[data-slot="steps-label"],[data-slot="steps-description"]')];
        return {status:n.dataset.status,leftGap:right-width-Math.max(...text.map(t=>t.getBoundingClientRect().right)),
          rightGap:next.left-right,centerDelta:top+parseFloat(line.borderTopWidth)/2-(marker.top+marker.bottom)/2,width,
          color:line.borderTopColor,statusColor:getComputedStyle(n.querySelector('[data-slot="steps-status"]')).color,
          content:line.content,display:line.display};
      })`);
      assert.equal(lines.length, 3);
      assert.equal(await ev(`getComputedStyle(${all(item)}.at(-1),'::after').content`), 'none');
      for (const line of lines) {
        assert.ok(Math.abs(line.leftGap-8)<=1, JSON.stringify(line));
        assert.ok(Math.abs(line.rightGap-8)<=1, JSON.stringify(line));
        assert.ok(Math.abs(line.centerDelta)<=1, JSON.stringify(line));
        assert.ok(line.width>=16, JSON.stringify(line));
        assert.equal(line.content, '""'); assert.notEqual(line.display, 'none');
        if (line.status==='complete') assert.equal(line.color, line.statusColor);
      }
      assert.notEqual(lines.find(n=>n.status==='complete').color, lines.find(n=>n.status!=='complete').color);
      measurements.push({ story:name, width:1000, lines });
    }
    await browser.shot('connectors-1000');
  });
  await check('완료/오류는 다른 아이콘과 상태 글자·오류가 현재 위치를 지우지 않음', async () => {
    await story('오류단계'); await indexIs(1);
    assert.equal(await ev(`${q(`${item}[aria-current="step"]`)}.dataset.status`), 'error');
    for (const [status,icon,text] of [['complete','.lucide-check','완료'],['error','.lucide-triangle-alert','오류']]) {
      assert.equal(await ev(`${all(`${item}[data-status="${status}"]`)}.every(n=>!!n.querySelector('${icon}[aria-hidden="true"]')&&n.querySelector('[data-slot="steps-status"]').textContent==='${text}')`), true);
    }
    assert.equal(await ev(`${all(`${item}[data-status="error"] button`)}.length`), 0);
    assert.equal(await ev(`${all(`${root} button`)}.length`), 1);
  });
  await check('완료 단계만 버튼·실제 Tab/Enter/Space·현재/예정 클릭으로 건너뛰기 불가', async () => {
    await story('완료단계클릭'); await indexIs(2);
    const buttons = `${root} [data-slot="steps-button"]`;
    assert.equal(await ev(`${all(buttons)}.length`), 2);
    assert.equal(await ev(`${all(`${root} button`)}.every(n=>n.type==='button'&&n.closest('li').dataset.status==='complete')`), true);
    await ev(`${all(`${item}:not([data-status="complete"]) [data-slot="steps-static"]`)}.forEach(n=>n.click())`);
    await indexIs(2); assert.equal(await ev('document.querySelector("output").textContent'), '현재 인덱스: 2');
    await ev(`${q('[data-probe="before"]')}.focus()`); await key('Tab');
    assert.equal(await ev(`document.activeElement===${all(buttons)}[0]`), true);
    assert.equal(await ev('getComputedStyle(document.activeElement).outlineStyle'), 'solid');
    await key('Tab'); assert.equal(await ev(`document.activeElement===${all(buttons)}[1]`), true);
    await key('Enter'); await indexIs(1);
    await ev(`${q('[data-probe="reset"]')}.click()`); await indexIs(2);
    await ev(`${all(buttons)}[0].focus()`); await key(' '); await indexIs(0);
    assert.equal(await ev(`${all(buttons)}.length`), 0);
  });
  await check('640px 가로 목록·639px 이하 요약·120~640px 가로 넘침 0·다시 펼침', async () => {
    await story('좁은폭');
    for (const width of [640,639,480,320,240,120,640]) {
      await ev(`${q(root)}.parentElement.style.width='${width}px'`);
      // 요약 글자는 flex 항목이라 계산 display 가 inline 이 아니라 block 으로 바뀐다 — 보임/숨김으로 판정한다.
      await wait(`(getComputedStyle(${q('[data-slot="steps-count"]')}).display!=='none')===${width<640}`);
      const m = await ev(`(() => {const n=${q(root)},p=n.parentElement;return {width:${width},root:[n.clientWidth,n.scrollWidth],parent:[p.clientWidth,p.scrollWidth],page:[document.documentElement.clientWidth,document.documentElement.scrollWidth],visible:[...n.querySelectorAll('li')].filter(n=>getComputedStyle(n).display!=='none').length,summary:n.querySelector('[aria-current] [data-slot="steps-count"]').textContent};})()`);
      assert.equal(m.visible, width<640?1:4); assert.equal(m.summary, '2 / 4 · ');
      if (width<640) assert.equal(await ev(`${all(item)}.every(n=>getComputedStyle(n,'::after').display==='none')`), true);
      for (const [w,s] of [m.root,m.parent,m.page]) assert.ok(s<=w, JSON.stringify(m));
      measurements.push(m);
    }
    // 좁은 모드에서 숨긴 완료 버튼이 접근성·Tab 경로에 남지 않는지 확인한다.
    await story('완료단계클릭'); await ev(`${q(root)}.style.width='320px'`);
    await wait(`${all(`${root} button`)}.every(n=>n.getClientRects().length===0)`);
    await ev(`${q('[data-probe="before"]')}.focus()`); await key('Tab');
    assert.equal(await ev(`document.activeElement===${q('[data-probe="reset"]')}`), true);
    await browser.shot('narrow');
  });
  await check('긴 라벨·설명 한 줄 축약과 title·DOM·전체 접근명 보존', async () => {
    await story('긴라벨');
    for (const width of [640,1000]) {
      await ev(`${q(root)}.style.width='${width}px'`);
      const rows = await ev(`${all(item)}.map(n=>{const l=n.querySelector('[data-slot="steps-label"]'),d=n.querySelector('[data-slot="steps-description"]'),line=getComputedStyle(n,'::after');return {name:n.getAttribute('aria-label'),label:l.textContent,title:l.title,width:l.clientWidth,natural:l.scrollWidth,ellipsis:getComputedStyle(l).textOverflow,description:d.textContent,descriptionTitle:d.title,lineWidth:line.content==='none'?null:parseFloat(line.width)};})`);
      for (const row of rows) {
        assert.ok(row.natural>row.width); assert.equal(row.ellipsis,'ellipsis');
        assert.equal(row.title,row.label); assert.ok(row.name.includes(row.label)); assert.equal(row.descriptionTitle,row.description);
        if (row.lineWidth!==null) assert.ok(row.lineWidth>=16, JSON.stringify(row));
      }
      measurements.push({ story:'긴라벨', width, rows });
    }
  });
  await check('상품 등록: 오류 첫 입력 포커스·앞뒤 이동 후 제목 포커스·초안 보존·중첩 폼 없음', async () => {
    await story('상품등록'); await indexIs(0);
    assert.equal(await ev('document.querySelectorAll("form").length'),1);
    await ev('document.querySelector("button[type=submit]").click()');
    await wait('document.activeElement===document.querySelector("form input[aria-invalid=true]")');
    await indexIs(0);
    await fill(['유기농 쌀','식품']);
    await ev('document.querySelector("button[type=submit]").click()'); await indexIs(1);
    await wait(`document.activeElement===document.querySelector('h2[tabindex="-1"]')`);
    await ev('[...document.querySelectorAll("form button")].find(n=>n.textContent==="이전").click()'); await indexIs(0);
    await wait('document.activeElement===document.querySelector("h2")');
    assert.deepEqual(await ev('[...document.querySelectorAll("form input")].map(n=>n.value)'), ['유기농 쌀','식품']);
    await ev('document.querySelector("button[type=submit]").click()'); await indexIs(1);
    await fill(['32000','100']); await ev('document.querySelector("button[type=submit]").click()'); await indexIs(2);
    await wait('document.activeElement===document.querySelector("h2")');
    await ev(`${all(`${root} button`)}[1].click()`); await indexIs(1);
    await wait('document.activeElement===document.querySelector("h2")');
    assert.deepEqual(await ev('[...document.querySelectorAll("form input")].map(n=>n.value)'), ['32000','100']);
    await ev('document.querySelector("button[type=submit]").click()'); await indexIs(2);
    await fill(['서울 물류센터']); await ev('document.querySelector("button[type=submit]").click()');
    await wait('document.querySelector("form [role=status]").textContent.includes("완료")');
    assert.equal(await ev('document.querySelectorAll("form form").length'),0);
  });
  await check('다크에서 완료·오류·현재·예정 글자/아이콘과 그림자 없는 의미 토큰', async () => {
    await story('다크');
    await wait('document.documentElement.dataset.theme==="dark"');
    assert.deepEqual(await ev(`${all(item)}.map(n=>n.dataset.status)`), ['complete','error','current','upcoming']);
    const colors = await ev(`${all(item)}.map(n=>{const m=getComputedStyle(n.querySelector('[data-slot="steps-marker"]'));return {state:n.dataset.status,color:m.color,background:m.backgroundColor,shadow:m.boxShadow,text:n.querySelector('[data-slot="steps-status"]').textContent};})`);
    assert.notEqual(colors[0].color,colors[1].color);
    for (const row of colors) { assert.ok(row.text); assert.equal(row.shadow,'none'); }
    measurements.push({ dark: colors }); await browser.shot('dark');
  });
  await check('모든 Steps 스토리의 콘솔 오류 0', async () => {
    for (const name of ['사용법','첫단계','중간단계','마지막단계','오류단계','완료단계클릭','긴라벨','좁은폭','다크','상품등록']) await story(name);
    errors.push(...browser.errors()); assert.deepEqual(errors, []);
  });
} finally {
  browser.close();
  writeFileSync(`${OUT}/results.json`,JSON.stringify({ results,measurements,errors },null,2));
}
const failed = results.filter(r=>!r.pass);
console.log(`검사 ${results.length}건 · 통과 ${results.length-failed.length} · 실패 ${failed.length}`);
process.exitCode = failed.length?1:0;
