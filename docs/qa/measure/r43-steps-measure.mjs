// 폭 경계만 사전 계측한다. Steps 상호작용 하네스는 실행하지 않는다.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser } from '../browser.mjs';
const out = '.qa-shots/r43-measurement';
mkdirSync(out, { recursive: true });
const browser = await launchBrowser({ outDir: out });
try {
  const tokens = readFileSync('packages/tokens/tokens.css', 'utf8');
  const css = readFileSync('packages/ui/src/components/steps/steps.css', 'utf8');
  const font = readFileSync('node_modules/pretendard/dist/public/variable/PretendardVariable.ttf').toString('base64');
  const html = `<style>${tokens}\n@font-face{font-family:Measure;src:url(data:font/ttf;base64,${font})}*{box-sizing:border-box}body{margin:0;font-family:Measure}${css}</style><div id="container"><div data-slot="steps" class="ds-steps"><ol data-slot="steps-list">${['기본 정보','가격 입력','배송 설정','최종 확인'].map((label,i) => `<li data-slot="steps-item" ${i===1?'aria-current="step"':''}><div data-slot="steps-static"><span data-slot="steps-marker">${i+1}</span><span data-slot="steps-content"><span data-slot="steps-heading"><span data-slot="steps-count">${i+1} / 4 · </span><span data-slot="steps-label">${label}</span></span><span data-slot="steps-status">${i===0?'완료':i===1?'진행 중':'예정'}</span></span></div></li>`).join('')}</ol></div></div>`;
  await browser.ev(`document.write(${JSON.stringify(html)});document.close();document.fonts.ready`);
  const results = [];
  for (const width of [800,640,639,480,320,240,120]) {
    await browser.ev(`document.querySelector('#container').style.width='${width}px'`);
    results.push(await browser.ev(`(() => { const c=document.querySelector('#container');return {width:${width},container:[c.clientWidth,c.scrollWidth],visible:[...c.querySelectorAll('li')].filter(n=>getComputedStyle(n).display!=='none').length,labels:[...c.querySelectorAll('[data-slot="steps-label"]')].map(n=>({width:n.clientWidth,natural:n.scrollWidth})),summary:getComputedStyle(c.querySelector('[data-slot="steps-count"]')).display};})()`));
  }
  writeFileSync(`${out}/widths.json`, JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
} finally { browser.close(); }
