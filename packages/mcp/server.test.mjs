import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { componentIndex } from './catalog.mjs';
import { BUDGETS } from './budget.mjs';

const manifest = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url), 'utf8'));
const baseline = JSON.parse(await readFile(new URL('../../docs/qa/fixtures/get-component-baseline.json', import.meta.url), 'utf8'));

// 실제 파이프의 모든 줄을 기록한다. 응답만 선별하면 console.log 오염을 놓치므로 파싱 실패도 보관한다.
async function client(t) {
  const child = spawn(process.execPath, [new URL('./server.mjs', import.meta.url).pathname], { stdio: ['pipe','pipe','pipe'] });
  let sequence = 0;
  const lines = [], pending = new Map(), pollution = [], unsolicited = [];
  let stderr = '';
  child.stderr.setEncoding('utf8'); child.stderr.on('data', (chunk) => { stderr += chunk; });
  createInterface({ input: child.stdout }).on('line', (line) => {
    lines.push(line);
    let data;
    try { data = JSON.parse(line); } catch { pollution.push(line); return; }
    const callback = pending.get(data.id);
    if (callback) { pending.delete(data.id); callback(data); } else unsolicited.push(data);
  });
  const write = (value) => child.stdin.write(`${typeof value === 'string' ? value : JSON.stringify(value)}\n`);
  const request = (method, params) => {
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`응답 시간 초과: ${method}; ${stderr}`)); }, 5000);
      pending.set(id, (response) => { clearTimeout(timeout); resolve(response); });
      write({ jsonrpc: '2.0', id, method, ...(params === undefined ? {} : { params }) });
    });
  };
  const rawRequest = (line) => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('파싱 오류 응답 시간 초과')), 5000);
    pending.set(null, (data) => { clearTimeout(timeout); resolve(data); }); write(line);
  });
  t.after(async () => {
    const closed = once(child, 'close'); child.stdin.end();
    const timer = setTimeout(() => child.kill(), 5000);
    const [code, signal] = await closed; clearTimeout(timer);
    assert.equal(signal, null); assert.equal(code, 0, stderr);
    assert.deepEqual(pollution, [], 'stdout에 JSON이 아닌 줄이 없어야 한다');
    assert.deepEqual(unsolicited, [], '알림 응답이나 요청하지 않은 출력이 없어야 한다');
    for (const line of lines) assert.equal(JSON.parse(line).jsonrpc, '2.0', '모든 stdout 줄은 MCP JSON-RPC 메시지다');
  });
  return { request, rawRequest, write, unsolicited, child };
}
const init = (protocolVersion) => ({ protocolVersion, capabilities: {}, clientInfo: { name: '스모크 테스트', version: '1' } });
const call = (c, name, args) => c.request('tools/call', { name, arguments: args });

