// 검색 1순위 회귀 대조 — packages/mcp/match.mjs 가 고르는 1순위를 R38 작업 전에 고정한 전체 질의 기준선
// (fixtures/r38-match-baseline.json, 439건)과 비교한다. 새 키워드로 기준선이 몰래 바뀌지 않게 한다 —
// intendedChanges 에 적은 변화 외에 1순위가 하나라도 바뀌면 실패다.
//
//   node docs/qa/compare-match-baseline.mjs   # 대조하고 r38-match-ranking.md 를 다시 쓴다(순위 규칙·정답 세트 수치·바뀐 1순위)
//
// packages/mcp/match.test.mjs 가 compareRankings() 로 같은 대조를 단위 시험에서 돈다.
// (옛 이름 r38-match-compare.mjs — 만든 작업 번호만 있고 하는 일이 드러나지 않아 바꿨다.)
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchComponents } from '../../packages/mcp/match.mjs';

// [질의, 지금 1순위, 바꾼 라운드, 이유]. 이유는 문서 표에 그대로 나간다.
const CHANGES = [
  ['상태·정렬 필터에서 하나를 고른다.', 'Select', 'R38', '상태+필터 떨어진 낱말'],
  ['행 액션 메뉴를 연다.', 'DropdownMenu', 'R38', '행+메뉴 떨어진 낱말'],
  ['저장·오류 알림을 표시한다.', 'Toaster', 'R38', '저장+알림 떨어진 낱말'],
  ['표시할 데이터가 없음을 알리고 선택적 액션을 제공한다.', 'EmptyState', 'R38', '데이터+없음 떨어진 낱말'],
  ['옆에서 열리는 편집 패널', 'SheetContent', 'R38', '요청 질의'],
  ['상품 이미지 여러 장 업로드', 'FileUpload', 'R38', '요청 질의'],
  ['상품명 검색', 'Input', 'R38', '요청 질의'],
  // R41: 단일 KPI는 새 지표 타일, 목표 달성 질의는 계속 BulletRow다.
  ['KPI', 'StatTile', 'R41', '단일 KPI 는 지표 타일'],
  // R43: 일반 단계 질의는 폼 위치 표시, 안내 투어는 Tour로 유지한다.
  ['단계', 'Steps', 'R43', '일반 단계는 폼 위치 표시'],
  // 목표 64: 부품 문장이 가족 루트로 가거나(4건) 가족 밖에서 가족 밖으로 옮겼다(1건). 자기 문장이 남의 부품으로 간 것은 없다.
  ['사이드 메뉴와 본문을 같은 업무 화면 틀로 배치한다.', 'AppShell', '목표 64', 'AppShell 자기 목적 문장 — 조사 뗀 줄기로 화면·틀·본문이 맞음'],
  ['선택할 옵션 목록을 표시한다.', 'Select', '목표 64', 'SelectContent 문장이 가족 루트로 — Select 키워드 옵션 목록'],
  ['실행할 액션 목록을 표시한다.', 'DropdownMenu', '목표 64', 'DropdownMenuContent 문장이 가족 루트로 — 키워드 액션 목록'],
  ['라디오 선택지 하나를 표시한다.', 'RadioGroup', '목표 64', 'RadioGroupItem 문장이 가족 루트로 — Checkbox 의 흔한 선택 키워드를 덜 침'],
  ['선택 옵션 하나를 표시한다.', 'RadioGroup', '목표 64', 'SelectItem 문장 — 전후 모두 가족(Select) 밖. 선택 키워드를 덜 쳐 Checkbox 에서 옮김'],
];
export const intendedChanges = new Map(CHANGES.map(([query, after]) => [query, after]));

export async function compareRankings() {
  const baseline = JSON.parse(await readFile(new URL('./fixtures/r38-match-baseline.json', import.meta.url), 'utf8'));
  const { components } = JSON.parse(await readFile(new URL('../../packages/mcp/manifest.json', import.meta.url), 'utf8'));
  return baseline.map(({ query, before }) => {
    const after = matchComponents(query, components)[0]?.name ?? null;
    return { query, before, after, expected: intendedChanges.get(query) ?? before };
  });
}

