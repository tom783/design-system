import assert from 'node:assert/strict';
import { launchBrowser, storybook } from './browser.mjs';
const browser = await launchBrowser({ port: 9463, outDir: '.qa-shots/r13' });
let failed = 0;
try {
  const { open } = storybook(browser);
  const index = await (await fetch('http://localhost:6099/index.json')).json();
  const stories = Object.values(index.entries).filter(e => e.type === 'story' && /^(Components\/(Select|DropdownMenu|Toast|DatePicker)|QA\/ListScreen)$/.test(e.title));
  // 이 가드의 뜻은 "스토리가 사라지지 않았는가" 다. 등식으로 두면 스토리를 **추가**할
  // 때마다 거짓 실패한다 — R19 에서 Select 에 툴바 필터 변형을 더하자 15→16 으로 깨졌다.
  // 아래 루프가 발견된 스토리를 전부 검증하므로 늘어나는 것은 그대로 이득이다.
  if (stories.length < 15) throw new Error(`R13 스토리가 누락됐습니다: 최소 15개, 실제 ${stories.length}개`);
  // 예외가 없어도 play는 실패할 수 있다. 완료 표식을 각 스토리마다 별도로 단언한다.
  async function verifyPlay(id, label = id) {
    let complete = false;
    try {
      const result = await open(id);
      complete = await browser.ev("document.querySelector('#storybook-root')?.dataset.playComplete === 'true'");
      assert.equal(complete, true, `${id}: playComplete가 true여야 합니다`);
      assert.equal(result.sbError, null, `${id}: Storybook 오류`);
      assert.deepEqual(result.errors, [], `${id}: 브라우저 오류`);
      console.log(`✓ ${label} playComplete: true`);
    } catch (error) {
      failed++;
      console.error(`✗ ${label} playComplete: ${complete} — ${error.message}`);
      await browser.shot(id);
    }
  }
  for (const story of stories) await verifyPlay(story.id);
  // 명시적 테마가 OS보다 우선하고 미지정 테마는 OS를 따르는지 양쪽 OS에서 반복한다.
  for (const scheme of ['light', 'dark']) {
    await browser.cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] });
    await verifyPlay('components-toast--다크', `시스템 ${scheme} 테마 3상태`);
  }
  // 목표 41 단계 2e: 닫기 버튼은 상자 안쪽 오른쪽 위다(DESIGN.md §16.5).
  // 모든 거리는 상자 바깥 경계(getBoundingClientRect)에서 잰다. 한 줄·여러 줄 × 라이트·다크.
  let extra = 0;
  async function check(label, run) {
    extra++;
    try { const m = await run(); console.log(`✓ ${label}${m ? ` — ${JSON.stringify(m)}` : ''}`); }
    catch (error) { failed++; console.error(`✗ ${label}: ${error.message}`); await browser.shot(`toast-close-${extra}`); }
  }
  async function until(expression, label = expression) {
    for (let i = 0; i < 100; i++) { if (await browser.ev(expression).catch(() => false)) return; await browser.sleep(40); }
    throw new Error(`조건 대기 실패: ${label}`);
  }
  const front = `document.querySelector('[data-sonner-toast][data-removed="false"]')`;
  // 앞 알림 하나만 남고 진입 전환(transform 400ms)이 끝나 사각형이 멈출 때까지 기다린다.
  async function show(button) {
    await browser.ev(`[...document.querySelectorAll('#storybook-root button')].find(b => b.textContent.trim() === ${JSON.stringify(button)}).click()`);
    await until(`document.querySelectorAll('[data-sonner-toast]').length === 1 && ${front}?.dataset.mounted === 'true'`, `${button} 알림 하나`);
    let previous = '';
    for (let i = 0; i < 40; i++) {
      const rect = await browser.ev(`JSON.stringify(${front}.getBoundingClientRect())`);
      if (rect === previous) return; previous = rect; await browser.sleep(60);
    }
    throw new Error(`${button}: 알림 위치가 멈추지 않았습니다`);
  }
  const geometry = `(() => {
    const t = ${front}, b = t.querySelector(':scope > [data-close-button]');
    const content = t.querySelector('[data-content]'), message = t.querySelector('[data-slot="toast-message"]');
    const range = document.createRange(); range.selectNodeContents(message);
    const lines = [...range.getClientRects()].filter(r => r.width > 0);
    const tr = t.getBoundingClientRect(), cr = content.getBoundingClientRect();
    const br = b?.getBoundingClientRect(), icon = b?.querySelector('svg')?.getBoundingClientRect();
    const overlaps = r => br && r.left < br.right && r.right > br.left && r.top < br.bottom && r.bottom > br.top;
    const s = b && getComputedStyle(b);
    return { hasClose: !!b, label: b?.getAttribute('aria-label'),
      right: br && +(tr.right - br.right).toFixed(2), top: br && +(br.top - tr.top).toFixed(2),
      width: br?.width, height: br?.height, icon: icon && [icon.width, icon.height],
      lines: new Set(lines.map(r => Math.round(r.top))).size, overlap: lines.some(overlaps) || overlaps(cr),
      textGap: br && +(br.left - Math.max(...lines.map(r => r.right))).toFixed(2),
      contentGap: br && +(br.left - cr.right).toFixed(2), inset: +(tr.right - cr.right).toFixed(2),
      toastHeight: tr.height, transform: s?.transform, bg: s?.backgroundColor, color: s?.color,
      toastColor: getComputedStyle(t).color };
  })()`;
  const near = (actual, expected, label, tolerance = 1) =>
    assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${expected}±${tolerance}px 이어야 하는데 ${actual}px`);
  for (const theme of ['light', 'dark']) {
    const result = await open('components-toast--닫기위치', { extra: `&globals=theme:${theme}` });
    assert.equal(result.sbError, null);
    await until(`document.documentElement.dataset.theme === '${theme}'`);
    await browser.ev('document.fonts.ready');
    await browser.cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 2, y: 2 });
    for (const [button, kind] of [['한 줄 오류', '한 줄'], ['여러 줄 오류', '여러 줄']]) {
      await check(`Toast 닫기 ${kind}·${theme}: 오른쪽 8·위 10·32×32·본문과 겹치지 않음`, async () => {
        await show(button);
        const g = await browser.ev(geometry);
        assert.equal(g.hasClose, true); assert.equal(g.label, '알림 닫기');
        near(g.right, 8, '오른쪽'); near(g.top, 10, '위');
        near(g.width, 32, '너비', 0.5); near(g.height, 32, '높이', 0.5);
        assert.deepEqual(g.icon, [16, 16], '아이콘 16px');
        assert.equal(g.transform, 'none', '바깥으로 미는 transform 없음');
        assert.equal(g.overlap, false, '본문 글·내용 상자가 버튼과 겹친다');
        assert.ok(g.contentGap >= 7.5, `내용 상자와 버튼 간격 8px 이상: ${g.contentGap}`);
        near(g.inset, 48, '본문 오른쪽 여백');
        if (kind === '여러 줄') assert.ok(g.lines >= 2, `여러 줄이어야 한다: ${g.lines}줄`);
        else assert.equal(g.lines, 1);
        assert.equal(g.bg, 'rgba(0, 0, 0, 0)', '별도 바탕색 없음');
        assert.equal(g.color, g.toastColor, '아이콘은 상자 글자색을 물려받는다');
        return { right: g.right, top: g.top, size: `${g.width}×${g.height}`, lines: g.lines, textGap: g.textGap, inset: g.inset, height: g.toastHeight };
      });
    }
    await check(`Toast 닫기 ${theme}: 포커스 링·호버 틴트·Escape`, async () => {
      await show('한 줄 오류');
      // 전역 :focus-visible 링(2px --border-focus)이 보이고 sonner 그림자 링은 꺼져 있다.
      const focus = await browser.ev(`(() => {
        const b = ${front}.querySelector('[data-close-button]'); b.focus();
        const probe = document.createElement('span'); probe.style.color = 'var(--border-focus)'; document.body.append(probe);
        const expected = getComputedStyle(probe).color; probe.remove(); const s = getComputedStyle(b);
        return { visible: b.matches(':focus-visible'), outline: s.outlineWidth + ' ' + s.outlineStyle, color: s.outlineColor, expected, shadow: s.boxShadow };
      })()`);
      assert.equal(focus.visible, true); assert.equal(focus.outline, '2px solid');
      assert.equal(focus.color, focus.expected, '포커스 링은 --border-focus'); assert.equal(focus.shadow, 'none');
      // 호버 바탕은 현재 글자색의 옅은 틴트다. 캔버스로 sRGB를 읽어 글자색과 같은 색·옅은 알파인지 본다.
      await browser.ev('document.activeElement.blur()');
      const point = await browser.ev(`(() => { const r = ${front}.querySelector('[data-close-button]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
      await browser.cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
      await until(`${front}.querySelector('[data-close-button]').matches(':hover')`, '호버');
      // sonner가 background에 200ms 전환을 건다. 전환 중에는 알파가 0에 가까워 거짓 실패한다
      // (실측: 첫 읽기 0,0,0,0). 계산값이 두 번 연속 같을 때까지 기다린다.
      let tint = '';
      for (let i = 0; i < 40; i++) {
        const next = await browser.ev(`getComputedStyle(${front}.querySelector('[data-close-button]')).backgroundColor`);
        if (next === tint) break; tint = next; await browser.sleep(80);
      }
      const hover = await browser.ev(`(() => {
        const b = ${front}.querySelector('[data-close-button]'), ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
        const rgba = c => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data]; };
        // 반투명 색은 캔버스가 프리멀티플라이로 저장해 알파 31에서 채널이 ±3 흔들린다(실측 다크
        // 255,140,107 vs 255,137,110). 틴트는 계산값 문자열에서 바로 읽는다.
        const tint = getComputedStyle(b).backgroundColor, n = tint.match(/-?[\\d.]+/g)?.map(Number) ?? [];
        const bg = tint.startsWith('color(srgb ') ? [...n.slice(0, 3).map(v => v * 255), (n[3] ?? 1) * 255]
          : tint.startsWith('rgba(') ? [n[0], n[1], n[2], n[3] * 255] : null;
        const fg = rgba(getComputedStyle(b).color);
        // 대비는 상자 바탕 위에 틴트를 실제로 합성한 불투명 픽셀로 잰다. 반올림한 값으로 판정하지 않는다.
        ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = getComputedStyle(${front}).backgroundColor; ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = tint; ctx.fillRect(0, 0, 1, 1); const mixed = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
        const lum = c => c.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
        const a = lum(fg.slice(0, 3)), m = lum(mixed);
        return { tint, bg, fg, contrast: (Math.max(a, m) + .05) / (Math.min(a, m) + .05) };
      })()`);
      await browser.cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 2, y: 2 });
      assert.ok(hover.bg, `호버 바탕 형식을 읽지 못했습니다: ${hover.tint}`);
      for (let i = 0; i < 3; i++) assert.ok(Math.abs(hover.bg[i] - hover.fg[i]) <= 1, `호버 틴트 색 ${hover.tint} ≠ 글자색 ${hover.fg}`);
      assert.ok(hover.bg[3] > 0 && hover.bg[3] < 64, `호버 틴트는 옅어야 한다: 알파 ${hover.bg[3]}/255`);
      assert.ok(hover.contrast >= 3, `호버 중 아이콘 대비 3:1 이상: ${hover.contrast}`);
      // Escape: 포커스가 알림 안에 있으면 닫힌다. 닫기 버튼이 없는 알림은 닫히지 않는다.
      await browser.ev(`${front}.querySelector('[data-close-button]').focus()`);
      await browser.cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await browser.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await until(`!${front}`, 'Escape 로 닫힘');
      await show('닫기 없는 알림');
      const plain = await browser.ev(geometry);
      assert.equal(plain.hasClose, false); near(plain.inset, 17, '닫기 없는 알림 오른쪽 여백(16 + 테두리 1)');
      await browser.ev(`${front}.focus()`);
      await browser.cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await browser.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await browser.sleep(300);
      assert.ok(await browser.ev(`!!${front}`), '닫기 버튼이 없는 알림은 Escape 로 닫히지 않는다');
      return { focus: focus.outline, hover: hover.tint, hoverContrast: +hover.contrast.toFixed(2), plainInset: plain.inset };
    });
  }
  const total = stories.length + 2 + extra;
  console.log(`${total}개 검사, ${total - failed}개 통과`);
} finally { browser.close(); }
process.exitCode = failed ? 1 : 0;
