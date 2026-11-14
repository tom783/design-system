// 서버 없이 실제 브라우저에서 실행할 수 있도록 스토리와 play 검사를 단일 HTML로 묶는다.
// 실행: node docs/qa/charts-render-verify.mjs → .context/r04/charts-verify.html 을 브라우저로 연다.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, '.context/r04');
await mkdir(output, { recursive: true });
const entry = resolve(output, 'charts-verify.jsx');
await writeFile(entry, `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import * as stories from '../../packages/ui/src/stories/charts.stories.tsx';
import * as loadingStories from '../../packages/ui/src/stories/loading.stories.tsx';
import { BulletRow } from '../../packages/ui/src/components/chart/index.ts';
import '../../packages/ui/src/styles.css';

const results = [];
const resultNode = document.getElementById('results');
const canvas = document.getElementById('canvas');
const renderRoot = createRoot(canvas);
const pause = () => new Promise(requestAnimationFrame);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const record = (name, error) => {
  results.push({ name, pass: !error, error: error ? String(error.stack || error) : null });
  resultNode.textContent = results.map(r => (r.pass ? '통과 ' : '실패 ') + r.name + (r.error ? '\\n' + r.error : '')).join('\\n');
};
async function render(element) {
  flushSync(() => renderRoot.render(element));
  await pause(); await pause();
}
async function check(name, task) {
  try { await task(); record(name); } catch (error) { record(name, error); }
}
function numericAndBounds() {
  for (const svg of canvas.querySelectorAll('svg[role="img"]')) {
    assert(!/NaN|Infinity/.test(svg.outerHTML), '비정상 SVG 좌표');
    assert(!svg.hasAttribute('viewBox'), 'viewBox 확대/축소 금지');
    for (const text of svg.querySelectorAll('text')) {
      const box = text.getBBox();
      assert(box.x >= -1 && box.x + box.width <= Number(svg.getAttribute('width')) + 1, '텍스트 수평 넘침: ' + text.textContent);
      assert(box.y >= -1 && box.y + box.height <= Number(svg.getAttribute('height')) + 1, '텍스트 수직 넘침: ' + text.textContent);
      assert(parseFloat(getComputedStyle(text).fontSize) >= 13, '13px보다 작은 글자');
    }
    for (const node of svg.querySelectorAll('[data-slot="trend-band-value"], [data-slot="bullet-value"], [data-slot="composition-value"]')) {
      const style = getComputedStyle(node);
      assert(style.fontVariantNumeric.includes('tabular-nums'), '고정폭 숫자 누락');
      assert(style.fontFamily.includes('Mono'), '수치 전용 서체 누락');
    }
    const labels = [...svg.querySelectorAll('[data-slot="composition-label"] text:first-of-type')];
    for (let i = 1; i < labels.length; i++) {
      const a = labels[i - 1].getBBox(), b = labels[i].getBBox();
      assert(a.y + a.height <= b.y + 1, '직접 라벨 겹침');
    }
  }
}
async function run() {
  for (const theme of ['light', 'dark']) {
    document.documentElement.dataset.theme = theme;
    for (const name of ['추이밴드', '추이밴드_선만', '추이밴드_축기준', '추이밴드_음수', '추이밴드_엣지', '불릿', '구성변화', '구성변화_절대값', '반응형', '구성변화_엣지', '로딩_추이밴드', '로딩_불릿', '로딩_치수일치', '오류', '비어있음', '지연로딩']) {
      await check(theme + ' · ' + name + ' · play 및 SVG 경계', async () => {
        const story = stories[name];
        await render(React.createElement(story.render));
        await story.play({ canvasElement: canvas });
        numericAndBounds();
        if (name === '로딩_치수일치') {
          const measurements = [...canvas.querySelectorAll('[data-compare]')].filter((_, i) => i % 2 === 0)
            .map(node => ({ pair: node.dataset.compare, diff: Number(node.dataset.plotHeightDiff) }));
          record(theme + ' · 플롯 치수 실측 ' + JSON.stringify(measurements));
        }
      });
    }
  }
  for (const name of ['대기시간_계층', '깜빡임_방지', '스켈레톤_기본', '스켈레톤_패턴', '스켈레톤_치수일치', '진행률', '긴작업', '모션_감소']) {
    await check('기존 로딩 · ' + name + ' · play', async () => {
      await render(React.createElement(loadingStories[name].render));
      if (loadingStories[name].play) await loadingStories[name].play({ canvasElement: canvas });
    });
  }
  await check('ResizeObserver 미지원 · 최초 측정 및 resize 폴백', async () => {
    const observer = window.ResizeObserver;
    flushSync(() => renderRoot.render(null));
    window.ResizeObserver = undefined;
    try {
      await render(React.createElement(stories.반응형.render));
      await stories.반응형.play({ canvasElement: canvas });
      const container = canvas.querySelector('[data-testid="width-640"]');
      const svg = container.querySelector('svg');
      const before = svg.getBoundingClientRect().width;
      container.style.width = '480px';
      window.dispatchEvent(new Event('resize'));
      await pause(); await pause();
      assert(Math.abs(svg.getBoundingClientRect().width - (before - 160)) < 1, '창 resize 폴백 누락');
      numericAndBounds();
    } finally { window.ResizeObserver = observer; }
  });
  await check('불릿 · 빈 데이터·긴 이름·경계값·0 최대값', async () => {
    await render(<div style={{ width: 320 }}><BulletRow metrics={[]} summary="집계된 목표와 실적 데이터가 없습니다." />
      <BulletRow metrics={[
        { label: '아주 긴 반품률 지표 이름의 전체 텍스트 보존 확인', actual: 2, target: 2, max: 5, unit: '%', lowerIsBetter: true },
        { label: '0 최대값', actual: 0, target: 0, max: 0 },
      ]} summary="반품률과 영점 지표 모두 경계값에서 목표를 달성했습니다." /></div>);
    assert(canvas.querySelector('[data-slot="chart-empty"]'), '빈 상태 누락');
    assert([...canvas.querySelectorAll('[data-slot="bullet-status"]')].every(n => n.textContent === '달성'), '경계값 달성 실패');
    const label = canvas.querySelector('[data-slot="bullet-label"]');
    assert(label.querySelector('title').textContent.includes('전체 텍스트 보존'), '긴 이름 원문 누락');
    assert(label.textContent.includes('…'), '말줄임 누락');
    numericAndBounds();
  });
  // 검사 후 비교 화면을 남겨 스크린샷과 육안 점검도 가능하게 한다.
  document.documentElement.dataset.theme = 'light';
  await render(React.createElement(stories.반응형.render));
  window.__CHART_QA_RESULTS__ = results;
  const failed = results.filter(r => !r.pass).length;
  document.title = '차트 검증 ' + (failed ? '실패 ' + failed : '전체 통과') + ' / ' + results.length;
  document.getElementById('status').textContent = document.title;
  document.body.dataset.qa = failed ? 'failed' : 'passed';
}
run().catch(error => { record('검증 실행', error); document.body.dataset.qa = 'failed'; });
`);

const bundle = await build({
  root, configFile: false, plugins: [react(), tailwindcss()], logLevel: 'warn',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    write: false, minify: true, cssCodeSplit: false,
    lib: { entry, formats: ['es'], fileName: 'charts-verify' },
    rolldownOptions: { output: { codeSplitting: false } },
  },
});
const files = (Array.isArray(bundle) ? bundle : [bundle]).flatMap(result => result.output);
const js = files.filter(file => file.type === 'chunk').map(file => file.code).join('\n');
const css = files.filter(file => file.type === 'asset' && file.fileName.endsWith('.css')).map(file => file.source).join('\n');
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><title>차트 검증 실행 중</title>
<style>${css}</style><body style="padding:24px"><h1 id="status">차트 검증 실행 중</h1><pre id="results" style="white-space:pre-wrap"></pre><main id="canvas"></main>
<script type="module">${js.replaceAll('</script', '<\\/script')}</script></body></html>`;
const destination = resolve(output, 'charts-verify.html');
await writeFile(destination, html);
console.log(`브라우저에서 열어 검증하세요: ${destination}`);
