# 변경 기록

`@s2life/tokens` · `@s2life/ui` · `@s2life/mcp` 는 **버전을 함께 올린다**(lockstep).
세 패키지의 버전이 어긋나면 배포 워크플로가 떨어진다.

태그는 **게시된 것에만** 붙인다(`v<버전>`). 배포 워크플로는 `contents: read` 만 갖기
때문에(의도된 제약) 태그는 게시 후 로컬에서 단다. 배포 절차는 `DESIGN.md §15`.

버전은 병합마다 올리지 않고 **오너 목표가 끝날 때 한 번** 올린다(2026-11-24 오너 결정). 1.0 전에는 새 부품·공개 API 추가·
호환 깨짐이 있으면 `0.x.0`, 고침·내부 개선만이면 `0.x.y` 다. **버전 확정은 게시가 아니다** — "미게시" 판은 태그·npm 게시 없이
번호와 변경 기록만 확정한 것이다. 게시는 받아 쓰는 앱이 필요하거나 오너가 요청할 때 승인을 받아서만 한다(AGENTS.md "버전·릴리스").

---

## 미출시

0.6.0 에 들어갈 변경(목표 64). **깨지는 변경이 있다**(2b 옛 이름 정리) — 0.4.0·0.5.0 이 예고한 이름을 공개 API 에서 뺐고
DatePicker 의 옛 값 알림 `onChange` 별칭을 없앴다.
0.4.0·0.5.0 은 게시하지 않아 이 이름을 쓰는 게시본 앱은 없다. 미게시 빌드를 먼저 받아 쓴 앱만 아래 표대로 바꾼다.

### 앱이 할 일 — 마이그레이션 표

빠진 이름을 import 하면 TypeScript 는 TS2305(`has no exported member`), 번들러는 "is not exported" 로 멈춘다.
부품이 안에서 쓰는 계산은 그대로라 부품 동작은 같다 — 공개 진입점(`@s2life/ui`)에서만 닫았다.

| 옛 이름 (0.5.0) | 0.6.0 | 새 이름 · 대체 방법 |
|---|---|---|
| `placeFallback` · 타입 `Rect` · `Placement` | 뺐다 | 말풍선 위치는 `Tooltip`·`Hint`·`Tour`·`Peek` 이 정한다. 직접 그린 말풍선이면 그 계산(위 자리가 없으면 아래, 화면 안 가두기)을 앱에 둔다 |
| `resolveStep` | 뺐다 | `Tour` + `useTour` 가 단계를 고른다. 대상이 없는 단계는 `Tour` 의 `onMissingTarget`(`'skip'`·`'center'`) |
| `useAnchored` · `supportsAnchor` | 뺐다 | `Tooltip`·`Hint`·`Tour`·`Peek`. 앵커 위치 지원 판별은 `CSS.supports('anchor-name', '--x')` |
| `nextFocusable` · 타입 `FocusCandidate` | 뺐다 | Enter 다음 칸 이동은 `FormFlow`(form 을 감싼다) 또는 `useFormFlow`(앱 form 에 붙인다) |
| `focusNextFormStop` | 뺐다 | 같음 — `FormFlow`·`useFormFlow`. Combobox 는 선택 뒤 다음 칸 이동을 스스로 한다 |
| `shouldValidate` · 타입 `ValidationTiming` | 뺐다 | 같은 식을 앱에 둔다: `!isComposing && (trigger !== 'change' \|\| hasErrored)` — 조합 여부는 `useComposition()` (DESIGN.md §11.2) |
| `nextPhase` · 타입 `LoadingPhase` · `LoadingInput` | 뺐다 | `useDelayedLoading(isLoading, { delay, minVisible })` 가 보일지 여부(boolean)를 준다 |
| `initials` | 뺐다 | `Avatar name="…"` 가 이름 글자를 그린다 |
| `encodeRecord` · `decodeRecord` | 뺐다 | `useReturnContext` 의 `capture`·`consume`. 타입 `ReturnRecord` 는 그대로 공개다(`consume()` 이 돌려준다) |
| `useElementWidth` | 뺐다 | 차트 폭은 `ChartFrame` 이 잰다. 다른 요소 폭은 앱이 `ResizeObserver` 로 잰다 |
| `<DatePicker onChange={(value) => …}>` | 뺐다 | `onValueChange={(value) => …}` — 받는 값(`Date`·`DateRange`·`undefined`)과 부르는 때(확정할 때만)는 같다 |

### 제거 (깨지는 변경)

- **내부 도우미 12개와 딸린 타입 6개를 공개 API 에서 뺐다** (목표 64 · DESIGN.md §6.3 규칙 4). 0.4.0 이 예고한 8개(`placeFallback`·
  `resolveStep`·`useAnchored`·`supportsAnchor`·`nextFocusable`·`focusNextFormStop`·`shouldValidate`·`nextPhase`)와 목표 49 가 예고한 4개
  (`initials`·`encodeRecord`·`decodeRecord`·`useElementWidth`), 그 함수에만 쓰이던 타입 `Rect`·`Placement`·`FocusCandidate`·
  `ValidationTiming`·`LoadingPhase`·`LoadingInput`. 루트 `index.ts` 와 부품 폴더 `index.ts`(guide·form·peek·avatar)에서 내보내기를
  지우고 `@deprecated` 를 "내부" 표기로 바꿨다. `ReturnRecord` 는 `useReturnContext` 반환 타입이라 남겼다.
  - 어디서 쓰였나: 모두 부품 안 — `placeFallback`(useAnchored)·`useAnchored`·`supportsAnchor`(Tooltip·Hint·Tour·Peek)·`resolveStep`(Tour)·
    `nextFocusable`(FormFlow)·`focusNextFormStop`(Combobox)·`nextPhase`(useDelayedLoading)·`initials`(Avatar)·`encodeRecord`·`decodeRecord`
    (useReturnContext)·`useElementWidth`(ChartFrame)·`shouldValidate`(부품 사용 없음, 단위 시험만). 스토리·문서 예제·MCP 매니페스트는
    이 이름을 쓰지 않았다(MCP 는 부품만 싣는다 — 응답 변화 없음).
  - `scripts/api-conventions-allow.mjs` 의 `helpers` 에서 12개를 지웠다. 공개 소문자 값은 16개다.
  - 앱이 할 일: 위 표.
- **DatePicker `onChange` 옛 별칭을 뺐다** (목표 64 · DESIGN.md §6.3 규칙 2·5 · 2026-11-24 디자인 총괄 동의). 확정 값 알림은
  `onValueChange` 하나다. 목표 49(0.5.0)에서 이름을 바꾸며 `@deprecated` 별칭으로 남겼던 것 — 타입의 `onChange` prop 과
  런타임 `onValueChange ?? onChange` 를 지웠다. 감싼 Input 의 DOM `onChange` 는 원래 공개 타입에서 빠져 있어(초안 처리용) 이제
  DatePicker props 에 `onChange` 는 없다.
  - 어디서 쓰였나: 저장소 안 스토리·문서 예제·하네스는 0.5.0 에서 이미 `onValueChange` 로 바꿨다. 남은 곳은 별칭을 고정하던
    타입 시험(`date-picker.typecheck.ts` — 이제 `onChange` 를 `@ts-expect-error` 로 거부함을 고정)과 허용 목록 `deprecatedProps`
    (비었다)·MCP `get_component DatePicker` 의 `onChange` prop("옛 이름. onValueChange와 같다.")뿐이었다.
  - TypeScript 앱은 `onChange` 를 넘기면 컴파일이 멈춘다. **타입 없이(JS) 넘긴 `onChange` 는 오류 없이 불리지 않는다** — 입력 초안
    핸들러가 덮는다. JS 앱은 이름을 꼭 바꾼다.
  - 앱이 할 일: 위 표 마지막 줄.

### 추가

- **비제어 초기값 3개 — `ClampText defaultExpanded` · `MultiSelect defaultValue` · `DataTable defaultSelectedIds`** (목표 64 ·
  DESIGN.md §6.3 규칙 1 `X`·`defaultX`·`onXChange`). 셋 다 내부 상태(비제어)가 이미 있었는데 처음 값을 줄 방법이 없어 규약 위반
  허용 목록(`pair/no-default`)에 있었다. 제어 값(`expanded`·`value`·`selectedIds`)을 주지 않을 때 첫 렌더에만 읽고, 둘 다 주면
  제어 값이 이긴다. 기본값은 지금 동작과 같다(접힘 · `[]` · `[]`). `defaultSelectedIds` 는 `useDataTable` 옵션에도 생겼고,
  `data` 에 없는 id 는 지금의 선택 정책(§4.1 교집합)대로 선택으로 세지 않는다. 이름을 바꾼 것이 아니라 새로 더한 것이라 별칭은 없다.
  - 허용 목록 `pair/no-default` 3건을 지웠다(11 → 8건).
  - 앱이 할 일: 없다. 처음 펼친 글·처음 고른 값·처음 선택한 행을 위해 제어형으로 두던 곳은 `default*` 로 줄일 수 있다.
- **반복 입력 줄 — `FieldList`** (타입 `FieldListColumn`·`FieldListCellContext`·`FieldListRowError`, 0.6.0 3a · 디자인 총괄 확정
  규칙 표 L-1~L-17 · Figma 203:4~7 r1 · DESIGN.md §11.10). 출고 품목·상품 옵션처럼 같은 칸 묶음(1~4칸)을 여러 줄 입력받는다.
  도그푸딩 6 에서 부품이 없어 AI 가 카드 안에 줄마다 테두리 상자를 만들고(390 에서 품목 5개 = 화면 3장) 품목 0개 오류를 회색
  글자로 썼다(D3·D4).
  - `fieldset` + `legend`(`hideLabel` 로 카드 제목과 같은 말을 숨긴다). 부품 폭 640 이상은 표 형 줄 — 열 머리 한 번(caption 500,
    필수 `*`) + 아래 4, 줄 피치 46(입력 38 + 8), 열 간격 16, 글자 칸 `minmax(0, 2fr)`·숫자 칸 `minmax(8rem, 1fr)`·삭제 38, 같은 열
    Δx 0. 640 미만은 줄 머리(`품목 2` + 삭제) → 첫 칸 전체 폭 → 숫자 칸 둘씩(간격 12), 줄 사이 `border-subtle`·위아래 16, 칸마다
    레이블. CSS 컨테이너 쿼리라 서버 첫 그림과 같다. 390 에서 3칸 줄 5개 카드 1,140px(목표 ≤ 1,200).
  - 입력 이름은 부품이 `품목 2 수량`으로 붙이고 id·`aria-describedby`·`aria-invalid`·required 를 Field 처럼 연결한다.
  - 삭제 = ghost 38×38 `품목 N 삭제`(확인창 없음), 입력이 있던 줄은 토스트 `품목 N 삭제됨 · 되돌리기`(5초, 같은 자리·같은 값으로).
    추가 = secondary `품목 추가`(목록 아래 12) → 새 줄 첫 칸 포커스. 삭제 뒤 포커스는 다음 줄 삭제 → 이전 줄 삭제 → 추가 버튼.
    `min` 에 닿으면 삭제 비활성(자리 유지), `max` 에 닿으면 추가 비활성 + `최대 N개`. `min` ≥ 1 이면 빈 줄로 시작, 0 이면 빈 상태
    `품목이 없습니다`.
  - 오류 세 층: 칸(`columns[].error` — Field 오류 모양, 자리 예약 없음) · 줄(`rowError` — 줄 아래, `{ message, column }` 이면 원인 칸
    테두리도 위험색) · 묶음(`error` — 목록 머리 아래 한 줄, 아이콘 16 + body-sm 위험색, `role=alert`, fieldset `aria-invalid`·
    `aria-describedby`). 새 토큰·새 Alert 모양 없음.
  - 값은 앱이 소유한다(제어 전용 `value`·`onValueChange` + `createItem` — 되돌리기가 지운 객체를 그대로 다시 넣는다. API 규약
    허용 목록에 이유). 열의 `render(item, { index, update })` 가 칸 입력 하나를 돌려준다. 줄 키는 항목 `id`(또는 `getKey`), 없으면
    부품이 추가·삭제를 따라 붙인다 — 입력 중 줄이 다시 그려지지 않아 한글 조합이 끊기지 않는다.
  - 기준 화면 `Screens/ShipmentCreate`(Figma 추천 조합 7상태 + 묶음 오류 둘), 부품 스토리 `Components/FieldList`, 문서 04 폼 만들기·
    02 컴포넌트 고르기(FieldList·DataTable·SheetContent 갈림길). 하네스 `field-list-render-verify`(87건: 라이트·다크 × 1440·1024·768·
    390 × 9상태 자가 점검 + 포커스·min/max·되돌리기·오류 수·IME). axe(wcag2a~22aa) 76회 위반 0(일회성 주입 — 저장소에 axe 없음).
  - MCP: FieldList 항목(디자인 총괄 지침 purpose·useWhen·dont + 규칙 8), 색인 25,520 → 26,189B(+669) · 목록 +204B · 상세 5,311B
    (상한 7,000 — 최대는 그대로 DataTable 6,118). which_component: 정답 세트 공백이던 품목 줄 2문항(도그푸딩 6)을 FieldList 로 채우고
    r060 6문항(한국어 4·영어 2 — '품목 반복 입력'·'repeat rows'·'line items' 등)을 더해 192문항 top-1 174 · top-3 190 · 후보 0개 0
    (하한 170 · 188 · 0으로 올림). 기존 186문항의 정답 순위·보류 세트 37 · 47·R38 439건 1순위는 그대로다. 검색어에 '입력'을 넣지 않았다 —
    '입력'이 든 키워드 부품이 4개를 넘으면 흔한 낱말로 덜 쳐져 R38 '입력 창을 닫는 버튼을 제공한다.'가 Input → Button 으로 바뀌었다.
  - 앱이 할 일: 없다. 카드 안에 줄마다 상자를 만들어 품목을 입력받던 곳은 이 부품으로 바꿀 수 있다.
