import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { matchComponents } from './match.mjs';
const { components } = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url), 'utf8'));

test('정확한 이름은 독립 컴포넌트가 1위이며 부품은 선택 후보에서 제외', () => {
  for (const c of components.filter((c) => (c.kind ?? 'component') === 'component' && !c.partOf)) assert.equal(matchComponents(c.name, components)[0].name, c.name);
  for (const c of components.filter((c) => c.partOf)) assert.ok(!matchComponents(c.name, components, components.length).some((candidate) => candidate.name === c.name));
});
test('가족 선택 질문에 부품이 끼지 않고 CardSkeleton은 독립 후보로 남는다', () => {
  for (const [query, parent, excluded] of [
    ['카드로 묶기', 'Card', ['CardBody', 'CardHeader', 'CardFooter', 'CardTitle']],
    ['상태 선택 필터', 'Select', ['SelectTrigger']],
    ['경로 구분자', 'Breadcrumb', ['BreadcrumbSeparator']],
  ]) {
    const candidates = matchComponents(query, components, components.length);
    assert.equal(candidates[0]?.name, parent);
    assert.ok(excluded.every((name) => !candidates.some((c) => c.name === name)));
    assert.ok(candidates.every((c) => !components.find((item) => item.name === c.name).partOf));
  }
  assert.ok(!Object.hasOwn(components.find((c) => c.name === 'CardSkeleton'), 'partOf'));
  assert.ok(!components.find((c) => c.name === 'Card').parts.includes('CardSkeleton'));
  assert.equal(matchComponents('CardSkeleton', components)[0]?.name, 'CardSkeleton');
  assert.ok(matchComponents('카드로 묶기', components).some((c) => c.name === 'CardSkeleton'));
});
test('한국어 행 요약은 Peek, 복수 후보에 근거·사용 조건·금지사항 포함', () => {
  const candidates = matchComponents('표에서 행 요약을 보여주고 싶다', components);
  assert.equal(candidates[0].name, 'Peek');
  assert.ok(candidates.length > 1);
  for (const c of candidates) { assert.ok(c.reasons.length); assert.ok(c.useWhen.length); assert.ok(c.dont.length); }
});
test('안내 도구의 한국어 목적을 구분', () => {
  for (const [query, name] of [['호버로 컨트롤 설명', 'Tooltip'], ['새 기능을 한 번 알려줘', 'Hint'], ['온보딩 투어 단계', 'Tour']]) assert.equal(matchComponents(query, components)[0].name, name);
});
test('일치하지 않는 설명과 공백은 빈 배열', () => {
  assert.deepEqual(matchComponents('zxqv987654', components), []);
  assert.deepEqual(matchComponents('  ', components), []);
});
test('대소문자·공백 차이를 흡수하고 입력을 변경하지 않는다', () => {
  const before = JSON.stringify(components);
  assert.deepEqual(matchComponents('  p E e K  ', components), matchComponents('peek', components));
  assert.equal(JSON.stringify(components), before);
});

// 사용자 표현을 그대로 유지해 키워드 데이터가 실제 선택 질문을 지원하는지 검증한다.
const routingCases = [
  ['사이드바', 'SideNav'], ['메뉴', 'SideNav'], ['내비게이션', 'SideNav'],
  ['페이지 제목', 'PageHeader'], ['화면 머리', 'PageHeader'], ['앱 셸', 'AppShell'],
  ['이미지 크게 보기', 'MediaViewer'],
  ['영상 보면서 작업', 'MediaViewer'],
  ['버튼에 한 줄 설명을 붙이고 싶다', 'Tooltip'],
  ['처음 온 사용자에게 기능 흐름을 단계별로 안내하고 싶다', 'Tour'],
  ['새 기능을 한 번만 알리고 싶다', 'Hint'],
  ['표에서 행 내용을 빠르게 요약해서 보고 싶다', 'Peek'],
  ['데이터를 불러오는 동안 뭘 보여줄까', 'Skeleton'],
  ['차트가 로딩 중일 때 보여줄 것', 'ChartSkeleton'],
  ['오래 걸리는 작업의 진행 상황', 'TaskProgress'],
  ['주문 목록을 정렬하고 여러 건 선택하게 하고 싶다', 'DataTable'],
  ['입력값이 틀렸을 때 오류 문구를 보여주고 싶다', 'Field'],
  ['Enter 로 다음 입력칸으로 넘어가게 하고 싶다', 'FormFlow'],
  ['매출 추이와 변동 범위를 보여주고 싶다', 'TrendBand'],
  ['목표 대비 실적을 보여주고 싶다', 'BulletRow'],
  ['구성 비율이 시간에 따라 변하는 걸 보여주고 싶다', 'CompositionArea'],
  ['주문 상태를 색과 함께 표시하고 싶다', 'StatusChip'],
  ['금액을 입력받고 싶다', 'Input'],
];
for (const [query, expected] of routingCases) {
  test(`실제 질문 상위 3위: ${query} → ${expected}`, () => {
    const ranking = matchComponents(query, components, components.length);
    assert.ok(ranking.slice(0, 3).some((c) => c.name === expected),
      `${query}: 기대 ${expected}, 실제 순위 ${ranking.map((c, i) => `${i + 1}. ${c.name} (${c.score})`).join(', ') || '후보 없음'}`);
  });
}

