# R28 · 사용 규칙을 소비자의 말로

매니페스트의 `purpose` · `useWhen` · `dont` · `rules` 는 **이 디자인 시스템으로 화면을 만드는
사람(과 AI)** 에게 가는 글이다. MCP `get_component` 와 Storybook 사용 의도 카드가 그대로 보여준다.
지금은 구현자 메모가 섞여 있다. 그것을 걷어 낸다. **버전은 올리지 마라.**

근거: 도그푸딩 2 G3-5 (`docs/dogfood/02-marketing-nextjs.md`).

---

## 0. 전제 — 내가 측정한 것

`rules` 가 있는 컴포넌트 47개, 규칙 문장 55개, 중앙값 41자, 최대 406자. 긴 것일수록 구현 메모다.

| 종류 | 예 | 소비자에게 |
|---|---|---|
| **할 일** | Input "금액·수량은 type=text inputMode=numeric" · Dialog "저장하지 않은 변경이 있으면 dismissible=false 와 onDismissAttempt" · Collapsible "입력값 보존은 forceMount" · Hint "닫은 안내는 앱이 기억한다" | **남긴다** |
| **알아둘 동작** | Carousel "사용자가 직접 넘기면 자동재생은 다시 켜지지 않는다" · Textarea "Enter 는 줄바꿈, Ctrl/Cmd+Enter 는 제출" · ClampText "전체 글은 DOM 에 남아 복사된다" | **남긴다** — 모르면 앱이 이것과 싸우거나 다시 만든다 |
| **구현 내부** | Carousel "IntersectionObserver threshold=0.6" · Collapsible "ARIA·data-state 는 Radix 가 소유" · Combobox "28px 태그 · roving tabindex" · Avatar "의미 토큰을 사용한다" · TrendBand "SVG 에 의미 토큰과 직접 라벨" | **뺀다** |
| **규칙 아님** | "Screens/CreateScreen 과 Screens/Flow 에서 … 조립한다" — Combobox·RadioGroup·Switch·FormFlow 에 **같은 문장 복붙** | **뺀다** |

구현 내부는 DESIGN.md 해당 절에 이미 있다 (표본 확인: threshold · roving · MutationObserver ·
forceMount · aria-multiselectable · focusNextFormStop · scroll-behavior · data-state · manual popover).
각 규칙의 `source` 가 그 절을 가리킨다.

`purpose` · `dont` 에도 같은 문제가 있다. Carousel purpose "네이티브 가로 스크롤과 scroll-snap 으로
넘긴다", dont "transform 이동·기본 순환을 추가하지 마라" 는 컴포넌트를 고치는 사람에게 하는 말이다.

## 1. 판정 기준 — 한 문장마다

> **"이 문장을 안 앱 개발자는 무엇을 다르게 하는가?"** 답이 없으면 뺀다.

- 주어는 앱(소비자)이다. "앱이 ~한다", "~에는 ~를 쓴다", "~는 컴포넌트가 처리한다 — 직접 만들지 않는다"
- **한 규칙 = 한 생각.** 지금처럼 여러 문장을 한 `text` 에 몰지 말고 `rules` 배열의 여러 항목으로 나눈다.
  각 항목은 자기 `source` 를 갖는다
- 항목당 **120자 이하**
- 동작 설명은 "그래서 앱은 무엇을 하지 않아도 되는가/하면 안 되는가"가 드러나게
  (예: "자동재생은 정지 버튼을 함께 렌더한다. 앱이 정지 버튼을 따로 만들지 않는다")
- prop·값 이름은 그대로 쓴다 (`forceMount`, `inputMode=numeric` 은 소비자 API 다)
- `purpose` 는 "무엇을 해 주는가" 한 문장. 구현 수단(scroll-snap, Radix, cmdk)은 쓰지 않는다
- `dont` 는 앱이 저지를 수 있는 실수만. 컴포넌트 내부를 고치지 말라는 문장은 뺀다
  (예: Carousel "Swiper·Embla 같은 캐러셀 라이브러리를 함께 쓰지 마라" 는 남길 만하다 — 앱의 선택이다)