test('실제 stdio 핸드셰이크·알림·버전 협상', { timeout: 10000 }, async (t) => {
  const c = await client(t);
  for (const version of ['2025-06-18','2025-03-26','2024-11-05']) {
    const response = await c.request('initialize', init(version));
    assert.equal(response.result.protocolVersion, version);
    assert.deepEqual(response.result.capabilities, { tools: {}, resources: {} });
    assert.ok(response.result.instructions.includes('which_component'));
  }
  const unknown = await c.request('initialize', init('2099-99-99'));
  assert.equal(unknown.result.protocolVersion, '2025-06-18'); assert.equal(unknown.error, undefined);
  c.write({ jsonrpc: '2.0', method: 'notifications/initialized' });
  c.write({ jsonrpc: '2.0', method: 'ping' });
  c.write({ jsonrpc: '2.0', method: '알수없는알림' });
  assert.deepEqual((await c.request('ping')).result, {});
  // ping 응답은 앞선 알림을 처리했다는 순서 장벽이다. 종료 시에도 늦은 응답까지 확인한다.
  assert.deepEqual(c.unsolicited, []);
});
test('6개 도구·구조화 하위 호환·선택·규칙·인자 검증', async (t) => {
  const c = await client(t);
  const { result } = await c.request('tools/list');
  assert.equal(result.tools.length, 6);
  for (const tool of result.tools) { assert.ok(tool.title); assert.equal(tool.inputSchema.type, 'object'); }
  const token = (await call(c, 'get_token', { name: '--bg-surface' })).result;
  assert.deepEqual(JSON.parse(token.content[0].text), token.structuredContent);
  assert.ok(token.structuredContent.light.value); assert.ok(token.structuredContent.dark.value);
  assert.ok(token.structuredContent.tailwind.includes('bg-surface'));
  assert.equal((await call(c, '없는도구', {})).error.code, -32602);
  for (const args of [{}, { name: 7 }, { name: '' }, { name: 'bg-surface', extra: true }, null]) assert.equal((await call(c, 'get_token', args)).error.code, -32602);
  assert.equal((await call(c, 'which_component', { description: '요약', limit: 0 })).error.code, -32602);
  assert.equal((await call(c, 'get_rules', { topic: '없는주제' })).error.code, -32602);
  const absent = await call(c, 'get_token', { name: '없는토큰' });
  assert.equal(absent.error, undefined); assert.equal(absent.result.isError, true); assert.match(absent.result.content[0].text, /search_tokens/);
  const found = (await call(c, 'search_tokens', { category: 'semantic', query: 'bg-surface' })).result;
  assert.equal(found.structuredContent.tokens[0].name, 'bg-surface');
  assert.ok((await call(c, 'list_components', {})).result.structuredContent.components.length > 20);
  const peek = (await call(c, 'get_component', { name: 'Peek' })).result.structuredContent;
  assert.ok(peek.props.some((p) => p.name === 'items')); assert.ok(peek.slots.includes('peek')); assert.ok(peek.rules.length);
  const candidates = (await call(c, 'which_component', { description: '표에서 행 요약을 보여주고 싶다' })).result.structuredContent.candidates;
  assert.equal(candidates[0].name, 'Peek'); assert.ok(candidates.length > 1);
  assert.equal((await call(c, 'which_component', { description: 'zxq987' })).result.isError, true);
  assert.ok((await call(c, 'get_rules', { topic: '폼' })).result.structuredContent.rules.every((rule) => rule.topic === '폼'));
});
test('리소스 3개 읽기·없는 URI·메서드 오류', async (t) => {
  const c = await client(t);
  const { resources } = (await c.request('resources/list')).result;
  assert.equal(resources.length, 3);
  for (const resource of resources) {
    const result = (await c.request('resources/read', { uri: resource.uri })).result.contents[0];
    assert.equal(result.uri, resource.uri); assert.equal(result.mimeType, resource.mimeType); assert.ok(result.text.length);
    if (result.uri === 'design://components') {
      assert.equal(result.text, JSON.stringify(componentIndex(manifest)));
      // R49 색인 실측 23,191바이트 + 여유 309바이트. 운영 상한은 packages/mcp/budget.mjs(40,000B).
      // 목표 49 FilterBar +362B · BulkActionBar +341B · DescriptionList +436B.
      // 목표 57 FormActionBar 553B · DataTable summary 313B · DescriptionList 금액 내역 69B.
      assert.ok(Buffer.byteLength(result.text) <= 23_500 + 362 + 341 + 436 + 935 + 255, '색인 전송량을 잰다');
    } else if (result.mimeType === 'application/json') assert.ok(JSON.parse(result.text).length);
  }
  assert.equal((await c.request('resources/read', { uri: 'design://missing' })).error.code, -32002);
  assert.equal((await c.request('resources/read', {})).error.code, -32602);
  assert.equal((await c.request('unknown')).error.code, -32601);
});
test('R28 지침을 반영한 기준선의 구조화 결과·text 직렬화와 신규 가족 목록을 보존한다', async (t) => {
  const c = await client(t);
  const checkBaseline = (response, expected) => {
    assert.equal(response.error, undefined);
    assert.deepEqual(response.result, {
      content: [{ type: 'text', text: JSON.stringify(expected) }],
      structuredContent: expected,
    }, '구조화 결과와 text의 키 순서·문자열도 기준선 그대로다');
  };
  assert.equal(Object.keys(baseline).length, 9);
  assert.equal(baseline.__list.length, 99);
  for (const [name, expected] of Object.entries(baseline)) {
    if (name === '__list') continue;
    // R35에서 허용한 DataTable 지침·관련 링크만 더하고 나머지 API 기준선은 유지한다.
    const next = name === 'DataTable' ? { ...expected,
      rules: [...expected.rules.slice(0, -1), {
        text: '페이지를 넘기면 선택이 해제된다. 서버 페이징은 표 아래에 Pagination을 조립한다.', source: 'DESIGN.md 4.1',
      }, expected.rules.at(-1)], related: [...expected.related, 'Pagination'],
    } : expected;
    let adjusted = name === 'RadioGroupItem' ? { ...next, dont: [...next.dont,
      '제출값 없이 보기·필터 단위를 즉시 바꾸면 SegmentedControl, 패널 전환은 Tabs를 쓴다'],
    } : next;
    if (name === 'FormFlow') adjusted = { ...adjusted,
      dont: [...adjusted.dont, '단계 위치는 Steps를 쓰고 폼을 중첩하지 마라'],
      related: [...adjusted.related, 'Steps'],
      rules: [...adjusted.rules, { text: '여러 단계 폼은 활성 단계마다 FormFlow 하나를 두고 이동 후 새 제목에 포커스한다.', source: 'DESIGN.md 11.8' }],
    };
    // 목표 57(DESIGN.md §4.3): 합계 행 summary 의 지침·prop·slot 만 더한다. 기존 기준선 값·순서는 그대로다.
    if (name === 'DataTable') adjusted = { ...adjusted,
      useWhen: [...adjusted.useWhen, '금액·수량처럼 더할 수 있는 열이 있고 합을 확인해야 하는 표(summary 합계 행)'],
      dont: [...adjusted.dont, '표 밖 dl·div로 열 합계를 만들지 마라', "페이지 일부 합을 '합계'라고만 쓰지 마라('이 페이지 합계')",
        '배송비·할인은 합계 행이 아니라 DescriptionList에 둔다'],
      rules: [...adjusted.rules,
        { text: 'summary는 숫자 열의 합계를 같은 열 맨 아래 한 줄로 둔다. values에 없는 열은 비우고 null은 —다. 빈 표에서는 숨는다.', source: 'DESIGN.md 4.3' },
        { text: '라벨은 범위다: 페이지 하나면 합계, 일부면 이 페이지 합계, 서버 전체는 전체 합계 · N건. 가로 스크롤 표는 금액 열을 pinnedEnd로.', source: 'DESIGN.md 4.3' }],
      related: [...adjusted.related, 'DescriptionList'],
      keywords: [...adjusted.keywords, '합계 행', '열 합계', '표 합계', '페이지 합계', '전체 합계', 'totals row', 'table footer'],
      props: [...adjusted.props, { name: 'summary', type: 'DataTableSummaryRow[] | undefined', required: false, doc: '열 합계 행(tfoot, 최대 2행). 라벨은 첫 데이터 열에 선다.' }],
      slots: [...adjusted.slots, 'data-table-summary', 'data-table-summary-cell', 'data-table-summary-row'].sort(),
    };
    // 목표 57 4단계(DESIGN.md §4.2·§4.4·§24.5 · 도그푸딩 6): 금지 2개를 더하고, 합계 라벨 규칙 끝의 고정 문장을
    // §4.4 고정 열 규칙(상태 열·금액 열, 고정선은 넘칠 때만)으로 옮긴다. props·slots·나머지 순서는 그대로다.
    if (name === 'DataTable') adjusted = { ...adjusted,
      dont: [...adjusted.dont, 'FilterBar·BulkActionBar와 쓰는 표에 exportFileName을 주지 마라',
        '5행 이하 표에 정렬(enableSorting:false로 끈다)·내보내기를 달지 마라'],
      rules: [...adjusted.rules.slice(0, -1),
        { text: '라벨은 범위다: 페이지 하나면 합계, 일부면 이 페이지 합계, 서버 전체는 전체 합계 · N건.', source: 'DESIGN.md 4.3' },
        { text: 'pinnedEnd로 상태 열(목록)·금액 열(합계 표)을 고정한다. 좁은 폭에서도 보이고 고정선은 표가 넘칠 때만 생긴다.', source: 'DESIGN.md 4.4' }],
    };
    // 0.6.0 목표 64: which_component 키워드 '초성' 하나만 끝에 더한다("초성만 쳐도 찾게"가 SideNav '브랜드'로 갔다). 나머지 그대로다.
    if (name === 'Combobox') adjusted = { ...adjusted, keywords: [...adjusted.keywords, '초성'] };
    // 목표 49(DESIGN.md §6.3): forwardRef → ref prop 으로 상속 표기만 바뀌었다. 런타임 동일.
    if (name === 'Button') adjusted = { ...adjusted, extends: ["React.ComponentProps<'button'>", ...adjusted.extends.slice(1)] };
    if (name === 'SelectTrigger') adjusted = { ...adjusted, extends: ['React.ComponentProps<typeof SelectPrimitive.Trigger>'] };
    checkBaseline(await call(c, 'get_component', { name }), adjusted);
  }
  // 기존 순서·구조·직렬화를 보존하고 R40 일시 안내·R41 StatTile·R42 SegmentedControl·R43 Steps·FormRow·목표 49 DescriptionList만 명시적으로 더한다.
  checkBaseline(await call(c, 'list_components', {}), { components: [{
    name: 'Steps', kind: 'component', purpose: '여러 단계 폼의 현재 위치와 완료·오류·예정을 표시한다.',
    import: "import { Steps } from '@s2life/ui';",
  }, {
    name: 'SegmentedControl', kind: 'component', purpose: '화면 보기와 기간·지표 단위를 즉시 바꾸는 단일 선택이다.',
    import: "import { SegmentedControl } from '@s2life/ui';",
  }, {
    name: 'FileUpload', kind: 'component', purpose: '파일을 고르고 검증하며 미리보기·목록·전송 상태를 표시한다.',
    import: "import { FileUpload } from '@s2life/ui';",
  }, {
    name: 'Pagination', kind: 'component', purpose: '목록의 페이지를 옮기고 표시 범위·전체 건수·페이지 크기를 확인한다.',
    import: "import { Pagination } from '@s2life/ui';",
  }, {
    name: 'AppShell', kind: 'component', purpose: '사이드 메뉴와 본문을 같은 업무 화면 틀로 배치한다.',
    import: "import { AppShell } from '@s2life/ui';",
  }, {
    name: 'SideNav', kind: 'component', purpose: '브랜드와 그룹별 메뉴로 현재 위치와 이동 경로를 보여준다.',
    import: "import { SideNav } from '@s2life/ui';",
  }, {
    name: 'SideNavGroup', kind: 'component', purpose: '사이드 메뉴 항목을 제목으로 묶는다.',
    import: "import { SideNavGroup } from '@s2life/ui';", partOf: 'SideNav',
  }, {
    name: 'SideNavItem', kind: 'component', purpose: '아이콘·라벨·개수와 현재 위치 또는 출시 예정 상태를 표시한다.',
    import: "import { SideNavItem } from '@s2life/ui';", partOf: 'SideNav',
  }, {
    name: 'PageHeader', kind: 'component', purpose: '페이지 제목과 설명·상태·주요 액션을 같은 위치에 배치한다.',
    import: "import { PageHeader } from '@s2life/ui';",
  }, {
    name: 'Carousel', kind: 'component', purpose: '배너·콘텐츠 슬라이드를 한 장씩 넘겨 보여준다.',
    import: "import { Carousel } from '@s2life/ui';",
  }, {
    name: 'CarouselSlide', kind: 'component', purpose: '캐러셀 안의 콘텐츠 한 장을 표시한다.',
    import: "import { CarouselSlide } from '@s2life/ui';", partOf: 'Carousel',
  }, {
    name: 'MediaViewer', kind: 'component', purpose: '이미지 확대와 동영상 팝업·플로팅 표시를 제공한다.',
    import: "import { MediaViewer } from '@s2life/ui';",
  }, ...baseline.__list.map(entry => entry.name === 'DatePicker'
    ? { ...entry, purpose: '한국어 단일 날짜·일시·기간 입력과 빠른 선택을 제공한다.' } : entry).flatMap(entry => entry.name === 'DialogHeader' ? [{
    name: 'SheetContent', kind: 'component', purpose: '목록 맥락을 유지하는 모달 옆 패널이다. side는 right·left, size는 sm 400·md 560·lg 720px다.',
    import: "import { SheetContent } from '@s2life/ui';", partOf: 'Dialog',
  }, {
    name: 'SheetBody', kind: 'component', purpose: 'SheetContent의 스크롤 본문이다. 헤더·푸터는 이 바깥에 둔다.',
    import: "import { SheetBody } from '@s2life/ui';", partOf: 'Dialog',
  }, entry] : [entry]).flatMap(entry => entry.name === 'TrendBand' ? [{
    name: 'StatTile', kind: 'component', purpose: '대시보드의 단일 지표 값과 비교 기간의 증감을 보여준다.',
    import: "import { StatTile } from '@s2life/ui';",
  }, entry] : [entry]).flatMap(entry => entry.name === 'SELECTION_COLUMN_ID' ? [entry, {
    // 목표 49: 목록 툴바 FilterBar·BulkActionBar 를 DataTable 묶음 뒤에 더한다.
    name: 'FilterBar', kind: 'component', purpose: '목록 위에 저장된 보기·검색·필터 트리거와 적용 필터 칩을 한 툴바로 둔다.',
    import: "import { FilterBar } from '@s2life/ui';",
  }, {
    name: 'BulkActionBar', kind: 'component', purpose: '표에서 행을 선택하면 툴바 자리에 선택 건수와 일괄 작업을 보인다.',
    import: "import { BulkActionBar } from '@s2life/ui';",
  }] : [entry]).flatMap(entry => entry.name === 'CardFooter' ? [entry, {
    // 목표 49 0.5.0: 상세 화면 키-값 묶음 DescriptionList 를 Card 가족 다음에 더한다.
    name: 'DescriptionList', kind: 'component', purpose: '상세 화면의 라벨-값 쌍을 같은 간격과 빈 값 표기로 보여준다.',
    import: "import { DescriptionList } from '@s2life/ui';",
  }] : [entry]).flatMap(entry => entry.name === 'FormFlow' ? [entry, {
    // 목표 57: 폼 하단 고정 액션 줄 FormActionBar 를 FormFlow 다음에 더한다.
    name: 'FormActionBar', kind: 'component', purpose: '등록·편집 폼의 취소·저장(과 편집의 삭제)을 화면 아래 한 줄로 고정한다.',
    import: "import { FormActionBar } from '@s2life/ui';",
  }] : [entry]).flatMap(entry => entry.name === 'Field' ? [entry, {
    // 2026-11-22: 같은 줄 정렬 FormRow 를 Field 의 부품으로 더한다.
    name: 'FormRow', kind: 'component', purpose: '같은 줄 Field들의 레이블·설명·입력·오류 행을 맞춘다.',
    import: "import { FormRow } from '@s2life/ui';", partOf: 'Field',
  }] : [entry])] });
  // 부품 조회가 보관 형태에 부모 필드나 기본값을 써 넣지 않았는지도 확인한다 — 조회 뒤 색인이 처음 그대로다.
  const resource = (await c.request('resources/read', { uri: 'design://components' })).result.contents[0];
  assert.equal(resource.text, JSON.stringify(componentIndex(manifest)));
});