- **섹션 제목 줄** — `SectionHeader` (타입 `SectionHeaderProps`·`SectionHeaderAction`, 목표 64 · 0.6.0 3b · DESIGN.md §24.6 ·
  디자인 총괄 규칙 표 S-1~S-11 r1.1 · Figma 203:8~11). 페이지 안, 카드 밖 섹션의 제목·개수·설명·섹션 동작을 한 줄로 두고
  `<section aria-labelledby=제목 id>` 로 내용(`children`)과 묶는다. 층은 PageHeader(h1) > SectionHeader(카드 밖) > CardHeader(카드 안).
  - 제목 `as` 기본 h2(h3 가능) title-sm 20/28 600, 개수 `count` 는 제목 옆 8·같은 크기 400·보조색·고정폭 숫자, 설명 body-sm 14/20
    보조색·제목 아래 4. 구분선·새 토큰 없음.
  - 동작은 머리 오른끝 한 묶음(간격 8, 제목과 ≥ 16), 세로 가운데 = 제목 첫 줄(28) 가운데. `actions` 는 데이터
    (`label`·`kind: 'link' | 'button'`·`href`·`onSelect`·`icon`·`disabled`) — 넘치면 ⋯ 메뉴 항목으로 옮겨야 해서 노드가 아니다.
    `control` 에 기간 SegmentedControl 하나. control 포함 2개까지 줄에, 나머지는 ⋯(38×38). primary 종류는 없다.
  - 여백: 앞 섹션 끝 → 제목 32, 머리 → 내용 12, 페이지 머리 바로 아래 첫 섹션 24 — 페이지 배치 gap 24(§24.3) 위에 앞 형제가 있는
    섹션만 8 을 더한다(padding 이라 `space-y` 에서도 같다).
  - 머리 폭 480 미만: control 은 제목(·설명) 아래 줄 — 위 8, 그릇 가득 폭, 세그먼트 균등(r1.1, 제목은 한 줄 유지. SegmentedControl sm
    기본 폭은 그대로). 제목 줄의 링크·버튼이 다 들어가지 않으면 링크형 1개(control 이 있으면 없음) + ⋯. "들어가는가"는 실제로 잰다
    (창 폭·웹폰트가 바뀌면 다시). 서버 첫 그림은 컨테이너 쿼리로 접힌 쪽이라 측정 전에도 가로 스크롤이 없다.
  - 동작 접근성 이름 '{제목} {label}'(최근 출고 전체 보기), ⋯ 은 '{제목} 더 보기'.
  - Storybook `Components/SectionHeader`: 사용법 · 동작 0·1·2 · 넘침(⋯, h3) · 좁은 폭 294(control 줄 내림·control + 링크 들어감/넘침) · 추천 조합 대시보드·출고 상세(Figma 203:11
    물류 데이터) · 다크. 하네스 `section-header-render-verify`(21건: 라이트·다크 × 1440·1024·768·390 × 두 화면 + 작은 스토리 5,
    스크린샷 16장). `02 컴포넌트 고르기` 에 PageHeader·SectionHeader·CardHeader 갈림길.
  - MCP: SectionHeader 항목(디자인 총괄 purpose·useWhen·dont 초안), PageHeader·Card(→ CardHeader 상속) 규칙에 층 구분(S-1) 한 줄씩.
    색인 26,189 → 26,926B(+737) · 목록 +244B · 상세 3,969B(상한 7,000 — 최대는 그대로 DataTable 6,118). which_component: 정답 세트 r060 에
    6문항(한국어 4·영어 2)을 더해 198문항 top-1 180 · top-3 196 · 후보 0개 0(하한 176 · 194 · 0으로 올림). 기존 192문항 정답 순위·보류 세트
    37 · 47·R38 439건 1순위는 그대로다. '섹션 제목'·'section header'·'섹션 머리' 첫 후보.
  - 앱이 할 일: 없다. `h2` + flex div 로 만든 섹션 머리와 표 위 별도 동작 줄은 이 부품으로 바꿀 수 있다.

### 바뀐 동작

- **필수 표시를 button 에 `aria-required` 로 두지 않는다 — Combobox(단일)·MultiSelect·FileUpload** (목표 64 · DESIGN.md §18.1).
  세 부품이 `required`(Field 가 넣는 값 포함)와 앱이 넘긴 `aria-required` 를 트리거 `<button>` 에 붙였는데, button 역할은 그
  속성을 받지 않아 axe `aria-allowed-attr` 위반이었다(QA/CreateScreen 등록 화면 예시 1건으로 보고됨, 같은 원인으로 Combobox 필드·
  MultiSelect 오류·필드·FileUpload Field안 스토리까지 6스토리 × 2테마 12건). 이제 필수는 값을 다루는 요소가 갖는다 — Combobox 는 열린 뒤
  검색 입력(`role=combobox`), MultiSelect 는 목록(`role=listbox`, 원래도 있었다), FileUpload 는 숨은 파일 입력(원래도 있었다).
  닫힌 트리거의 필수 여부는 Field 라벨의 "필수 입력"이 접근 이름에 실린다("출고 사업장필수 입력"). 트리거에 `role=combobox` 를 주는
  방법은 열린 동안 콤보박스가 둘이 되어 쓰지 않았다. 다중 Combobox 는 입력이 곧 트리거(`role=combobox`)라 그대로다. 화면 변화는 없다.
  - axe-core 4.10.3(WCAG 2.0·2.1 A·AA, 2.2 AA) 관련 127 스토리 × 라이트·다크: `aria-allowed-attr` 12 → 0, QA/CreateScreen 2 스토리 위반 0.
  - 앱이 할 일: 코드 수정은 없다. 트리거 `button[aria-required]` 를 찾던 테스트는 라벨(접근 이름의 "필수 입력")이나 열린 검색 입력·
    목록의 `aria-required` 를 본다. Field 없이 `required` 만 준 Combobox·MultiSelect 는 닫힌 트리거에서 필수가 읽히지 않으니 라벨에
    필수 표시를 둔다(Field 를 쓰면 저절로 된다).
- **넘치는 표의 스크롤 영역이 Tab 으로 닿는다 — DataTable** (0.6.0 3c · 목표 64 · DESIGN.md §4.5). 표가 가로(좁은 폭)나 세로(높이
  제한·가상화)로 넘칠 때만 스크롤 영역(`data-table-scroll`)이 `tabIndex=0` · `role="region"` · 이름 = 표 `caption`(`aria-labelledby`)이
  된다. 포커스한 뒤 ←·→·↑·↓·PageUp/PageDown 으로 민다(브라우저 기본 스크롤). 전에는 늘 `tabIndex=-1` 이라 정렬 버튼·링크가 없는
  표가 좁은 폭에서 넘치면 오른쪽 열을 키보드로 볼 수 없었다(axe `scrollable-region-focusable` serious — 0.6.0 3b 섹션 제목 줄 검사의
  출고 상세 390). 넘치지 않는 표는 그대로(-1 · role 없음)라 Tab 순서·랜드마크가 늘지 않는다. 링은 전역 2px 중립 링(새 토큰 없음)이고
  화면 변화는 포커스 링뿐이다.
  - 검증: axe-core 4.10.3(WCAG 2.0·2.1 A·AA, 2.2 AA) — DataTable 이 그려지는 스토리·문서 63개 × 390·1440 × 라이트·다크
    252 화면에서 DataTable 의 `scrollable-region-focusable` 2 → 0(섹션 제목 줄 추천 조합 상세 390). 넘치는 표 294개 모두 Tab
    정지점, 넘치지 않는 표 154개 중 정지점 0. 같은 252 화면 픽셀 비교: 246장 바이트 동일, 나머지 6장은 DataTable 문서에 새 스토리가
    끼어 아래가 밀린 4장(그 블록을 지우고 찍으면 4/4 동일)과 기준선끼리도 흔들리는 Peek 2장. 포커스 링은 390·1440 × 라이트·다크에서
    네 변 모두 그려지고(잘림 없음) 버튼 링과 같은 값이다. 하네스 `render-verify` +7건, 스토리 `가로 스크롤 — 키보드`.
  - 앱이 할 일: 코드 수정은 없다. 넘치는 표에는 Tab 정지점이 하나 는다(표 안 정렬 버튼·체크박스보다 먼저) — Tab 횟수를 세는 앱
    테스트는 영역(`role=region`, 이름 = caption)을 넣는다. caption 을 생략한 표는 영역 이름이 기본값 '데이터 목록'이니 업무 대상과
    범위를 말하는 caption 을 준다.

### 고침

- **`which_component` 추천 정확도 — 영어 질의와 0.5.0 부품** (0.6.0 목표 64 · 2a · DESIGN.md §13.4 · `docs/qa/r38-match-ranking.md`).
  도그푸딩 6 사전 점검에서 영어 16개 중 9개가 후보 0개, 한국어 16개 중 5개를 놓쳤다. 정답 세트를 128 → 186문항(도그푸딩 6 표 32 ·
  0.5.0 부품 26)으로 늘리고, 같은 세트에서 **top-1 96 → 166/184 · top-3 129 → 182/184 · 후보 0개 28 → 0/186**(영어 후보 0개 27 → 0/50).
  튜닝에 쓰지 않은 보류 세트 48문항은 top-1 19 → 37 · top-3 23 → 47 · 후보 0개 15 → 0이다. 0.5.0 에서 1위·3위 안이던 문항이 밀려난 것은 두 세트 모두 0개다. 원인별로 고쳤다 — 특정 질의 하드코딩은 없다.
  - **영어 동의어:** 영어 낱말·구절을 메타데이터의 한국어 어휘로 옮기는 대응표(약 320개, `filter`→필터, `stuck … bottom`→하단 고정).
    메타데이터는 한국어 하나로 둔다.
  - **토큰화:** 영어 복수형·진행형·과거형 줄기, 한국어 조사·어미를 뗀 줄기(목적·쓰임새 문장과 떨어진 키워드 낱말), 한국어 활용형
    (`걸러`→필터·`한꺼번에`→일괄·`바로`→즉시), 라틴 키워드는 낱말 경계로(`Enter` 가 "center" 안에서 맞지 않는다), 구두점은 구절을 끊는다.
  - **순위 가중치:** 소문자 영어 낱말(`button`·`select`·`label`)은 이름 일치(+1000)가 아니다 — 적힌 그대로의 이름이나 두 낱말 이상 이름
    (`filter bar`)만 센다. 한 부품 안에서 긴 키워드에 든 짧은 키워드를 다시 더하지 않는다. 흔한 단일 낱말 키워드('선택'·'목록')는 덜 친다.
  - **메타데이터:** 키워드 누락 20개 부품에 보강(넣어 보고 다른 문항을 밀어낸 키워드 — FilterBar '필터 조건'·Breadcrumb '위치 표시'·DataTable '합계' — 는 뺐다. FilterBar '필터'·'목록 필터', DatePicker '예정일'·'날짜 선택', DescriptionList '기본 정보'·
    '항목과 값', BulkActionBar '일괄', Checkbox '행 선택'·'일부 선택', Combobox '초성' 등).
  - 회귀 검사: 정답 세트 하한 **top-1 162 · top-3 180 · 후보 0개 0**(`which-component-golden.test.mjs`, pnpm test = verify·pre-commit·CI).
    R38 전체 질의 439건의 1순위 변화는 5건(부품 문장 4건이 가족 루트로, 1건은 전후 모두 가족 밖)이며 모두 대조 표에 적었다.
  - MCP: `which_component` 응답 형태는 그대로다(후보·점수·근거). 점수와 `reasons` 문구가 바뀐다. `get_component` 는 20개 부품의
    `keywords` 만 늘었다(가장 큰 DataTable 은 2a 로는 그대로 5,940바이트 — 2b 의 `defaultSelectedIds` 뒤 6,118 / 7,000, 아래 바뀐 지침).
    색인·목록·규칙·토큰 응답은 바이트가 같다
    (`mcp-response-diff` 0.5.0 c1bda98 ↔ 이 변경 1,543건 중 다름은 which_component 584 · get_component 20).
  - 남은 것: 반복 입력 줄(품목 줄 추가) 공백 2문항은 0.6.0 3a FieldList 로 채웠다(위 '추가'). 스켈레톤 가족의
    "X 모양 자리 표시"는 일반 Skeleton 이 1위다(2위에 해당 프리셋).
  - 앱이 할 일: 없다.

### 바뀐 지침 (MCP)

- `get_component DatePicker` 의 props 에서 `onChange`(옛 이름) 항목이 빠졌다 — 3,091 → 2,909바이트(−182). 상속 표기·규칙은 그대로다.
- `get_component` ClampText·MultiSelect·DataTable 에 위 prop 이 제어 값 바로 뒤에 한 줄씩 생겼다(이름·타입·`required:false`·설명).
  실제 stdio 서버 응답의 props 이름 집합·타입이 TypeScript 부품 props 타입과 같은지 타입 단정으로 대조했다(셋 다 일치).
  색인·`list_components` 는 바이트가 같다.
- **`get_component` 한 건 운영 상한 6,000 → 7,000바이트** (2026-11-24 개발 총괄 결정 · `packages/mcp/budget.mjs`). DataTable 이
  5,940 → 6,118바이트(+178)로 6,000 을 넘었다(JSDoc 없이도 6,017). R49 원칙(실측 최대 × 약 1.15~1.3)대로 올렸고 남은 여유는 882바이트다.
  회귀 상한(`build.test.mjs`)은 늘어난 178바이트만 올렸다. 상세 상위 3개: DataTable 6,118 · FormActionBar 5,270 · FilterBar 4,330.
- **목록 단위 오류는 FieldList `error` — FormActionBar 묶음 오류 지침을 바꿨다** (0.6.0 3a · 규칙 표 L-14·L-15 · DESIGN.md §11.10·§19.5·§24.5).
  0.5.0 의 임시 지침(추가 버튼에 `aria-invalid` + 제출 때 `toast.error`)은 쓰지 않는다 — 목록 머리 아래 위험색 한 줄(fieldset
  `aria-invalid`)이다. `errorCount` 에 묶음 오류도 1개로 센다. `오류 N개` 를 눌렀을 때 첫 `aria-invalid` 가 FieldList 의 fieldset 이면
  빈 목록은 추가 버튼, 아니면 그 목록의 첫 오류 칸(없으면 첫 칸)으로 간다(FormActionBar 동작 고침 — 전에는 fieldset 에 `focus()` 를
  불러 아무 일도 없었을 것이다). MCP `get_component FormActionBar` 규칙 1개 교체·관련 부품 +FieldList(상세 5,270 → 5,490B).
  - 앱이 할 일: 0.5.0 지침대로 추가 버튼에 `aria-invalid`·`toast.error` 를 달았다면 FieldList `error` 로 옮긴다.

---

## 0.5.0 — 미게시

목록 화면 툴바(필터 바·일괄 작업 바)·설명 목록·폼 하단 고정 액션 줄·표 합계 행·입력 단위 접미사를 더하고(목표 49·57),
공개 API 규약을 정리하고, 앱이 받는 번들을 쓴 부품만큼으로 줄였다. 공개 컴포넌트 115개 → **119개**
(`FilterBar`·`BulkActionBar`·`DescriptionList`·`FormActionBar`). 바이브코딩 도그푸딩 6(AI 가 사람 손 없이 목록·상세·등록·
대시보드 4화면)에서 찾은 작은 고침과 화면 조립 지침까지 담았다. 새 부품·공개 API 추가가 있어 0.x.0 이다.
앱 코드나 시각 기준선에 닿는 변경은 **바뀐 동작(마이그레이션)** 에 모았다. 게시하지 않았다(태그·npm 없음).

### 앱이 할 일 (요약 — 자세한 것은 각 항목)

- **코드:** `<DatePicker onChange>` → `onValueChange`(옛 이름은 동작한다). `next build --webpack` 앱은
  `experimental.optimizePackageImports: ['@s2life/ui']`. MCP `design://components` 를 `derived` 로 복원하던 클라이언트는
  `get_component`. DataTable 도구 줄의 선택 수(`N건 선택`)를 쓰던 화면은 BulkActionBar 로, 목록 툴바와 `exportFileName` 을
  함께 썼다면 내보내기를 PageHeader·바 `actions` 로. 카드를 고정 열 수 격자에 넣었다면 auto-fit 으로.
