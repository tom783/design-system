// which_component 정답 세트 정확도 — top-1·top-3·후보 0개(R49 · 0.6.0 목표 64).
//
//   node docs/qa/which-component-golden.mjs            # 정확도와 틀린 문항 표
//   node docs/qa/which-component-golden.mjs --check    # 하한 아래면 exit 1 (단위 테스트도 같은 판정)
//
// 서버와 같은 입력을 쓴다: 저장 형태의 manifest.components 를 matchComponents 에 그대로 넘긴다.
// 순위는 전체 후보로 매긴다(서버 기본 limit 5 안의 top-3 와 같다). "후보 0개"는 서버 기본 limit 의 응답이
// 비어 isError 가 되는 것이다.
// 정답 세트·하한은 docs/qa/fixtures/which-component-golden.json 이다.
//   expected: 문자열 하나 · 허용 정답 여러 개(배열, 가장 높은 순위로 친다) · null(맞는 부품이 아직 없다 — gap 에 이유).
//   null 문항은 정확도 분모에서 빼고 "후보 0개"만 센다. set 은 문항 출처(없으면 R49 기준 세트)다.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchComponents } from '../../packages/mcp/match.mjs';

export const loadGolden = async () => JSON.parse(await readFile(new URL('./fixtures/which-component-golden.json', import.meta.url), 'utf8'));
export const loadComponents = async () => JSON.parse(await readFile(new URL('../../packages/mcp/manifest.json', import.meta.url), 'utf8')).components;

export const acceptedNames = expected => expected === null ? [] : [expected].flat();

const tally = rows => {
  const scored = rows.filter(row => row.accepted.length);
  return {
    total: scored.length,
    top1: scored.filter(row => row.rank === 1).length,
    top3: scored.filter(row => row.rank !== null && row.rank <= 3).length,
    noCandidates: rows.filter(row => row.candidates === 0).length,
    queries: rows.length,
  };
};
const groupBy = (rows, key) => Object.fromEntries([...new Set(rows.map(key))].map(value => [value, tally(rows.filter(row => key(row) === value))]));

export function evaluateGolden(cases, components) {
  const rows = cases.map(({ query, expected, lang, set = 'r49' }) => {
    const ranking = matchComponents(query, components, components.length);
    const accepted = acceptedNames(expected);
    const ranks = accepted.map(name => ranking.findIndex(candidate => candidate.name === name)).filter(index => index >= 0);
    return { query, expected, accepted, lang, set, rank: ranks.length ? Math.min(...ranks) + 1 : null,
      candidates: matchComponents(query, components).length, top: ranking.slice(0, 3).map(c => c.name) };
  });
  return { rows, ...tally(rows), byLang: groupBy(rows, row => row.lang), bySet: groupBy(rows, row => row.set) };
}

// 하한(floor)은 실측에서 여유를 조금 둔 값이다. 후보 0개 상한은 여유 없이 지킨다.
export function compareToFloor(result, floor) {
  const failures = [];
  if (result.top1 < floor.top1) failures.push(`top-1 ${result.top1} < 하한 ${floor.top1}`);
  if (result.top3 < floor.top3) failures.push(`top-3 ${result.top3} < 하한 ${floor.top3}`);
  const empty = result.noCandidates;
  if (floor.maxNoCandidates !== undefined && empty > floor.maxNoCandidates) failures.push(`후보 0개 ${empty} > 상한 ${floor.maxNoCandidates}`);
  return { failures };
}

export function formatResult(result, golden) {
  const pct = (value, total) => `${value}/${total} (${(value / total * 100).toFixed(0)}%)`;
  const line = (label, v) => `${label} top-1 ${pct(v.top1, v.total)} · top-3 ${pct(v.top3, v.total)} · 후보 0개 ${v.noCandidates}/${v.queries}`;
  const misses = result.rows.filter(row => row.rank !== 1);
  const { floor, measured } = golden;
  return [
    `which_component 정답 세트: ${line('전체', result)}`,
    `  하한 top-1 ${floor.top1} · top-3 ${floor.top3} · 후보 0개 ≤ ${floor.maxNoCandidates}${measured ? ` · 기록한 실측 top-1 ${measured.top1} · top-3 ${measured.top3}` : ''}`,
    ...Object.entries(result.byLang).map(([lang, v]) => `  ${line(lang, v)}`),
    ...Object.entries(result.bySet).map(([set, v]) => `  ${line(set, v)}`),
    `  1위가 아닌 문항 ${misses.length}개 (정답 순위 · 실제 상위 3):`,
    ...misses.map(row => `    ${row.accepted.length ? (row.rank === null ? '없음' : `${row.rank}위`).padEnd(3) : '공백'} ${(row.accepted.join('|') || '(부품 없음)').padEnd(16)} "${row.query}" → ${row.top.join(' · ') || '후보 없음'}`),
  ].join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const golden = await loadGolden();
  const result = evaluateGolden(golden.cases, await loadComponents());
  console.log(formatResult(result, golden));
  const { failures } = compareToFloor(result, golden.floor);
  if (failures.length) { console.error(`\n✗ 하한 아래: ${failures.join(' · ')}`); if (process.argv.includes('--check')) process.exitCode = 1; }
  else if (golden.measured && (result.top1 !== golden.measured.top1 || result.top3 !== golden.measured.top3)) {
    console.log(`\n기록한 실측과 다르다 — fixtures/which-component-golden.json 의 measured 를 top1 ${result.top1} · top3 ${result.top3} 로 고치고, 오른 만큼 floor 도 올린다.`);
  }
}
