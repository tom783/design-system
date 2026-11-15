# R16 · 나머지 입력 — Textarea · RadioGroup · Switch · Label · Input 타입

대상 섹션: `DESIGN.md §17`. (§16 이 상세 화면이다. §17 을 새로 만든다.)
의존성은 설치돼 있다: `@radix-ui/react-radio-group` · `@radix-ui/react-switch` · `@radix-ui/react-label`.

---

## 0. 전제 — 내가 브라우저에서 직접 측정한 결과

**이 표가 설계의 근거다.** 추측하지 마라. 다르게 하려면 먼저 재라.

### 0.1 `type="number"` 는 금액·수량에 쓸 수 없다

| 넣은 값 / 동작 | 실제 결과 |
|---|---|
| `1,000` | 쉼표가 **조용히 사라진다** → `1000`, `checkValidity()` 는 **true** |
| `1e5` | 통과한다. `valueAsNumber` 가 **100000** |
| `--5` | **값이 통째로 빈 문자열이 된다**, invalid. 사용자는 이유 없이 빈 칸을 본다 |
| 마우스 휠 | `10` → **`11`**. 포커스된 칸 위에서 페이지를 스크롤하면 수량이 바뀐다 |
| ArrowUp | `10` → `11` |
| `step=0.01` 위반 메시지 | `"Please enter a valid value. The two nearest valid values are"` — **영어**. `lang="ko"` 인데도 그렇다 |

### 0.2 `type="date"`

| 측정 | 결과 |
|---|---|
| 너비 | **125px 고정**. 같은 조건의 `type=text` 는 153px — 우리 컨트롤 치수와 안 맞는다 |
| `value` | `"2026-11-15"` 문자열로 정확하다 |
| `valueAsDate` | `Sun Nov 15 2026 09:00:00 GMT+0900` — **UTC 자정**이다. 로컬 날짜로 꺼내면 시간대에 따라 하루 어긋난다 |
| 검증 메시지 | 영어 (0.1 과 같다) |

### 0.3 그 밖

| 측정 | 결과 |
|---|---|
| `type=search` 네이티브 지우기 | **측정 불가.** 헤드리스에서는 버튼이 나타나지 않았고 너비도 `type=text` 와 같은 153px 이었다. **있다고 가정하지 마라** |
| Textarea `rows=3` | 51px |
| Textarea 자동 높이 | 25px → 74px 로 정상 동작 |
| 자동 높이 + 한글 IME | 조합 중 줄바꿈 경계에서 `27 → 44` 로 **한 번** 늘고, 확정 후에도 44 로 **같다**. 진동하지 않는다 |
| RadioGroup 화살표 | 포커스와 선택을 **함께** 옮긴다(`r-a→r-b→r-c`), 끝에서 순환. roving tabindex 정상 |
| RadioGroup 그룹 role | `radiogroup` |
| Switch | `<button type="button" role="switch" aria-checked="false">`, Space 로 토글 |
| Label 클릭 | 연결된 컨트롤로 포커스가 간다 |

### 0.4 이 표에서 바로 나오는 규칙

**금액·수량에 `type="number"` 를 쓰지 마라.** `type="text" inputMode="numeric"` 을 쓴다.
쉼표가 사라지고, 지수 표기가 통과하고, 오타 하나에 값이 통째로 날아가고,
휠로 조용히 바뀐다. 네 가지가 전부 **조용한** 사고다.

**네이티브 검증 메시지에 의존하지 마라.** `lang="ko"` 와 무관하게 영어다.
오류 문구는 우리 `Field` 가 한국어로 말한다.

---

## 1. Input 타입 확장

`packages/ui/src/components/input/` 의 기존 `Input` 을 확장한다. **새 컴포넌트를 만들지 마라.**

- `type` 은 그대로 통과시킨다: `text`(기본) · `number` · `search` · `password` · `email` · `tel` · `url` · `date`.
- **`type="number"` 에는 휠 가드를 내장한다.** 0.1 에서 실측한 사고다.
  포커스된 상태에서 휠 이벤트가 값을 바꾸지 못하게 막아라. 페이지 스크롤은 계속 되어야 한다 —
  입력에서 포커스를 떼는 방식(`blur`)보다 그 이벤트만 막는 쪽이 낫다. 어느 쪽이든
  **페이지가 스크롤되지 않게 만들지는 마라.** 그건 더 나쁜 회귀다.
- `type="password"` 에는 **보기/숨기기 토글**을 내장한다. 토글 버튼은 `aria-label` 이
  상태에 따라 `비밀번호 표시` / `비밀번호 숨기기` 로 바뀌고, `aria-pressed` 를 함께 준다.
  입력 자체의 `type` 을 바꾸는 방식이다.
