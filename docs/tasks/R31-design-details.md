# R31 · 디자인 디테일 — 화면 조립 훑기에서 찾은 것

사용자 지시: 배포보다 기능·디자인 디테일을 먼저. 글꼴(Pretendard) 전환 뒤 Storybook 화면 조립 스토리
(목록·상세·등록)를 라이트·다크, 1440·1024px 로 훑고 수치로 확인했다. **버전은 올리지 마라.**

---

## 0. 전제 — 내가 측정한 것

| | 측정 |
|---|---|
| 세로 중심 | 컨트롤 안 한글 라벨 잉크 중심이 상자 중심에서 ±0.6px (버튼·Select·MultiSelect·입력·칩). **손댈 것 없음** |
| D1 행 액션 | 목록 12행마다 **테두리 있는 secondary 버튼 + 문자 `⋯`** — 표에서 가장 무거운 요소. 열 제목 "액션" |
| D2 탭 밑줄 | 선택 탭 2px 밑줄 끝 206px, 탭 목록 기준선 211px — **5px 떠 있다.** 원인: `.ds-tabs-list { padding: var(--space-4) }` (스크롤 영역에서 포커스 링이 잘리지 않게 둔 여백) |
| D3 상세 이중 선 | 탭 기준선 211px 바로 아래 227px 에 `dl` 의 `border-top` — 평행선 두 개 (DetailScreen 스토리) |
| D4 라디오 묶음 레이블 | 등록 화면 "배송" 이 `<p>` 15px/400, 다른 레이블은 Field `<label>` 13px/500. Field 는 항상 `<label htmlFor>` 인데 RadioGroup 루트는 `div` 라 연결되지 않는다 → 스토리가 `<p>배송</p>` + `aria-label="배송"` 으로 우회. 도그푸딩 3 에서 나도 `<legend>` 로 즉흥 |
| D5 수량 입력 | 등록 화면 수량이 폼 전체 폭 672px 에 오른쪽 정렬 — 값 "1" 이 레이블에서 멀리 떨어진다 |
| D6 Storybook 여백 | 데코레이터 `p-6` 의 **`.p-6` 규칙이 CSS 에 없다** (`.storybook/preview.tsx` 가 Tailwind 스캔 밖). 모든 스토리가 여백 0 → 1024px 에서 화면 조립 스토리가 화면 가장자리에 붙는다. `min-h-dvh`·`bg-canvas` 는 다른 곳에서 쓰여 우연히 있다 |

## 1. D1 · 행 액션은 조용한 아이콘 버튼

- 패턴: `<Button variant="ghost" size="sm" iconOnly aria-label="{행 식별} 작업"><Ellipsis aria-hidden="true" /></Button>`
  (`Ellipsis` 는 `@s2life/ui/icons`). 문자 `⋯` 를 쓰지 않는다
- 목록·DropdownMenu·Peek 스토리의 `⋯` 세 곳을 이 패턴으로 (Peek 의 행 트리거도 같은 이유)
- 액션 열 제목은 화면에서 숨기고(`sr-only`) 접근 이름은 "작업". "액션" 이라는 말은 쓰지 않는다
- DESIGN.md 의 행 액션 단락과 MCP(DropdownMenu 또는 DataTable 소비자 규칙, 120자 이하)에 패턴을 적는다
- 측정 기준: 평소 테두리 색 투명, 아이콘 대비 ≥ 3:1(행 배경 대비, 라이트·다크), 호버·포커스 시 드러남

## 2. D2 · 선택 밑줄은 기준선 위에 앉는다

- 탭 목록 아래쪽 여백을 0 으로, 기준선은 `border-bottom` 대신 **안쪽 그림자**(`box-shadow: inset 0 -1px 0 …`)로
  그려 트리거의 2px 밑줄이 그 위를 덮게 한다
- 그러면 바깥 포커스 링이 스크롤 영역 아래에서 잘린다 → 탭 트리거의 포커스 링을 **안쪽**으로
  (`outline-offset` 음수). DESIGN §16(포커스)과 탭 절에 이유를 적는다
