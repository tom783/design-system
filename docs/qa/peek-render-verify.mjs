// Peek 렌더 검증: 기존 안내 하네스와 같은 CDP·포커스 에뮬레이션을 사용한다.
import { writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
const BASE=process.env.STORYBOOK_BASE_URL||'http://localhost:6099', OUT=process.argv[2]||'./.r10-shots', PORT=9496;
mkdirSync(OUT,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ch=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new',`--remote-debugging-port=${PORT}`,`--user-data-dir=${mkdtempSync(join(OUT,'chrome-'))}`,'--no-first-run','--disable-gpu','--window-size=1440,900','--force-device-scale-factor=1','--disable-extensions','about:blank'],{stdio:'ignore'});
process.on('exit',()=>{try{ch.kill()}catch{}});
let ws,mid=0; const pend=new Map(); let cerr=[],pexc=[];
for(let i=0;i<80;i++){try{const l=await(await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();const p=l.find(t=>t.type==='page'&&t.webSocketDebuggerUrl);if(p){ws=new WebSocket(p.webSocketDebuggerUrl);break}}catch{} await sleep(250)}
await new Promise((a,b)=>{ws.onopen=a;ws.onerror=b});
ws.onmessage=e=>{const m=JSON.parse(e.data);
  if(m.id&&pend.has(m.id)){const{a,b}=pend.get(m.id);pend.delete(m.id);return m.error?b(new Error(m.error.message)):a(m.result)}
  if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error') cerr.push(m.params.args.map(x=>x.value??x.description??'').join(' ').slice(0,300));
  if(m.method==='Runtime.exceptionThrown') pexc.push((m.params.exceptionDetails.exception?.description??'').slice(0,300));};
const cdp=(method,params={})=>new Promise((a,b)=>{pend.set(++mid,{a,b});ws.send(JSON.stringify({id:mid,method,params}));setTimeout(()=>{if(pend.has(mid)){pend.delete(mid);b(new Error(method+' 타임아웃'))}},40000)});
await cdp('Page.enable'); await cdp('Runtime.enable');
await cdp('Emulation.setFocusEmulationEnabled',{enabled:true});
// 자동 실행 감시 — 어떤 스크립트보다 먼저 showPopover 를 계측한다
await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`
  window.__opens=[]; window.__clicks=0;
  addEventListener('click',()=>{window.__clicks++},{capture:true});
  const real=HTMLElement.prototype.showPopover;
  HTMLElement.prototype.showPopover=function(...a){
    window.__opens.push({slot:this.dataset?.slot??null, clicksBefore:window.__clicks, t:Math.round(performance.now())});
    return real.apply(this,a);
  };`});
const ev=async s=>{const r=await cdp('Runtime.evaluate',{expression:s,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text); return r.result?.value};
const shot=async n=>{const r=await cdp('Page.captureScreenshot',{format:'png'});writeFileSync(`${OUT}/${n}.png`,Buffer.from(r.data,'base64'))};
async function go(id,waitPlay=true){
  cerr=[];pexc=[];
  await cdp('Page.navigate',{url:`${BASE}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`});
  for(let i=0;i<80;i++){if(await ev('document.readyState').catch(()=>'')==='complete')break; await sleep(150)}
  if(waitPlay) for(let i=0;i<70;i++){ if(await ev(`!!document.querySelector('[data-play-complete="true"]')`).catch(()=>false)) break; await sleep(200);}
  return {errors:[...cerr,...pexc].filter(m=>!/Warning:|DevTools|favicon|preload|3단계를 권장/i.test(m))};
}
// 새 Peek 스토리는 완료 신호를 필수로 확인하여 play 중단을 성공으로 오인하지 않는다.
const index = await (await fetch(`${BASE}/index.json`)).json();
const results = [];
for (const story of Object.values(index.entries).filter(s => s.type === 'story' && s.title === 'Components/Peek')) {
  const { errors } = await go(story.id);
  const completed = await ev(`!!document.querySelector('[data-play-complete="true"]')`);
  const coordinates = await ev(`document.querySelector('[data-marker-coordinates]')?.dataset.markerCoordinates ?? null`);
  const pass = completed && errors.length === 0;
  results.push({ id: story.id, pass, errors, coordinates: coordinates ? JSON.parse(coordinates) : null });
  await shot(story.id);
  console.log(`${pass ? '✓' : '✗'} ${story.id} ${JSON.stringify({ errors, coordinates })}`);
}
writeFileSync(`${OUT}/peek-results.json`, JSON.stringify(results, null, 2));
ws.close(); ch.kill();
process.exit(results.some(r => !r.pass) ? 1 : 0);
