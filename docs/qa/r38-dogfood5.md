# R38 · 도그푸딩 5 보정

버전·공개 API·SelectTrigger 기본 폭·카탈로그 90KB 상한을 유지했다. 간격 이중 적용의 원인은 부품의 바깥 여백과 페이지 배치 책임이 겹친 것이며, PageHeader의 바깥 여백을 제거하고 예시의 부모 gap으로 옮겼다.

## 바꾼 파일

| 파일 | 변경 |
|---|---|
| `packages/ui/src/components/app-shell/app-shell.css` | PageHeader의 margin-block-end 제거 |
| `packages/ui/docs/examples/app-shell.tsx` | 머리·본문을 gap-6(24px)로 묶음, 필터 Select 폭 명시 |
| `packages/ui/src/stories/app-shell-screen.stories.tsx` | 긴 본문 예시도 gap-6로 묶음 |
| `packages/ui/src/stories/list-screen.stories.tsx` | 필터 Select에 w-auto·min-w-40 |
| `packages/ui/src/stories/detail-screen.stories.tsx` | 목록 상태 필터 Select에 w-auto·min-w-40 |
| `packages/ui/src/components/data-table/data-table.tsx` | 선택 미사용 시 선택 상태 제거, 부분 내보내기 버튼·범위 문구 분리, 버튼 오른쪽 배치 보존 |
| `packages/ui/src/stories/data-table.stories.tsx` | 옛 버튼 라벨 단정 1건 교체, 새 툴바 단정·선택 없는 내보내기 예시 추가 |
| `docs/research/component-intent.mjs` | 소비자 규칙 3종과 Input 검색 키워드 |
| `packages/mcp/manifest.json` | 생성기로 재생성 |
| `packages/mcp/match.mjs` | 낱말 일치·고유 검색 부품의 후보 조건 통합 |
| `packages/mcp/match.test.mjs` | 요청한 3질의·점수 우선순위·붙인 말·전체 기준선 회귀 |
| `packages/mcp/README.md` | 실제 매칭 점수 설명 |
| `docs/qa/fixtures/get-component-baseline.json` | SelectTrigger가 상속하는 Select 규칙의 문구만 동기화 |
| `docs/qa/fixtures/r38-match-baseline.json` (신규) | 작업 전 전체 439개 질의와 1순위 고정 |
| `docs/qa/compare-match-baseline.mjs` (신규) | 전체 질의 대조·허용 변화 검사·표 생성 |
| `docs/qa/r38-match-ranking.md` (신규) | 변화 전부 및 439개 전체 질의 표 |
| `docs/qa/app-shell-render-verify.mjs` | 바깥 여백 0·24px 간격·예시 위치 ±1px 하네스 작성 |
| `docs/qa/render-verify.mjs` | 선택 없는 전체·부분 로드 내보내기 하네스 작성 |
| `DESIGN.md` | §24.3에 여백·간격 책임과 R38 근거 추가 |
| `CHANGELOG.md` | 0.3.1 미게시의 고침에 R38 추가 |
| `docs/qa/r38-dogfood5.md` (신규) | 이 보고서 |

`docs/examples`는 실제로 `packages/ui/docs/examples`에 있다. 단독 PageHeader 예시는 뒤따르는 요소가 없어 추가 배치가 필요하지 않았다. 날짜 툴바·Select 사용법의 필터는 이미 w-auto·min-w-40이었으며, Field의 일반 폼 Select 기본 폭은 유지했다.

## 소비자 규칙 원문

AppShell:

> 본문·건너뛰기 링크와 여백(24px, 좁으면 16px)은 내장이다. 페이지 루트에 padding을 다시 주지 않는다. 화면 요소 사이는 gap 24px.

PageHeader:

> title은 페이지의 h1이다. 같은 제목을 다시 만들지 않는다. 바깥 여백이 없다. 아래 요소와의 간격은 페이지 배치(gap)로 준다.

Select:

> Field에는 SelectTrigger를 넣는다. 선택 키 처리는 컴포넌트에 맡긴다. 필터 줄에서는 SelectTrigger에 폭을 지정한다(기본은 칸을 채운다).

세 규칙 모두 금지어 없이 120자 이하다. 기존 규칙과 합쳐 카탈로그의 별도 회귀 크기 기준도 그대로 통과하도록 했다.

## 매칭 알고리즘

여러 낱말 키워드가 모두 질의에 들어 있으면 후보로 인정한다. 연속 구절은 40점, 떨어졌지만 질의의 각 낱말 앞부분에서 같은 순서로 맞으면 24점, 순서가 다르거나 낱말 내부에서만 맞으면 8점이다. 완전한 키워드 일치 80점과 이름 점수는 유지한다. 낱말 앞부분 비교는 `옆에서` 같은 조사 결합을 허용한다. 붙여 쓴 `상품이미지`도 약한 일치로 남긴다.

```js
const positions = words.map(word => queryWords.findIndex(candidate => candidate.startsWith(word)));
if (words.length > 1 && words.every(word => query.includes(word))) {
  const ordered = positions.every(position => position >= 0) && positions.every((position, index) => index === 0 || position > positions[index - 1]);
  return { weight: ordered ? 24 : 8, separated: true, words };
}
```