- `type="search"` 는 **우리가 지우기 버튼을 그린다.** 0.3 에서 네이티브 버튼을 확인하지
  못했고, webkit 전용이라 브라우저마다 다르다. 값이 있을 때만 보이고 `aria-label="검색어 지우기"`.
  누르면 값을 비우고 **입력에 포커스를 돌려준다.**
- `type="date"` 는 통과시키되 **권장하지 않는다**(§17 에 이유를 적어라). 0.2 를 보라.
- 숫자 정렬이 필요한 값(수량·금액)은 기존 `.tabular` 규칙을 따른다.

## 2. Textarea

`packages/ui/src/components/textarea/textarea.tsx` + `textarea.css`.

- `rows` 를 받는다(기본 3). 0.1 측정대로 `rows=3` 은 51px 이다.
- **`autoGrow` 옵션(기본 false).** 켜면 내용에 따라 높이가 자란다.
  - `resize: none` + `overflow: hidden` + `maxHeight` 필수. maxHeight 에 닿으면 스크롤한다.
  - 높이 계산은 `scrollHeight` 로 한다.
  - **IME 조합 중에도 자란다. 그게 맞다** — 실측에서 줄바꿈 경계에 한 번 늘고
    진동하지 않았으며 확정 후 높이도 같았다. 조합 중 높이 변경을 일부러 막지 마라.
    (§11.2 의 "조합 중 값 변형 금지" 는 **값**에 대한 규칙이다. 높이는 값이 아니다.)
  - `autoGrow` 가 꺼져 있으면 `resize` 를 막지 마라. 사용자가 늘릴 수 있어야 한다.
- `FormFlow` 와의 관계는 **이미 구현돼 있다**(`form-flow.tsx` 가 `target.matches('textarea')`
  로 분기한다). 새로 만들지 말고 **스타일된 Textarea 로도 그 동작이 유지되는지 검증**해라:
  Enter 는 줄바꿈, Shift+Enter 는 이전 칸(§11.5).

## 3. RadioGroup

`packages/ui/src/internal/radio-group.ts` 재수출 + `components/radio-group/`.

- 내보낼 것: `RadioGroup`, `RadioGroupItem`.
- **Radix 기본 동작을 덮어쓰지 마라.** 0.3 에서 화살표가 포커스와 선택을 함께
  옮기는 것을 확인했다. 그게 ARIA 라디오 패턴이다. Tabs 의 `manual` 같은 것은 **없다** —
  라디오에서 "포커스만 이동"은 패턴 위반이다.
- 선택 표시는 색만으로 하지 않는다(§2.4). 점(indicator) + 테두리 변화를 함께 쓴다.
- 레이블은 `Label` 로 연결한다. 점만 클릭 가능하게 만들지 마라 — 레이블도 눌려야 한다.

## 4. Switch

`packages/ui/src/internal/switch.ts` 재수출 + `components/switch/`.

- 내보낼 것: `Switch`.
- Radix 가 `<button type="button" role="switch" aria-checked>` 를 만든다(실측). 그대로 쓴다.
- **Switch 와 Checkbox 를 언제 쓰나 — `dont` 에 넣을 규칙:**
  - `Switch`: 누르는 즉시 적용된다. 저장 버튼이 없다. (알림 켜기, 자동 재고 차감)
  - `Checkbox`: 폼의 일부이고 제출할 때 함께 간다. (약관 동의, 목록 선택)
  - **폼 안에 Switch 를 넣지 마라.** 즉시 적용인지 제출 대기인지 사용자가 알 수 없다.
- 켜짐/꺼짐을 색만으로 구분하지 않는다. 손잡이 위치가 1차 신호다.

## 5. Label

`packages/ui/src/internal/label.ts` 재수출 + `components/label/`.

- 내보낼 것: `Label`.
- `Field` 가 이미 레이블을 그린다. `Label` 은 **Field 를 쓰지 않는 자리**를 위한 것이다 —
  Switch·Checkbox·Radio 처럼 레이블이 컨트롤 **옆**에 오는 경우.
- `Field` 를 `Label` 로 재구현하지 마라. 둘은 공존한다. §17 에 역할 구분을 적어라.
- 필수 표시는 `Field` 의 기존 규칙(`role="img" aria-label="필수 입력"`)을 따른다.

## 6. 스토리

`packages/ui/src/stories/` 에 추가한다.

- `textarea.stories.tsx` — 고정 rows · autoGrow · maxHeight 도달 · FormFlow 안에서 Enter 줄바꿈
- `radio-group.stories.tsx` — 기본 · 레이블 클릭 · 비활성 항목
- `switch.stories.tsx` — 켜짐/꺼짐 · 비활성 · Label 과 나란히
- `input.stories.tsx`(기존 파일에 추가) — 타입별: number(휠 가드) · password(토글) ·
  search(지우기) · email · tel · date(권장하지 않음 표시)