- 측정 기준: 선택 탭 밑줄 아래 끝 = 기준선 아래 끝(±0.5px). 키보드 포커스 링이 탭 목록의 잘림 사각형 안에 다 들어온다.
  가로 스크롤(탭넘침 스토리)에서도 같다

## 3. D3 · 상세 화면 이중 선

DetailScreen 스토리 패널의 `dl` 위쪽 선을 없앤다. 탭 기준선 아래 24px 안에 다른 가로 선이 없어야 한다.

## 4. D4 · Field 가 라디오 묶음에도 레이블을 준다

- Field 의 레이블에 id 를 주고, **비공개 컨텍스트**(R29 의 `field-error-context` 와 같은 방식)로 넘겨
  RadioGroup 이 `aria-labelledby` 로 쓴다. 소비자가 `aria-label`·`aria-labelledby` 를 주면 그것이 우선
- Field 가 넘기는 설명·오류(`aria-describedby`·`aria-invalid`)가 radiogroup 에 붙는지 확인
- 등록 화면 스토리의 "배송" 을 `<Field label="배송">` 으로. 소비자 규칙(MCP RadioGroup): 묶음 제목은 Field 로 준다
- **공개 prop 을 늘리지 마라**
- 측정 기준: 접근성 트리에서 radiogroup 의 이름이 "배송"(CDP `Accessibility.getFullAXTree` 등). "배송" 레이블의
  계산 스타일이 다른 Field 레이블과 같다(태그·크기·굵기·색)

## 5. D5 · 숫자 입력은 자릿수에 맞는 폭

- 등록 화면 수량 Field 의 폭을 내용에 맞게 좁힌다 (예: 토큰 `--field-min-w` 120px 근처. 근거를 적어라)
- MCP Input 규칙: 숫자 입력은 예상 자릿수에 맞춰 폭을 좁힌다 — 넓은 칸 오른쪽 끝의 숫자는 레이블과 멀어진다
- Input 의 기본 폭은 바꾸지 마라 (그리드 칸을 채우는 경우가 있다)

## 6. D6 · Storybook 여백

데코레이터의 여백을 Tailwind 클래스가 아니라 **인라인 스타일**(`padding: var(--space-24)`)로. Tailwind 스캔 범위를
넓히지 마라 — 소비자 CSS 에 Storybook 전용 클래스가 섞일 수 있다. 문서 모드에서 R26 의 높이 규칙은 그대로.
- 측정 기준: 스토리 루트 래퍼의 계산된 padding 24px. 1024px 에서 화면 조립 스토리 내용의 왼쪽이 24px

## 7. 하네스

`docs/qa/` 에 디테일 하네스 하나(또는 기존 하네스에 추가) — 위 측정 기준을 그대로 단언한다. D2 는 탭넘침 스토리 포함,
D1 은 라이트·다크. 여백이 생기면 위치를 절대값으로 잰 기존 단정이 흔들릴 수 있다 — **기대값을 고치지 말고 목록으로
보고해라.** 내가 실측해서 판단한다. 접근 이름 변경("액션" → "작업")으로 바뀌는 선택자는 고쳐도 된다.

## 8. 하지 마라

- 공개 prop 추가, Input 기본 폭 변경, Tailwind `@source` 확장, 버전 범프
- 정렬 아이콘(↑↓) 표시 방식 변경 — 정렬 가능함을 알리는 장점이 있어 이번 범위 밖

## 9. 보고할 것

1. 바꾼 파일 목록
2. D2 의 포커스 링 처리(값)와 DESIGN 에 적은 이유
3. D4 컨텍스트 연결 코드 인용, 소비자 aria 우선 처리
4. D5 폭 값과 근거
5. 영향을 받을 것으로 보이는 기존 단정 목록 (고치지 않은 것)
6. `npm_config_offline=true pnpm verify`, `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify` 결과
