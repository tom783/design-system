// 검색 1순위 회귀 대조 — packages/mcp/match.mjs 가 고르는 1순위를 R38 작업 전에 고정한 전체 질의 기준선
// (fixtures/r38-match-baseline.json, 439건)과 비교한다. 새 키워드로 기준선이 몰래 바뀌지 않게 한다 —
// intendedChanges 에 적은 변화 외에 1순위가 하나라도 바뀌면 실패다.
//
//   node docs/qa/compare-match-baseline.mjs   # 대조하고 r38-match-ranking.md 표를 다시 쓴다
//
// packages/mcp/match.test.mjs 가 compareRankings() 로 같은 대조를 단위 시험에서 돈다.
// (옛 이름 r38-match-compare.mjs — 만든 작업 번호만 있고 하는 일이 드러나지 않아 바꿨다.)
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchComponents } from '../../packages/mcp/match.mjs';

export const intendedChanges = new Map([
  // R43: 일반 단계 질의는 폼 위치 표시, 안내 투어는 Tour로 유지한다.
  ['단계', 'Steps'],
  // R41: 단일 KPI는 새 지표 타일, 목표 달성 질의는 계속 BulletRow다.
  ['KPI', 'StatTile'],
  ['상태·정렬 필터에서 하나를 고른다.', 'Select'],
  ['행 액션 메뉴를 연다.', 'DropdownMenu'],
  ['저장·오류 알림을 표시한다.', 'Toaster'],
  ['표시할 데이터가 없음을 알리고 선택적 액션을 제공한다.', 'EmptyState'],
  ['옆에서 열리는 편집 패널', 'SheetContent'],
  ['상품 이미지 여러 장 업로드', 'FileUpload'],
  ['상품명 검색', 'Input'],
]);

export async function compareRankings() {
  const baseline = JSON.parse(await readFile(new URL('./fixtures/r38-match-baseline.json', import.meta.url), 'utf8'));
  const { components } = JSON.parse(await readFile(new URL('../../packages/mcp/manifest.json', import.meta.url), 'utf8'));
  return baseline.map(({ query, before }) => {
    const after = matchComponents(query, components)[0]?.name ?? null;
    return { query, before, after, expected: intendedChanges.get(query) ?? before };
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rows = await compareRankings();
  const changed = rows.filter(row => row.before !== row.after);
  assert.deepEqual(rows.filter(row => row.after !== row.expected), [], '의도하지 않은 1순위 변화');
  const escape = value => String(value ?? '후보 없음').replaceAll('|', '\\|');
  const table = items => ['| 질의 | 이전 1순위 | 변경 후 1순위 |', '|---|---|---|',
    ...items.map(row => `| ${escape(row.query)} | ${escape(row.before)} | ${escape(row.after)} |`)].join('\n');
  const report = `# R38 추천 1순위 대조\n\n작업 전 manifest의 모든 components(부품·상수 포함)의 keywords·useWhen·purpose와 요청한 3개 질의를 중복 제거했다. 작업 전 알고리즘과 매니페스트로 고정한 기준선은 fixtures/r38-match-baseline.json이다. 서버와 동일하게 저장 형태의 manifest.components를 matchComponents에 전달한다.\n\n전체 ${rows.length}건 · 불변 ${rows.length - changed.length}건 · 의도한 변화 ${changed.length}건 · 의도하지 않은 변화 0건.\n\n요청한 3건 외 4건은 떨어진 낱말이 해당 부품의 역할을 정확히 가리키는 개선으로 검토·고정했다(상태+필터, 행+메뉴, 저장+알림, 데이터+없음). Checkbox·ChartFrame의 목적 문장과 확인·취소 액션 그룹 등은 기존 1순위를 유지한다.\n\n## 바뀐 1순위 전부\n\n${table(changed)}\n\n## 전체 질의\n\n${table(rows)}\n`;
  await writeFile(new URL('./r38-match-ranking.md', import.meta.url), report);
  console.log(`전체 ${rows.length}건 · 불변 ${rows.length - changed.length}건 · 의도한 변화 ${changed.length}건 · 의도하지 않은 변화 0건`);
}
