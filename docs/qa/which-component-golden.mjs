// which_component 정답 세트 정확도 — top-1·top-3(R49).
//
//   node docs/qa/which-component-golden.mjs            # 정확도와 틀린 문항 표
//   node docs/qa/which-component-golden.mjs --check    # 기준선 아래면 exit 1 (단위 테스트도 같은 판정)
//
// 서버와 같은 입력을 쓴다: 저장 형태의 manifest.components 를 matchComponents 에 그대로 넘긴다.
// 순위는 전체 후보로 매긴다(서버 기본 limit 5 안의 top-3 와 같다).
// 정답 세트·기준선은 docs/qa/fixtures/which-component-golden.json 이다. 질의에 컴포넌트 이름을 넣지 않는다.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchComponents } from '../../packages/mcp/match.mjs';

export const loadGolden = async () => JSON.parse(await readFile(new URL('./fixtures/which-component-golden.json', import.meta.url), 'utf8'));
export const loadComponents = async () => JSON.parse(await readFile(new URL('../../packages/mcp/manifest.json', import.meta.url), 'utf8')).components;

export function evaluateGolden(cases, components) {
  const rows = cases.map(({ query, expected, lang }) => {
    const ranking = matchComponents(query, components, components.length);
    const index = ranking.findIndex(candidate => candidate.name === expected);
    return { query, expected, lang, rank: index < 0 ? null : index + 1, top: ranking.slice(0, 3).map(c => c.name) };
  });
  const count = predicate => rows.filter(predicate).length;
  return {
    rows,
    total: rows.length,
    top1: count(row => row.rank === 1),
    top3: count(row => row.rank !== null && row.rank <= 3),
    byLang: Object.fromEntries([...new Set(rows.map(row => row.lang))].map(lang => {
      const subset = rows.filter(row => row.lang === lang);
      return [lang, { total: subset.length, top1: subset.filter(r => r.rank === 1).length, top3: subset.filter(r => r.rank !== null && r.rank <= 3).length }];
    })),
  };
}

export function compareToBaseline(result, baseline) {
  const failures = [];
  if (result.top1 < baseline.top1) failures.push(`top-1 ${result.top1} < 기준선 ${baseline.top1}`);
  if (result.top3 < baseline.top3) failures.push(`top-3 ${result.top3} < 기준선 ${baseline.top3}`);
  const raised = result.top1 > baseline.top1 || result.top3 > baseline.top3;
  return { failures, raised };
}

export function formatResult(result, baseline) {
  const pct = (value) => `${value}/${result.total} (${(value / result.total * 100).toFixed(0)}%)`;
  const misses = result.rows.filter(row => row.rank !== 1);
  return [
    `which_component 정답 세트: top-1 ${pct(result.top1)} · top-3 ${pct(result.top3)} · 기준선 top-1 ${baseline.top1} · top-3 ${baseline.top3}`,
    `  언어별: ${Object.entries(result.byLang).map(([lang, v]) => `${lang} ${v.top1}/${v.total}·${v.top3}/${v.total}`).join(' · ')}`,
    `  1위가 아닌 문항 ${misses.length}개 (정답 순위 · 실제 상위 3):`,
    ...misses.map(row => `    ${row.rank === null ? '없음' : `${row.rank}위`.padEnd(3)} ${row.expected.padEnd(16)} "${row.query}" → ${row.top.join(' · ') || '후보 없음'}`),
  ].join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const golden = await loadGolden();
  const result = evaluateGolden(golden.cases, await loadComponents());
  console.log(formatResult(result, golden.baseline));
  const { failures, raised } = compareToBaseline(result, golden.baseline);
  if (failures.length) { console.error(`\n✗ 기준선 아래: ${failures.join(' · ')}`); if (process.argv.includes('--check')) process.exitCode = 1; }
  else if (raised) console.log(`\n기준선보다 높다 — fixtures/which-component-golden.json 의 baseline 을 top1 ${result.top1} · top3 ${result.top3} 로 올린다.`);
}
