// which_component 정답 세트의 형식과 정확도 하한(R49). pnpm test(= verify·pre-commit)에서 돈다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGolden, loadComponents, evaluateGolden, compareToBaseline, formatResult } from './which-component-golden.mjs';

const golden = await loadGolden();
const components = await loadComponents();
const normalize = text => text.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/gu, '');

// R49 기준 100문항 + 0.5.0 부품마다 더한 문항. rebase 때는 증가분 항을 모두 남겨 합을 맞춘다.
const CASES = 100
  + 5 // 목표 49 입력 단위 접미사(Input unit)
  + 4 // 목표 49 FilterBar(한국어 3·영어 1)
  + 4 // 목표 49 BulkActionBar(한국어 3·영어 1)
  + 5 // 목표 49 설명 목록(DescriptionList)
  + 10 // 목표 57 FormActionBar 5(한국어 4·영어 1)·DataTable 합계 행 4(한국어 3·영어 1)·DescriptionList 금액 내역 1
  + 6; // 0.6.0 3a 반복 입력 줄 FieldList(한국어 4·영어 2)
test('정답 세트는 100문항(+부품 증가분)·한국어 위주·질의마다 정답 하나이며 선택 가능한 부품을 가리킨다', () => {
  assert.equal(golden.cases.length, CASES);
  assert.equal(new Set(golden.cases.map(item => item.query)).size, CASES, '같은 질의가 두 번 들어가면 정확도가 부풀려진다');
  const ko = golden.cases.filter(item => item.lang === 'ko').length, en = golden.cases.filter(item => item.lang === 'en').length;
  assert.equal(ko + en, CASES);
  assert.ok(ko > en && en > 0, `한국어 위주·영어 일부: ko ${ko} · en ${en}`);
  // 서버가 후보로 내놓을 수 있는 것만 정답이 된다: 상수·검색어 없는 부품은 후보에서 빠진다(match.mjs).
  const selectable = new Set(components.filter(c => c.kind !== 'constant' && (!c.partOf || c.keywords?.length)).map(c => c.name));
  for (const { query, expected } of golden.cases) {
    assert.equal(typeof expected, 'string', query);
    assert.ok(selectable.has(expected), `${query}: ${expected} 는 선택 후보가 될 수 없다`);
    // 이름 일치는 +1000점이라 정확도가 아니라 이름 검색을 재게 된다.
    const named = components.filter(c => normalize(query).includes(normalize(c.name))).map(c => c.name);
    assert.deepEqual(named, [], `${query}: 질의에 컴포넌트 이름이 들어 있다`);
  }
});

test('top-1·top-3 정확도가 기준선 아래로 떨어지지 않는다', () => {
  const result = evaluateGolden(golden.cases, components);
  const { failures } = compareToBaseline(result, golden.baseline);
  assert.deepEqual(failures, [], `기준선 아래로 떨어졌다\n${formatResult(result, golden.baseline)}`);
});

test('기준선 비교는 한 문항이라도 줄면 실패하고 늘면 올리라고 알린다', () => {
  const baseline = { top1: 52, top3: 72 };
  assert.deepEqual(compareToBaseline({ top1: 51, top3: 72 }, baseline).failures, ['top-1 51 < 기준선 52']);
  assert.deepEqual(compareToBaseline({ top1: 52, top3: 71 }, baseline).failures, ['top-3 71 < 기준선 72']);
  assert.deepEqual(compareToBaseline({ top1: 52, top3: 72 }, baseline), { failures: [], raised: false });
  assert.deepEqual(compareToBaseline({ top1: 53, top3: 72 }, baseline), { failures: [], raised: true });
});

test('순위는 서버와 같은 저장 형태 입력으로 매기고 정답이 후보에 없으면 null 이다', () => {
  const result = evaluateGolden([
    { query: '쿠폰 코드를 입력받는 모달', expected: 'Dialog', lang: 'ko' },
    { query: 'zzzz 아무 관련 없는 말', expected: 'Dialog', lang: 'ko' },
  ], components);
  assert.equal(result.rows[0].rank, 1);
  assert.equal(result.rows[1].rank, null);
  assert.deepEqual([result.top1, result.top3], [1, 1]);
});
