// 좁은 폭 후보만 사전 계측한다. 상호작용 하네스의 실행을 대신하지 않는다.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser } from './browser.mjs';
const out = '.qa-shots/r42-measurement';
mkdirSync(out, { recursive: true });
const browser = await launchBrowser({ outDir: out });
try {
  const tokens = readFileSync('packages/tokens/tokens.css', 'utf8');
  const css = readFileSync('packages/ui/src/components/segmented-control/segmented-control.css', 'utf8');
  const font = readFileSync('node_modules/pretendard/dist/public/variable/PretendardVariable.ttf').toString('base64');
  const html = `<style>${tokens}\n@font-face{font-family:Measure;src:url(data:font/ttf;base64,${font})}*{box-sizing:border-box}body{margin:0;font-family:Measure}button{font:inherit}${css}</style><div id="container"><div role="radiogroup" data-slot="segmented-control" data-full-width="true" class="ds-segmented-control">${['일별 매출 현황', '주별 매출 현황', '월별 매출 현황'].map((label,i) => `<button data-slot="segmented-control-item" aria-checked="${i===0}"><span data-slot="segmented-control-label">${label}</span></button>`).join('')}</div></div>`;
  await browser.ev(`document.write(${JSON.stringify(html)});document.close();document.fonts.ready`);
  const measurements = [];
  for (const width of [320, 240, 180, 120]) {
    measurements.push(await browser.ev(`(() => {const c=document.querySelector('#container');c.style.width='${width}px';const g=c.firstElementChild;return {width:${width},container:[c.clientWidth,c.scrollWidth],group:[g.clientWidth,g.scrollWidth],height:g.getBoundingClientRect().height,labels:[...g.querySelectorAll('span')].map(n=>({width:n.clientWidth,natural:n.scrollWidth,ellipsis:getComputedStyle(n).textOverflow}))};})()`));
  }
  writeFileSync(`${out}/widths.json`, JSON.stringify(measurements, null, 2));
  console.log(JSON.stringify(measurements, null, 2));
} finally { browser.close(); }
