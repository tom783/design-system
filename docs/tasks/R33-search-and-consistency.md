# R33 · 검색 입력과 일관성 — 도그푸딩 4 결함 3건

근거: `docs/dogfood/04-vibe-coding-cms.md` V1–V3, `docs/research/ui-coverage-review.md` P1 "검색 입력".
0.3.1 후보. **버전은 올리지 마라.**

---

## 0. 전제 — 내가 측정한 것

| | 측정 |
|---|---|
| V1 검색 아이콘 | 바이브코딩 AI 가 `<Search>` 를 절대 위치로 Input 위에 겹쳤다 → **Input 바탕이 덮어 안 보인다**(아이콘 중심에서 가장 위 요소는 INPUT). Input 에 앞쪽 아이콘 자리가 없어서다 |
| V2 카드 위 여백 | `CardBody` = `p-4 pt-0`. CardHeader 없이 쓰면 첫 요소가 카드 테두리에서 **1px**(헤더 있는 카드 17px) |
| V3 Select 계열 | 아래 표 |
| 유틸리티 | 공개 `styles.css` 에 `.sr-only`·`.tabular`·`.truncate` 가 있다. `.tabular` 는 우리가 정의했지만 `.sr-only`·`.truncate` 는 내부 사용 덕에 Tailwind 가 만든 것 — 내부에서 안 쓰게 되면 사라진다. 문서에 없어 AI 가 다시 정의했다 |

V3 실측 (라이트, 레이어 디테일 스토리):

| | Select | Combobox 단일 | Combobox 다중 | MultiSelect |
|---|---|---|---|---|
| 바탕 | **투명** | bg-surface | bg-surface | bg-surface |
| 꺾쇠 | text-primary × **opacity .5** | text-primary × 1 | text-primary × 1 | text-primary × 1 |
| 꺾쇠 오른쪽 여백 | 13 | 13 | **5** | 13 |
| 비었을 때 글자 시작 | 13 | 13 | **5** (도그푸딩 4) | 13 |

Select 의 투명 바탕·흐린 꺾쇠는 shadcn 기본 클래스(`bg-transparent`, `opacity-50`)가 남은 것이다.

## 1. 검색 입력 — Input 앞쪽 아이콘

- `Input` 에 `leadingIcon?: React.ReactNode` (Button 의 `leadingIcon` 과 같은 이름). 아이콘은 장식이다(`aria-hidden`),
  클릭은 입력으로 간다(포인터 이벤트 통과), 색은 `text-tertiary`, 16px, 입력 글자는 아이콘 뒤에서 시작한다
- `type="search"` 는 `leadingIcon` 을 주지 않으면 **돋보기 아이콘을 기본으로** 단다(검색 칸의 관례 — 소비자가 매번
  넣지 않아도 되게). 끄는 방법도 하나 둔다(예: `leadingIcon={null}`). 이유와 함께 DESIGN 입력 절에
- 기존 지우기 버튼(오른쪽)·비밀번호 보기 버튼과 함께 쓸 수 있어야 한다. 기존 래퍼를 재사용해라
- `Field` 가 넘기는 `id`·`aria-*` 는 계속 실제 `<input>` 에 붙어야 한다
- **아이콘이 입력 바탕 위에 그려져야 한다**(V1 의 실패가 바로 이것). 하네스로 증명

## 2. CardBody 단독 위 여백

헤더 없이 쓴 `CardBody`(카드의 첫 자식)는 위 여백을 갖는다(16px, 헤더 있는 카드와 같은 시작선). 헤더 다음의 CardBody 는
지금처럼 `pt-0`. 소비자 prop 을 늘리지 말고 CSS 로.

## 3. Select 계열 트리거 모양 통일

Select · Combobox 단일 · Combobox 다중 · MultiSelect 트리거가 같아야 한다:
- 바탕 `bg-surface`, 경계 `border-input`, 높이 38
- 꺾쇠: 같은 색·같은 투명도·같은 크기·같은 오른쪽 여백(13). 색은 하나를 골라 근거와 함께 — 비텍스트 대비 3:1 이상
- 비었을 때 플레이스홀더 글자 시작 13
- Combobox 다중은 태그가 있을 때 태그 영역만 촘촘한 여백을 써도 된다. 꺾쇠 위치·빈 상태 글자 시작은 위와 같게
- 다크도 같은 기준

## 4. 공개 유틸리티

`styles.css` 에 공개 계약으로 **직접 정의**: `.sr-only`(스크린리더 전용), `.tabular`(있음). `.truncate` 는 공개하지 않는다
(내부 Tailwind 생성물 — 필요하면 근거를 대고 공개). README·시작하기에 "제공하는 유틸리티" 한 줄과 쓰임.
Tailwind 경로(`tailwind.css`)에서도 같은 이름이 동작하는지 확인.

## 5. MCP·문서

- Input 소비자 규칙: 검색 칸은 `type="search"` — 돋보기·지우기가 내장된다. 아이콘을 따로 겹치지 않는다
- Card 규칙: 헤더 없이 CardBody 만 써도 된다(위 여백 내장)
- 스토리: Input 검색(기본 아이콘)·앞쪽 아이콘(다른 아이콘)·아이콘+지우기·비활성, Card 본문만, Select 계열 나란히(라이트·다크)

## 6. 검증

`npm_config_offline=true pnpm verify`, `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify`.

하네스 (작성만 — 실행은 내가 한다):
- 검색 입력: 아이콘이 보인다 — 아이콘이 입력 **위에** 그려지는지(DOM 순서·쌓임 맥락으로 단언), 아이콘 중심 클릭 시
  입력에 포커스, 입력 글자 시작 ≥ 아이콘 오른쪽 + 8, Field 안에서 `aria-describedby`·`id` 가 input 에 있다
- Card: 본문만 카드의 첫 요소 위 간격 = 헤더 있는 카드의 제목 위 간격 (±1px)
- Select 계열 4종: 바탕·경계·높이·꺾쇠(색·투명도·크기·오른쪽 여백)·빈 상태 글자 시작이 같다, 라이트·다크
- `.sr-only`·`.tabular` 가 기본·Tailwind 경로 모두에서 계산 스타일로 동작

## 7. 하지 마라

- Input 기본 폭·높이 변경, 버전 범프
- 꺾쇠 아이콘 모양 변경(lucide ChevronDown 유지)

## 8. 보고할 것

1. 바꾼 파일 목록 2. leadingIcon 구조(코드 인용)와 끄는 방법 3. 꺾쇠 색 선택과 대비 4. 흔들릴 수 있는 기존 단정
5. verify·MCP 결과 6. CHANGELOG `0.3.1 — 미게시` 기록 여부