- `keywords` 는 건드리지 마라 (검색 매칭)

## 2. 빠지는 지식은 DESIGN.md 에 있어야 한다

뺀 문장마다 그 내용이 **인용된 DESIGN.md 절에 이미 있는지** 확인해라. 없으면 그 절에 옮겨 적는다.
지식을 버리는 라운드가 아니라 **자리를 옮기는** 라운드다. 옮긴 것은 보고에 목록으로.

## 3. 자동 검사 (단위 테스트, mcp-build 게이트든 새 테스트든)

모든 컴포넌트의 `purpose` · `useWhen` · `dont` · `rules[].text` 에:

- 금지어 0: `Observer`, `threshold`, `scrollBy`, `scrollTo`, `Radix`, `cmdk`, `구독`, `roving`,
  `tabindex`, `data-state`, `popover`, `useLayoutEffect`, `useEffect`, `preventDefault`,
  `activedescendant`, `scrollHeight`, `fonts.ready`, `재측정`, `Screens/`
  — 정말 소비자 API 라서 써야 하는 경우가 있으면 **그 항목만** 이유와 함께 허용 목록에 둔다
- `rules[].text` 각 120자 이하
- 같은 `rules[].text` 가 두 컴포넌트 이상에 똑같이 있으면 실패 (복붙 방지. 부모-부품 상속은 해당 없음)

**판별력 확인**: 지금(R27) 매니페스트에 이 검사를 돌리면 실패해야 한다. 몇 건이 걸리는지 보고해라.

## 4. 기준선 픽스처 — 이 라운드에서만 갱신한다

`docs/qa/fixtures/get-component-baseline.json` 의 8개 상세에서 `rules` 가 바뀐다. R23 의 "고치지 마라"는
**구조 리팩터의 안전망**이었다. 이번엔 내용을 의도적으로 바꾸므로 갱신한다. 조건:

- 갱신 전후를 비교하는 스크립트를 한 번 돌려, 차이가 **8개 항목의 `purpose`·`useWhen`·`dont`·`rules`
  필드에만** 있고 그 밖(`props`·`slots`·`import`·`source`·`kind`·`__list` 의 구조 등)은 바이트 단위로
  같음을 보여라. `__list` 의 `purpose` 가 바뀌는 건 허용
- `server.test.mjs` 의 R26 `dontDelta` 는 새 기준선에 흡수하고 지운다
- 기준선 비교 자체(구조화 결과와 text 직렬화 동일)는 그대로 둔다

## 5. 하지 마라

- `principles`(get_rules) 수정 — 대부분 앱 코드에도 적용되는 규칙이라 이번 범위 밖
- `keywords` · `props` · `slots` · `related` 수정
- 컴포넌트 코드 수정
- 매칭 결과를 바꾸려고 문구를 조정하기 — `match.test.mjs` 가 깨지면 고치지 말고 보고해라
- 버전 범프

## 6. 유지보수 꼬리

- `CHANGELOG.md` `0.3.1 — 미게시` 에 "바뀐 지침 (MCP)" 로
- 매니페스트 예산 출력 (줄어들 것이다)

## 7. 보고할 것

1. 바꾼 파일 목록
2. 3번 검사의 판별력: R27 매니페스트에서 걸린 건수
3. DESIGN.md 로 옮긴 내용 목록 (없으면 "없음, 전부 이미 있었다")
4. 4번 기준선 비교 스크립트 결과
5. 허용 목록에 둔 항목과 이유
6. `npm_config_offline=true pnpm verify` 결과
7. 판단이 애매했던 문장 (남길지 뺄지) — 내가 본다

전후 대조표는 내가 매니페스트 diff 로 직접 만든다. 따로 쓰지 않아도 된다.
`pnpm qa` 는 내가 돌린다.
