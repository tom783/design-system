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
//  · 응답 크기 — 커지면 AI 컨텍스트를 태운다. 운영 상한은 packages/mcp/budget.mjs 한 곳(R49)
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { readFileSync } from 'node:fs';
import { BUDGETS } from '../../packages/mcp/budget.mjs';
// 문구는 매니페스트가 원본이다. 하네스에 문장을 복사하면 지침을 고칠 때마다 깨진다(R28).
const stored = JSON.parse(readFileSync(new URL('../../packages/mcp/manifest.json', import.meta.url), 'utf8'));
// 절대경로를 박으면 내 기계에서만 돈다. 실제로 CI(리눅스)에서 initialize 타임아웃으로 죽었다.
const SERVER = fileURLToPath(new URL('../../packages/mcp/server.mjs', import.meta.url));
const proc = spawn('node', [SERVER], { stdio: ['pipe','pipe','pipe'] });
// 한글 UTF-8 문자가 청크 경계에서 나뉘어도 대체 문자로 손상되지 않게 디코딩한다.
proc.stdout.setEncoding('utf8');
proc.stderr.setEncoding('utf8');
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
  check(`list_components 응답은 ${BUDGETS.list.total}바이트 이하`, Buffer.byteLength(s) <= BUDGETS.list.total, `${Buffer.byteLength(s)}바이트`);
  check('list_components 가 import 구문을 준다', /import \{/.test(s), s.slice(0,110));
  const list = r.structuredContent.components;
  check('목록은 부품의 partOf를 주고 독립 CardSkeleton은 유지한다', list.find((c) => c.name === 'SelectTrigger')?.partOf === 'Select' && !Object.hasOwn(list.find((c) => c.name === 'CardSkeleton'), 'partOf'));
  check('목록은 이름·종류·목적·import·partOf만 제공한다', list.every((c) => Object.keys(c).every((key) => ['name', 'kind', 'purpose', 'import', 'partOf'].includes(key))));
}
{
  // R49: 리소스는 저장 형태(derived 복원 규칙 + 축약 항목)가 아니라 읽을 수 있는 선택 색인이다.
  const rr = await call('resources/read', { uri: 'design://components' });
  const bytes = Buffer.byteLength(rr.result.contents[0].text);
  check(`components 색인이 ${BUDGETS.index.total}바이트 이하`, bytes <= BUDGETS.index.total, `${bytes}바이트`);
  const index = JSON.parse(rr.result.contents[0].text);
  const part = index.components.find((c) => c.name === 'SelectTrigger');
  const parent = index.components.find((c) => c.name === 'Select');
  check('리소스는 복원 규칙 없이 읽는 색인이다 — 이름·분류·용도·쓰는 때·금지·부품 관계만', !Object.hasOwn(index, 'derived')
    && index.components.length === stored.components.length && /get_component/.test(index.description)
    && index.components.every((c) => Object.keys(c).every((key) => ['name', 'partOf', 'category', 'purpose', 'useWhen', 'dont', 'parts'].includes(key)))
    && part.partOf === 'Select' && parent.category && parent.parts.includes('SelectTrigger') && parent.useWhen.length && parent.dont.length,
    `${index.components.length}항목`);
  const entryMax = Math.max(...index.components.map((c) => Buffer.byteLength(JSON.stringify(c))));
  check(`색인 항목 하나는 ${BUDGETS.index.entry}바이트 이하`, entryMax <= BUDGETS.index.entry, `최대 ${entryMax}바이트`);
}
{
  const bad = await call('tools/call', { name: '없는도구', arguments: {} });
  check('모르는 도구는 JSON-RPC 에러 -32602', bad.error?.code === -32602, JSON.stringify(bad.error??bad.result).slice(0,100));
}

