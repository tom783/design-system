// which_component 정답 세트의 형식과 정확도 하한(R49 · 0.6.0 목표 64). pnpm test(= verify·pre-commit·CI)에서 돈다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadGolden, loadComponents, evaluateGolden, compareToFloor, formatResult, acceptedNames } from './which-component-golden.mjs';
import { matchComponents } from '../../packages/mcp/match.mjs';

const golden = await loadGolden();
const components = await loadComponents();

// R49 기준 100문항 + 0.5.0 부품마다 더한 문항 + 목표 64. rebase 때는 증가분 항을 모두 남겨 합을 맞춘다.
const CASES = 100
  + 5 // 목표 49 입력 단위 접미사(Input unit)
  + 4 // 목표 49 FilterBar(한국어 3·영어 1)
  + 4 // 목표 49 BulkActionBar(한국어 3·영어 1)
  + 5 // 목표 49 설명 목록(DescriptionList)
  + 10 // 목표 57 FormActionBar 5(한국어 4·영어 1)·DataTable 합계 행 4(한국어 3·영어 1)·DescriptionList 금액 내역 1
  + 32 // 목표 64 도그푸딩 6 사전 점검 표(한국어 16·영어 16, 공백이던 품목 줄 2문항은 0.6.0 3a FieldList) — set logistics06
  + 26 // 목표 64 0.5.0 부품 질의(짧은 말 11 · 부품마다 영어 2개 이상 채운 문장 15) — set r050
  + 6 // 0.6.0 3a 반복 입력 줄 FieldList(한국어 4·영어 2) — set r060
  + 6; // 0.6.0 3b 섹션 제목 줄 SectionHeader(한국어 4·영어 2) — set r060
const selectable = new Set(components.filter(c => c.kind !== 'constant' && (!c.partOf || c.keywords?.length)).map(c => c.name));

test('정답 세트는 198문항·한국어 위주이며 정답은 선택 가능한 부품(또는 이유 있는 공백)이다', () => {
  assert.equal(golden.cases.length, CASES);
  assert.equal(new Set(golden.cases.map(item => item.query)).size, CASES, '같은 질의가 두 번 들어가면 정확도가 부풀려진다');
  const ko = golden.cases.filter(item => item.lang === 'ko').length, en = golden.cases.filter(item => item.lang === 'en').length;
  assert.equal(ko + en, CASES);
  assert.ok(ko > en && en > 0, `한국어 위주·영어 일부: ko ${ko} · en ${en}`);
  assert.equal(golden.cases.filter(item => item.set === 'logistics06').length, 32, '도그푸딩 6 표 16행 × 한국어·영어');
  for (const { query, expected, gap } of golden.cases) {
    if (expected === null) { assert.ok(typeof gap === 'string' && gap.length, `${query}: 정답이 없으면 gap 에 이유를 쓴다`); continue; }
    const names = acceptedNames(expected);
    assert.ok(names.length && names.every(name => typeof name === 'string'), query);
    assert.equal(new Set(names).size, names.length, `${query}: 허용 정답이 겹친다`);
    // 서버가 후보로 내놓을 수 있는 것만 정답이 된다: 상수·검색어 없는 부품은 후보에서 빠진다(match.mjs).
    for (const name of names) assert.ok(selectable.has(name), `${query}: ${name} 는 선택 후보가 될 수 없다`);
  }
});

test('질의는 이름 일치 점수를 받지 않는다(이름 검색이 아니라 정확도를 잰다)', () => {
  for (const { query } of golden.cases) {
    const named = matchComponents(query, components, components.length).filter(c => c.reasons.some(reason => reason.startsWith('이름 일치'))).map(c => c.name);
    assert.deepEqual(named, [], `${query}: 이름 일치 +1000점을 받는다`);
  }
});

test('top-1·top-3 정확도가 하한 아래로 떨어지지 않고 후보 0개가 없다', () => {
  const result = evaluateGolden(golden.cases, components);
  const { failures } = compareToFloor(result, golden.floor);
  assert.deepEqual(failures, [], `하한 아래로 떨어졌다\n${formatResult(result, golden)}`);
});

test('하한은 기록한 실측 이하이고 여유는 조금이다', () => {
  const { measured, floor } = golden;
  assert.ok(floor.top1 <= measured.top1 && measured.top1 - floor.top1 <= 5, `top-1 하한 ${floor.top1} · 실측 ${measured.top1}`);
  assert.ok(floor.top3 <= measured.top3 && measured.top3 - floor.top3 <= 5, `top-3 하한 ${floor.top3} · 실측 ${measured.top3}`);
  assert.equal(floor.maxNoCandidates, 0, '후보 0개는 여유를 두지 않는다');
});

test('하한 비교는 한 문항이라도 하한 밑이면 실패하고 후보 0개를 센다', () => {
  const floor = { top1: 52, top3: 72, maxNoCandidates: 0 };
  assert.deepEqual(compareToFloor({ top1: 51, top3: 72, noCandidates: 0 }, floor).failures, ['top-1 51 < 하한 52']);
  assert.deepEqual(compareToFloor({ top1: 52, top3: 71, noCandidates: 0 }, floor).failures, ['top-3 71 < 하한 72']);
  assert.deepEqual(compareToFloor({ top1: 52, top3: 72, noCandidates: 1 }, floor).failures, ['후보 0개 1 > 상한 0']);
  assert.deepEqual(compareToFloor({ top1: 60, top3: 80, noCandidates: 0 }, floor).failures, []);
});

test('순위는 서버와 같은 저장 형태 입력으로 매기고 허용 정답은 가장 높은 순위, 정답이 없으면 분모에서 뺀다', () => {
  const result = evaluateGolden([
    { query: '쿠폰 코드를 입력받는 모달', expected: 'Dialog', lang: 'ko' },
    { query: 'zzzz 아무 관련 없는 말', expected: 'Dialog', lang: 'ko' },
    { query: '쿠폰 코드를 입력받는 모달', expected: ['Peek', 'Dialog'], lang: 'ko' },
    { query: 'zzzz 아무 관련 없는 말', expected: null, gap: '시험', lang: 'ko' },
  ], components);
  assert.equal(result.rows[0].rank, 1);
  assert.equal(result.rows[1].rank, null);
  assert.equal(result.rows[2].rank, 1);
  assert.deepEqual([result.total, result.top1, result.top3, result.noCandidates], [3, 2, 2, 2]);
});

test('보류 세트는 정답 세트와 겹치지 않고 형식이 같다(게이트는 걸지 않는다)', async () => {
  const holdout = JSON.parse(await readFile(new URL('./fixtures/which-component-holdout.json', import.meta.url), 'utf8'));
  const seen = new Set(golden.cases.map(item => item.query));
  for (const { query, expected, lang } of holdout.cases) {
    assert.ok(!seen.has(query), `${query}: 정답 세트와 겹친다`);
    assert.ok(['ko', 'en'].includes(lang), query);
    assert.ok(selectable.has(expected), `${query}: ${expected}`);
  }
});