// R15: 실제 화면을 요청하는 표현은 조립 루트를 먼저 안내한다.
for (const [query, expected] of [
  ['삭제 확인', 'AlertDialog'], ['모달 띄우기', 'Dialog'],
  ['탭으로 나누기', 'Tabs'], ['목록으로 돌아가는 경로', 'Breadcrumb'],
]) {
  test(`상세 화면 라우팅 1위: ${query} → ${expected}`, () => {
    assert.equal(matchComponents(query, components)[0]?.name, expected);
  });
}

for (const [query, expected] of [
  ['여러 줄 메모', 'Textarea'], ['하나만 선택', 'RadioGroup'],
  ['즉시 적용되는 토글', 'Switch'], ['금액 입력', 'Input'],
  ['비밀번호', 'Input'], ['검색창', 'Input'], ['전화번호', 'Input'], ['입력 이름', 'Label'],
]) {
  test(`나머지 입력 라우팅 1위: ${query} → ${expected}`, () => {
    assert.equal(matchComponents(query, components)[0]?.name, expected);
  });
}
test('금액 입력은 number 금지·text와 numeric 입력 모드 규칙을 제공', () => {
  const input = matchComponents('금액 입력', components)[0];
  assert.ok(input.dont.some(rule => rule.includes('type=number')));
  const detail = components.find(component => component.name === input.name);
  assert.ok(detail.rules.some(rule => rule.text.includes('type=text inputMode=numeric')));
});

for (const [query, expected] of [
  ['많은 옵션에서 검색해 선택', 'Combobox'], ['초성으로 찾기', 'Combobox'],
  ['상태 필터 20개 이하', 'Select'],
]) test(`검색 선택 라우팅 1위: ${query} → ${expected}`, () => {
  assert.equal(matchComponents(query, components)[0]?.name, expected);
});

for (const [query, expected] of [
  ['여러 사업장 고르기', 'MultiSelect'], ['검색해서 여러 개 고르기', 'Combobox'],
]) test(`다중 선택 라우팅 1위: ${query} → ${expected}`, () => {
  assert.equal(matchComponents(query, components)[0]?.name, expected);
});
test('다중 선택의 공개 타입·분기 구현 슬롯과 독립 의도를 보존한다', () => {
  const multi = components.find(component => component.name === 'MultiSelect');
  assert.ok(!Object.hasOwn(multi, 'partOf'));
  const combo = components.find(component => component.name === 'Combobox');
  assert.ok(combo.props.some(prop => prop.name === 'multiple'));
  assert.ok(combo.extends.some(base => base.includes('aria-describedby')));
  for (const slot of ['combobox-trigger', 'combobox-input', 'combobox-list', 'combobox-chip-remove']) assert.ok(combo.slots.includes(slot), slot);
});

for (const [query, expected] of [
  ['긴 설명 더보기', 'ClampText'], ['고급 설정 접기', 'Collapsible'],
]) test(`접고 펴기 라우팅 1위: ${query} → ${expected}`, () => {
  assert.equal(matchComponents(query, components)[0]?.name, expected);
});

for (const query of ['이미지 크게 보기', '영상 보면서 작업']) test(`미디어 라우팅 1위: ${query} → MediaViewer`, () => {
  assert.equal(matchComponents(query, components)[0]?.name, 'MediaViewer');
});

test('배너 슬라이드 라우팅 1위: Carousel', () => {
  assert.equal(matchComponents('배너 슬라이드', components)[0]?.name, 'Carousel');
});

for (const query of ['페이지', '페이징', '페이지 이동', '페이지 크기', '몇 개씩']) test(`페이지네이션 라우팅 1위: ${query}`, () => {
  assert.equal(matchComponents(query, components)[0]?.name, 'Pagination');
});