test('R49: design://components 는 복원 규칙 없이 읽는 선택 색인이고 상세는 get_component 로 넘긴다', async (t) => {
  const c = await client(t);
  const listed = (await c.request('resources/list')).result.resources.find(r => r.uri === 'design://components');
  assert.equal(listed.mimeType, 'application/json');
  assert.match(listed.description, /get_component/);
  const index = JSON.parse((await c.request('resources/read', { uri: 'design://components' })).result.contents[0].text);
  assert.deepEqual(Object.keys(index), ['description', 'components']);
  assert.match(index.description, /get_component/);
  assert.match(index.description, /import \{ 이름 \} from '@s2life\/ui';/);
  assert.equal(index.components.length, manifest.components.length);
  assert.deepEqual(index.components.map(item => item.name), manifest.components.map(item => item.name), '목록과 같은 순서');
  const allowed = ['name', 'partOf', 'category', 'purpose', 'useWhen', 'dont', 'parts'];
  for (const item of index.components) {
    const keys = Object.keys(item);
    assert.deepEqual(keys, allowed.filter(key => keys.includes(key)), `${item.name}: 정해진 필드만 정해진 순서로`);
    assert.ok(item.name && item.purpose, item.name);
    assert.ok(item.partOf ? !item.category : item.category, `${item.name}: 루트는 분류, 부품은 부모를 적는다`);
    for (const key of ['useWhen', 'dont', 'parts']) if (key in item) assert.ok(item[key].length, `${item.name}.${key}: 빈 배열은 생략`);
  }
  // 저장 형태의 축약(derived 규칙·짧은 출처·생략된 기본값)이 새지 않는다.
  assert.ok(!('derived' in index) && !/sourceRoot|optionalTypeSuffix|kindDefault/.test(JSON.stringify(index)));
  const select = index.components.find(item => item.name === 'Select');
  const trigger = index.components.find(item => item.name === 'SelectTrigger');
  assert.ok(select.parts.includes('SelectTrigger') && trigger.partOf === 'Select' && !('useWhen' in trigger));
  assert.equal(index.components.find(item => item.name === 'SELECTION_COLUMN_ID').category, 'constant');
  // 색인에 없는 상세는 같은 이름으로 get_component 에서 얻는다.
  const detail = (await call(c, 'get_component', { name: 'SelectTrigger' })).result.structuredContent;
  assert.ok(detail.props && detail.slots.includes('select-trigger') && detail.useWhen.length && detail.inheritedFrom === 'Select');
});
test('깨진 JSON 후 생존·이후 정상 처리·stdout 오염 없음', async (t) => {
  const c = await client(t);
  assert.equal((await c.rawRequest('{broken')).error.code, -32700);
  assert.equal(c.child.exitCode, null);
  assert.deepEqual((await c.request('ping')).result, {});
  assert.equal((await c.rawRequest('[]')).error.code, -32600);
  assert.deepEqual((await c.request('ping')).result, {});
});

