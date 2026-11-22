# R42 · 세그먼트 컨트롤

근거: `docs/research/ui-coverage-review.md` P2. 보기 전환(표·카드), 기간 단위(일·주·월), 차트 지표 전환. 지금은 Tabs(패널 전환)나
RadioGroup(폼 입력)으로 우회한다 — 둘 다 모양·의미가 맞지 않는다. 0.3.1 후보. **버전은 올리지 마라.**

---

## 1. 부품 (이름은 제안)

`SegmentedControl` + `SegmentedControlItem`(또는 `options` 배열 — 카탈로그 크기와 소비자 편의로 골라 근거를 보고):
제어·비제어(`value`·`onValueChange`·`defaultValue`), 항목 `value`·라벨·선택 아이콘·`disabled`, `size` sm·md(높이는 기존 control 토큰), 선택 `fullWidth`

- 의미: **한 개 선택** — `role="radiogroup"`·`radio` + `aria-checked`, 화살표 키로 이동·선택(로빙 탭 인덱스), 그룹 접근성 이름 필수
  (`aria-label` 또는 보이는 라벨 연결). 아이콘 전용 항목은 이름 필수
- 모양: 바탕 위 선택 칸이 떠 있는 형태. 선택은 **색만으로 말하지 않는다**(바탕·그림자/경계·굵기). 비활성·포커스 링·다크
- 좁은 폭: 항목이 넘치면 가로 넘침 없이 — 줄바꿈하지 않고 축약/스크롤 중 측정해서 정해라
- Tabs·RadioGroup 과의 갈림길: 패널을 바꾸면 Tabs, 폼 값이면 RadioGroup(제출되는 값), 화면 보기·필터 단위를 즉시 바꾸면 세그먼트

## 2. 문서·MCP·스토리

- DESIGN 입력 절에 갈림길 표
- MCP intent + keywords("보기 전환", "기간 단위", "일 주 월", "토글 그룹", "세그먼트") + Tabs·RadioGroup dont/related
- 스토리: 기본 · 아이콘+라벨 · 아이콘 전용 · 크기 2 · 비활성 항목 · fullWidth · 좁은 폭 · 다크 · 표/카드 보기 전환 조립. Primary 깨끗하게
- MCP 크기: 상한 회귀 단정을 실측 + 여유 300 이하로. 카탈로그 90KB·목록 24KB·상세 6KB 안

## 2b. MCP "전체 매니페스트" 예산을 응답 단위로 바꾼다 (내가 측정·결정했다)

R41 후 전체 매니페스트 154,853 / 160,000. 이 라운드와 R43 으로 넘을 수 있다. 그런데 전체 매니페스트는 **어떤 MCP 응답으로도
한 번에 나가지 않는다** — 응답은 `list_components`(≤24KB)·`get_component`(≤6KB)·`design://components`(카탈로그 ≤90KB)·
`design://tokens`·`get_rules` 로 나뉘어 나가고, 앞의 셋은 이미 응답 예산이 있다. 예산이 없는 응답은 토큰(실측 67,002)과 규칙(4,141)뿐이다.

- `assertSizeBudget` 의 "전체 160,000" 을 없애고 **`design://tokens` 응답 ≤ 80,000**, **`get_rules` 응답(전체) ≤ 8,000** 으로 바꾼다
  (출력 형식은 기존 줄과 같게, 넘으면 exit 1). 경계값 테스트도 함께
- DESIGN 13.3·`packages/mcp/README.md` 의 예산 문장과 이유 한 단락(위 실측). 카탈로그 90KB 는 그대로

## 3. 검증

`npm_config_offline=true pnpm verify`, `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify`.
하네스(작성만): 역할·`aria-checked`·그룹 이름 · 화살표·Home·End · Tab 은 그룹에 한 번 · 비활성 건너뜀 · 선택 표시가 색 외 단서를 가진다
(계산 스타일) · 높이 = control 토큰 · 좁은 폭 가로 넘침 0 · 라이트·다크 대비 · 콘솔 오류 0.

## 4. 하지 마라

- 다중 선택(체크박스 토글 그룹)은 범위 밖, 새 색 토큰, 버전 범프

## 5. 보고할 것

1. 바꾼 파일 2. 공개 API·구조 선택 근거 3. 좁은 폭 처리 결정(측정) 4. verify·MCP 결과 5. CHANGELOG
