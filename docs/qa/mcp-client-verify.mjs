// MCP 서버 검증 — 독립 클라이언트. 의존성 0개.
//
//   node docs/qa/mcp-client-verify.mjs
//
// 서버가 자기 테스트로 통과했다는 것과 실제 클라이언트가 붙는다는 것은 다르다.
// 이 파일은 2025-06-18 명세대로 바이트를 주고받는다.
//
// 반드시 확인하는 것:
//  · 줄바꿈 구분 JSON. Content-Length 헤더는 없다 (그건 LSP 다)
//  · stdout 에 MCP 메시지가 아닌 줄이 하나라도 있으면 실패 — console.log 한 줄이
//    연결을 조용히 깬다. 로그는 stderr 로만.
//  · 알림(id 없음)에는 응답하지 않는다
//  · 모르는 프로토콜 버전은 에러가 아니라 지원 버전으로 대체 응답
//  · 깨진 JSON 을 받아도 죽지 않고 -32700 뒤 정상 복구
//  · 조회 실패는 JSON-RPC 에러가 아니라 isError 결과 + 다음에 뭘 할지 안내
//  · components 카탈로그 크기 — 커지면 AI 컨텍스트를 태운다
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { readFileSync } from 'node:fs';
// 문구는 매니페스트가 원본이다. 하네스에 문장을 복사하면 지침을 고칠 때마다 깨진다(R28).
const stored = JSON.parse(readFileSync(new URL('../../packages/mcp/manifest.json', import.meta.url), 'utf8'));
// 절대경로를 박으면 내 기계에서만 돈다. 실제로 CI(리눅스)에서 initialize 타임아웃으로 죽었다.
const SERVER = fileURLToPath(new URL('../../packages/mcp/server.mjs', import.meta.url));
const proc = spawn('node', [SERVER], { stdio: ['pipe','pipe','pipe'] });
let buf = '', stderrBuf = '';
const pending = new Map(); const notifications = []; const badLines = [];
let nextId = 1;
proc.stderr.on('data', d => { stderrBuf += d; });
proc.stdout.on('data', d => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    if (!line.trim()) continue;
    let m;
    try { m = JSON.parse(line); } catch { badLines.push(line.slice(0,120)); continue; }
    if (m.id !== undefined && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    else notifications.push(m);
  }
});
const send = (obj) => proc.stdin.write(JSON.stringify(obj) + '\n');
const call = (method, params) => new Promise((res, rej) => {
  const id = nextId++;
  pending.set(id, res);
  send({ jsonrpc: '2.0', id, method, ...(params !== undefined ? { params } : {}) });
  setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error(method + ' 타임아웃')); } }, 8000);
});
const sendRaw = (s) => proc.stdin.write(s + '\n');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = []; const check = (l, p, d) => { R.push({l,p}); console.log(`  ${p?'✓':'✗'} ${l}${d?` — ${d}`:''}`); };

console.log('── A. 핸드셰이크 ──');
const init = await call('initialize', { protocolVersion:'2025-06-18', capabilities:{}, clientInfo:{name:'claude-verify',version:'1'} });
check('initialize 가 응답한다', !!init.result, JSON.stringify(init.error ?? '').slice(0,80));
check('요청한 버전을 그대로 돌려준다', init.result?.protocolVersion === '2025-06-18', init.result?.protocolVersion);
check('tools · resources 능력을 선언한다', !!init.result?.capabilities?.tools && !!init.result?.capabilities?.resources, JSON.stringify(init.result?.capabilities));
check('serverInfo 가 있다', !!init.result?.serverInfo?.name, JSON.stringify(init.result?.serverInfo));
check('instructions 가 쓰는 법을 안내한다', (init.result?.instructions||'').length > 40, `${(init.result?.instructions||'').length}자`);
console.log(`     instructions: "${(init.result?.instructions||'').slice(0,150)}…"`);

send({ jsonrpc:'2.0', method:'notifications/initialized' });
await sleep(250);
check('initialized 알림에 응답하지 않는다', notifications.length === 0, `알림 수신 ${notifications.length}`);