for (const query of ['보기 전환', '기간 단위', '일 주 월', '토글 그룹', '세그먼트', '차트 지표 전환']) {
  const response = await t('which_component', { description: query });
  check(`세그먼트 검색: ${query}`, response.structuredContent?.candidates[0]?.name === 'SegmentedControl');
}
{
  const component = (await t('get_component', { name: 'SegmentedControl' })).structuredContent;
  check('SegmentedControl은 options·제어·크기·이름·축약 규칙을 전달한다',
    ['options', 'value', 'defaultValue', 'onValueChange', 'size', 'fullWidth', 'iconOnly', 'disabled'].every(name => component.props.some(p => p.name === name))
    && component.rules.some(r => r.text.includes('aria-label')) && component.rules.some(r => r.text.includes('말줄임')));
  for (const name of ['Tabs', 'RadioGroup']) {
    const related = (await t('get_component', { name })).structuredContent;
    check(`${name}와 세그먼트의 양방향 갈림길`, component.related.includes(name) && component.dont.some(s => s.includes(name))
      && related.related.includes('SegmentedControl') && related.dont.some(s => s.includes('SegmentedControl')));
  }
  const tokens = (await call('resources/read', { uri: 'design://tokens' })).result.contents[0].text;
  check(`design://tokens 응답은 ${BUDGETS.tokens}바이트 이하`, Buffer.byteLength(tokens) <= BUDGETS.tokens, `${Buffer.byteLength(tokens)}바이트`);
  const rules = (await t('get_rules', {})).content[0].text;
  check(`get_rules 전체 응답은 ${BUDGETS.rules}바이트 이하`, Buffer.byteLength(rules) <= BUDGETS.rules, `${Buffer.byteLength(rules)}바이트`);
}

