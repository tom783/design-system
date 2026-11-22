import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';

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
      const catalog = JSON.parse(result.text);
      assert.deepEqual(catalog, { derived: manifest.derived, components: manifest.components });
      // FormRow(2026-11-22) 포함 실측 88,651바이트 + 여유 299바이트. 운영 상한 90KB는 유지한다.
      assert.ok(Buffer.byteLength(result.text) <= 88_950, '복원 규칙까지 포함한 전송량을 잰다');
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
    checkBaseline(await call(c, 'get_component', { name }), adjusted);
  }
  // 기존 순서·구조·직렬화를 보존하고 R40 일시 안내·R41 StatTile·R42 SegmentedControl·R43 Steps·FormRow만 명시적으로 더한다.
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
  }, entry] : [entry]).flatMap(entry => entry.name === 'Field' ? [entry, {
    // 2026-11-22: 같은 줄 정렬 FormRow 를 Field 의 부품으로 더한다.
    name: 'FormRow', kind: 'component', purpose: '같은 줄 Field들의 레이블·설명·입력·오류 행을 맞춘다.',
    import: "import { FormRow } from '@s2life/ui';", partOf: 'Field',
  }] : [entry])] });
  // 부품 조회가 보관 형태에 부모 필드나 기본값을 써 넣지 않았는지도 확인한다.
  const resource = (await c.request('resources/read', { uri: 'design://components' })).result.contents[0];
  assert.deepEqual(JSON.parse(resource.text), { derived: manifest.derived, components: manifest.components });
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
  assert.ok(Buffer.byteLength(list.content[0].text) <= 24_000);
  for (const component of manifest.components) {
    const detail = (await call(c, 'get_component', { name: component.name })).result;
    assert.ok(Buffer.byteLength(detail.content[0].text) <= 6_000, component.name);
    assert.equal(detail.content[0].text, JSON.stringify(detail.structuredContent));
  }
  const upload = (await call(c, 'get_component', { name: 'FileUpload' })).result.structuredContent;
  assert.ok(upload.props.some(prop => prop.name === 'value' && prop.type === 'FileUploadItem[]'));
  assert.ok(upload.rules.some(rule => rule.source === 'DESIGN.md 11.7'));
});