console.log('\n── B. 버전 협상 ──');
{
  const p2 = spawn('node',[SERVER],{stdio:['pipe','pipe','pipe']});
  let b=''; const got = await new Promise(res=>{
    p2.stdout.on('data',d=>{b+=d; const i=b.indexOf('\n'); if(i>=0) res(JSON.parse(b.slice(0,i)))});
    p2.stdin.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'1999-01-01',capabilities:{},clientInfo:{name:'x',version:'1'}}})+'\n');
    setTimeout(()=>res({timeout:true}),8000);
  });
  p2.kill();
  check('모르는 버전에 에러를 내지 않는다', !got.error, JSON.stringify(got.error??'').slice(0,80));
  check('지원하는 버전을 대신 돌려준다', !!got.result?.protocolVersion && got.result.protocolVersion!=='1999-01-01', got.result?.protocolVersion);
}

console.log('\n── C. 도구 목록 ──');
const tl = await call('tools/list', {});
const tools = tl.result?.tools ?? [];
check('도구 6개', tools.length === 6, tools.map(t=>t.name).join(' · '));
check('모든 도구에 inputSchema 가 있다', tools.every(t=>t.inputSchema?.type==='object'), tools.filter(t=>!t.inputSchema).map(t=>t.name).join(',')||'전부 있음');
check('모든 도구에 설명이 있다', tools.every(t=>(t.description||'').length>10));