test('R36: Sheet 검색·Dialog 규칙 상속·독자 갈림길과 API를 함께 보존한다', async t => {
  const c = await client(t);
  const result = (await call(c, 'get_component', { name: 'SheetContent' })).result;
  assert.equal(result.structuredContent.partOf, 'Dialog');
  assert.equal(result.structuredContent.inheritedFrom, 'Dialog');
  assert.ok(result.structuredContent.rules.some(rule => rule.text.includes('onDismissAttempt')));
  assert.ok(result.structuredContent.dont.some(text => text.includes('Peek')));
  assert.ok(result.structuredContent.props.some(prop => prop.name === 'showClose'));
  for (const description of ['옆 패널','사이드 패널','서랍','드로어','슬라이드 패널']) {
    const response = (await call(c, 'which_component', { description })).result;
    assert.equal(response.structuredContent.candidates[0].name, 'SheetContent');
  }
});

test('R37 파일 업로드의 여섯 검색 의도·API와 실제 응답 예산', async t => {
  const c = await client(t);
  for (const description of ['파일 업로드', '이미지 업로드', '첨부', '드래그 앤 드롭', '대표 이미지', '엑셀 업로드']) {
    const result = (await call(c, 'which_component', { description })).result.structuredContent;
    assert.equal(result.candidates[0].name, 'FileUpload');
  }
  const list = (await call(c, 'list_components', {})).result;
  // 운영 상한은 budget.mjs 한 곳에서 읽는다(R49: 목록 24,000 → 36,000, 상세 6,000 유지).
  assert.ok(Buffer.byteLength(list.content[0].text) <= BUDGETS.list.total);
  for (const component of manifest.components) {
    const detail = (await call(c, 'get_component', { name: component.name })).result;
    assert.ok(Buffer.byteLength(detail.content[0].text) <= BUDGETS.detail, component.name);
    assert.equal(detail.content[0].text, JSON.stringify(detail.structuredContent));
  }
  const upload = (await call(c, 'get_component', { name: 'FileUpload' })).result.structuredContent;
  assert.ok(upload.props.some(prop => prop.name === 'value' && prop.type === 'FileUploadItem[]'));
  assert.ok(upload.rules.some(rule => rule.source === 'DESIGN.md 11.7'));
});