- **시각 기준선 갱신(코드 수정 없음):** StatusChip 기준선(글자 줄의 칩 1~1.5px) · 선택 탭 포커스 링 · 고정 열(넘치지 않는 표의
  고정 경계선·선택 열 뒤 선이 없어짐, 고정 머리 칸 바탕) · 표 도구 줄(`0건 선택` 없음).
- **선택(바꾸면 좋은 것):** 손으로 만든 필터·일괄 작업 툴바·`<dl>`·표 밖 합계·sticky 저장 줄·단위 span 을 새 부품으로.
  폭에 따라 켜고 끄던 `pinnedEnd` 는 늘 주는 것으로.
- **deprecated 12개는 0.5.0 에도 남아 있다.** 0.4.0 이 "다음 마이너에서 뺀다"고 예고한 내부 도우미 8개(`placeFallback`·`resolveStep`·
  `useAnchored`·`supportsAnchor`·`nextFocusable`·`focusNextFormStop`·`shouldValidate`·`nextPhase`)는 0.4.0 이 게시되지 않아 예고가
  앱에 닿은 판이 없었으므로 이번에 빼지 않았다. 목표 49 의 4개(`initials`·`encodeRecord`·`decodeRecord`·`useElementWidth`)와
  DatePicker `onChange` 별칭과 함께 다음 마이너(0.6.0)에서 뺀다. 대체 수단은 각 항목에 있다.

### 추가

- **입력 단위 접미사** — `Input`의 `unit`(목표 49 4a · DESIGN.md §17.1.1). `<Input numeric inputMode="numeric" unit="원" />`처럼
  원·개·%·개월을 상자 안 오른쪽 12px에 값과 같은 14px로 그린다. 숫자 값은 접미사 왼쪽 4px에서 끝나고, 접미사 폭은 실제로 재서
  끝 여백과 최소 폭(120px + 4px + 접미사 폭)에 더한다 — '개월'처럼 긴 접미사도 값과 겹치지 않는다. 색은 기본·포커스·오류
  `--text-tertiary`, 비활성 `--text-disabled`(오류는 경계·아이콘·문장이 맡는다). leadingIcon과 함께 쓸 수 있다.
  접미사는 값이 아니다: `aria-describedby` 맨 앞에 붙어 낭독기가 "39,000 원"으로 읽고(Field 오류·설명·앱 id 와 합친다),
  span은 `aria-hidden`·`user-select: none`이라 복사·붙여넣기·제출에 섞이지 않는다. 슬롯 `data-slot="input-unit"`.
  이름은 StatTile·BulletRow의 `unit`과 같다. DatePicker는 Input props를 이어받지만 `unit`은 뺐다.
  기준 화면 Storybook `Screens/ProductCreate`의 판매가·정가·공급가에 `unit="원"`을 넣었다(같은 줄 정렬·필드 피치 그대로).
  - MCP: `get_component Input`에 `unit` prop·규칙 1개·검색어 3개(접미사·단위 접미사·퍼센트 입력), 2,007 → 2,595바이트(+588).
    `get_component DatePicker` +22바이트(상속 표기 `| 'unit'`·정적 슬롯 `input-unit`). 색인·목록은 바이트가 같다.
    which_component 정답 세트에 5문항을 더해 top-1 57/105 · top-3 77/105(기존 100문항 순위 변화 0).
  - 앱이 할 일: 없다. 단위를 설명 줄이나 겹친 span으로 그리던 곳은 `unit`으로 바꾼다.
- **목록 툴바 — `FilterBar` · `BulkActionBar`** (목표 49 · 0.5.0 디자인 총괄 확정 규격 · DESIGN.md §4.2).
  `FilterBar`: 저장된 보기 Select → 검색 → 필터 트리거(`필터 N`, 0개면 `필터`) → (보기가 바뀌면 '변경됨' + 보기 저장) 한 줄과
  적용 필터 칩 한 줄. 칩은 실제 폭으로 넘침을 정해 나머지를 `+N` 팝오버(`+N` 아래 오른쪽 끝 맞춤·본문 안쪽 16px 안, 하나씩 해제, Esc 로 `+N` 복귀)로 보내고,
  0개여도 칩 줄 높이를 남겨 표 시작점이 고정된다. 칩 해제 뒤 포커스는 다음 칩(없으면 필터 트리거), 초기화 뒤 필터 트리거.
  값은 `view`·`query`·`filters`·`filterOpen` 이 각각 `defaultX`·`onXChange` 쌍이고, `filterContent` 를 주면 트리거가 조건 패널
  팝오버를 연다. 바 폭 720px 미만은 검색이 둘째 줄 전체 폭이다.
  `BulkActionBar`: 행을 선택하면 children(필터 바) 자리를 같은 높이로 대체하고 표 위에 sticky 로 붙는다. `N건 선택`(늘 있는
  live region) → 선택 해제 → 안전 액션 → 구분선 → 위험 액션 하나. 바탕은 중립 `bg/sunken`. 선택 중 필터 바는 `inert`.
  선택은 DataTable `selectedIds`·`onSelectedIdsChange`(제어형)가 소유하고 바는 `selectedCount`·`onClear` 만 받는다.
  새 토큰 없음. AppShell 본문 여백을 `--app-shell-gutter` 변수로도 둬 sticky 바가 본문 윗변에 딱 붙는다(값은 그대로).
  `Screens/OrderList` 와 `QA/ListScreen` 의 손 조합 툴바를 이 부품으로 바꿨고, OrderList 에 검수 매트릭스 상태(칩 0·3·8 ×
  선택 전/후 · `+N` 열림 · 보기 변경됨)와 주문 취소 확인(AlertDialog)을 더했다. 하네스 `list-toolbar-render-verify`(54건).
  - MCP: 색인 +703바이트(FilterBar 362 · BulkActionBar 341) · `list_components` +409바이트(206 · 203), 상세 4,292 · 2,625바이트.
    `which_component` 정답 세트에 8문항(부품마다 한국어 3·영어 1)을 더해 접미사 5문항과 합친 113문항 top-1 65 · top-3 85
    (기존 문항의 순위는 그대로).
- **설명 목록** — `DescriptionList` (타입 `DescriptionListItem`, 목표 49 · DESIGN.md §16.7). 상세 화면의 라벨-값 묶음을
  `items`(label·value·emphasis)로 그린다. `<dl>` 하나에 쌍마다 `<div>`, 라벨 열은 5.5rem~10rem 안에서 가장 긴 라벨에 맞추고
  (`labelWidth`로 고정), 라벨–값 24px·쌍 사이 8px·행 24px(칩 높이, 칩·작은 버튼 줄 포함 피치 32px)·라벨과 값 글자(칩·링크 안
  글자 포함)의 같은 기준선. 빈 값은 `—`(화면 낭독기 "없음"),
  긴 값은 줄바꿈하고 말줄임하지 않는다. `columns={2}`는 카드 폭 640px 이상에서만 두 열(위→아래 순서), 카드 360px 미만은 라벨 위·
  값 아래로 접는다 — CSS 컨테이너 쿼리라 서버 렌더와 첫 그림이 같다. 금액 합계는 `align="end"`(끝 정렬·고정폭 숫자)와 마지막 쌍
  `emphasis`(600·위 구분선·위 여백 8px). Screens/OrderDetail의 손 조합 `<dl>` 네 곳을 이 부품으로 바꿨다(위치 차이는 §16.7).
  - 앱이 할 일: 없다. 상세 화면에서 `<dl>`을 손으로 조합했다면 이 부품으로 바꿀 수 있다.
- **폼 하단 고정 액션 줄 — `FormActionBar`** (목표 57 · 디자인 총괄 확정 규칙 표 F-1~F-13 · DESIGN.md §19.5 · Figma 198:3939 r2).
  등록·편집 폼의 마지막 자식으로 두면 AppShell 본문 바닥에 sticky 로 고정된다 — 짧은 폼도 바닥(본문 내용 min-height 100%).
  좌우·아래 음수 여백과 sticky 오프셋은 `var(--app-shell-gutter)`(24 · 1024 미만 16), 높이 63(12 + 버튼 38 + 윗선 1), 바탕
  `bg/sunken` + 윗선 `border/subtle`, 그림자 없음. 버튼 묶음 최대 폭은 폼 열과 같은 `contentMaxWidth`(기본 48rem) — 저장 오른끝 =
  폼 열 오른끝. 순서 `[삭제 — 편집만, onDelete]` · · · `[상태]` `[취소 — onCancel]` `[저장 primary, type=submit]`, 삭제–저장 ≥ 24.
  `dirty` → '저장하지 않은 변경 있음', `errorCount` → '오류 N개' 링크(첫 `aria-invalid` 칸 포커스, `onErrorClick`),
  `saving` → 저장 버튼 스피너 '저장 중…'(주요색 유지·`aria-disabled`, 그동안 제출을 막는다)·취소·삭제 비활성.
  삭제는 확인창(기본 포커스 '계속 편집', 확정 채운 danger)을 거쳐 `onDelete`. 480px 미만은 상태 숨김·삭제는 '더 보기'(⋯ 38×38)
  메뉴·취소·저장 같은 폭. 줄이 있으면 본문 `scroll-padding-bottom` 79 — Tab·오류 이동으로 칸이 줄 밑에 가리지 않는다.
  폼 밖에 두면 `form` 에 폼 id. Sheet·Dialog 는 `DialogFooter` 그대로(순서·상태 규칙만 공유). 새 토큰 없음.
  FormFlow 의 마지막 칸 Enter 는 다음 정지점이 줄(취소가 먼저)이어도 줄의 저장으로 제출한다.
  `Screens/ProductCreate`(등록·수정·저장 중·오류 2개·짧은 폼)와 `QA/CreateScreen` 저장 줄(주요 버튼이 왼쪽 첫째였다)을 이 부품으로 바꿨다.
- **표 합계 행 — `DataTable` `summary`** (타입 `DataTableSummaryRow`, 목표 57 · 규칙 표 T-1~T-12 · DESIGN.md §4.3).
  `summary={[{ label: '합계', values: { qty: '4', sum: '121,300원' } }]}` 가 `<tfoot>` 한 줄을 그린다 — 첫 데이터 열(선택 열 다음)이
  `<th scope="row">` 라벨, 셀 여백·행 높이는 본문 칸과 같아 합계 숫자가 열 숫자와 같은 x 다. 14/20·600·고정폭 숫자, 열 정렬을 따른다.
  위 1px `border/default`(본문 행 선보다 진하게)·머리와 같은 `bg/canvas`. 최대 2행('이 페이지 합계' 위 · '전체 합계 · N건' 아래).
  `values` 에 없는 열은 비우고 `null` 은 '—'(낭독 "없음"), 빈 표·오류에서는 숨고 로딩 중에는 값 자리가 숫자 폭 스켈레톤이다.
  `tfoot` 은 `sticky bottom` 이라 표가 자기 세로 스크롤을 가지면 바닥에 붙고, `pinnedEnd` 열의 합계 칸도 같은 고정·바탕이다.
  표 스크롤 영역은 `isolation: isolate` 라 머리·합계 층이 표 밖 sticky 줄 위로 올라오지 않는다.
  `Screens/OrderDetail` 의 표 밖 합계는 tfoot 합계 행 + 금액 내역 `DescriptionList`(배송비 → 결제 금액, 값 끝 = 금액 열 글자 끝,
  '상품 합계' 중복 없음)로 바꿨고, 표가 가로로 넘치면 금액 열을 오른쪽에 고정한다. 검수 변형(페이지네이션 2행·선택 열·빈 표·로딩)을 더했다.
  - MCP: FormActionBar 항목(디자인 총괄 지침 purpose·useWhen·dont) · DataTable useWhen·dont·규칙·`summary` · DescriptionList 금액 내역 갈림길.
    색인 +935바이트(553 · 313 · 69) · `list_components` +212바이트, 최대 상세 DataTable 4,576 → 5,642바이트(운영 상한 6,000 안).
    `which_component` 정답 세트에 10문항(FormActionBar 5 · 합계 행 4 · 금액 내역 1, 한국어 8·영어 2)을 더해 128문항
    top-1 80 · top-3 100(기존 118문항 top-1 70 · top-3 90 그대로).
  - 앱이 할 일: 없다. 표 아래 `<dl>`·div 로 열 합계를 만들었다면 `summary` 로, sticky div 저장 줄은 `FormActionBar` 로 바꿀 수 있다.

### 바뀐 동작 (마이그레이션)

- **선택 수는 한 곳 — DataTable 도구 줄이 `N건 선택`을 쓰지 않는다** (목표 57 4단계 · 도그푸딩 6 D1 · 디자인 검수 P1 · DESIGN.md §4.2).
  AI 가 만든 출고 목록에서 행 두 개를 고르면 일괄 작업 바 `2건 선택` 아래 표 도구 줄에 `2건 선택`이 한 번 더 나왔고, 선택이 없어도
  `0건 선택 · 전체 432건 중 20건`이 늘 보였다.
  - 원인: **부품 결함**이 먼저다. `exportFileName` 을 주면 생기는 DataTable 도구 줄이 선택 열이 있으면 늘 `N건 선택`(0 포함)을 그렸다 —
    일괄 작업 바보다 먼저 만든 줄이라 같은 숫자를 두 부품이 그렸다(디자인 시스템 자체 스토리 `선택자동해제`에서도 `0건 선택`이 보였다).
    **조합**도 겹쳤다: 목록 툴바(FilterBar·BulkActionBar) 위 표에 `exportFileName` 을 줘 표 위 줄이 둘이 됐다 — 기준 화면
    `Screens/OrderList` 는 내보내기를 PageHeader 에 둔다. 앞은 부품을, 뒤는 MCP 지침(아래 바뀐 지침)을 고쳤다.
  - 이제 도구 줄은 선택 수를 쓰지 않는다. 로드된 행을 모두 골랐는데 전체가 더 많을 때만 `로드된 N건이 선택됨 · 전체 M건` 범위 안내를
    쓰고(그대로), live region 은 늘 두고 글자만 바꾼다. 내보내기 버튼 라벨(`선택한 행 내보내기` 등)과 동작은 그대로다.
  - 앱이 할 일: 선택 수를 보여야 하면 BulkActionBar 를 쓴다(DataTable 을 제어형으로 두고 `selectedCount={selectedIds.length}`).
    목록 툴바와 함께 `exportFileName` 을 썼다면 빼고, 전체 내보내기는 PageHeader `actions`, 선택 행 내보내기는 바 `actions` 에서
    공개 함수 `downloadCsv` 로 옮긴다. 표 도구 줄 글자를 단정하던 시험은 `N건 선택` 대신 빈 글자를 본다.