for (const query of ['KPI', '지표', '대시보드 숫자', '요약 수치', '증감', '전일 대비']) {
  const response = await t('which_component', { description: query });
  check(`지표 타일 검색: ${query}`, response.structuredContent?.candidates[0]?.name === 'StatTile');
}
for (const [query, name] of [['KPI 목표 달성도', 'BulletRow'], ['매출 시간 추세', 'TrendBand']]) {
  const response = await t('which_component', { description: query });
  check(`지표 갈림길: ${query}`, response.structuredContent?.candidates[0]?.name === name);
}
{
  const component = (await t('get_component', { name: 'StatTile' })).structuredContent;
  check('StatTile 상세는 API·한국어 축약·그리드·증감 규칙을 제공한다',
    ['label', 'value', 'format', 'delta', 'goodDirection', 'state', 'href', 'asChild'].every(name => component?.props.some(p => p.name === name))
    && component.rules.some(r => r.text.includes('만/억/조')) && component.rules.some(r => r.text.includes('200px') && r.text.includes('16px'))
    && component.rules.some(r => r.text.includes('success/danger')));
  check('StatTile와 BulletRow는 단일 KPI·목표 달성의 갈림길을 전달한다',
    component.related.includes('BulletRow') && component.dont.some(s => s.includes('BulletRow'))
    && (await t('get_component', { name: 'BulletRow' })).structuredContent.dont.some(s => s.includes('StatTile')));
}
// 목표 49 DescriptionList: 키-값 질의의 첫 후보, 표·요약과의 갈림길, 빈 값·두 열 경계·합계 계약.
for (const query of ['키-값', '라벨과 값', '주문 정보', '합계 묶음', 'key value']) {
  const response = await t('which_component', { description: query });
  check(`설명 목록 검색: ${query}`, response.structuredContent?.candidates[0]?.name === 'DescriptionList');
}
{
  const component = (await t('get_component', { name: 'DescriptionList' })).structuredContent;
  check('DescriptionList 상세는 API·빈 값·두 열 경계·합계 규칙과 DataTable·Peek 갈림길을 제공한다',
    ['items', 'columns', 'align', 'labelWidth'].every(name => component?.props.some(p => p.name === name))
    && component.rules.some(r => r.text.includes('없음')) && component.rules.some(r => r.text.includes('640px') && r.text.includes('360px'))
    && component.rules.some(r => r.text.includes('emphasis')) && ['DataTable', 'Peek'].every(name => component.dont.some(s => s.includes(name))));
}
// 목표 57: 폼 하단 고정 액션 줄·표 합계 행 — 질의 첫 후보와 디자인 총괄 지침(purpose·useWhen·dont)·API.
for (const [query, expected] of [['폼 아래에 취소와 저장 버튼을 항상 고정해 줘', 'FormActionBar'],
  ['sticky save and cancel bar at the bottom of the edit form', 'FormActionBar'],
  ['주문 상품 표 맨 아래에 수량과 금액 합계 행', 'DataTable'], ['totals row at the bottom of the order items table', 'DataTable'],
  ['배송비와 할인, 결제 금액 내역을 표 아래 오른쪽에', 'DescriptionList']]) {
  const response = await t('which_component', { description: query });
  check(`목표 57 검색: ${query} → ${expected}`, response.structuredContent?.candidates[0]?.name === expected);
}
{
  const bar = (await t('get_component', { name: 'FormActionBar' })).structuredContent;
  check('FormActionBar 상세는 지침(purpose·useWhen·dont)과 저장 중·변경·오류·삭제 API를 제공한다',
    bar?.purpose === '등록·편집 폼의 취소·저장(과 편집의 삭제)을 화면 아래 한 줄로 고정한다.'
    && bar.useWhen.some(s => s.includes('AppShell 본문 마지막')) && ['sticky div', 'DialogFooter', '주요 버튼', 'BulkActionBar'].every(w => bar.dont.some(s => s.includes(w)))
    && ['saving', 'dirty', 'errorCount', 'onCancel', 'onDelete', 'form', 'contentMaxWidth'].every(name => bar.props.some(p => p.name === name)));
  const table = (await t('get_component', { name: 'DataTable' })).structuredContent;
  check('DataTable 상세는 합계 행(summary) API·지침과 DescriptionList 갈림길을 제공한다',
    table?.props.some(p => p.name === 'summary') && table.useWhen.some(s => s.includes('합을 확인'))
    && ['dl·div', '이 페이지 합계', 'DescriptionList'].every(w => table.dont.some(s => s.includes(w))));
}
// 목표 64(0.6.0 3b): 섹션 제목 줄 — 질의 첫 후보, 디자인 총괄 지침(purpose·useWhen·dont), 층 구분(S-1)이 세 머리에 다 있다.
for (const query of ['섹션 제목', 'section header', '섹션 머리', '대시보드 최근 출고 섹션 제목 옆에 전체 보기 링크', 'section title with view all link']) {
  const response = await t('which_component', { description: query });
  check(`목표 64 검색: ${query} → SectionHeader`, response.structuredContent?.candidates[0]?.name === 'SectionHeader');
}
{
  const section = (await t('get_component', { name: 'SectionHeader' })).structuredContent;
  check('SectionHeader 상세는 지침(purpose·useWhen·dont)과 제목·개수·설명·control·actions API를 제공한다',
    section?.purpose.startsWith('카드 밖 페이지 섹션의 제목·보조 설명·섹션 동작을 한 줄로') && section.useWhen.some(s => s.includes('섹션이 둘 이상'))
    && ['flex div', 'CardHeader', 'primary', '표 위 별도 줄', 'legend'].every(w => section.dont.some(s => s.includes(w)))
    && ['title', 'as', 'count', 'description', 'control', 'actions'].every(name => section.props.some(p => p.name === name))
    && section.rules.some(r => r.text.includes('aria-labelledby')) && section.rules.some(r => r.text.includes('480px')));
  const page = (await t('get_component', { name: 'PageHeader' })).structuredContent;
  const cardHeader = (await t('get_component', { name: 'CardHeader' })).structuredContent;
  check('PageHeader·CardHeader 상세가 SectionHeader 와의 층 구분(S-1)을 알려 준다',
    page?.rules.some(r => r.text.includes('SectionHeader') && r.text.includes('CardHeader'))
    && cardHeader?.rules.some(r => r.text.includes('SectionHeader') && r.text.includes('카드 하나만')));
}