console.log('\n── D. 도구 호출 ──');
const t = async (name, args) => {
  const r = await call('tools/call', { name, arguments: args });
  if (!r.result) throw new Error(`${name} 가 에러를 반환: ${JSON.stringify(r.error)}`);
  return r.result;
};
{
  const r = await t('get_token', { name: 'row-marker' });
  const parsed = (()=>{try{return JSON.parse(r.content[0].text)}catch{return null}})();
  check('get_token 이 structuredContent 를 준다', !!r.structuredContent, JSON.stringify(r.structuredContent??'').slice(0,100));
  check('content[0].text 가 같은 내용의 JSON 이다', JSON.stringify(parsed)===JSON.stringify(r.structuredContent), parsed?'일치':'불일치');
  const s = JSON.stringify(r.structuredContent);
  check('라이트·다크 양쪽 값을 준다', /light/.test(s)&&/dark/.test(s), s.slice(0,120));
}
{
  const r = await t('get_token', { name: '없는토큰임' });
  check('없는 토큰은 에러가 아니라 isError 결과', r?.isError === true, JSON.stringify(r).slice(0,120));
  check('무엇을 대신 하라고 알려준다', /search_tokens|찾/.test(r?.content?.[0]?.text??''), (r?.content?.[0]?.text??'').slice(0,90));
}
{
  const r = await t('which_component', { description: '표에서 행 내용을 빠르게 요약해서 보고 싶다' });
  const s = JSON.stringify(r.structuredContent ?? r.content?.[0]?.text ?? '');
  check('which_component 가 Peek 을 후보로 준다', /Peek/.test(s), s.slice(0,200));
  check('판단 근거(useWhen/dont/reasons)를 함께 준다', /useWhen/.test(s)&&/dont/.test(s)&&/reasons/.test(s), s.slice(0,120));
}
{
  const r = await t('which_component', { description: '버튼에 한 줄 설명을 붙이고 싶다' });
  const s = JSON.stringify(r.structuredContent ?? '');
  const names = (JSON.parse(s||'{}').candidates ?? []).map(c=>c.name);
  check('툴팁 질문에 Tooltip 이 상위 3위 안에 든다', names.slice(0,3).includes('Tooltip'), names.join(' · '));
}
{
  const r = await t('get_component', { name: 'Peek' });
  const s = JSON.stringify(r.structuredContent ?? '');
  check('get_component 가 금지사항을 준다', /호버/.test(s), s.slice(0,200));
  check('get_component 가 규칙 출처를 준다', /DESIGN\.md/.test(s));
}
{
  const parent = (await t('get_component', { name: 'Select' })).structuredContent;
  const r = await t('get_component', { name: 'SelectTrigger' });
  const part = r.structuredContent;
  check('부품 조회는 부모의 useWhen·dont·rules·category를 합친다',
    ['useWhen', 'dont', 'rules', 'category'].every((key) => parent[key]?.length && isDeepStrictEqual(part?.[key], parent[key])));
  check('합친 부모를 inheritedFrom으로 표시한다', part?.inheritedFrom === 'Select' && part?.partOf === 'Select');
  check('부품 고유 purpose·API를 보존하고 텍스트 응답도 같다', part?.purpose === stored.components.find((c) => c.name === 'SelectTrigger').purpose && part?.purpose !== parent.purpose && part?.slots.includes('select-trigger') && isDeepStrictEqual(JSON.parse(r.content[0].text), part));
  check('부모 조회는 부품 목록을 제공하고 상속 표시는 없다', parent.parts?.includes('SelectTrigger') && !Object.hasOwn(parent, 'inheritedFrom'));
}
{
  const input = (await t('get_component', { name: 'Input' })).structuredContent;
  check('Input은 leadingIcon API와 장식 슬롯을 전달한다', input.props.some(p => p.name === 'leadingIcon') && input.slots.includes('input-leading-icon'));
  check('검색 type·내장 돋보기·겹치기 금지·null 해제 지침을 전달한다',
    input.rules.some(r => r.text.includes('type="search"') && r.text.includes('겹치지')) && input.rules.some(r => r.text.includes('leadingIcon={null}')));
  const body = (await t('get_component', { name: 'CardBody' })).structuredContent;
  check('CardBody는 헤더 없이 사용 가능한 위 여백 지침을 상속한다', body.inheritedFrom === 'Card' && body.rules.some(r => r.text.includes('헤더 없이 CardBody') && r.text.includes('위 여백')));
}
{
  const r = await t('get_rules', { topic: '폼' });
  const s = JSON.stringify(r.structuredContent ?? r.content?.[0]?.text ?? '');
  check('get_rules 가 폼 규칙을 준다', s.length > 100 && !r?.isError, s.slice(0,160));
}
{
  const r = await t('which_component', { description: 'zzzz 아무 관련 없는 말' });
  check('무매칭은 에러가 아니라 isError + 안내', r.isError === true && /list_components/.test(r.content?.[0]?.text ?? ''), (r.content?.[0]?.text??'').slice(0,80));
}
{
  const r = await t('list_components', {});
  const s = JSON.stringify(r.structuredContent ?? '');
  check('list_components 가 import 구문을 준다', /import \{/.test(s), s.slice(0,110));
  const list = r.structuredContent.components;
  check('목록은 부품의 partOf를 주고 독립 CardSkeleton은 유지한다', list.find((c) => c.name === 'SelectTrigger')?.partOf === 'Select' && !Object.hasOwn(list.find((c) => c.name === 'CardSkeleton'), 'partOf'));
  check('목록은 이름·종류·목적·import·partOf만 제공한다', list.every((c) => Object.keys(c).every((key) => ['name', 'kind', 'purpose', 'import', 'partOf'].includes(key))));
}
{
  // 카탈로그가 AI 컨텍스트를 태우지 않을 만큼 작은가
  const rr = await call('resources/read', { uri: 'design://components' });
  const kb = Buffer.byteLength(rr.result.contents[0].text) / 1024;
  check('components 카탈로그가 80KB 이하', kb <= 80, kb.toFixed(0) + 'KB');
  const { derived, components: catalog } = JSON.parse(rr.result.contents[0].text);
  const part = catalog.find((c) => c.name === 'SelectTrigger');
  check('리소스는 복원 규칙과 상속을 합치지 않은 보관 형태다', derived.sourceRoot === 'packages/ui/src/' && derived.kindDefault === 'component' && part.partOf === 'Select' && ['useWhen', 'dont', 'rules', 'category', 'related', 'keywords', 'inheritedFrom', 'import', 'kind'].every((key) => !Object.hasOwn(part, key)));
}
{
  const bad = await call('tools/call', { name: '없는도구', arguments: {} });
  check('모르는 도구는 JSON-RPC 에러 -32602', bad.error?.code === -32602, JSON.stringify(bad.error??bad.result).slice(0,100));
}

console.log('\n── E. 리소스 ──');
for (const [query, name] of [['사이드바', 'SideNav'], ['메뉴', 'SideNav'], ['내비게이션', 'SideNav'], ['페이지 제목', 'PageHeader'], ['화면 머리', 'PageHeader']]) {
  const result = await t('which_component', { description: query });
  check(`앱 셸 선택 질문: ${query} → ${name}`, result.structuredContent?.candidates.slice(0, 3).some(candidate => candidate.name === name));
}
for (const [name, props] of [['AppShell', ['sidebar', 'header', 'children', 'contentMaxWidth']],
  ['SideNav', ['brand', 'brandIcon', 'collapsed', 'defaultCollapsed', 'onCollapsedChange']],
  ['PageHeader', ['title', 'description', 'breadcrumb', 'status', 'actions']]]) {
  const result = (await t('get_component', { name })).structuredContent;
  check(`${name}의 공개 API·소비자 규칙`, props.every(prop => result.props.some(item => item.name === prop)) && result.rules.length > 0);
}
for (const description of ['페이지', '페이징', '페이지 이동', '페이지 크기', '몇 개씩']) {
  const result = (await t('which_component', { description })).structuredContent;
  check(`페이지네이션 선택 질문: ${description}`, result?.candidates[0]?.name === 'Pagination');
}
{
  const pagination = (await t('get_component', { name: 'Pagination' })).structuredContent;
  check('Pagination 공개 API·소비자 규칙', ['page', 'pageSize', 'totalCount', 'onPageChange', 'pageSizeOptions', 'onPageSizeChange', 'disabled']
    .every(name => pagination.props.some(prop => prop.name === name)) && pagination.rules.length > 0);
  const table = (await t('get_component', { name: 'DataTable' })).structuredContent;
  check('DataTable 페이지 전환 선택 해제 규칙', table.rules.some(rule => rule.text.includes('페이지를 넘기면 선택이 해제된다')));
}
const rl = await call('resources/list', {});
const res = rl.result?.resources ?? [];
check('리소스 3개', res.length === 3, res.map(r=>r.uri).join(' · '));
for (const r of res) {
  const rr = await call('resources/read', { uri: r.uri });
  const txt = rr.result?.contents?.[0]?.text ?? '';
  check(`${r.uri} 읽힌다`, txt.length > 50, `${txt.length}자 · ${rr.result?.contents?.[0]?.mimeType}`);
}
{
  const bad = await call('resources/read', { uri: 'design://없음' });
  check('없는 uri 는 -32002', bad.error?.code === -32002, JSON.stringify(bad.error??'').slice(0,90));
}

console.log('\n── F. 견고성 ──');
sendRaw('{ 이건 JSON 이 아니다');
await sleep(300);
check('깨진 입력에 프로세스가 죽지 않는다', proc.exitCode === null);
{
  const after = await call('tools/list', {});
  check('깨진 입력 뒤에도 정상 응답한다', (after.result?.tools?.length ?? 0) === 6);
}
{
  const p = await call('ping', {});
  check('ping 에 응답한다', !!p.result && !p.error, JSON.stringify(p.result??p.error).slice(0,60));
}
{
  const u = await call('모르는/메서드', {});
  check('모르는 메서드는 -32601', u.error?.code === -32601, JSON.stringify(u.error??'').slice(0,80));
}
check('stdout 에 JSON 아닌 줄이 하나도 없다', badLines.length === 0, badLines.join(' | ').slice(0,150));
console.log(`     stderr ${stderrBuf.length}자${stderrBuf?': "'+stderrBuf.slice(0,80)+'"':''}`);

proc.kill();
const f = R.filter(x=>!x.p);
console.log('\n' + '═'.repeat(62));
console.log(`검사 ${R.length}건 · 통과 ${R.length-f.length} · 실패 ${f.length}`);
if (f.length) { console.log('\n실패:'); for (const x of f) console.log(`  ✗ ${x.l}`); }
process.exit(f.length?1:0);