- **고정 경계선은 표가 가로로 넘칠 때만 보인다** (목표 57 4단계 · 디자인 검수 P2 · TD-2 A · DESIGN.md §4.4). 넘치지 않는 상세 1440 의
  품목 표에도 금액 열 앞 세로선이 보였다(AI 앱은 금액 열을 늘 `pinnedEnd` 로 줬다). **부품 결함** — 고정 열 경계선을 넘침과 상관없이
  그렸다. DataTable 이 스크롤 영역과 표 크기를 관찰해 넘치면(`scrollWidth − clientWidth > 1`) 루트에 `data-overflow-x` 를 붙이고,
  아니면 경계 칸의 선 색만 투명으로 둔다(굵기 1px 는 남겨 열 폭이 흔들리지 않는다). 선택 열(늘 왼쪽 고정) 뒤 세로선도 같다 —
  Figma 목록 툴바 추천 조합(189:2)에도 그 선이 없다. 고정(sticky)·오프셋은 그대로다.
  - 같은 계열의 결함 하나를 함께 고쳤다: 고정 열 **머리 칸**만 바탕이 `bg-surface`(라이트 흰색 · 다크 #1a1817)이고 다른 머리 칸은
    `bg-canvas`(#f7f6f5 · #0b0a09)라, 선이 없어도 선택 열·금액 열 머리가 흰 칸으로 떠 다른 열처럼 보였다(선을 지우자 드러났다 — 실측).
    고정 머리 칸도 머리 바탕 canvas 다(불투명이라 스크롤되는 머리 칸을 그대로 가린다). 본문 고정 칸 바탕은 그대로 행 바탕이다.
  - 화면이 바뀌는 곳: 넓은 화면에서 넘치지 않는 선택 표(Screens/OrderList·QA/ListScreen·DataTable 선택 스토리)는 선택 열 뒤 세로선이,
    `Screens/OrderDetail` 1440 은 (원래 없던) 금액 열 앞 선이 계속 없다. 넘치는 표(390·`가상화-컬럼고정`)는 그대로 선이 있다.
  - `Screens/OrderDetail` 은 넘침을 재서 `pinnedEnd` 를 켜고 끄던 스토리 쪽 우회를 지우고 금액 열을 늘 고정한다.
  - 기준 화면이 상태 열을 고정한다(디자인 검수 2026-11-24 조건 — AI 는 기준 화면을 따라 한다). `Screens/OrderList` `pinnedEnd={['status']}`,
    `QA/ListScreen` `['status', 'actions']`(고정 열은 끝으로 모여 상태만 주면 행 작업 열 뒤로 간다), AppShell 문서 예제의 주문 목록. 390 에서
    상태 칩이 첫 화면 오른쪽 끝에 보이고(고정선 있음), 1440 은 그대로다(선 없음). 하네스 `screens-render-verify` 가 라이트·다크로 단정한다.
  - 앱이 할 일: 코드 수정은 없다. 폭에 따라 `pinnedEnd`·`pinnedStart` 를 켜고 끄던 코드는 늘 주는 것으로 줄일 수 있다.
    선택 표의 시각 기준선을 갱신한다. 서버 렌더 첫 그림은 선이 없고, 넘치는 표는 하이드레이션 뒤 선이 생긴다.
- **주문 상세 카드 겹침** (목표 57 2c). `Screens/OrderDetail` 카드 세 장이 1024 이하에서 겹쳤다 — Card 최소 폭 240 × 3 + 간격 32 =
  752 > 본문 약 720. `grid-cols-3` 대신 `repeat(auto-fit, minmax(min(100%, var(--card-min-w)), 1fr))` 로 폭이 모자라면 줄을 바꾼다.
  Card 공개 API·최소 폭은 그대로다. 앱이 할 일: 카드를 고정 열 수 격자에 넣었다면 같은 auto-fit 으로 바꾼다.

- **앱 번들 크기 — 쓴 부품만 받는다** (목표 57 · `docs/qa/bundle-size.md`). Button 하나만 가져온 앱이 lucide 전체와
  tokens.json 원본까지 받던 것을 고쳤다. tarball 을 Vite 앱처럼 묶은 값(react 외부, 축소, kB=1000):

  | 앱이 가져온 것 | 0.4.0 | 지금 |
  |---|---|---|
  | Button 하나 | 1,097.1kB · gzip 280.4kB | 34.5kB · gzip 11.3kB |
  | 목록 화면 10개 | 1,343.4kB · gzip 349.6kB | 385.9kB · gzip 117.1kB |
  | 전체 `export *` | 1,533.7kB · gzip 408.7kB | 636.0kB · gzip 192.0kB |

  Next 16 App Router 빈 앱(서버 페이지가 Button·StatusChip·Card·`icons` 의 Check 를 import)의 클라이언트 JS 는 1,694kB → 590kB
  (전송 466 → 179kB), 클라이언트 청크의 lucide 아이콘 2,102 → 8개.
  - 원인 셋: carousel 이 공개 `icons` 진입점(`export * from 'lucide-react'`)을 가져와 lucide 전체가 이름공간 객체로 복사됐다(→ `lucide-react` 직접).
    `dist/index.js` 한 파일이라 앱 번들러가 쓰지 않는 부품을 덜어내지 못했다(→ 소스 파일마다 dist 파일, `preserveModules`).
    `lib/layer.ts`·`lib/use-delayed-loading.ts` 가 생성 JSON 전체를 import 했다(→ 값 3개만 담은 생성 상수 `lib/runtime-tokens.ts`, 값은 그대로 — 8px·200ms·400ms).
  - `"use client"` 는 부품·lib 모듈마다 붙고 공개 진입점 `index.js`·`icons.js`(재export 뿐)에는 붙지 않는다. 진입점에 붙어 있던 0.4.0 은
    서버 페이지가 Button 하나를 써도 부품 전부와 lucide 전체를 클라이언트로 보냈고, `next build --webpack` 은
    `"export *" in a client boundary` 로 **빌드가 실패했다**. 이제 `@s2life/ui/icons` 의 아이콘은 서버에서 그려진다(lucide 자체 경계).
  - 공개 API(`exports`·이름·타입)는 그대로다. 깊은 경로(`@s2life/ui/dist/components/…`)는 여전히 열려 있지 않다.
  - 앱이 할 일: Turbopack(Next 16 기본)·Vite 는 없다. **`next build --webpack` 앱은 `experimental.optimizePackageImports: ['@s2life/ui']`** 를
    켠다 — 없으면 webpack 이 서버 그래프에서 닿는 부품 전부를 클라이언트 번들에 싣는다(1,103kB → 켜면 583kB).
    `cn()`·`buttonVariants()` 같은 함수를 서버 컴포넌트에서 부를 수 없는 것은 0.4.0 과 같다.

- **StatusChip의 기준선은 라벨 글자다** (목표 49 설명 목록 검수 D1 · DESIGN.md §2.3). 이전에는 첫 항목인 아이콘의 아래 끝이
  칩 기준선이라, 칩과 같은 줄의 글자가 칩 글자보다 약 3px 아래에 섰다. 칩 안 배치는 그대로다. 칩이 있는 스토리 58개 전후 대조에서
  41개(DataTable 15개·주문 목록 8개·목록 화면·Peek·대시보드·FileUpload 등)는 화면이 같고, 설명 목록 6개 밖에서는 글자 줄에 놓인
  칩 11개 화면만 1~1.5px 움직였다(PageHeader 상태 칩·주문 상세·QA/DetailScreen·Card 예시 표 셀·StatusChip 예시 2개).
  - 앱이 할 일: 코드 수정은 없다. 칩을 글자 줄(기준선 정렬)에 놓은 화면의 시각 기준선을 갱신한다.
- **MCP `design://components` 리소스는 선택 색인이다** (R49). 저장 형태(`{ derived, components }` — 복원 규칙과
  축약 항목, 88,863바이트)를 그대로 보내던 것을 복원 규칙 없이 읽는 목록으로 바꿨다:
  `{ description, components: [{ name, partOf?, category?, purpose, useWhen?, dont?, parts? }] }`(23,191바이트, 순서는
  `list_components`와 같다). props·slots·규칙·부모에서 합친 의도는 `get_component`로 이름마다 조회한다.
  리소스 목록의 제목·설명도 바뀌었다. **R49 자체로는 도구(tool) 응답이 바이트까지 그대로다** — 0.4.0 서버와 1,363건 대조.
  (목표 49 공개 API 규약이 바꾼 `get_component` 표기는 아래 **바뀐 지침 (MCP)**.)
  - 앱이 할 일: `design://components`를 읽어 `derived`로 복원하던 클라이언트는 `get_component`로 상세를 받는다.
    도구만 쓰는 AI 클라이언트는 할 일이 없다.
- **MCP 응답 크기 예산은 요약·상세·고정으로 나눈다** (R49). 0.4.0의 "MCP 응답 크기 예산은 응답 단위다" 항목의 수치를
  대체한다. 요약(항목 수에 비례): 색인 전체 40,000 · 항목 800, `list_components` 전체 36,000(0.4.0: 24,000) · 항목 320.
  상세: `get_component` 한 건 6,000. 고정: `design://tokens` 80,000 · `get_rules` 전체 8,000. 카탈로그 90,000 상한은 없앴다 —
  저장 형태는 응답이 아니다. 요약 응답은 지금 가장 큰 가족(DropdownMenu 15항목) 4개분 여유를 늘 남기고, 모자라면 생성이 멈춘다.
  실측: 색인 23,191 · 목록 19,873 · 상세 최대 4,576(DataTable) · 토큰 67,555 · 규칙 4,327.
  - 앱이 할 일: 없다. MCP를 쓰는 AI 클라이언트의 컨텍스트 예산은 위 응답 단위로 잡는다.
- **선택 탭의 포커스 링** (2026-11-23 디자인 총괄 결정). 키보드 포커스가 선택된 탭에 오면 안쪽 링의 아래 변 2px가
  브랜드 밑줄 2px를 정확히 덮어 선택 표시가 사라졌다. 이제 링의 아래 변만 밑줄과 간격 2px 위에서 끝나(아래 안쪽 여백
  4px) 밑줄 전체와 기준선 일치가 링 아래로 보인다. 위·좌·우 변과 선택되지 않은 탭의 링은 그대로이고(픽셀 동일), 링은 탭
  안에 머물러 스크롤 영역에서 잘리지 않는다. 이 상태의 링은 버튼 `outline`이 아니라 `::after`로 그린다(§16.1).
  - 앱이 할 일: 코드 수정은 없다. 선택 탭에 포커스가 있는 화면의 시각 기준선을 갱신한다. 앱이 탭 트리거의
    `:focus-visible` 링을 덮어썼다면 선택 탭(`[data-state="active"]`)에서는 `::after`의 `outline`도 함께 맞춘다.
- **DatePicker 값 알림은 `onValueChange`** (목표 49 · DESIGN.md §6.3). 확정한 날짜·기간을 받는 핸들러가 `onChange` →
  `onValueChange`다. 감싼 Input의 DOM 이벤트 `onChange(event)`와 이름은 같고 인자가 달랐다. `onChange`는 deprecated 별칭으로
  그대로 동작하고 다음 마이너에서 빠진다. 둘 다 주면 `onValueChange`만 부른다. 타입에서 핸들러가 필수가 아니게 됐다.
  - 앱이 할 일: `<DatePicker onChange={…}>`를 `onValueChange={…}`로 바꾼다. 받는 값(Date·DateRange·undefined)은 같다.
- **ref는 prop으로 받는다 — 타입 표기 변경, 런타임 동일** (목표 49 · DESIGN.md §6.3). `forwardRef`로 감쌌던 22개(Button·Input·
  Textarea·Checkbox·FormRow·SideNavItem, Select 부품 7개, DropdownMenu 부품 9개)를 ref를 prop으로 받는 함수 부품으로 바꿨다.
  DOM에 props를 펼치면서 ref 타입이 없던 14개(Card·CardHeader·CardTitle·CardBody·CardFooter·StatusChip·AppShell·SideNav·
  SideNavGroup·PageHeader·DropdownMenuShortcut·Field·StatTile·Pagination)는 그 요소의 ref 타입을 받는다(StatTile은 루트가 div·a로
  바뀌어 `HTMLElement`). React 19는 실행 중에 이미 ref를 넘기고 있어 막혀 있던 것은 타입뿐이다. 같은 부품 트리의 SSR HTML이
  바꾸기 전 소스(ddef6c1)와 바이트 단위로 같고, 헤드리스 브라우저에서 ref 27곳이 같은 요소에 붙는다. 예외 하나: Pagination은 포커스
  복구용 내부 ref가 앱 ref를 덮어써 버렸는데(`as any`로 넘긴 경우) 이제 둘을 합친다.
  - 앱이 할 일: 없다. `React.ComponentRef<typeof Button>`·`React.ComponentProps<typeof Button>`은 그대로 쓴다. 부품 타입을
    `ForwardRefExoticComponent`로 적어 둔 코드가 있다면 `ComponentProps`·`ComponentRef`로 바꾼다.
- **내부 도우미 4개를 더 예고한다** (목표 49 · DESIGN.md §6.3 규칙 4). `initials`·`encodeRecord`·`decodeRecord`·`useElementWidth`에
  `@deprecated`를 붙였다. 부품 폴더가 내보낸 것이 루트 `export *`로 새어 나왔다. 0.4.0에서 예고한 8개와 함께 다음 마이너에서
  공개 API에서 빠지며, 그때까지는 그대로 쓸 수 있다.
  - 앱이 할 일: 이름 글자는 Avatar가 그리고, 복귀 위치 저장 형식은 `useReturnContext`가 맡는다. 요소 폭은 앱이 `ResizeObserver`로 잰다.

### 바뀐 지침 (MCP)

- **도그푸딩 6 화면 조립 지침**(목표 57 4단계 · 디자인 검수 P1·P3 · DESIGN.md §4.4·§24.5). `dont`·`rules` 만 더하거나 고쳤다 —
  `purpose`·`useWhen`·검색어는 그대로라 부품 추천 점수는 바뀌지 않는다.
  - DataTable: 금지 "FilterBar·BulkActionBar와 쓰는 표에 exportFileName을 주지 마라" · "5행 이하 표에 정렬(enableSorting:false로 끈다)·
    내보내기를 달지 마라". 합계 라벨 규칙 끝의 "가로 스크롤 표는 금액 열을 pinnedEnd로"를 새 규칙(§4.4)으로 옮겼다 — "pinnedEnd로 상태 열(목록)·
    금액 열(합계 표)을 고정한다. 좁은 폭에서도 보이고 고정선은 표가 넘칠 때만 생긴다." 상태 열 고정은 기본값으로 넣지 않았다 — 어느 열이
    상태인지 부품이 모르므로 열 id 를 추측하면 공개 동작이 바뀐다.
  - BulkActionBar: "선택 수는 이 바 한 곳이다. 선택 행 내보내기는 actions에서 downloadCsv로, 전체 내보내기는 PageHeader actions에 둔다."
  - PageHeader: 상세 화면의 주요 행동(확정·취소·편집)은 `actions` 에. DatePicker: 폼 안 날짜 칸 폭 고정(단일 15rem·기간 20rem).
    Card(부품 4개가 물려받음): 카드 제목과 같은 말을 안의 Field 라벨로 반복하지 않는다. DescriptionList: 금액 내역 규칙을 "표 바로 아래면"으로
    좁히고 "표와 떨어진 결제 내역 카드는 상품 금액부터 쓴다"를 더했다(D5). FormActionBar: 금지 "품목 0개 같은 목록 단위 오류를 회색 보조
    글자로만 보이지 마라" · 규칙 "errorCount에 세고 추가 버튼에 aria-invalid, 제출 때 toast.error로도"(D3, 반복 입력 줄 부품 전까지).
  - 크기: 색인 25,265 → 25,520바이트(+255 — 금지 3개) · `list_components` 그대로(20,693) · 최대 상세 DataTable 5,642 → 5,940바이트
    (운영 상한 6,000 — 남은 60바이트, DataTable 에 지침을 더 넣으려면 예산을 다시 정한다). 회귀 상한은 늘어난 만큼만 올렸다.
  - 대조: `docs/qa/mcp-response-diff.mjs`(HEAD 282bb9e ↔ 작업 트리) 1,427건 중 244건이 다르다 — `get_component` 11건(위 6부품 + Card 부품 4) ·
    색인 1 · `which_component` 232건(결과에 실린 DataTable·FormActionBar 의 `dont` 글자). `dont` 를 빼고 비교하면 685질의 × limit 5·10 의
    순위·점수 차이 0. 정답 세트 128문항 top-1 80 · top-3 100 그대로.
- DatePicker: "onValueChange로 받은 확정 날짜를 쓴다"(이전 onChange). props에 `onValueChange`가 더해지고 `onChange`는 선택이며
  "옛 이름. onValueChange와 같다."는 설명이 붙는다.
- `get_component`의 상속 표기(`extends`) 37곳: `React.*HTMLAttributes<…>`·`ComponentPropsWithoutRef<…>` → `React.ComponentProps<…>`
  (ref 포함). StatTile은 `React.RefAttributes<HTMLElement>`를 더했다(목표 49).
- SegmentedControl `aria-label`·`aria-labelledby` 설명이 같은 문장으로 두 번 이어 붙던 것을 한 번으로 고쳤다. 생성기가 합집합
  갈래마다 다시 잡히는 같은 선언의 JSDoc을 겹쳐 붙였다.
- 위 세 가지를 `docs/qa/mcp-response-diff.mjs`로 main 서버(cd294ae — MCP는 R49와 같다)와 대조하면 1,363건 중 42건(이름 39개 + 대소문자·공백 변형
  3건)만 다르고 모두 의도 목록이다. 색인·목록·토큰·규칙·`which_component` 응답은 바이트가 같고 정답 세트도 top-1 52 · top-3 72
  그대로다. 저장 카탈로그는 88,863 → 88,622바이트(응답 아님).
- `DescriptionList` 항목을 더했다(목표 49). 색인 23,191 → 23,627바이트(+436)·`list_components` 19,873 → 20,072바이트(+199),
  `get_component DescriptionList` 2,745바이트. "키-값·라벨과 값·주문 정보·합계 묶음" 같은 질의의 첫 후보다. 기존 키워드·쓰임새·목적
  439개 질의의 1순위는 그대로이고, `which_component` 정답 세트에 이 부품 문항 5개(한국어 4·영어 1)를 더해 접미사 5문항·툴바 8문항과
  합친 118문항이 top-1 70 · top-3 90이다(다른 문항의 순위는 그대로).

### 문서

- DESIGN.md §4.4 고정 열(경계선은 넘칠 때만 · 상태 열 고정 · 오른쪽 고정은 한 열), §24.5 화면 조립 지침(도그푸딩 6 P3 여섯 가지와 디자인 검수안과
  다르게 적은 두 곳 — 날짜 폭 12em→15rem, Alert→errorCount·aria-invalid·toast), §4.2 선택 수는 한 곳, §4.3 금액 내역 예외·OrderDetail 고정.
  표 만들기(`03-tables.mdx`)에 열 고정 절(상태 열·금액 열 표, `컬럼고정` 미리보기)과 내보내기 줄·선택 수·5행 이하 표 안내.

- 시작하기(`01-getting-started.mdx`)·ui README 의 Next 안내 — 부품 파일마다 `"use client"`, 아이콘은 서버에서 그려짐, webpack 빌드는
  `optimizePackageImports`. `docs/qa/bundle-size.md`(재는 방법·전후 표·Next 표·`"use client"` 판단·상한 올리는 법). DESIGN.md §15.6.1.

- DESIGN.md §16.7 설명 목록 — 디자인 총괄 규칙 표 0.5.0, 측정 예시와 다른 곳(규칙 표 우선), 카드 폭 경계의 부품 폭 환산(606·326px),
  주문 상세 교체 실측.

- DESIGN.md §6.3 공개 API 규약(목표 49) — 제어/비제어 쌍 `X`·`defaultX`·`onXChange`, 값 알림 `on{X}Change`와 DOM 전용 `onChange`,
  ref prop, 루트 `index.ts` 이름 나열, deprecated 별칭으로 이름 바꾸기. 조사 스냅숏 `docs/research/api-conventions-survey.md`.
  스토리·문서 예제의 DatePicker를 `onValueChange`로, §13.3의 Button `extends` 예시를 지금 표기로 바꿨다.

### 내부

- CI(verify.yml): 한 job 이던 검증을 `build`·`checks`·`node harnesses`·`harness shard 1·2` 병렬 job 으로 나누고 `gate` 하나로 모은다 —
  `gate` 는 main 브랜치 보호의 필수 체크다(cc6d50a). 같은 저장소 PR 의 `pull_request` run 은 이름을 갈라 건너뛰고 push run 이 판정한다(ddef6c1).
  CI 생성물 대조에 `runtime-tokens.ts` 를 더했다(9e47e10).
- pre-push: 보내는 sha 전부의 원격 `gate` 가 headSha 일치·녹색이면 브라우저 하네스(약 6분)를 건너뛰고 근거 run URL 을 찍는다.
  typecheck·verify 는 늘 돈다. gh 없음·조회 실패·진행 중·실패·불일치면 평소대로 전부 돈다(`scripts/gate-reuse.mjs`, 8702551).
  AGENTS.md 에 main 통합 절차(작업 브랜치 gate 녹색 → 그 sha 로 main 빨리 감기, 병합 버튼·`--no-verify` 금지).
- 일회성 계측 스크립트(R40~R43)를 `docs/qa/measure/` 로 옮기고(6937848), `r38-match-compare` 를 `compare-match-baseline` 으로
  이름을 바꿨다(10f701b). 게이트·CI 는 돌리지 않는다.

- 하네스(목표 57 4단계): `render-verify` 에 고정 경계선 검사 — 스토리 셋(`복수선택`·`컬럼고정`·`가상화-컬럼고정`)마다 넘침 ⇔
  `data-overflow-x` ⇔ 경계선 보임, 굵기 1px 유지, 고정 머리 칸 바탕 = 머리 바탕, 넘치는 표와 넘치지 않는 표가 모두 있는지, 같은 표를 360px 로 좁히면 선이 생기고 되돌리면
  사라지는지. `form-summary-render-verify` 는 금액 열이 늘 고정이고 넘치지 않으면 경계선 투명·넘치면 보임을 본다(전: 넘치지 않으면 고정 없음).
  `dogfood3-render-verify` 의 표 도구 줄 글자 단정을 `N건 선택` → 빈 글자로. MCP 기준선 시험(server.test R28)에 DataTable 지침 변경분을 명시해 더했다.

- 크기 회귀 검사 `pnpm size`(목표 57, `scripts/bundle-size-check.mjs`): `npm pack` → 빈 앱에 격리 설치 → 묶음 셋(Button·목록 화면 10개·전체)을
  Vite 로 묶어 min·gzip 을 잰다. Button ≤ 60kB · lucide 아이콘 ≤ 80개(쓰지 않는 아이콘 이름 없음) · tokens.json 원본 없음 · 목록 ≤ 500kB ·
  전체 ≤ 820kB. `pnpm verify` 마지막 단계(약 5초). CI(verify.yml `checks`)에도 걸었다 — 실패하면 실패 줄을 오류 주석(`::error`)으로 남긴다(9e47e10).
  0.4.0 코드에서 9건으로 실패한다.
- 빌드 가드(`scripts/build-ui.mjs`): dist JS 마다 대응하는 src 파일이 있어야 하고(src 밖 모듈 차단 — tokens.json 이 `dist/docs/research/tokens.js` 로
  나왔다), 모듈은 `"use client"` 로 시작하고, 진입점은 배너 없이 재export 만이어야 한다. `pack-verify` 도 설치된 tarball 에서 같은 규칙을 본다.
- 경계 검사(`scripts/check-boundaries.mjs`): 부품·lib 이 공개 진입점(`icons`·`index`)이나 `tokens.json` 을 import 하면 실패한다(스토리는 예외).
- 생성 파일 `packages/ui/src/lib/runtime-tokens.ts`(`pnpm tokens`, 목록 `docs/research/ui-runtime-tokens.mjs`)를 pre-commit 생성물 대조에 넣었다.
  CI `checks` 는 tokens.json 만 대조하므로 `runtime-tokens.test.mjs` 가 커밋된 파일을 tokens.json 에서 다시 만든 것과 바이트로 비교한다.
- `docs/qa/measure/next-consumer.mjs`: Next 16 빈 앱(Turbopack·`--webpack`·`--optimize`)의 SSR·하이드레이션·Select·클라이언트 JS 계측. 게이트 밖.

- 공개 API 규약 검사(목표 49): `scripts/check-api-conventions.mjs`가 매니페스트·루트 `index.ts`·소스를 읽어 DESIGN.md §6.3을
  검사하고 `pnpm test`·pre-commit(`packages/ui/src/lib/api-conventions.test.mjs`)에서 돈다. 기존 위반 11건은
  `scripts/api-conventions-allow.mjs`에 이유와 함께 두며, 고친 항목이 목록에 남으면 실패한다. ref 타입은
  `ref-props.typecheck.tsx`가 고정한다. 루트 `index.ts`의 `export *` 27곳을 이름 나열로 바꿨다(공개 이름 224개 그대로).
- `description-list-render-verify.mjs`(목표 49): 규칙 표 5절 검수 매트릭스(라이트·다크 × 가로형·두 열 720·접힘 600·세로형 320 ×
  빈 값·긴 값·칩·링크·합계 강조), 카드 폭 경계 640·360, 라벨 폭 고정, 주문 상세 교체 뒤 위치를 픽셀로 단정하고 매트릭스를 실제 크기로 찍는다.
  색인·목록 응답 크기 회귀 단정(server·build 테스트, mcp-client-verify)은 부품별 증가분을 명시해 더하는 꼴(`23_500 + 436`)로 바꿨고,
  정답 세트 시험의 문항 수(`CASES`)에 이 부품 증가분 `+ 5`를 더했다.

---

## 0.4.0 — 미게시

앱 화면의 뼈대(앱 셸·페이지네이션·옆 패널)와 입력·표시 부품 여섯 가지를 더하고, 도그푸딩 2~5와
2026-11-22 디자인 검토에서 찾은 시각·동작을 고쳤다. 공개 컴포넌트 102개 → **115개**.
앱 코드나 시각 기준선에 닿는 변경은 **바뀐 동작(마이그레이션)** 에 모았다.

이 판도 **앱 전체를 이 디자인 시스템으로 만드는 것을 전제로 한다.** `styles.css`(와 `tailwind.css`)는
앱 전체에 preflight·기본 규칙을 적용하며, 기존 앱의 일부 화면에만 넣는 부품 전용 CSS는 제공하지 않는다.

### 추가

- **앱 셸** — `AppShell` · `SideNav`(`SideNavGroup`·`SideNavItem`) · `PageHeader` (R34).
  건너뛰기 링크·선택 상단 슬롯·독립 본문 스크롤, 240px 메뉴와 64px 레일(1024px 미만 자동 레일, 접기 버튼 숨김)·
  그룹·배지·미오픈 항목·링크 합성, 제목·경로·상태·반응형 액션. 접힌 레일은 Tooltip 하나만 띄운다. 접힘 저장은 앱이 맡는다.
- **옆 패널** — `SheetContent` · `SheetBody` (R36). Dialog 부품과 조립한다. 좌우 배치·세 가지 폭·본문 독립 스크롤,
  닫기 보호(`dismissible`)와 모션은 Dialog와 같다. AppShell `narrowNavigation="drawer"`로 좁은 화면 메뉴를 서랍으로 연다.
- **페이지네이션** — `Pagination` (R35). 범위·전체 건수(`1–20 / 1,284건`)·페이지 크기·번호 접기·이전/다음,
  polite 알림과 포커스 보존, 실제 폭 640px 미만의 간략 표시. 크기 Select는 번호 버튼과 같은 32px다.
  0건이면 그리지 않고 EmptyState가 대신 말한다. 로딩 중에는 조작만 막고 진행 표시는 표 스켈레톤이 맡는다.
  URL 동기화는 앱이 맡는다.
- **파일 업로드** — `FileUpload` (타입 `FileUploadItem`, R37). 제어형. 선택·드롭 공통 형식·크기·개수 검증,
  파일별 상태·진행률·오류, Thumbnail 미리보기, 단일 대표 이미지(미리보기 최대 320px, 넓으면 옆에 정보·바꾸기·삭제).
  드롭존 빈 곳을 눌러도 선택 창이 열린다. Field 오류 테두리는 드롭존에만 그린다. 전송·재시도·취소는 앱이 맡는다.
- **날짜+시각** — DatePicker `mode="single"`의 `time={true | { step: 1 | 5 | 10 | 15 | 30 }}` (R40).
  24시간 직접 입력·시/분 Select·최근접 분 칸 맞춤(동률 올림)과 알림, 날짜·빠른 선택의 시각 보존.
  브라우저 지역 시간이며 서버 변환은 앱이 맡는다. range + 시각은 타입으로 막는다.
- **KPI 지표 타일** — `StatTile` (R41). 값·한국어 만/억/조 축약(천 단위 쉼표 — `3,842만원`)·원문 보존,
  방향 아이콘·부호·`goodDirection`별 증감 색, 접근성 문장, 로딩·오류·재시도, `href`/`asChild` 상세 링크.
- **세그먼트 컨트롤** — `SegmentedControl` (R42). `options` 배열, 제어·비제어 단일 선택, 아이콘·비활성·sm/md·
  `fullWidth`, 부모가 좁을 때만 한 줄 말줄임, 라디오 의미·로빙 키보드.
- **단계 표시** — `Steps` (R43). 0 기준 `current`, 완료/진행 중/예정 자동 계산·오류 덮어쓰기, 완료 단계로만
  돌아가는 버튼, 단계 사이를 잇는 연결선(완료 구간은 성공 색), 640px 미만 요약과 전체 라벨 보존.
- **같은 줄 정렬** — `FormRow` (폼 밀도 F98 · (b), 2026-11-22 오너 확정). 같은 줄 Field들이 레이블·설명·입력·오류
  네 행을 함께 쓴다(CSS subgrid). 한쪽만 설명이 있거나 오류가 둘이어도 입력칸이 어긋나지 않고, 컨테이너 480px
  미만에서는 한 열로 접는다. 필드 피치 98px은 그대로다.
- Input `leadingIcon` 장식 슬롯 (R33). 지우기·비밀번호 보기와 함께 쓴다. 아이콘은 입력 바탕 위에 그린다.
- 공개 유틸리티 `.sr-only`·`.tabular`를 두 CSS 경로에 직접 정의했다. `.truncate`는 공개 계약이 아니다.
- ui 토큰 하위 경로 `@s2life/ui/tokens.css`·`theme.css`·`tokens.json` (R27). tokens 패키지 원본을 빌드 때
  바이트 그대로 복사한다 — 앱은 `@s2life/tokens`를 따로 설치하지 않는다.
- 토큰 `--status-neutral-fg`·`--status-neutral-bg`(중립 상태·차트 "대기·기타" 계열, 계열 색 변수가 다섯 개가 됐다)·
  `--bg-selected-row`(표 선택 행·달력 범위)·`--overlay-scrim`(대화상자 막)·`--side-nav-w`·`--side-nav-rail-w`.
  Tailwind 이름 `neutral-ink`·`neutral-tint`·`selected-row`·`overlay-scrim`. 지운 토큰은 없다.
- Carousel 루트 스타일을 확장하는 `className`.
- 대표 화면 스토리(2026-11-22 디자인 검토 확정안) `Screens/OrderList`·`Screens/OrderDetail`(D2 — 머리 오른쪽
  ⋯ 더보기 안의 삭제 → AlertDialog 기본 포커스 취소)·`Screens/Dashboard`·`Screens/ProductCreate`(F98 · (b)).
  정식 부품만 조립했고 스토리 전용 CSS는 없다.

### 바뀐 동작 (마이그레이션)

앱에서 보이거나 앱 코드를 바꿔야 할 수 있는 변경이다(0.x이므로 minor에 포함한다). 항목마다 **앱이 할 일**을 적었다.
시각 회귀 기준선(스크린샷)을 쓰는 앱은 기준선을 다시 만든다.

- **peer React `^19.3.1` → `^19.0.0`.** React·React DOM 19.0~19.2 앱도 설치할 수 있다. React 18은 지원하지 않는다.
  배포 리허설을 React·React DOM 19.0.0(`@types` 19.0.x)으로도 돌려 타입·렌더를 확인했다.
  - 앱이 할 일: 없다. React 18 앱은 19로 올린 뒤 설치한다.
- **CSS 클래스에 `ds-` 접두어** (R39). 고유 클래스 37개(`.loading-*`·`.data-table-*`·`.state`·`.state-error`·
  `.thumbnail`·`.avatar`)가 `.ds-<기존 이름>`이 됐다(예: `.loading-skeleton` → `.ds-loading-skeleton`,
  `.data-table-cell` → `.ds-data-table-cell`). MediaViewer 재사용 선택자도 맞췄다. `data-slot`·공개 API·계산 스타일은 그대로다.
  - 앱이 할 일: 앱 CSS·테스트가 옛 클래스 이름을 선택자로 쓰고 있었다면 `ds-` 이름으로 바꾼다(가능하면 `data-slot`으로 건다).
    앱 클래스는 `ds-`로 시작하지 않고, `.flex`·`.hidden` 같은 유틸리티 이름을 다시 정의하지 않는다.
- **기본 글꼴 Pretendard** (R30). `--font-sans` 첫 글꼴이 IBM Plex Sans KR → Pretendard Variable이다. 숫자 정렬은
  본문 글꼴의 `tabular-nums`(`.tabular`)를 쓰고 `--font-mono`는 코드용 시스템 고정폭이다(IBM Plex Mono 제외).
  글꼴 파일은 패키지에 없다 — 0.3.0의 IBM Plex도 Storybook에서만 로드되고 소비 앱에는 오지 않았다(도그푸딩 3 G7).
  - 앱이 할 일: `npm install pretendard` 후 앱 진입점에서
    `import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'`를 `@s2life/ui/styles.css` 앞에 한 번 불러온다.
    불러오지 않으면 시스템 글꼴로 그려져 숫자 폭·줄바꿈이 디자인과 달라진다.
- **포커스 링: 크림슨 → 중립 고대비** (R01 일부 변경, 오너 결정 2026-11-22). `--border-focus`가 라이트 brand-600 →
  neutral-950 `#262222`, 다크 brand-400 → neutral-50 `#F7F6F5`(본문색과 같은 값)이다. 크림슨 링이 브랜드 채움·오류
  빨강과 겹쳐 읽혔다(다크 포커스 vs 오류 ΔE76 22.6 → 60.6). 두께 2px·offset 2px와 안쪽 링 예외(Tabs·팝오버 안 검색
  입력)는 그대로다. 전역 `:focus-visible`·Select·Calendar·DataTable 행·SegmentedControl·Steps·StatTile·Combobox가
  함께 바뀐다. Tour·Hint 대상 링(`--hint-ring`)과 FileUpload 드래그 중 드롭존 테두리는 크림슨 그대로다.
  - 앱이 할 일: `--border-focus`를 덮어쓰지 않았다면 코드 수정은 없다. 포커스 상태를 담은 시각 기준선을 갱신한다.
    앱이 직접 그린 포커스 표시가 브랜드 색이면 `--border-focus`로 바꾼다.
- **선택 배경 `--bg-selected` 값과 표 선택 행 전용 `--bg-selected-row`** (R32 · 2026-11-22 디자인 검토).
  `--bg-selected`는 라이트 brand-50 → brand-100, 다크 brand-975 → brand-900이다(이전 값은 표면 대비 1.08·1.02로 선택이
  거의 보이지 않았다). 표 선택 행·달력 범위 중간은 새 `--bg-selected-row`(Tailwind `bg-selected-row`)를 쓴다 — 라이트는
  brand-100(`--bg-selected`와 같은 값), 다크는 brand-900 와인색 `#6A1021`의 채도를 절반으로 내린 `#552D32`다(선택 행이
  '취소 요청' danger 칩과 같은 계열로 읽혔다. 호버 행과 ΔE 10.7, 본문 대비 10.76). `--bg-selected`는 현재 위치(SideNav
  현재 메뉴)와 FileUpload 드래그 면이 쓴다.
  - 앱이 할 일: 앱이 `--bg-selected`(`bg-selected`)로 표 선택 행이나 범위를 직접 칠했다면 `--bg-selected-row`로 바꾼다.
    선택 행이 보이는 화면의 시각 기준선을 갱신한다.
- **금액 칸 최소 폭 `--cell-min-w-money` 128px → 140px** (R30). `₩1,248,500,000`을 Pretendard tabular 14px로 잰
  111.73px + 좌우 여백 28px다. 금액 열이 12px 넓어진다.
  - 앱이 할 일: 금액 열 폭을 이 값에 맞춰 잡은 레이아웃(고정 폭 표 컨테이너 등)이 있으면 다시 확인한다.
- **중립 칩 바탕(양 테마)** (2026-11-22 · 2026-11-23 디자인 총괄 결정). StatusChip `neutral`(미결제·판매중지 등)과 FileUpload
  '전송 대기' 칩의 바탕 `--status-neutral-bg`가 라이트 `#EFECEB`(neutral-100 = `bg-sunken`) → neutral-200 `#E1DCDB`, 다크 `#060505`
  (= `bg-sunken`) → `#312D2C`(OKLCH 30% 0.007 H30)다. 0.3.0 값은 라이트에서 `--bg-hover`와
  같아 호버한 표 행에서 칩 모양이 사라졌고(대비 1.00), 다크에서는 표면보다 어두워 구멍처럼 보였다. 이제 (라이트·다크) 표면
  1.36·1.30, 호버 행 1.16·1.16, 표 선택 행 1.15·1.17로 구별되고 글자 대비는 라이트 7.14 → 6.18, 다크 14.99 → 10.02다. 글자색
  `--status-neutral-fg`(차트 중립 계열)·`--bg-hover`·다른 톤은 그대로다.
  - 앱이 할 일: `--status-neutral-bg`를 덮어쓰지 않았다면 코드 수정은 없다. neutral 칩이 보이는 화면(양 테마)의 시각 기준선을 갱신한다.
- **Tabs 기준선** (R31 · 2026-11-22). 선택 밑줄이 기준선에서 5px 떠 있던 것을 기준선 위에 앉혔다 — 목록 아래 여백 4px와
  경계선 1px를 없애 **탭 목록 높이가 5px 줄었다.** 기준선은 스크롤 내용 바닥에 붙인 1px 배경이라 클래식 스크롤바
  (Windows·리눅스·마우스를 연결한 macOS, 10~11px)가 있어도 가려지지 않는다(이전에는 탭이 넘치면 스크롤바가 기준선을
  덮었다). 탭 포커스 링은 스크롤 영역에서 잘리지 않게 안쪽에 그린다.
  - 앱이 할 일: Tabs 아래 내용이 5px 올라온다. 탭 목록 높이에 맞춘 고정 값이 있으면 확인하고 시각 기준선을 갱신한다.
- **Toast 닫기 버튼 위치·Escape·포커스 복귀** (2026-11-22). 닫기 버튼이 왼쪽 위 모서리 밖에 반쯤 걸친 20px 원에서
  **오른쪽 위 안쪽 32×32**(Button ghost sm iconOnly와 같은 크기)로 옮겼고, 닫기가 있으면 본문 오른쪽 여백이 48px이다.
  상태 아이콘은 여러 줄에서도 첫 줄 가운데에 선다. **Escape**가 포커스가 들어간 알림을 닫는다(닫기 버튼이 있는 알림만).
  클릭·Escape로 닫으면 알림에 들어오기 직전 요소로 포커스가 돌아가고, 그 요소가 사라졌으면 `main` 랜드마크(tabindex가
  없으면 -1을 준다)로 간다.
  - 앱이 할 일: 코드 수정은 없다. 오류 알림(`toast.error`는 닫기 버튼 내장)의 배치가 바뀌니 시각 기준선을 갱신하고,
    닫은 뒤 포커스를 단정하는 테스트는 '직전 요소'로 맞춘다. `main` 랜드마크가 없으면 포커스는 그대로 남는다(AppShell은 `main`을 그린다).
    포커스를 가진 알림을 `toast.dismiss()`로 지운 뒤 다른 알림을 닫으면 최종 위치는 맞지만 그 요소에 focus·blur가 한 번
    지나간다 — blur에서 검증하는 입력이면 검증이 한 번 돈다.
- **DataTable 툴바 문구와 선택 표시** (R38 · 2026-11-22). 선택 상태 `N개 선택` → `N건 선택`(천 단위 쉼표 — Pagination
  `1–20 / 1,284건`·부분 로드 안내·전체 선택 라벨과 단위를 맞췄다). 선택 기능이 없는 표에는 선택 상태 줄을 그리지 않는다.
  부분 로드 내보내기는 버튼 `{N}건 내보내기`와 상태 문구 `전체 {M}건 중 {N}건`으로 나눴다(이전: 버튼 라벨이 문장
  "로드된 50건만 내보냅니다"). MultiSelect의 `N개 선택`(고른 값의 개수)은 그대로다.
  - 앱이 할 일: 이 문구로 요소를 찾던 e2e 테스트와 시각 기준선을 갱신한다.
- **DataTable: `data`에서 빠진 행은 선택에서 자동 해제된다** (R29, 사용자 결정). 필터를 바꿔도 화면에 없는 행이 선택된 채
  일괄 작업 대상이 되던 문제다(도그푸딩 3: 앱 1,250건 / 툴바 0개). 제어형이면 `onSelectedIdsChange(교집합)`를 한 번 부른다.
  `state`가 `loading`·`error`일 때는 유지한다. 행을 덧붙이는 무한 스크롤에는 영향이 없다.
  - 앱이 할 일: 서버 페이징에서 페이지를 넘겨도 선택을 남기려면 선택을 앱 상태에 따로 보관한다(새 `data`에 없는 id는 해제된다).
    제어형은 `onSelectedIdsChange`가 데이터 변경만으로도 불린다는 것을 전제로 둔다.
- **DatePicker 오류 줄·오류 문구·빠른 선택** (R29 · R40b · 2026-11-22 디자인 검수).
  자체 오류 줄(20px)을 예약하지 않는다. Field 안에서는 Field의 오류 자리를 함께 써서(이중 예약 해소) **Field로 감싼
  DatePicker가 20px 낮아지고**, Field 밖(필터 툴바)에서는 오류가 입력 아래 20px에 투명 바탕으로 걸친다 — 툴바에서 다른
  컨트롤보다 10px 위에 놓이던 것이 맞춰진다. 오류 문구는 고치는 법을 말한다: 단일 `YYYY-MM-DD 형식으로 입력하세요.`
  (이전 `날짜를 YYYY-MM-DD 형식으로 입력하세요.`), 형식이 맞고 값이 틀리면 `월은 01~12로 입력하세요.`·
  `2026년 2월은 01~28일로 입력하세요.`. 기간은 형식 → 없는 날짜 → 순서 중 하나만 말한다:
  `YYYY-MM-DD ~ YYYY-MM-DD로 입력하세요.` · `시작일: 2026년 2월은 01~28일로 입력하세요.` ·
  `종료일을 시작일과 같거나 이후로 입력하세요.`(이전 `기간을 YYYY-MM-DD ~ YYYY-MM-DD 순서로 입력하세요.`).
  빠른 선택은 모드를 따른다 — 기간 `오늘·최근 7일·이번 달·지난 달`, 단일 `오늘·어제`, 단일 + 시각 `오늘·내일`
  (이전에는 단일에서도 기간 단추가 나와 "이번 달"이 그 달 끝날을 골랐다).
  - 앱이 할 일: Field 밖 DatePicker 아래(필터 툴바 아래)는 20px 이상 띄운다. 오류 문구·빠른 선택 단추 이름으로 찾던 테스트와
    Field로 감싼 폼의 시각 기준선을 갱신한다.
- **Button 안 앞·뒤 아이콘이 라벨과 한 줄에 선다** (0.3.0 게시본 결함). `<Button><Check />저장</Button>`처럼 children 맨 앞·뒤에
  넣은 아이콘이 라벨 위로 쌓이고 버튼 위로 1px 나갔다 — 라벨을 말줄임 span으로 감싸는데 preflight가 svg를 `display: block`으로
  두었다. 이제 앞뒤 아이콘 요소(svg·컴포넌트)를 라벨 밖 flex 항목으로 꺼내 `leadingIcon`·`trailingIcon`과 같은 자리(간격 8px·
  세로 가운데)에 둔다. 아이콘 하나뿐인 `iconOnly`와 `<strong>` 같은 글 요소는 그대로다.
  - 앱이 할 일: 아이콘 쌓임을 막으려 넣은 우회 CSS(svg inline·flex 등)를 지우고, 아이콘 버튼이 보이는 화면의 시각 기준선을 갱신한다.
- **Input: 검색 입력의 기본 돋보기, 폭 클래스는 바깥 래퍼에** (R33 · 2026-11-22). `type="search"`가 앞쪽 돋보기를 기본으로
  그린다(`leadingIcon={null}`로 끈다). 래퍼가 있는 입력(검색·비밀번호·앞 아이콘)에서 `className`의 폭·배치 클래스
  (`w-`·`min-w-`·`max-w-`·`flex-1`·`basis`·`grow`·`shrink`·`order`·`self`·`col-`/`row-`·`m*`)는 바깥 래퍼
  `.ds-input-control`에 붙는다 — 이전에는 안쪽 input에만 붙어 `className="w-80"`을 줘도 래퍼(width:100%)가 툴바 한 줄을
  차지했다. 글자·테두리·안쪽 여백 클래스는 input에 남는다.
  - 앱이 할 일: 검색 입력 앞에 돋보기를 직접 붙였다면 지운다(두 개가 된다). 래퍼 폭을 앱 CSS로 덮던 우회가 있으면
    `className` 폭 클래스로 바꾼다.
- **헤더 없는 CardBody의 위 여백 16px** (R33). CardBody가 카드의 첫 자식이면 위 여백 16px로 헤더 있는 카드와 시작선을 맞춘다.
  - 앱이 할 일: 헤더 없는 카드에 위 여백을 앱이 직접 주고 있었다면 지운다.
- **PageHeader는 바깥 여백이 없다** (R38). 간격은 부모의 `gap`이 준다 — 앱 gap과 겹쳐 머리와 툴바 사이가 약 60px이던
  문제다. AppShell 본문 여백(24px, 좁으면 16px)은 내장이다. *0.3.0에는 없던 부품이라 미게시 빌드로 먼저 쓴 앱만 해당한다.*
  - 앱이 할 일: 페이지 루트를 `flex flex-col gap-6`처럼 묶어 PageHeader 아래 간격을 준다. AppShell 안 페이지 루트에 padding을 다시 주지 않는다.
- **SideNav 미오픈 표시 "출시 예정"** (2026-11-22 디자인 검토 §25). `SideNavItem disabled`의 라벨 옆 문구·접근 이름·접힌
  레일 툴팁이 `준비 중` → `출시 예정`이다 — 주문 상태 칩 "준비 중"과 한 화면에서 두 뜻이 됐다. 글자색은 `--text-disabled`다.
  *0.3.0에는 없던 부품이라 미게시 빌드로 먼저 쓴 앱만 해당한다.*
  - 앱이 할 일: "준비 중"으로 메뉴 항목을 찾던 테스트를 "출시 예정"으로 바꾼다.
- **MCP 응답 크기 예산은 응답 단위다** (R37 · R42). 상한을 AI에게 실제로 가는 응답마다 둔다: `design://components`(카탈로그)
  90,000바이트(0.3.0: 80,000) · `list_components` 24,000 · `get_component` 한 건(부모 의도 포함) 6,000 · `design://tokens`
  80,000 · `get_rules` 전체 8,000. 0.3.0의 "전체 매니페스트 160,000바이트" 상한은 없앴다 — 한 번에 전송되는 응답이 아니다.
  생성할 때 하나라도 넘으면 빌드가 멈춘다. 이번 판 실측: 카탈로그 88,863 · 토큰 67,555 · 규칙 4,327 · 목록 19,873 ·
  상세 최대 4,576(DataTable).
  - 앱이 할 일: 없다. MCP를 쓰는 AI 클라이언트의 컨텍스트 예산은 위 응답 단위로 잡는다.
- **내부 도우미 8개는 다음 마이너에서 공개 API에서 빠진다 (예고).** `placeFallback`·`resolveStep`·`useAnchored`·
  `supportsAnchor`·`nextFocusable`·`focusNextFormStop`·`shouldValidate`·`nextPhase`에 `@deprecated`를 붙였다.
  0.4.0에서는 그대로 쓸 수 있다.
  - 앱이 할 일: 쓰고 있다면 공개 부품으로 옮긴다 — 위치·앵커는 Tooltip·Hint·Tour·Peek, Enter 이동은 FormFlow,
    로딩 표시 지연은 `useDelayedLoading`. `shouldValidate`는 같은 판단식 `!isComposing && (trigger !== 'change' || hasErrored)`을 앱에 둔다.

그 밖의 시각 보정(Select 계열 트리거 통일·다크 대화상자 막·달력 날짜 색·메뉴 글자 시작 정렬 등)은 **고침**에 있다.
코드 수정은 필요 없지만 시각 기준선에는 함께 잡힌다.

### 고침

- Button children 앞·뒤 아이콘이 라벨 위로 쌓이던 문제(0.3.0 게시본부터) → 바뀐 동작 참조.
- `@s2life/mcp`의 실행 명령 경로를 `npm pkg fix` 형태(`"s2life-mcp": "server.mjs"`)로 맞췄다. npm 11.19가 게시하면서
  `./server.mjs`를 고치고 `"bin[s2life-mcp]" script name server.mjs was invalid and removed`라고 경고했다(0.4.0 dry-run에서 발견).
  실제로 명령이 빠지지는 않았다 — 같은 npm으로 게시한 0.3.0도 `s2life-mcp`로 설치·실행된다. 이제 경고가 없고, tarball과
  레지스트리 메타데이터의 bin 값이 같다.
- ClampText가 `white-space: nowrap` 조상(예: DataTable 셀) 안에서 긴 글을 더보기 없이 자르던 문제(도그푸딩 2: 1210/576px,
  더보기 0/16). 내용이 `text-wrap-mode: wrap`과 `overflow-wrap: anywhere`를 소유한다. `white-space: normal`이 아니라서
  `pre-line`·`pre`로 보존한 사용자 개행은 그대로 남는다.
- DataTable 헤더 체크박스가 보이는 행 중 선택이 0개인데 "일부 선택"으로 보이던 문제. 현재 행 기준으로 센다.
- DatePicker 범위 입력이 고른 기간보다 좁아 잘리던 문제(입력 198px < 값 216px · 플레이스홀더 238px → 264px).
- 달력의 이번 달 날짜는 `--text-primary`, 이웃 달 날짜는 `--text-tertiary`다(대비 라이트 5.95 · 다크 8.05). 이전에는 셀 색보다
  안쪽 ghost 버튼의 글자색이 우선해 둘 다 `--text-secondary`였다.
- Field 안의 RadioGroup에 접근 이름이 없던 문제. Field 레이블이 `<label htmlFor>`로는 `div` 루트에 연결되지 않았다 —
  레이블 id를 `aria-labelledby`로 넘긴다(소비자의 `aria-label`·`aria-labelledby`가 우선). 묶음 제목을 Field로 주면 다른 레이블과 같은 모양이다.
- Dialog·SheetContent `dismissible={false}`: 확인 AlertDialog를 형제로 두면 Escape·닫기 버튼 한 번에 `onDismissAttempt`가
  두 번 불렸다. 확인창으로 포커스가 나가는 것은 시도로 세지 않는다. 막을 눌러도 포커스가 BODY로 빠지지 않는다.
- AlertDialog: 트리거 없이 상태로 연 확인창이 닫히면 열리기 직전 포커스 요소로 돌아간다(이전: BODY). 트리거·앱의
  `onCloseAutoFocus`가 우선한다.
- Dialog·AlertDialog·MediaViewer 팝업의 막이 본문 글자색을 섞어 다크에서 밝아지던 문제. 테마별 검정 막 `--overlay-scrim`
  (라이트 35% · 다크 65%)을 쓴다 (R32).
- 닫기 버튼이 없는 Dialog·AlertDialog의 제목과 설명이 상자 안쪽 폭을 모두 쓴다.
- Combobox 단일/다중·MultiSelect의 활성 후보를 Select와 같은 배경·outline 없음으로 맞추고, 팝오버 안 검색 입력의 2px 포커스 링을 안쪽에 그린다.
- 아이콘이 섞인 메뉴의 글자 시작을 맞추고, Select·DropdownMenu(하위 메뉴 포함)·DatePicker/Popover·Combobox·MultiSelect의
  화면 가장자리 충돌 여백을 8px 토큰으로 통일했다.
- Select·Combobox 단일/다중·MultiSelect 트리거의 바탕(`bg-surface`)·경계·38px 높이·빈 상태 글자 시작과 꺾쇠(16px·
  text-tertiary·불투명도 1·오른쪽 13px)를 통일했다 (R33). 다중 Combobox 태그 영역의 밀도는 그대로다.
- DropdownMenuItem `destructive`의 글자·아이콘 색을 채움용 `text-destructive`(danger-700 `#B42800`)에서 테마별 글자 토큰
  `text-danger-ink`(`--status-danger-fg`)로 바꿨다. 다크 팝오버에서 2.73:1로 본문 하한 4.5:1에 못 미쳤다. 이제 라이트 6.47:1·
  하이라이트 5.51:1, 다크 7.63:1·하이라이트 6.79:1이다. 라이트 글자색은 같은 값이다.

### 바뀐 지침 (MCP)

- `purpose`·`useWhen`·`dont`·`rules`를 화면을 만드는 소비자의 말로 정리했다(R28). 구현 메모는 DESIGN.md에 보존하고,
  규칙마다 한 생각과 출처를 둔다. 빌드에서 구현 금지어·120자 초과·컴포넌트 사이 규칙 복제를 차단한다.
- 원칙(`get_rules` 간격): "앱 전체를 이 시스템으로 만든다. styles.css는 앱 전체 preflight를 포함하며 부품 전용 CSS는 없다."
  와 "앱 CSS 클래스는 ds-로 시작하지 않으며, .flex·.hidden 같은 유틸리티 이름을 다시 정의하지 않는다."
- 추천(`which_component`): 여러 낱말 키워드는 떨어져 있어도 맞춘다(R38 — "옆에서 열리는 편집 패널" → SheetContent,
  "상품 이미지 여러 장 업로드" → FileUpload, "상품명 검색" → Input). 문장 비교에서 일반어 10개(관련·아무·없는·있는·위한·
  대한·통해·경우·모든·어떤)를 빼 무관한 질의가 부품에 매칭되지 않는다.
- 새 부품의 규칙과 갈림길(AppShell·SideNav·PageHeader·Pagination·Sheet·FileUpload·StatTile·SegmentedControl·Steps·FormRow).
  그중 화면 조립 규칙: AppShell 본문 여백은 내장이라 페이지 루트에 padding을 다시 주지 않는다 · PageHeader는 바깥 여백이 없고
  간격은 gap · 미오픈 메뉴는 "출시 예정" · Pagination의 진행 표시는 표 스켈레톤이 맡는다.
- Select: 필터 줄에서는 폭을 지정한다.
- DatePicker: Field 밖 오류는 아래로 20px 걸치므로 필터 툴바 아래는 20px 이상 띄운다.
- Toaster: 포커스가 들어간 알림은 Escape로 닫힌다.
- ClampText: "DataTable 셀에 쓰지 마라" — 셀이 말줄임과 전체 값 `title`을 이미 제공한다.
- DataTable: "긴 글 열을 ClampText로 감싸지 마라" · 빠진 행의 선택 자동 해제 · 화면 라벨이 원본과 다른 열(상태 등)은
  `exportValue`로 CSV 값을 지정.
- 행 액션 트리거는 `Button variant="ghost" size="sm" iconOnly` + `Ellipsis` 아이콘 + 행을 밝히는 `aria-label`. 문자 `⋯`·
  테두리 버튼을 쓰지 않는다. 열 제목은 화면에서 숨긴다.
- Input: 숫자 입력은 예상 자릿수에 맞춰 폭을 좁힌다 — 넓은 칸 오른쪽 끝의 숫자는 레이블과 멀어진다.
- RadioGroup: 묶음 제목은 Field로 준다.
- CompositionArea: 계열 색은 `--status-{neutral,info,warning,success,danger}-fg`. 목록 밖 이름은 검게 그려진다.

### 문서

- 설치 안내를 `npm install @s2life/ui pretendard`와 CSS import 두 줄(Pretendard·`@s2life/ui/styles.css`)로 통일했다(R27·R30).
  토큰 직접 접근도 ui 하위 경로를 쓴다. 이전 "시작하기"의 `import '@s2life/tokens/tokens.css'`는 `styles.css`와 중복이었고
  pnpm에서 ui만 설치하면 해석에 실패해 빌드가 깨졌다. Next.js App Router·Vite 진입점 안내를 더했다.
- README·시작하기: 앱 전체 전제(부품 전용 CSS 없음)와 `ds-` 클래스 규칙, peer React 19.0 이상(React 18 미지원).
- DESIGN.md
  - 2026-11-22 디자인 검토 문안: §6.1 선택·현재 표시 네 갈래(현재 위치 = 브랜드, 선택된 데이터 = 선택 틴트, 모드·값 = 중립 칩,
    진행 = 브랜드 채움), §6.2 상세 화면의 파괴적 액션(⋯ 더보기 안 삭제·확정 단계에서만 채운 danger), §11.9 폼 세로 리듬과
    같은 줄 정렬(FormRow), §24.4 페이지 제목 34 단일, §25 문구(건/개·출시 예정·범위 오류·숫자 축약).
  - 새 절 §24 레이아웃(앱 셸)·§4.1 페이지네이션(로딩 중 진행 표시는 표 스켈레톤). §11.1.1·§11.3 날짜 입력 오류 문구와 "오류 문구는 최소 폭에서 한 줄" 규칙, §16.1 탭 기준선과
    클래식 스크롤바, §16.5 Toast 닫기·호버 틴트, §15.7 peer 하한 리허설, §2.4 중립 칩 바탕 후보 비교와 §16.4.1 선택 행 표
    (중립 칩이 호버 행·표 선택 행 위에서 구별되는 근거).
  - §12.2~§16.4.1 중복 사본을 지웠다(R32에서 한 번 더 들어가 두 사본의 내용이 달라져 있었다).
- 모든 `Components/*`에 문서 페이지: 사용 의도 → 사용법(코드 보기) → props 표 → 스토리. props 표는 Storybook docgen
  (26개 중 12개만 채워짐)이 아니라 MCP 매니페스트에서 그린다. Dialog·Tabs·Breadcrumb 문서 스토리 신설.
- Carousel·MediaViewer·ClampText·MultiSelect·Combobox 다중·차트의 `사용법` 스토리 — 보여주는 코드가 실제로 렌더되는 코드다.
- 차트 안내 페이지: 무엇을 언제 쓰는지, `summary`가 화면 글자가 아니라 svg 접근성 이름으로 간다는 것과 화면에도 보여주는 방법.
- 부품 카드에서 같은 페이지 부모의 규칙 반복을 없앴다(Dialog 15회 → 0).
- 문서 미리보기가 화면 높이를 채우지 않는다(Combobox 문서 15,471 → 4,635px). 테스트용 스크롤 여유 높이(`180vh`)는 스토리
  화면에서만 준다. Guide 문서의 Tour·Hint는 iframe에 격리해 본문을 덮지 않는다.
- 도그푸딩 기록(02 마케팅·03 물류·04 CMS·05 상품 관리)과 UI 요소 준비도 검토(`docs/research/ui-coverage-review.md`).

### 내부

- 테스트 장치 스토리를 `QA/`로 옮겼다(`Screens/ListScreen`·`DetailScreen`·`AppShell`·`CreateScreen`·`Flow` → `QA/…`).
  `Screens/`에는 디자인 검토를 거친 대표 화면만 둔다.
- MCP 카탈로그의 중복 부품 소스·빈 API 배열·규칙 출처 접두어를 무손실 압축했다(R33b, 70,643 → 66,507바이트, 도구 응답 110건
  바이트 동일). 응답 예산은 **바뀐 동작**의 MCP 항목이 최종 값이다 — R37에서 카탈로그 80,000 → 90,000과 목록·상세 상한을
  두었고, R42에서 전체 매니페스트 상한을 응답 단위(토큰·규칙)로 바꿨다. 현재 크기 회귀 상한은 단위 테스트와 MCP 하네스에 있다.
- `mcp-build`가 DESIGN.md 절 번호 중복이면 매니페스트 생성을 멈춘다(규칙 출처가 절 번호를 가리킨다).
- 게이트: `check-boundaries`가 `packages/ui/src` 안의 `@s2life/ui` 자기 참조를 막고, pre-push가 임시 worktree에서 dist 없이
  typecheck한다(`pnpm typecheck:clean`). 스토리 3개의 자기 참조 import가 R31~R43b 원격 CI를 11회 연속 깨뜨렸다.
- QA: 리눅스 헤드리스의 hover·pointer 조건(`parityArgs`)과 글꼴 힌팅 1px 허용, 그려진 픽셀을 보는 `decodePng`,
  `run-all --only`·`--shard i/N`·`--timings`와 하네스별 시간 기준선, `cdp()` 응답 뒤 45초 타이머 해제(CI 1,408초 중 약
  1,080초가 그 대기였다). 새 하네스: 앱 셸·페이지네이션·옆 패널·파일 업로드·날짜+시각·StatTile·세그먼트·단계 표시·
  같은 줄 정렬(9건)·대표 화면(14건)·레이어 디테일·디자인 디테일·검색 입력 일관성·도그푸딩 3.
- 배포 리허설: `S2_PACK_REACT=<x.y.z>`로 소비 앱 React를 지정한다(peer 하한 확인). 기본·지정 모두 번들 안 React 버전이 하나인지 검사한다.
  소비 앱에 Tabs를 두고 기본·Tailwind 두 경로에서 '버튼 아이콘·라벨 한 줄'과 '탭 선택 밑줄이 기준선에 앉는다'를 위치로 잰다
  (0.3.0의 Button이면 세로 중심 차 20px로 실패한다).
  세 tarball의 package.json이 원본과 같고 npm이 게시하며 고칠 필드가 0개인지(`npm pkg fix`), mcp tarball에 bin `s2life-mcp`가
  있는지 보고, 소비 앱에서 `node_modules/.bin/s2life-mcp`와 `npx @s2life/mcp` 둘 다 stdio initialize를 주고받는다.
  `pnpm publish:check`는 세 패키지를 `npm publish --dry-run`(닫힌 로컬 레지스트리·`--ignore-scripts`)으로 돌려 자동 교정 경고를 잡는다.
- QA 하네스 구조(3단계 2차): 하네스가 남의 서버·낡은 빌드를 검사하고 통과하지 못하게 했다. run-all이 내장 정적 서버
  (`static-server.mjs`)를 빈 포트(`--port 0`, 지정 포트가 차 있으면 즉시 실패)에 띄우고, 빌드 폴더 nonce와 `build-info.json`의 sha가
  HEAD와 같아야 진행한다(dirty 빌드는 pre-push·CI 엄격 모드에서 거부). 하네스는 `storybookBase()`(`DS_SB_URL`)로 같은 확인을
  한 번 더 하고, CDP 포트는 브라우저가 고른다(`DevToolsActivePort`). `--jobs N`(서버 하나에 브라우저 N개)·`--group storybook|node`,
  하네스 공통 입력 `actions()`, 함정 린트(`traps.test.mjs` — 고정 6099·고정 CDP 포트·`http-server` 등 AGENTS.md 함정 7가지),
  배포 리허설의 실행마다 임시 폴더·빈 미리보기 포트, waitPlay가 표식 없는 스토리에서 14초를 버리던 것 제거, 리눅스 기준선
  ci-734862c(하네스 31개 384.7초). pre-push는 origin/main 대비 `.github/**`만 바뀐 푸시면 브라우저 하네스를 건너뛴다.
- CI: 게이트 제한 시간 verify 20 → 45분·release 25 → 60분, 실행 기반과 액션 런타임 정리.
- 개발 의존성 `pretendard` 1.3.9 — Storybook도 소비 앱과 같은 CSS import로 글꼴을 로드한다.

## 0.3.0 — 2026-11-21

`v0.3.0` · run `44850936920` · OIDC 신뢰 게시, sigstore provenance 포함
(tokens `4031048376` · ui `4031048854` · mcp `4031049316`).

도그푸딩으로 공개 API 간극을 메우고, 사람이 읽을 사용 문서를 만들고,
요청받은 UI 요소 네 가지를 더했다. 공개 export 94개 → **102개**.

### 추가

- **MultiSelect** — 요약 트리거 + 체크 목록. 트리거 높이가 선택 수와 무관하게 일정하다.
  Radix Select 는 `value: string | undefined` 라 다중 선택을 못 해서 새로 지었고,
  메뉴가 아니라 `listbox` + `aria-multiselectable` 이다.
- **Combobox `multiple`** — 태그를 컨트롤 안에. 칩 영역은 2줄까지만 늘고
  그 뒤로는 안에서 스크롤한다(실측 38 → 68px 에서 고정). 제거 타깃 24px,
  칩 묶음은 Tab 정지점 하나, 빈 입력 Backspace 는 두 번이다.
- **Collapsible** — 트리거가 항상 보이는 접기. 입력을 담으면 `forceMount` 를 쓴다.
- **ClampText** — 글을 N줄로 자르고 **넘칠 때만** 더보기를 보여준다.
- **MediaViewer** — 이미지·동영상을 확대 팝업 또는 **비모달 플로팅**으로.
  동영상은 네이티브 컨트롤·자막에 Picture-in-Picture 를 더했다. 플레이어를 만들지 않는다.
- **Carousel** · **CarouselSlide** — scroll-snap 기반. Swiper 를 쓰지 않는다.
  자동재생은 **정지 버튼과 한 몸**이고, 호버·포커스·reduced-motion·숨겨진 탭에서
  멈추며, 사용자가 직접 넘기면 **다시 켜지지 않는다**.
- `createDataTableColumnHelper<T>()` 와 `RowData`·`CellContext`·`HeaderContext` 공개.
- `Button` 의 `asChild`. `DialogContent` 의 `size="wide"`.
- Storybook **사용 문서 5개**(시작하기·컴포넌트 고르기·표·폼·토큰).
  규칙을 손으로 베끼지 않고 매니페스트에서 렌더하므로 어긋날 수 없다.

### 고침

- **DataTable 을 clean install 로 쓸 수 없었다.** 컬럼을 만들 헬퍼를 내보내지 않아
  `@tanstack/react-table` 을 직접 설치해야 했고, 그건 npm 평탄화 덕에 우연히 해소된
  것이라 pnpm 엄격 모드에서는 깨졌다.
- **`DataTableColumns<T>` 로 주석하면 셀 추론이 `any` 로 넓어졌다.** 주석하라고
  내보낸 타입인데 쓰면 더 나빠졌다.
- 중첩 확인창이 부모 다이얼로그를 반으로 잘랐다 — §16.3 이 권장한 패턴이었다.
  확인창을 좁혔다(부모 576px · 확인창 448px).
- MediaViewer 플로팅 폭이 `100vw` 기준이라 스크롤바 때문에 좌우가 어긋났다.
- `scroll-behavior: smooth` 가 reduced-motion 을 존중하지 않는 것을 컴포넌트에서 덮었다.
- `resolveHeadlessShell` 이 GUI 번들 거부보다 존재 확인을 먼저 해, 그 규칙을 지키는
  테스트가 macOS 에서만 통과했다.

### 바뀐 동작

- **한국어 줄바꿈이 어절 단위가 됐다**(`word-break: keep-all` + `overflow-wrap: anywhere`).
  모든 화면의 줄바꿈 위치가 바뀐다. 긴 URL 이 좁은 칸에서 넘치던 것도 함께 고쳐졌다.
- `pnpm verify` 가 단위 테스트를 포함한다.

### MCP

- 파생 가능한 것을 저장하지 않는다 — `import`·`source` 접두사·`kind` 기본값·
  `required: false`·타입의 `| undefined`. `components` 77,804 → 64,011 바이트.
  **응답은 한 글자도 달라지지 않는다**(기준선 깊은 비교로 보장).
- `which_component` 후보에서 복합 부품을 제외했다.

### 검증

단위 **253건** · 브라우저 **486건** · 하네스 19개.

## 0.2.0 — 2026-11-16

`v0.2.0` · run `43727619700` · OIDC 신뢰 게시, sigstore provenance 포함
(tokens `3924241424` · ui `3924244478` · mcp `3924247100`).

상세·등록 화면을 닫고, 조립해야만 드러나는 결함을 고쳤다.
공개 export 60개 → **94개**.

### 추가

- **Tabs** · `TabsList` · `TabsTrigger` · `TabsContent` — 서버에서 패널을 가져오면
  `activationMode="manual"` 을 쓴다. 화살표로 네 탭을 지나는 동안 요청 네 번을 보내지 않는다.
- **Breadcrumb** 7개 — R10 의 "돌아오는 길"(`useReturnContext`)을 그릴 경로 표시.
  마지막 항목은 `aria-current="page"`, 구분자는 `aria-hidden`.
- **Dialog** 8개 — `dismissible` 과 `onDismissAttempt`. 저장하지 않은 변경이 있을 때만
  닫기를 가로챈다(`dismissible={!dirty}`). 우상단 닫기 버튼을 내장해 갇히지 않는다.
- **AlertDialog** 9개 — 되돌릴 수 없는 선택의 확인. Radix 가 Cancel 로 초기 포커스를
  옮기므로 **기본이 취소**다. 바깥 클릭으로 닫히지 않는다.
- **Textarea** — `autoGrow` + `maxHeight`. 한글 조합 중에도 자란다(진동하지 않음을 실측).
- **RadioGroup** · `RadioGroupItem` — 화살표가 포커스와 선택을 함께 옮긴다(ARIA 라디오).
- **Switch** — 누르는 즉시 적용하는 설정. 저장 대기 폼에는 `Checkbox` 를 쓴다.
- **Label** — `Field` 를 쓰지 않는 자리(Switch·Checkbox·Radio 옆 레이블)용.
- **Combobox** — 20개 초과 옵션의 검색 선택. 초성 검색(`ㅅㅇ` → 서울)을 지원한다.
- `Input` 타입 확장 — `number`(휠 가드 내장) · `password`(보기 토글) · `search`(지우기 버튼)
  · `email` · `tel` · `url` · `date`.
- `focusNextFormStop(element)` — 폼 안의 다음 Tab 정지점으로 포커스를 옮긴다.

### 고침

- **등록 화면이 Enter 로 쓸 수 없었다.** 상품명에서 Enter 를 9번 눌러도 수량 칸에
  도달하지 못하고 콤보박스 트리거↔검색 입력을 무한 왕복했다. Enter 이동 계약을
  `data-form-control="advance"` 옵트인으로 정리했다.
- **Switch 가 Enter 로 조용히 토글됐다.** 이제 Enter 는 다음 칸이고 Space 가 토글한다.
- **Tabs 의 탭 끌어오기가 문서를 세로로 밀었다**(실측 `scrollY` 244 → 266).
  `scrollIntoView` 대신 목록의 `scrollTo` 로 가로만 움직인다.
- **열린 Combobox 에 `role="combobox"` 가 두 개였다.** 트리거에서 빼고 입력 하나로 두었다.
- `which_component` 의 후보가 복합 부품으로 오염됐다. `카드로 묶기` 가
  `Card`·`CardBody`·`CardFooter`·`CardHeader` 동점을 돌려줬다. 부품을 후보에서 제외했다.
- `aria-label="breadcrumb"` 만 영어였다. `"경로"` 로 바꿨다.

### 바뀐 동작 (0.x 이므로 minor 에 포함)

- `FormFlow` 안에서 **Switch·RadioGroupItem 의 Enter 가 값을 바꾸지 않고 다음 칸으로**
  간다. 고유 동작은 Space·화살표가 맡는다. **폼 밖에서는 바뀌지 않는다.**
- `FormFlow` 안의 **Combobox 는 고른 뒤 다음 칸으로** 포커스를 옮긴다. 폼 밖에서는
  트리거에 남는다.
- `<textarea>` 의 **`Shift+Enter` 는 줄바꿈**이다. §11.5 의 "이전 칸" 은 단일 행 입력
  규칙이며 textarea 에는 적용되지 않는다.

### MCP

- 복합 부품을 한 번만 저장한다. 부품은 `partOf` 로 부모를 가리키고, `get_component` 가
  읽을 때 부모의 `useWhen`·`dont`·`rules` 를 합쳐 주며 `inheritedFrom` 을 붙인다.
  부모는 `parts` 를 갖는다. `list_components` 응답에 `partOf` 가 추가됐다.
- `components` 전송 크기 75,334 → **68,905** 바이트 (컴포넌트는 60개 → 94개로 늘었다).
- `which_component` 의 최소 점수를 올렸다. purpose 한 토큰만 맞은 것은 매칭이 아니다.

### 검증

브라우저 **352건** · 대비 100건 · ΔE 8건. 하네스 14개.
pre-commit · pre-push · CI 세 겹으로 걸려 있다.

---

## 0.1.1 — 2026-11-15

`v0.1.1` · run `43698069402` · sigstore provenance 포함.

- CI 가 잡은 두 가지를 고쳤다 — 하네스에 박힌 개인 절대 경로, Ubuntu AppArmor 샌드박스.
- 배포 워크플로에 `id-token: write` 를 추가했다. `--provenance` 에 필요하다.
- 배포 가드가 로컬 배포 때 `pnpm verify` 를 돌린다.
- 저장소를 공개로 전환했다. `--provenance` 는 공개 저장소만 지원한다.

## 0.1.0 — 2026-11-15

첫 게시. 태그 체계 이전이라 태그가 없다.

- `@s2life/tokens` — OKLCH 기반 의미 토큰 48개. 라이트·다크·OS 추종 3상태.
- `@s2life/ui` — 표·차트·로딩·안내·폼·요약/상세 컴포넌트와 사전 컴파일 CSS.
- `@s2life/mcp` — AI 가 이 시스템을 읽는 stdio MCP 서버. 도구 6개, 리소스 3개.