// 0.6.0 3a: 반복 입력 줄 — 질의 첫 후보, 디자인 총괄 지침(purpose·useWhen·dont)·API, FormActionBar 묶음 오류 지침이 이 부품으로 바뀜.
for (const query of ['품목 반복 입력', 'repeat rows', 'line items', '출고 품목을 여러 줄로 입력하고 줄을 추가·삭제', '품목이 하나도 없을 때 목록 전체 오류 표시']) {
  const response = await t('which_component', { description: query });
  check(`반복 입력 줄 검색: ${query} → FieldList`, response.structuredContent?.candidates[0]?.name === 'FieldList');
}
{
  const list = (await t('get_component', { name: 'FieldList' })).structuredContent;
  check('FieldList 상세는 지침(purpose·useWhen·dont)과 값·열·최소/최대·세 층 오류 API를 제공한다',
    list?.purpose === '같은 칸 묶음을 여러 줄 입력받는다(출고 품목, 상품 옵션, 묶음 상품 구성).'
    && list.useWhen.some(s => s.includes('1~4개')) && ['테두리 상자', '회색 보조 글자', 'Sheet', 'CSV'].every(w => list.dont.some(s => s.includes(w)))
    && ['value', 'onValueChange', 'columns', 'createItem', 'min', 'max', 'error', 'rowError', 'hideLabel'].every(name => list.props.some(p => p.name === name))
    && list.rules.some(r => r.text.includes('errorCount')) && list.rules.some(r => r.text.includes('되돌리기')));
  const bar = (await t('get_component', { name: 'FormActionBar' })).structuredContent;
  check('FormActionBar 목록 단위 오류 지침은 FieldList error 다(추가 버튼 aria-invalid·toast.error 지침 없음)',
    bar?.rules.some(r => r.text.includes('FieldList error')) && !bar.rules.some(r => r.text.includes('toast.error'))
    && bar.related.includes('FieldList'));
}

