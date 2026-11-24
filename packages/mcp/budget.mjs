// MCP 응답 크기 예산(R49). 생성기(mcp:build)·단위 테스트·클라이언트 하네스가 같은 수치를 쓴다.
// 이 파일은 런타임이 아니므로 npm 패키지(files)에 넣지 않는다.
//
// 예산은 **AI 에게 실제로 가는 바이트**(compact UTF-8 JSON)를 잰다. 저장 파일(manifest.json)은
// 어떤 응답으로도 한 번에 나가지 않으므로 총량 상한이 없다(R42 의 토큰·규칙 판단과 같은 원칙).
//
// 구조 — 개수에 비례하는 것과 아닌 것을 나눈다.
//   요약(항목 수에 비례): design://components 색인 · list_components
//     → 항목당 상한 + 전체 상한 + 큰 묶음 예약(아래 RESERVE_FAMILIES)
//   상세(지연 조회, 개수와 무관): get_component 1건
//   고정(컴포넌트 수와 무관): design://tokens · get_rules 전체
//
// 이전(R37~R43)에는 design://components 가 저장 형태 전체(88,863B / 90,000B)라 부품이 늘 때마다
// props·규칙까지 같이 늘었다. 지금은 색인만 보내고 상세는 이름별로 조회하므로 한 항목이 커져도
// 요약은 항목당 상한까지만 는다.
import { listComponents, getComponent, componentIndex } from './catalog.mjs';

// 수치 근거(2026-11-23, 115항목 · 가족 55개 · 가장 큰 가족 DropdownMenu 15항목 실측):
//   색인 23,191B · 항목 최대 553B(DropdownMenu, 부품 이름 14개) · 가장 큰 가족 2,047B
//   목록 19,873B · 항목 최대 239B(SheetContent) · 가장 큰 가족 2,783B
//   상세 최대 4,576B(DataTable) · 토큰 67,555B · 규칙 4,327B
// 전체 상한 = 지금 + 가장 큰 가족 4개 예약 + 평균 가족 10개 이상의 자유 증가분.
//   색인 23,191 + 4×2,047 = 31,379 → 40,000 (자유 8.6KB ≈ 평균 가족 20개)
//   목록 19,873 + 4×2,783 = 31,005 → 36,000 (자유 5.0KB ≈ 평균 가족 13개)
// 항목당 상한은 지금 최대의 약 1.4배다. 문장 하나가 비정상적으로 길어지면 여기서 걸린다.
// 상세(get_component 1건) 6,000 → 7,000 (2026-11-24 목표 64 · 개발 총괄 결정): R49 는 당시 최대 4,576B(DataTable)의
// 약 1.3배로 6,000 을 잡았다. 목표 57 의 합계·고정 열 지침으로 DataTable 이 5,940B 가 됐고, 0.6.0 에서 규약대로
// 비제어 초기값 defaultSelectedIds 를 더하자 6,118B(JSDoc 없이도 6,017B)로 넘었다. 같은 원칙(실측 최대 × 약 1.15~1.3)으로 7,000 —
// 0.6.0 의 다른 지침(반복 입력 줄·섹션 제목 줄·추천 정확도)이 DataTable 에 문장을 더할 여유 약 0.9KB.
export const BUDGETS = {
  index: { total: 40_000, entry: 800 },
  list: { total: 36_000, entry: 320 },
  detail: 7_000,
  tokens: 80_000,
  rules: 8_000,
};
// P3(리치 텍스트 편집기·카테고리 트리·칸반·알림 센터)처럼 큰 묶음이 한 번에 들어와도 견디도록,
// 요약 응답은 언제나 "지금 가장 큰 가족" 4개를 더 받을 여유를 남긴다. 여유가 그 아래로 떨어지면
// 상한에 닿기 전에 mcp:build 가 실패한다 — 그때 예산을 다시 정한다(88KB/90KB 처럼 꽉 찬 뒤가 아니다).
export const RESERVE_FAMILIES = 4;

const bytes = value => Buffer.byteLength(JSON.stringify(value));