// 지금 순위 규칙. match.mjs 를 고치면 여기도 고친다 — 문서는 이 글과 실측으로만 만든다.
const RULES = `## 지금 순위 규칙 (packages/mcp/match.mjs · 0.6.0 목표 64)

which_component 는 외부 모델 없이 키워드 점수로 후보 여러 개와 근거(\`reasons\`)를 돌려주고, 최종 판단은 호출자가 한다.
응답 형태(\`{ candidates: [{ name, score, reasons, purpose, useWhen, dont }] }\`, 기본 5개, 후보가 없으면 \`isError\`)는 그대로다.

**질의를 두 갈래로 본다.**
- **원문**: NFKC·소문자·공백 제거(구두점은 남긴다). 한국어 키워드는 이 안에 들어 있는지(조사 결합 흡수), 라틴 키워드는
  낱말 경계와 영어 줄기로 맞춘다 — \`enter\` 가 "center" 안에서 맞지 않는다.
- **번역**: 같은 순서로 낱말을 메타데이터 어휘로 바꾼 것. 영어 낱말·구절은 대응표(\`ENGLISH_TERMS\`, 약 320개)로 한국어가 되고
  (\`filter\`→필터, \`stuck … bottom\`→하단 고정, \`kpi card\`→KPI 지표), 한국어 활용형은 대표 어휘가 된다(\`걸러\`·\`거르는\`→필터,
  \`한꺼번에\`→일괄, \`골라\`→선택, \`바로\`→즉시). 대응표에 없는 영어 낱말은 버린다. 구두점 자리는 끊는다("선택·해제" 는 '선택 해제' 구절이 아니다).
- 영어 줄기: 복수형·진행형·과거형·끝 e 를 뗀다(\`rows\`→row, \`saving\`·\`saved\`·\`save\`→sav, \`shipping\`→ship).

**점수** — 원문과 번역 중 더 센 일치를 쓴다.

| 근거 | 점수 |
|---|---|
| 질의 전체가 부품 이름 | 2000 |
| 이름을 식별자로 씀: 적힌 그대로(\`Button\`·\`DataTable\`) 또는 두 낱말 이상 이름을 낱말 경계에서(\`filter bar\`·\`date picker\`) | 1000 |
| 질의 전체가 키워드(원문에서만) | 80 |
| 여러 낱말 키워드가 연속으로 | 40 |
| 한 낱말 키워드가 연속으로 | 20 × min(1, 4 ÷ 그 낱말이 키워드에 든 부품 수) |
| 여러 낱말 키워드의 낱말이 모두 있고 순서도 같음 / 순서가 다름(한국어 낱말은 활용형 줄기도 인정) | 24 / 8 |
| 한 글자 키워드 | 4 |
| 목적(purpose) · 쓰임새(useWhen) 문장에 질의 낱말(두 글자 이상·일반어 제외, 조사·어미 뗀 줄기 포함)이 있음 | 낱말마다 2 · 5 |

- **소문자 영어 낱말은 이름 일치가 아니다.** "page title with a primary create button" 의 button 은 낱말이다. 예전 규칙은 포함만으로
  +1000점을 줘 다른 후보가 이길 수 없었다(물류 영어 16개 중 7개가 Button·Select·Label·Card·Input 이름 일치를 받았고 6개가 그 때문에 1위를 놓쳤다). "selector" 는 Select 가 아니다.
- **같은 글자를 두 번 세지 않는다.** 한 부품 안에서 긴 연속 키워드('주문 상태')에 든 짧은 키워드('상태')는 더하지 않고,
  떨어진 낱말 일치는 이미 연속으로 맞은 낱말 키워드 점수를 뺀다(R38).
- **흔한 낱말 키워드는 덜 친다.** '선택'(키워드에 든 부품 8개)·'목록'(10개)이 '날짜'·'예정일'(1개)과 같은 20점을 받아 "출고 예정일 선택" 이
  Checkbox 로 갔다. 문장 토큰에도 같은 가중을 곱해 봤으나 정답 세트가 오르지 않고 아래 대조의 1순위만 더 흔들려 쓰지 않는다.
- 부품(\`partOf\`)은 고유 키워드나 이름이 맞을 때만 후보가 된다. 목적 한 토큰(2점)만 맞은 후보는 버린다(점수 > 2).
- 점수 가중치를 테스트 통과용으로 조작하지 않는다(DESIGN.md §13.4). 특정 질의를 하드코딩하지 않는다 — 대응표는 낱말 단위이고
  한국어 어휘는 component-intent.mjs 의 keywords·purpose·useWhen 에 실제로 있는 말이다.
`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rows = await compareRankings();
  const changed = rows.filter(row => row.before !== row.after);
  assert.deepEqual(rows.filter(row => row.after !== row.expected), [], '의도하지 않은 1순위 변화');
  const { loadGolden, loadComponents, evaluateGolden } = await import('./which-component-golden.mjs');
  const golden = await loadGolden();
  const result = evaluateGolden(golden.cases, await loadComponents());
  const holdout = evaluateGolden(JSON.parse(await readFile(new URL('./fixtures/which-component-holdout.json', import.meta.url), 'utf8')).cases, await loadComponents());
  const escape = value => String(value ?? '후보 없음').replaceAll('|', '\\|');
  const cell = v => `${v.top1}/${v.total} · ${v.top3}/${v.total} · ${v.noCandidates}/${v.queries}`;
  const SET_LABEL = { r49: 'R49 기준', logistics06: '도그푸딩 6 물류', r050: '0.5.0 부품', r060: '0.6.0 반복 입력 줄' };
  const accuracy = ['| 묶음 | top-1 · top-3 · 후보 0개 |', '|---|---|', `| 전체 | ${cell(result)} |`,
    ...Object.entries(result.byLang).map(([lang, v]) => `| ${lang === 'ko' ? '한국어' : '영어'} | ${cell(v)} |`),
    ...Object.entries(result.bySet).map(([set, v]) => `| ${SET_LABEL[set] ?? set} | ${cell(v)} |`),
    `| 보류 세트(튜닝에 안 씀) | ${cell(holdout)} |`].join('\n');
  const misses = result.rows.filter(row => row.rank !== 1).map(row =>
    `| ${escape(row.query)} | ${row.accepted.join(' · ') || '(부품 없음)'} | ${row.accepted.length ? row.rank ?? '없음' : '공백'} | ${escape(row.top.join(' · '))} |`).join('\n');
  const note = new Map(CHANGES.map(([query, , round, why]) => [query, `${round} — ${why}`]));
  const table = items => ['| 질의 | 이전 1순위 | 변경 후 1순위 | 바꾼 라운드 · 이유 |', '|---|---|---|---|',
    ...items.map(row => `| ${escape(row.query)} | ${escape(row.before)} | ${escape(row.after)} | ${escape(note.get(row.query) ?? '')} |`)].join('\n');
  const full = ['| 질의 | 이전 1순위 | 변경 후 1순위 |', '|---|---|---|', ...rows.map(row => `| ${escape(row.query)} | ${escape(row.before)} | ${escape(row.after)} |`)].join('\n');
  const report = `# which_component 추천 순위 — 규칙과 대조 (R38 기준선)

\`node docs/qa/compare-match-baseline.mjs\` 가 이 문서를 다시 쓴다. 손으로 고치지 않는다.

${RULES}
## 정답 세트 수치 (\`docs/qa/fixtures/which-component-golden.json\`)

\`node docs/qa/which-component-golden.mjs\` 로 재현한다. 하한 top-1 ${golden.floor.top1} · top-3 ${golden.floor.top3} · 후보 0개 ${golden.floor.maxNoCandidates} 아래로
떨어지면 \`which-component-golden.test.mjs\`(pnpm test = verify·pre-commit·CI)가 실패한다. 정확도 분모는 정답이 있는 문항(부품 공백 ${result.queries - result.total}개 제외), 후보 0개 분모는 전체 질의다.
보류 세트(\`which-component-holdout.json\`)는 튜닝을 마친 뒤 따로 쓴 질의로, 과적합을 재기만 하고 게이트는 걸지 않는다.

${accuracy}

목표 64 이전(0.5.0 main) 같은 세트 수치는 전체 top-1 96/184 · top-3 129/184 · 후보 0개 28/186(영어 27/50)이었다.

### 1위가 아닌 문항

| 질의 | 정답 | 정답 순위 | 실제 상위 3 |
|---|---|---|---|
${misses}

## 1순위 대조 (\`fixtures/r38-match-baseline.json\`)

R38 작업 전 manifest의 모든 components(부품·상수 포함)의 keywords·useWhen·purpose와 요청한 3개 질의를 중복 제거한 ${rows.length}건이다.
작업 전 알고리즘과 매니페스트로 고정한 1순위가 "이전 1순위"다. 서버와 동일하게 저장 형태의 manifest.components를 matchComponents에 전달한다.
아래 표에 없는 1순위 변화가 생기면 \`packages/mcp/match.test.mjs\` 가 실패한다.

전체 ${rows.length}건 · 불변 ${rows.length - changed.length}건 · 의도한 변화 ${changed.length}건 · 의도하지 않은 변화 0건.

### 바뀐 1순위 전부

${table(changed)}

### 전체 질의

${full}
`;
  await writeFile(new URL('./r38-match-ranking.md', import.meta.url), report);
  console.log(`전체 ${rows.length}건 · 불변 ${rows.length - changed.length}건 · 의도한 변화 ${changed.length}건 · 의도하지 않은 변화 0건`);
}