`play` 를 붙여라. **`play` 는 열었다가 전부 닫고 끝난다**는 걸 기억해라.

## 7. 검증 하네스

`docs/qa/input-render-verify.mjs` 를 새로 만들고 `docs/qa/run-all.mjs` 에 등록해라.
**반드시 `docs/qa/browser.mjs` 를 쓴다.**

최소한 아래를 검사해라. 전부 0 번 표에서 나온 것이다:

- `type=number` 위에서 휠을 굴려도 **값이 바뀌지 않는다**, 그리고 **페이지는 스크롤된다**
- password 토글이 `type` 을 바꾸고 `aria-label`·`aria-pressed` 가 함께 바뀐다
- search 지우기 버튼이 값이 있을 때만 보이고, 누르면 비우고 **입력으로 포커스가 돌아온다**
- Textarea `autoGrow` 가 줄 수에 따라 높이를 키우고 `maxHeight` 에서 멈추고 스크롤한다
- Textarea 안에서 Enter 가 줄바꿈이고 칸을 넘기지 않는다 (FormFlow 안에서)
- RadioGroup 화살표가 **포커스와 선택을 함께** 옮긴다, 끝에서 순환한다
- RadioGroup 의 레이블 클릭으로 선택된다
- Switch 가 `role="switch"` 이고 Space 로 `aria-checked` 가 뒤집힌다
- 콘솔 오류 0건

### 하네스 함정 — 이번에 내가 밟았다

**`keyDown` 과 `keyUp` 을 붙여 보내면 Radix 의 화살표 추적이 깨진다.**
RadioGroup 이 "화살표로 선택이 안 바뀐다"고 1차 측정에서 **거짓으로** 나왔다.
Radix 는 document 의 keydown/keyup 으로 `isArrowKeyPressed` 를 추적하고, 붙여 보내면
포커스 이벤트가 처리되기 전에 플래그가 지워진다.
`type: 'rawKeyDown'` → **대기** → `type: 'keyUp'` 으로 떼어 보내라.

그리고 **포커스 단정 앞에는 대기 루프를 넣어라.** 즉시 읽으면 CI 에서 거짓 실패한다.

## 8. 유지보수 꼬리 — 빼먹으면 verify 가 떨어진다

- `docs/research/component-intent.mjs` 에 `Textarea`·`RadioGroup`·`RadioGroupItem`·
  `Switch`·`Label` 추가. 섹션은 `17`.
  **`RadioGroupItem` 은 `RadioGroup` 의 부품이다 — `partOf` 를 명시해라**(R15B 구조).
  `Textarea`·`Switch`·`Label` 은 독립 컴포넌트다. 부품이 아니다.
  키워드: `여러 줄`, `메모`, `비고`, `긴 글`, `라디오`, `하나만 선택`, `택일`,
  `스위치`, `토글`, `켜기 끄기`, `즉시 적용`, `레이블`, `입력 이름`,
  `비밀번호`, `검색창`, `전화번호`, `수량`, `금액 입력`
- `packages/mcp/match.test.mjs` 에 라우팅 케이스 추가. 최소:
  `"여러 줄 메모"` → `Textarea`, `"하나만 선택"` → `RadioGroup`,
  `"즉시 적용되는 토글"` → `Switch`, `"금액 입력"` → `Input`(number 가 아님을 규칙에서 읽게)
- `packages/ui/src/index.ts` 내보내기. `components.css` 에 새 CSS 연결.
- 예산 여유는 20,242 바이트다(R15B 후). 5개면 충분하다. 그래도 빌드가
  크기로 떨어지면 **보고해라.** 올리지 마라.

## 9. 하지 마라

- 금액·수량 예시에 `type="number"` 사용
- 네이티브 검증 메시지에 의존 (영어다)
- `type=search` 의 네이티브 지우기 버튼에 의존
- RadioGroup 에 "포커스만 이동" 모드 추가
- 폼 안에 Switch 를 넣은 예시
- `Field` 를 `Label` 로 재구현
- IME 조합 중 autoGrow 높이 변경을 막기 (실측상 안전하다)
- `internal/` 밖에서 `@radix-ui/*` import
- JS 에서 CSS import
- 휠 가드가 페이지 스크롤까지 막기

## 10. 보고할 것

1. 새로 만든 파일 목록
2. `pnpm verify` · `pnpm typecheck` 결과
3. `components` 매니페스트 크기 (이전 59,758)
4. 0 번 표와 **다르게 나온 측정** (있으면 값과 재현 방법)
5. 명세와 다르게 구현한 부분 (있으면 반드시)

브라우저는 네 샌드박스에서 못 띄운다. `pnpm qa` 는 내가 돌린다. 하네스는 **작성만** 해라.