// 가족 = 루트 컴포넌트와 그 부품(partOf). 배열 안 항목은 쉼표 1바이트가 붙는다.
function families(manifest, entries) {
  const sizes = new Map();
  manifest.components.forEach((component, index) => {
    const root = component.partOf ?? component.name;
    const family = sizes.get(root) ?? { name: root, count: 0, bytes: 0 };
    family.count += 1; family.bytes += bytes(entries[index]) + 1;
    sizes.set(root, family);
  });
  return [...sizes.values()];
}

export function measureResponses(manifest, { budgets = BUDGETS, reserve = RESERVE_FAMILIES } = {}) {
  const index = componentIndex(manifest);
  const list = listComponents(manifest);
  const summary = (label, response, entries, budget) => {
    const groups = families(manifest, entries);
    const largest = groups.reduce((max, family) => family.bytes > max.bytes ? family : max, { name: '없음', count: 0, bytes: 0 });
    const entrySizes = entries.map((entry, i) => [manifest.components[i].name, bytes(entry)]);
    const largestEntry = entrySizes.reduce((max, item) => item[1] > max[1] ? item : max, ['없음', 0]);
    const total = bytes(response);
    const mean = groups.length ? Math.round(groups.reduce((sum, family) => sum + family.bytes, 0) / groups.length) : 0;
    return { label, total, limit: budget.total, entryLimit: budget.entry, largestEntry, largestFamily: largest, meanFamily: mean,
      reserve, projected: total + reserve * largest.bytes };
  };
  const details = manifest.components.map(entry => [entry.name, bytes(getComponent(manifest, entry))]);
  const largestDetail = details.reduce((max, item) => item[1] > max[1] ? item : max, ['없음', 0]);
  return {
    summaries: [
      summary('design://components 색인', index, index.components, budgets.index),
      summary('list_components', list, list.components, budgets.list),
    ],
    fixed: [
      [`get_component 최대 ${largestDetail[0]}`, largestDetail[1], budgets.detail],
      ['design://tokens', bytes(manifest.tokens), budgets.tokens],
      ['get_rules 전체', bytes({ rules: manifest.principles }), budgets.rules],
    ],
  };
}

const kb = value => (value / 1000).toFixed(2);
export function assertSizeBudget(manifest, { log = console.error, ...options } = {}) {
  const { summaries, fixed } = measureResponses(manifest, options);
  const errors = [];
  for (const s of summaries) {
    const free = s.limit - s.projected;
    log(`MCP 요약 ${s.label}: ${s.total}바이트 / ${s.limit}바이트 (${kb(s.total)}KB / ${s.limit / 1000}KB) · 항목 최대 ${s.largestEntry[0]} ${s.largestEntry[1]}바이트 / ${s.entryLimit}바이트`);
    log(`  예약: 가장 큰 가족 ${s.largestFamily.name}(${s.largestFamily.count}항목) ${s.largestFamily.bytes}바이트 × ${s.reserve} → 예상 ${s.projected}바이트 · 남은 자유 ${free}바이트 ≈ 평균 가족 ${s.meanFamily ? Math.floor(Math.max(free, 0) / s.meanFamily) : 0}개`);
    if (s.total > s.limit) errors.push(`${s.label} 전체 ${s.total}바이트 > ${s.limit}바이트`);
    if (s.largestEntry[1] > s.entryLimit) errors.push(`${s.label} 항목 ${s.largestEntry[0]} ${s.largestEntry[1]}바이트 > ${s.entryLimit}바이트`);
    if (s.total <= s.limit && s.projected > s.limit)
      errors.push(`${s.label} 예약 부족: 가장 큰 가족 ${s.reserve}개를 더 받을 여유가 없다(예상 ${s.projected}바이트 > ${s.limit}바이트). 부품을 넣기 전에 예산을 다시 정한다`);
  }
  for (const [label, size, limit] of fixed) {
    log(`MCP 크기 ${label}: ${size}바이트 / ${limit}바이트 (${kb(size)}KB / ${limit / 1000}KB)`);
    if (size > limit) errors.push(`${label} ${size}바이트 > ${limit}바이트`);
  }
  if (errors.length) throw new Error(`MCP 크기 예산 초과:\n  ${errors.join('\n  ')}`);
}
