import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { matchComponents } from './match.mjs';
const { components } = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url), 'utf8'));

test('정확한 이름은 해당 컴포넌트가 1위', () => {
  for (const c of components.filter((c) => c.kind === 'component')) assert.equal(matchComponents(c.name, components)[0].name, c.name);
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