for (const query of ['날짜 시간', '시각', '예약 발행', '일시']) {
  const response = await t('which_component', { description: query });
  check(`날짜+시각 검색: ${query}`, response.structuredContent?.candidates[0]?.name === 'DatePicker');
}
{
  const response = await t('get_component', { name: 'DatePicker' });
  const component = response.structuredContent;
  const time = component?.props.find(prop => prop.name === 'time');
  check('DatePicker 상세는 시각 API·분 간격·지역 시간 규칙을 제공한다',
    !!time && /true/.test(time.type) && ['1', '5', '10', '15', '30'].every(step => time.type.includes(step))
      && component.rules.some(rule => /single/.test(rule.text) && /지역 시간/.test(rule.text)));
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
// 목표 75 3단계: 상단 바 — 조립 항목 app-header(kind: pattern)·새 부품 첫 후보, 기존 항목 한 줄씩(AppShell·Toaster·State·SideNav·Tabs·CountBadge).
for (const [query, expected] of [['상단 바에 알림 벨과 사용자 메뉴 배치', 'app-header'], ['top bar with a store switcher and a notification bell', 'app-header'],
  ['지금 보고 있는 제품을 다른 제품으로 전환', 'ContextSwitcher'], ['알림 목록 패널', 'NotificationCenter'], ['안 읽은 개수 표시', 'CountBadge'],
  ['권한 없는 화면', 'EmptyState'], ['새 취소 요청이 오면 화면 구석에 알림을 띄우고 이동 버튼', 'Toaster']]) {
  const response = await t('which_component', { description: query });
  check(`목표 75 검색: ${query} → ${expected}`, response.structuredContent?.candidates[0]?.name === expected);
}
{
  const top = (await t('which_component', { description: '상단 바에 알림 벨과 사용자 메뉴 배치' })).structuredContent.candidates[0];
  const header = (await t('get_component', { name: 'app-header' })).structuredContent;
  const listed = new Set((await t('list_components', {})).structuredContent.components.map(item => item.name));
  const tags = [...new Set([...(header?.example ?? '').matchAll(/<([A-Z][A-Za-z0-9]*)/g)].map(match => match[1]))];
  check('app-header 는 kind: pattern 후보·상세이고 uses·예시 태그가 모두 공개 부품이다(초안 이름 NotificationBell·UserMenu·Spacer 없음)',
    top?.kind === 'pattern' && header?.kind === 'pattern' && !listed.has('app-header') && header.uses.every(name => listed.has(name))
    && tags.length >= 7 && tags.every(name => listed.has(name)) && !/NotificationBell|UserMenu|Spacer|mode=/.test(header.example)
    && ['header=', 'headerEnd=', 'DropdownMenuSub'].every(text => header.example.includes(text)),
    tags.join(' · '));
  const index = JSON.parse((await call('resources/read', { uri: 'design://components' })).result.contents[0].text);
  check('색인 patterns 에 app-header 가 고르는 필드만으로 실린다', index.patterns?.length === 1 && index.patterns[0].name === 'app-header'
    && Object.keys(index.patterns[0]).join() === 'name,category,purpose,useWhen,dont,uses');
  const rules = async name => (await t('get_component', { name })).structuredContent.rules.map(rule => rule.text).join(' ');
  check('기존 항목 한 줄씩 — AppShell headerEnd 64 · toast.notify 등급·묶음 키·한 번에 하나 · State size=page · SideNav brand · Tabs·CountBadge',
    /headerEnd.*64px/.test(await rules('AppShell')) && /toast\.notify.*groupKey/.test(await rules('Toaster')) && /한 번에 하나/.test(await rules('Toaster'))
    && /size="page"/.test(await rules('EmptyState')) && /size="page"/.test(await rules('ErrorState')) && /표시 전용/.test(await rules('SideNav'))
    && /TabsTrigger count/.test(await rules('Tabs')) && /링 2px/.test(await rules('CountBadge')));
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
{
  const sheet = (await t('get_component', { name: 'SheetContent' })).structuredContent;
  check('SheetContent는 Dialog 부품·규칙을 상속한다', sheet.partOf === 'Dialog' && sheet.inheritedFrom === 'Dialog'
    && sheet.rules.some(rule => rule.text.includes('onDismissAttempt')));
  check('Sheet의 Dialog·Peek 갈림길을 보존한다', sheet.dont.some(text => text.includes('Peek')) && sheet.related.includes('DialogContent'));
  for (const description of ['옆 패널','사이드 패널','서랍','드로어','슬라이드 패널']) {
    const result = (await t('which_component', { description })).structuredContent;
    check(`${description} 첫 후보는 SheetContent`, result.candidates[0].name === 'SheetContent');
  }
}
{
  for (const description of ['파일 업로드','이미지 업로드','첨부','드래그 앤 드롭','대표 이미지','엑셀 업로드']) {
    const result = (await t('which_component', { description })).structuredContent;
    check(`${description} 첫 후보는 FileUpload`, result.candidates[0].name === 'FileUpload');
  }
  const upload = (await t('get_component', { name: 'FileUpload' })).structuredContent;
  check('FileUpload 항목·검증·대표 이미지 API와 소비자 규칙', ['value','onValueChange','accept','maxSize','multiple','maxFiles','mode'].every(name => upload.props.some(prop => prop.name === name))
    && upload.rules.some(rule => rule.text.includes('id·file')) && upload.dont.some(text => text.includes('전송')));
  let largest = { name: '', bytes: 0 };
  for (const entry of stored.components) {
    const response = await t('get_component', { name: entry.name });
    const bytes = Buffer.byteLength(response.content[0].text);
    if (bytes > largest.bytes) largest = { name: entry.name, bytes };
  }
  check(`get_component 한 건은 ${BUDGETS.detail}바이트 이하`, largest.bytes <= BUDGETS.detail, `${largest.name} ${largest.bytes}바이트`);
}
// R43: 실제 응답 단위 회귀 상한. 실측 대비 여유는 각각 300B 이하다.
{
  for (const description of ['단계', '스텝', '진행 단계', '여러 단계 폼', '1단계 2단계']) {
    const result = (await t('which_component', { description })).structuredContent;
    check(`${description} 첫 후보는 Steps`, result.candidates[0]?.name === 'Steps');
  }
  const steps = (await t('get_component', { name: 'Steps' })).structuredContent;
  check('Steps API·0 기준·완료 이동·제목 포커스 계약',
    ['steps','current','onStepClick'].every(name => steps.props.some(prop => prop.name === name))
    && steps.rules.some(rule => rule.text.includes('0 기준'))
    && steps.rules.some(rule => rule.text.includes('완료 단계만'))
    && steps.rules.some(rule => rule.text.includes('제목') && rule.text.includes('포커스')));
  for (const name of ['FormFlow', 'TaskProgress']) {
    const component = (await t('get_component', { name })).structuredContent;
    check(`${name}와 Steps 양방향 갈림길`, component.dont.some(text => text.includes('Steps'))
      && component.related.includes('Steps') && steps.related.includes(name));
  }
  const catalog = (await call('resources/read', { uri: 'design://components' })).result.contents[0].text;
  const tokens = (await call('resources/read', { uri: 'design://tokens' })).result.contents[0].text;
  const list = (await t('list_components', {})).content[0].text;
  const rules = (await t('get_rules', {})).content[0].text;
  // R49 색인 실측 23,191B + 309B. 목록 19,873B·토큰 67,555B·규칙 4,327B 는 그대로다. 운영 상한은 budget.mjs.
  // 목표 49 FilterBar 색인 +362B·목록 +206B · BulkActionBar 색인 +341B·목록 +203B · DescriptionList 색인 +436B·목록 +199B.
  // 0.6.0 3a FieldList 색인 +669B·목록 +204B · 목표 64(0.6.0 3b) SectionHeader 색인 +736B·목록 +244B.
  // 목표 75 2단계: ContextSwitcher·ContextSwitcherGroup·NotificationCenter·CountBadge 최소 항목 — 색인 +1,370B · 목록 +851B(build.test 와 같은 수치).
  // 목표 75 3단계: 조립 항목 app-header — 색인 +978B · 목록 그대로(build.test·server.test 와 같은 수치).
  for (const [name, text, limit] of [['색인',catalog,23_500 + 362 + 341 + 436 + 935 + 255 + 669 + 736 + 1_370 + 978],['목록',list,19_950 + 206 + 203 + 199 + 212 + 204 + 244 + 851],['토큰',tokens,67_800],['규칙',rules,4_400]]) {
    const bytes = Buffer.byteLength(text);
    check(`${name} 응답 크기 회귀 상한 ${limit}B`, bytes <= limit, `${bytes}바이트`);
  }
  const detailBytes = Math.max(...(await Promise.all(stored.components.map(async entry =>
    Buffer.byteLength((await t('get_component', { name: entry.name })).content[0].text)))));
  // 목표 57: DataTable 상세 4,576B → 5,642B(summary 합계 행 지침 +1,066B). 운영 상한은 budget.mjs.
  // 목표 64(0.6.0): DataTable 5,940B → 6,118B(+178 — 비제어 초기값 defaultSelectedIds). 운영 상한 7,000B(budget.mjs). build.test R23 과 같은 수.
  check('최대 상세 응답 크기 회귀 상한 6,118B', detailBytes <= 4_800 + 842 + 298 + 178, `${detailBytes}바이트`);
}
check('stdout 에 JSON 아닌 줄이 하나도 없다', badLines.length === 0, badLines.join(' | ').slice(0,150));
console.log(`     stderr ${stderrBuf.length}자${stderrBuf?': "'+stderrBuf.slice(0,80)+'"':''}`);

proc.kill();
const f = R.filter(x=>!x.p);
console.log('\n' + '═'.repeat(62));
console.log(`검사 ${R.length}건 · 통과 ${R.length-f.length} · 실패 ${f.length}`);
if (f.length) { console.log('\n실패:'); for (const x of f) console.log(`  ✗ ${x.l}`); }
process.exit(f.length?1:0);