R36의 고유 검색 부품 후보 조건도 같은 함수를 쓴다.

```js
c.keywords.some(keyword => keywordMatch(query, queryWords, keyword))
```

`상태`와 떨어진 `상태 표시`처럼 같은 근거를 중복 가산하지 않는다. 이 처리가 없으면 Checkbox·ChartFrame 목적 문장이 StatusChip으로 잘못 바뀐다. `실행` 안의 `행`과 역순의 `취소 확인`은 약한 일치로 남겨 기존 1순위를 압도하지 않게 한다. Input에는 `검색` 키워드를 추가했다.

작업 전 모든 부품·상수의 keywords·useWhen·purpose와 요청한 3개 질의를 중복 제거해 439개를 고정했다. 432개 불변, 의도한 개선 7개, 의도하지 않은 변화 0개다. 아래 7개 외의 변화는 회귀 검사에서 실패한다. 추가 4개는 낱말 매칭으로 해당 역할을 정확히 추천하게 된 개선으로 검토했다.

| 질의 | 이전 | 이후 | 판단 |
|---|---|---|---|
| 옆에서 열리는 편집 패널 | Dialog | SheetContent | 요청한 보정 |
| 상품 이미지 여러 장 업로드 | Thumbnail | FileUpload | 요청한 보정 |
| 상품명 검색 | Combobox | Input | 요청한 보정 |
| 상태·정렬 필터에서 하나를 고른다. | StatusChip | Select | 상태+필터는 표시가 아닌 선택 |
| 행 액션 메뉴를 연다. | SideNav | DropdownMenu | 행+메뉴는 내비게이션이 아닌 행 작업 |
| 저장·오류 알림을 표시한다. | Field | Toaster | 저장+알림은 입력 검증이 아닌 작업 결과 |
| 표시할 데이터가 없음을 알리고 선택적 액션을 제공한다. | Button | EmptyState | 데이터+없음은 빈 결과 안내 |

전체 표: [r38-match-ranking.md](./r38-match-ranking.md). 재현: `node docs/qa/compare-match-baseline.mjs`.

## 하네스 단정 변경 목록

기존 문구 단정 교체는 **1건**이다.

- `packages/ui/src/stories/data-table.stories.tsx`, `부분로드_전체선택.play`: 버튼 접근명 `로드된 50건만 내보냅니다` → `50건 내보내기`.

새로 더한 단정:

- 같은 부분 로드 스토리: 선택 후 `선택한 행 내보내기` 버튼.
- `무한스크롤.play`의 시작: `50건 내보내기`, `전체 1,284건 중 50건`, `N개 선택` 부재.
- `render-verify.mjs`: 선택 옵션 생략 표와 명시적 none 부분 로드 표 각각에서 선택 상태 줄 부재·버튼 라벨·범위 상태 검증.
- `app-shell-render-verify.mjs`: 단독 머리의 margin-block-end 0; 라이트·다크·사용법·긴 본문 예시에서 1440/800px의 바깥 여백 0·머리와 다음 영역 간격 24px. margin 24px/gap 0인 이전 배치와 gap 24px/margin 0인 현재 배치의 머리·본문·필드·표 위치 및 크기를 ±1px로 비교한다.

기존 위치·동작 단정과 R29 `로드된 N건이 선택됨 · 전체 M건`은 유지했다. API 기준선 JSON은 SelectTrigger의 상속 규칙 문구 1곳만 갱신했다. 크기 단정과 상한은 바꾸지 않았다.

## 검증 결과와 실행하지 않은 것

- `npm_config_offline=true pnpm verify`: 통과. 토큰 대비 128건·테마 3상태·의미 분리, MCP 생성·경계·소비자 지침, 타입, 단위 검사 312건, Storybook 정적 빌드.
- `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify`: 77건 통과, 실패 0.
- 추천 대조: 439건, 의도하지 않은 변화 0. match.test.mjs 69건 통과.
- 브라우저 하네스는 `node --check`로 문법만 확인했다. 요청대로 실행하지 않았으므로 화면 간격 ±1px는 하네스에 담은 기대이며 새 브라우저 실측 결과가 아니다.
- 카탈로그: 79,416 → **79,679바이트**. 기존 79,700바이트 회귀 단정·90,000바이트 상한 모두 유지. 전체 매니페스트 150,685바이트, 최대 get_component(DataTable) 4,576바이트.
- Storybook 빌드는 기존 유형의 500kB 초과 청크 경고를 출력하며 성공했다.
- 버전 범프·공개 API 추가·SelectTrigger 기본 폭 변경·브라우저 실행·커밋·푸시는 하지 않았다. 금지된 다른 AI 설정 경로는 읽거나 수정하지 않았다.

사용자가 화면 검증을 진행할 때는 `pnpm qa`를 실행하면 등록된 하네스가 기존 검사와 함께 실행된다. 해당 결과에서 app-shell의 간격·위치 검사와 DataTable의 새 문구 검사를 확인하면 된다.
