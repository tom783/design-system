// R40: 작성 전용 하네스. 실행은 pnpm qa에서 수행한다. 레이어는 실제 포인터로 연다.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser, storybook, CANVAS } from './browser.mjs';

const OUT = process.argv[2] || '.qa-shots/date-time';
mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser({ port: 9486, outDir: OUT });
const { cdp, ev, sleep } = browser;
const { open } = storybook(browser);
const results = [], measurements = [], seenErrors = [];
const input = '[data-slot="date-picker"] input';
const trigger = '[data-slot="date-picker"] button[aria-label="달력 열기"]';
const output = '[data-probe="date-time-value"]';
const clock = '[data-slot="date-picker-time"]';
const hour = `${clock} button[aria-label="시"]`, minute = `${clock} button[aria-label="분"]`;
const q = selector => `document.querySelector(${JSON.stringify(selector)})`;
async function wait(expression) {
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) { if (await ev(expression)) return; await sleep(30); }
  throw new Error(`조건 대기 실패: ${expression}`);
}
async function check(label, run) {
  try { await run(); results.push({ label, pass: true }); console.log(`✓ ${label}`); }
  catch (error) {
    results.push({ label, pass: false, error: error.message }); console.error(`✗ ${label}: ${error.message}`);
    await browser.shot(`failure-${results.length}`);
  }
}
async function story(name) {
  seenErrors.push(...browser.errors());
  const result = await open(`components-datepicker--${name}`);
  assert.equal(result.sbError, null); assert.deepEqual(result.errors, []);
  await wait(`${CANVAS}.dataset.playComplete === 'true' && !!${q(input)}`);
  await ev('document.fonts.ready');
}
async function key(name, code) {
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name, windowsVirtualKeyCode: code, ...(name === 'Enter' ? { text: '\r' } : {}) });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode: code });
}
async function pointer(selector) {
  // 내부 버튼 조작은 .click() 또는 키보드로 한다. 실제 포인터는 레이어를 여는 트리거에만 사용한다.
  await ev(`${q(selector)}.scrollIntoView({ block:'nearest' })`);
  const point = await ev(`(() => { const r=${q(selector)}.getBoundingClientRect(); return { x:r.x+r.width/2, y:r.y+r.height/2 }; })()`);
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
}
async function calendar() { await pointer(trigger); await wait(`!!${q(clock)} && ${q('[data-slot="popover-content"]')}.contains(document.activeElement)`); }
async function enter(text, blur = false) {
  await ev(`${q(input)}.focus(); ${q(input)}.select()`);
  // 완성 문자열 삽입은 붙여넣기와 같은 input 경로를 거치며 React 초안을 갱신한다.
  await cdp('Input.insertText', { text });
  if (blur) await key('Tab', 9); else await key('Enter', 13);
}
async function valueIs(text) {
  await wait(`${q(input)}.value === ${JSON.stringify(text)} && ${q(output)}.textContent === ${JSON.stringify(text)}`);
}
async function highlighted(text) { await wait(`${q('[role="option"][data-highlighted]')}?.textContent === ${JSON.stringify(text)}`); }
async function focusIs(selector) { await wait(`document.activeElement === ${q(selector)}`); }
async function preset(label) {
  await ev(`[...${q('[data-slot="date-picker-presets"]')}.querySelectorAll('button')].find(n => n.textContent === ${JSON.stringify(label)}).click()`);
}
async function day(date) { await ev(`${q(`button[data-slot="calendar-day"][data-day="${date}"]`)}.click()`); }
async function dateColors() {
  return ev(`(() => {
    const calendar=${q('[data-slot="calendar"]')};
    const token = name => {
      const probe=document.createElement('span'); probe.style.color='var('+name+')'; calendar.append(probe);
      const color=getComputedStyle(probe).color; probe.remove(); return color;
    };
    // 기간 스토리의 선택 범위(11/10–15)·오늘(11/15)과 겹치지 않는 일반 날짜다.
    const days=['2026-11-01','2026-11-02','2026-12-05'].map(date => {
      const n=calendar.querySelector('button[data-day="'+date+'"]');
      return { date, color:getComputedStyle(n).color, outside:n.closest('td').dataset.outside === 'true' };
    });
    return { primary:token('--text-primary'), tertiary:token('--text-tertiary'),
      background:getComputedStyle(${q('[data-slot="popover-content"]')}).backgroundColor, days };
  })()`);
}
function contrast(foreground, background) {
  const luminance = color => {
    assert.match(color, /^rgb\(/, '불투명 sRGB 색으로 대비를 잰다');
    const linear = color.match(/[\d.]+/g).map(Number).map(value => {
      const channel=value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const a=luminance(foreground), b=luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

try {
  await check('세 모드·라이트/다크에서 이번 달은 primary·이웃 달은 tertiary이며 서로 다르고 대비 4.5 이상', async () => {
    for (const name of ['단일날짜', '기간선택', '단일시각']) {
      await story(name); await pointer(trigger); await wait(`!!${q('[data-slot="calendar"]')}`);
      for (const theme of ['light', 'dark']) {
        await ev(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
        // 날짜 버튼의 색 전환이 끝난 실제 computed 값을 검사한다.
        const deadline=Date.now() + 6000;
        let colors;
        do {
          colors=await dateColors();
          if (colors.days.every(day => day.color === (day.outside ? colors.tertiary : colors.primary))) break;
          await sleep(30);
        } while (Date.now() < deadline);
        assert.deepEqual(colors.days.map(day => day.outside), [false, false, true]);
        for (const day of colors.days) assert.equal(day.color, day.outside ? colors.tertiary : colors.primary, day.date);
        assert.notEqual(colors.days[0].color, colors.days[2].color);
        const ratio=contrast(colors.days[2].color, colors.background);
        measurements.push({ story:name, theme, ...colors, outsideContrast:ratio });
        assert.ok(ratio >= 4.5, `${name} ${theme}: ${ratio}:1`);
      }
    }
  });
  await check('모드별 빠른 선택은 range 4개·날짜 single 오늘/어제·시각 single 오늘/내일', async () => {
    for (const [name, labels] of [
      ['기간선택', ['오늘', '최근 7일', '이번 달', '지난 달']],
      ['단일날짜', ['오늘', '어제']],
      ['단일시각', ['오늘', '내일']],
    ]) {
      await story(name); await pointer(trigger); await wait(`!!${q('[data-slot="date-picker-presets"]')}`);
      assert.deepEqual(await ev(`[...${q('[data-slot="date-picker-presets"]')}.querySelectorAll('button')].map(n => n.textContent)`), labels);
    }
    await story('단일날짜'); await pointer(trigger); await wait(`!!${q('[data-slot="date-picker-presets"]')}`);
    await preset('어제'); await wait(`${q(input)}.value === '2026-11-14' && !${q('[data-slot="calendar"]')}`);
    await pointer(trigger); await wait(`!!${q('[data-slot="date-picker-presets"]')}`);
    await preset('오늘'); await wait(`${q(input)}.value === '2026-11-15' && !${q('[data-slot="calendar"]')}`);
  });
  await check('이웃 달 날짜도 선택할 수 있고 시각 모드에서는 기존 시각을 보존', async () => {
    await story('단일날짜'); await pointer(trigger); await wait(`!!${q('[data-slot="calendar"]')}`);
    await day('2026-12-05'); await wait(`${q(input)}.value === '2026-12-05' && !${q('[data-slot="calendar"]')}`);
    await story('단일시각'); await calendar(); await day('2026-12-05'); await valueIs('2026-12-05 13:30');
    assert.equal(await ev(`!!${q(clock)}`), true);
  });
  await check('직접 입력·완성 문자열 붙여넣기 경로·blur/Enter는 지역 Date를 확정', async () => {
    await story('단일시각'); await enter('2026-11-18 21:40'); await valueIs('2026-11-18 21:40');
    await enter('2026-11-19 00:20', true); await valueIs('2026-11-19 00:20');
    assert.match(await ev(`getComputedStyle(${q(input)}).fontVariantNumeric`), /tabular-nums/);
  });
  await check('잘못된 날짜·24시·60분·날짜만 입력은 형식 오류이며 확정값 보존', async () => {
    await story('단일시각');
    for (const text of ['2026-02-30 10:00', '2026-11-15 24:00', '2026-11-15 13:60', '2026-11-15']) {
      await enter(text);
      await wait(`${q(input)}.getAttribute('aria-invalid') === 'true'`);
      assert.equal(await ev(`${q('[data-slot="date-picker-error"]')}.textContent`), 'YYYY-MM-DD HH:mm 형식으로 입력하세요.');
      assert.equal(await ev(`${q(output)}.textContent`), '2026-11-15 13:30');
      assert.equal(await ev(`!!${q('[data-slot="date-picker-error"] svg')}`), true);
    }
    await enter('2026-11-15 13:40'); await valueIs('2026-11-15 13:40');
    assert.notEqual(await ev(`${q(input)}.getAttribute('aria-invalid')`), 'true');
  });
  await check('기본 10분은 최근접·동률 올림이며 polite 알림과 설명 연결', async () => {
    await story('단일시각'); await enter('2026-11-15 13:14'); await valueIs('2026-11-15 13:10');
    await enter('2026-11-15 13:15'); await valueIs('2026-11-15 13:20');
    const notice = await ev(`(() => { const n=${q('[data-slot="date-picker-notice"]')}; return {
      text:n.textContent, role:n.getAttribute('role'), live:n.getAttribute('aria-live'), icon:!!n.querySelector('svg'),
      connected:${q(input)}.getAttribute('aria-describedby').split(/\\s+/).includes(n.id), invalid:${q(input)}.getAttribute('aria-invalid') }; })()`);
    assert.match(notice.text, /10분 단위로 2026-11-15 13:20에 맞췄습니다/);
    assert.equal(notice.role, 'status'); assert.equal(notice.live, 'polite'); assert.equal(notice.icon, true); assert.equal(notice.connected, true);
    assert.notEqual(notice.invalid, 'true');
  });
  await check('step 30은 두 분 칸·23:59는 다음 해 자정으로 맞춤', async () => {
    await story('삼십분간격'); await enter('2026-12-31 23:59'); await valueIs('2027-01-01 00:00');
    assert.match(await ev(`${q('[data-slot="date-picker-notice"]')}.textContent`), /30분.*2027-01-01 00:00/);
    await calendar(); await pointer(minute); await wait(`!!${q('[role="listbox"]')}`);
    assert.deepEqual(await ev(`[...document.querySelectorAll('[role="option"]')].map(n => n.textContent)`), ['00', '30']);
    await key('Escape', 27);
  });
  await check('빈 값의 첫 날짜는 09:00이며 날짜를 고른 뒤 레이어 유지', async () => {
    await story('시각첫선택'); await calendar(); await day('2026-11-18'); await valueIs('2026-11-18 09:00');
    assert.equal(await ev(`!!${q(clock)}`), true);
  });
  await check('달력 날짜만 바꾸면 13:30 유지·빠른 선택도 시각 유지', async () => {
    await story('단일시각'); await calendar(); await day('2026-11-18'); await valueIs('2026-11-18 13:30');
    await preset('오늘'); await valueIs('2026-11-15 13:30');
    await preset('내일'); await valueIs('2026-11-16 13:30');
    assert.equal(await ev(`!!${q(clock)}`), true);
  });
  await check('키보드만으로 날짜→시→분 선택·24시간·완료 후 닫힘', async () => {
    await story('단일시각'); await calendar();
    // 포인터로 연 뒤부터 focus()를 호출하지 않는다. 팝오버 자동 포커스에서 Tab으로 달력에 도달한다.
    let reached = false;
    for (let i = 0; i < 16; i++) {
      if (await ev(`document.activeElement?.matches('button[data-slot="calendar-day"]')`)) { reached = true; break; }
      await key('Tab', 9);
    }
    assert.equal(reached, true, '실제 Tab 경로의 달력 날짜');
    await key('ArrowRight', 39); await key('Enter', 13); await valueIs('2026-11-16 13:30');
    await key('Tab', 9); await focusIs(hour); await key('Enter', 13); await highlighted('13');
    await key('ArrowDown', 40); await highlighted('14'); await key('Enter', 13); await focusIs(hour);
    await valueIs('2026-11-16 14:30');
    await key('Tab', 9); await focusIs(minute); await key('Enter', 13); await highlighted('30');
    await key('End', 35); await highlighted('50'); await key('Enter', 13); await focusIs(minute);
    await valueIs('2026-11-16 14:50');
    assert.equal(await ev(`${q(hour)}.textContent`), '14'); assert.equal(await ev(`${q(minute)}.textContent`), '50');
    await key('Tab', 9); assert.equal(await ev('document.activeElement.textContent'), '완료');
    await key('Enter', 13); await wait(`!${q(clock)}`); await focusIs(trigger);
  });
  await check('Field 설명·자체 오류 자리·aria-describedby·aria-invalid', async () => {
    await story('시각오류');
    const wiring = await ev(`(() => { const field=${q('[data-slot="field"]')}, n=${q(input)}, e=field.querySelector('[data-slot="field-error"]'), d=field.querySelector('[data-slot="field-description"]'); return {
      invalid:n.getAttribute('aria-invalid'), ids:n.getAttribute('aria-describedby').split(/\\s+/), errorId:e.id, descriptionId:d.id,
      error:e.textContent, count:field.querySelectorAll('[data-slot="date-picker-error"]').length, live:e.getAttribute('aria-live') }; })()`);
    assert.equal(wiring.invalid, 'true'); assert.ok(wiring.ids.includes(wiring.errorId)); assert.ok(wiring.ids.includes(wiring.descriptionId));
    assert.equal(wiring.count, 1); assert.equal(wiring.live, 'polite'); assert.equal(wiring.error, 'YYYY-MM-DD HH:mm 형식으로 입력하세요.');
    await enter('2026-11-15 13:40'); await valueIs('2026-11-15 13:40');
    assert.notEqual(await ev(`${q(input)}.getAttribute('aria-invalid')`), 'true');
    assert.equal(await ev(`${q('[data-slot="field-error"]')}.textContent`), '');
  });
  await check('최소 폭 280px에서 값·placeholder·오류 글자 잘림 없음', async () => {
    await story('단일시각');
    await ev(`${q('[data-slot="date-picker"]')}.style.width='280px'`);
    const dimensions = await ev(`(() => { const n=${q(input)}, s=getComputedStyle(n), root=${q('[data-slot="date-picker"]')};
      const measure = (text, style) => { const span=document.createElement('span'); span.textContent=text;
        Object.assign(span.style,{position:'absolute',whiteSpace:'pre',font:style.font,fontVariantNumeric:style.fontVariantNumeric,letterSpacing:style.letterSpacing});
        document.body.append(span); const width=span.getBoundingClientRect().width; span.remove(); return width; };
      return { min:getComputedStyle(root).minWidth, root:root.getBoundingClientRect().width,
        inner:n.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight), value:measure(n.value,s), placeholder:measure(n.placeholder,s) }; })()`);
    measurements.push(dimensions); assert.equal(dimensions.min, '280px'); assert.equal(dimensions.root, 280);
    assert.ok(dimensions.inner >= dimensions.value); assert.ok(dimensions.inner >= dimensions.placeholder);
    await enter('2026-11-15 25:00');
    const error = await ev(`(() => { const n=${q('[data-slot="date-picker-error"]')}, span=n.firstElementChild, r=span.getBoundingClientRect(); return {
      width:n.clientWidth, scroll:n.scrollWidth, height:r.height, line:parseFloat(getComputedStyle(n).lineHeight) }; })()`);
    measurements.push(error); assert.ok(error.scroll <= error.width); assert.ok(error.height <= error.line + 1);
  });
  await check('다크에서 입력·달력·시/분 표면·오류 아이콘·문장 표시', async () => {
    await story('시각다크'); await wait(`document.documentElement.dataset.theme === 'dark'`);
    await calendar();
    assert.equal(await ev(`${q(hour)}.textContent`), '13'); assert.equal(await ev(`${q(minute)}.textContent`), '30');
    const surfaces = await ev(`[${q(input)},${q(clock)},${q(hour)}].map(n => ({background:getComputedStyle(n).backgroundColor,color:getComputedStyle(n).color}))`);
    measurements.push({ theme: 'dark', surfaces });
    for (const surface of surfaces) assert.notEqual(surface.background, surface.color);
    await browser.shot('dark-time'); await key('Escape', 27);
    await enter('2026-11-15 25:00');
    assert.equal(await ev(`!!${q('[data-slot="date-picker-error"] svg')}`), true);
    assert.match(await ev(`${q('[data-slot="field-error"]')}.textContent`), /YYYY-MM-DD HH:mm/);
  });
  await check('날짜만 single은 240px·range는 기존 날짜 형식 유지', async () => {
    await story('단일날짜'); assert.equal(await ev(`getComputedStyle(${q('[data-slot="date-picker"]')}).minWidth`), '240px');
    assert.equal(await ev(`${q(input)}.value`), '2026-11-12'); assert.equal(await ev(`${q(clock)}`), null);
    await story('기간선택'); assert.equal(await ev(`${q(input)}.value`), '2026-11-10 ~ 2026-11-15');
    assert.equal(await ev(`${q(clock)}`), null);
  });
  await check('모든 경로 콘솔 오류 0건', async () => assert.deepEqual([...seenErrors, ...browser.errors()], []));
} finally {
  writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, measurements, errors: [...seenErrors, ...browser.errors()] }, null, 2));
  browser.close();
}
const failed = results.filter(result => !result.pass).length;
console.log(`\n${results.length}건 검사 · ${results.length - failed}건 통과 · ${failed}건 실패`);
if (failed) process.exitCode = 1;
