# @s2life/ui

B2B 커머스 SaaS용 React 디자인 시스템. React·React DOM 19(19.0 이상)를 앱에서 제공한다.

**0.3.0에서 올리는 앱:** npm에는 0.3.0 다음 판이 0.7.0이라 0.4.0~0.6.0의 변경이 한 번에 온다. 0.3.0의 공개 이름 일부(내부 도우미 12개·DatePicker `onChange`)가 빠져 코드가 깨지니 아래 「0.3.0에서 올릴 때」를 먼저 본다.

```sh
npm install @s2life/ui pretendard
```

React·React DOM 19(19.0 이상)는 peer 의존성이며 React 18은 지원하지 않는다. 앱에 없다면 `npm install @s2life/ui pretendard react react-dom`으로 함께 설치한다.
앱에 `@s2life/tokens`를 따로 설치하지 않는다 — ui가 같은 버전을 고정해 가져오며, 따로 설치하면 버전이 어긋날 수 있다.

```tsx
import { Button, Field, Input } from '@s2life/ui';
import { Check } from '@s2life/ui/icons';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@s2life/ui/styles.css';
```

두 줄의 CSS는 앱 공통 진입점에서 한 번 불러온다. Next.js App Router는 루트 `app/layout.tsx`, Vite는 `src/main.tsx`에 둔다. 토큰·유틸리티·모든 컴포넌트 스타일이 사전 컴파일되어 있어 Tailwind 설치가 필요 없다. 이벤트·상태를 쓰는 Next.js 컴포넌트는 클라이언트 컴포넌트에서 사용한다. 부품은 파일마다 `"use client"`가 있어 서버 컴포넌트에서 import하면 쓴 부품만 클라이언트 번들에 들어간다. `next build --webpack`으로 빌드하면 `experimental.optimizePackageImports: ['@s2life/ui']`를 켠다(Next 16 기본 Turbopack은 필요 없다).

`styles.css`는 앱 전체에 적용되는 기본 초기화(Tailwind preflight)와 유틸리티를 포함한다. **앱 전체를 이 디자인 시스템으로 만드는 것을 전제로 한다.** 기존 앱의 일부 화면에만 넣는 부품 전용 CSS(preflight 없는 파일)는 제공하지 않는다 — `styles.css`든 `tailwind.css`든 불러오면 앱 전체의 기본 스타일이 함께 바뀐다. 우리 고유 클래스는 `ds-`로 시작한다. 앱 CSS 클래스는 `ds-`로 시작하지 않으며, `.flex`·`.hidden` 같은 유틸리티 이름을 다시 정의하지 않는다.

글꼴 파일은 용량과 호스팅 방식을 앱이 정하도록 ui 패키지에 넣지 않는다. Pretendard CSS의 동적 서브셋은 번들러가 앱에서 자체 호스팅하며 외부 CDN이 필요 없다. 이 CSS를 불러오지 않으면 시스템 글꼴로 그려져 숫자 폭·줄바꿈이 디자인과 달라진다. Pretendard는 Google Fonts에 없으므로 `next/font/google` 대신 위 CSS import를 사용한다.

제공하는 유틸리티: `.sr-only`는 스크린리더용 문구를 화면에서 숨기고, `.tabular`는 숫자 열을 고정폭으로 정렬한다. `styles.css`·`tailwind.css` 두 경로에서 제공하며 `.truncate`는 공개 계약에 포함하지 않는다.

토큰 파일을 직접 써야 한다면 `@s2life/ui/tokens.css`, Tailwind 이름 매핑은 `@s2life/ui/theme.css`, 기계 판독용 값은 `@s2life/ui/tokens.json`으로 가져온다. `styles.css`에는 토큰이 이미 포함되어 있으므로 `tokens.css`를 중복으로 불러오지 않는다.

이미 Tailwind v4를 사용하는 앱은 사전 컴파일 CSS 대신 다음 입력을 사용한다. 경로는 `src/app.css` 기준이다.

```css
@import "tailwindcss";
@import "@s2life/ui/tailwind.css";
@source "../node_modules/@s2life/ui/dist";
```

이 경로는 앱의 Tailwind가 유틸리티를 한 번만 생성한다. 앱 진입점에서 `styles.css` 대신 위 `pretendard` CSS와 `./app.css`를 불러온다. `tailwind.css`에는 토큰·테마 브리지·컴포넌트 CSS·공통 base 규칙이 포함된다.

공개 진입점은 루트·`icons`·`styles.css`·`tailwind.css`·`tokens.css`·`theme.css`·`tokens.json`이며 `internal`은 내보내지 않는다. JS는 ESM, 타입은 `.d.ts`로 제공한다. `@s2life/tokens`, `@s2life/ui`, `@s2life/mcp`는 따로 개발·배포하며 같은 버전을 사용한다. tokens 수정도 lockstep으로 배포하고 ui가 그 버전을 고정해 가져오므로 앱은 ui만 업데이트한다.

## 0.3.0에서 올릴 때

npm에는 0.3.0 다음 판이 0.7.0이다. 0.4.0·0.5.0·0.6.0은 번호와 변경 기록만 확정하고 따로 게시하지 않아 그 변경이 모두 0.7.0에 함께 실렸다. 0.3.0 앱이 한 번에 받는 변경 중 앱 코드·화면·시험에 닿는 것을 모았다 — 문장과 수치는 변경 기록 각 판의 항목 그대로이고, 괄호 안은 그 판(0.4~0.7)이다.
변경 기록은 패키지에 들어가지 않는다. 판마다 자세한 것은 저장소의 [변경 기록 「0.3.0에서 0.7.0으로 올릴 때」](https://github.com/tom783/design-system/blob/main/CHANGELOG.md#030에서-070으로-올릴-때)와 [저장소 README](https://github.com/tom783/design-system#readme)에 있고, 0.7.0 뒤 판의 변경은 변경 기록의 그 판 절에 있다.

### 코드가 깨지는 것 — 먼저 고친다

**내부 도우미 12개와 딸린 타입 6개가 공개 진입점에서 빠졌다** (0.6). 0.3.0에서 `@s2life/ui`로 import 되던 이름이다. import 하면 TypeScript는 TS2305(`has no exported member`), 번들러는 "is not exported"로 멈춘다. 부품이 안에서 쓰는 계산은 그대로라 부품 동작은 같다 — 공개 진입점에서만 닫았다.

| 옛 이름 (0.3.0) | 대체 방법 |
|---|---|
| `placeFallback` · 타입 `Rect` · `Placement` | 말풍선 위치는 `Tooltip`·`Hint`·`Tour`·`Peek`이 정한다. 직접 그린 말풍선이면 그 계산(위 자리가 없으면 아래, 화면 안 가두기)을 앱에 둔다 |
| `resolveStep` | `Tour` + `useTour`가 단계를 고른다. 대상이 없는 단계는 `Tour`의 `onMissingTarget`(`'skip'`·`'center'`) |
| `useAnchored` · `supportsAnchor` | `Tooltip`·`Hint`·`Tour`·`Peek`. 앵커 위치 지원 판별은 `CSS.supports('anchor-name', '--x')` |
| `nextFocusable` · 타입 `FocusCandidate` | Enter 다음 칸 이동은 `FormFlow`(form을 감싼다) 또는 `useFormFlow`(앱 form에 붙인다) |
| `focusNextFormStop` | 같음 — `FormFlow`·`useFormFlow`. Combobox는 선택 뒤 다음 칸 이동을 스스로 한다 |
| `shouldValidate` · 타입 `ValidationTiming` | 같은 식을 앱에 둔다: `!isComposing && (trigger !== 'change' \|\| hasErrored)` — 조합 여부는 `useComposition()` |
| `nextPhase` · 타입 `LoadingPhase` · `LoadingInput` | `useDelayedLoading(isLoading, { delay, minVisible })`가 보일지 여부(boolean)를 준다 |
| `initials` | `Avatar name="…"`가 이름 글자를 그린다 |
| `encodeRecord` · `decodeRecord` | `useReturnContext`의 `capture`·`consume`. 타입 `ReturnRecord`는 그대로 공개다(`consume()`이 돌려준다) |
| `useElementWidth` | 차트 폭은 `ChartFrame`이 잰다. 다른 요소 폭은 앱이 `ResizeObserver`로 잰다 |

**DatePicker 값 알림 `onChange` → `onValueChange`** (0.5 이름 바꿈 · 0.6 옛 이름 제거). 0.3.0에서는 `onChange`가 유일한 이름이었다. 받는 값(`Date`·`DateRange`·`undefined`)과 부르는 때(확정할 때만)는 같다. TypeScript 앱은 `onChange`를 넘기면 컴파일이 멈추고, **타입 없이(JS) 넘긴 `onChange`는 오류 없이 불리지 않는다** — JS 앱은 이름을 꼭 바꾼다.

### 코드를 바꿔야 하는 것

- **CSS 클래스 `ds-` 접두어** (0.4). 고유 클래스 37개(`.loading-*`·`.data-table-*`·`.state`·`.state-error`·`.thumbnail`·`.avatar`)가 `.ds-<기존 이름>`이다. 앱 CSS·시험이 옛 이름을 선택자로 썼다면 `ds-` 이름으로 바꾼다(가능하면 `data-slot`으로 건다).
- **DataTable 선택 수는 BulkActionBar 한 곳** (0.5). 도구 줄이 선택 수를 쓰지 않는다(0.3.0의 `N개 선택`). 선택 수를 보여야 하면 BulkActionBar(`selectedCount={selectedIds.length}`)를 쓴다. 목록 툴바와 함께 `exportFileName`을 썼다면 빼고, 전체 내보내기는 PageHeader `actions`, 선택 행 내보내기는 바 `actions`에서 공개 함수 `downloadCsv`로 옮긴다.
- **DataTable: `data`에서 빠진 행은 선택에서 자동 해제된다** (0.4). 서버 페이징에서 페이지를 넘겨도 선택을 남기려면 선택을 앱 상태에 따로 보관한다. 제어형은 `onSelectedIdsChange`가 데이터 변경만으로도 불린다는 것을 전제로 둔다.
- **우회 코드 정리** (0.4): 표 선택 행·범위를 `--bg-selected`(`bg-selected`)로 칠했다면 `--bg-selected-row`로 · Button 앞·뒤 아이콘 쌓임을 막으려 넣은 우회 CSS(svg inline·flex 등)를 지운다 · 검색 입력 앞에 직접 붙인 돋보기를 지운다(두 개가 된다) · 래퍼 폭을 앱 CSS로 덮던 우회는 `className` 폭 클래스로 · 헤더 없는 카드에 직접 준 위 여백을 지운다 · Field 밖 DatePicker 아래(필터 툴바 아래)는 20px 이상 띄운다.
- **번들러** (0.5): `next build --webpack` 앱은 `experimental.optimizePackageImports: ['@s2life/ui']`(Turbopack·Vite는 없음).

### 앱 진입점과 모든 화면

- **기본 글꼴 Pretendard — 앱이 CSS를 먼저 불러야 한다** (0.4). `--font-sans` 첫 글꼴이 IBM Plex Sans KR → Pretendard Variable이다. `npm install pretendard` 후 앱 진입점에서 위 설치 안내의 Pretendard CSS를 `@s2life/ui/styles.css` **앞**에 한 번 불러온다. 불러오지 않으면 시스템 글꼴로 그려져 숫자 폭·줄바꿈이 디자인과 달라진다. 숫자 정렬은 본문 글꼴의 `tabular-nums`(`.tabular`), `--font-mono`는 코드용 시스템 고정폭이다.
- **포커스 링: 크림슨 → 중립 고대비** (0.4). `--border-focus`가 라이트 neutral-950 `#262222` · 다크 neutral-50 `#F7F6F5`다. 두께 2px·offset 2px는 그대로이고, Tour·Hint 대상 링과 FileUpload 드래그 중 드롭존 테두리는 크림슨 그대로다. `--border-focus`를 덮어쓰지 않았다면 코드 수정은 없다 — 포커스 상태를 담은 시각 기준선을 갱신하고, 앱이 직접 그린 포커스 표시가 브랜드 색이면 `--border-focus`로 바꾼다.

| 무엇 | 0.3.0 → 0.7.0 | 판 | 앱이 할 일 |
|---|---|---|---|
| 선택 배경 `--bg-selected` | 라이트 brand-50 → brand-100 · 다크 brand-975 → brand-900 | 0.4 | 없음 |
| 표 선택 행 `--bg-selected-row`(새) | 라이트 brand-100 · 다크 `#552D32` · 달력 범위 중간도 이 값 | 0.4 | 선택 행을 `bg-selected`로 칠했다면 `bg-selected-row`로 |
| 중립 칩 바탕 `--status-neutral-bg` | 라이트 `#EFECEB` → `#E1DCDB` · 다크 `#060505` → `#312D2C`(StatusChip `neutral`) | 0.4 | 덮어쓰지 않았다면 없음. neutral 칩 화면(양 테마) 기준선 갱신 |
| 대화상자 막 | 본문 글자색 섞던 막 → `--overlay-scrim`(라이트 35% · 다크 65%) | 0.4 | 없음 |
| 금액 칸 최소 폭 `--cell-min-w-money` | 128px → 140px | 0.4 | 이 값에 맞춘 고정 폭 레이아웃 확인 |

### 0.3.0에 있던 부품의 모양 변화

| 부품 | 무엇이 달라 보이나 | 판 |
|---|---|---|
| Tabs | 선택 밑줄이 기준선 위에 앉아 **탭 목록 높이가 5px 줄었다**(아래 내용이 5px 올라온다). 클래식 스크롤바가 기준선을 가리지 않는다 | 0.4 |
| Tabs | 키보드 포커스가 선택된 탭에 오면 링의 아래 변만 밑줄과 간격 2px 위에서 끝나 밑줄이 링 아래로 보인다(`::after` 링) | 0.5 |
| Toast | 닫기 버튼이 왼쪽 위 밖 20px 원 → 오른쪽 위 안쪽(0.4) · 1024 이상 38 · 미만 44(0.7). 본문 오른쪽 비움 54(1024 미만 60). 상태 아이콘은 첫 줄 가운데 | 0.4·0.7 |
| Button | 앞·뒤 아이콘이 라벨 위로 쌓이던 0.3.0 게시본 결함 → 라벨과 한 줄(간격 8px · 세로 가운데) | 0.4 |
| Input | `type="search"` 앞에 기본 돋보기(`leadingIcon={null}`로 끈다). 폭 클래스(`w-80` 등)가 바깥 래퍼에 붙는다 | 0.4 |
| Select·Combobox·MultiSelect | 트리거 바탕(`bg-surface`)·경계·38px 높이·꺾쇠 통일 · 활성 후보 배경 통일 · 아이콘이 섞인 메뉴의 글자 시작 정렬 · 화면 가장자리 충돌 여백 8px | 0.4 |
| DatePicker | Field로 감싸면 **20px 낮아진다**(오류 자리 이중 예약 해소) · 필터 툴바에서 다른 컨트롤과 높이가 맞는다 · 빠른 선택이 모드를 따른다 · 오류 문구가 고치는 법을 말한다 | 0.4 |
| 달력 | 이번 달 날짜 `--text-primary` · 이웃 달 `--text-tertiary` | 0.4 |
| CardBody | 헤더 없는 카드의 첫 CardBody 위 여백 16px | 0.4 |
| StatusChip | 기준선이 라벨 글자 — 글자 줄에 놓인 칩이 1~1.5px 움직인다 | 0.5 |
| DataTable | 도구 줄 선택 수 없음(위 「코드를 바꿔야 하는 것」) · 고정 경계선은 표가 가로로 넘칠 때만 · 고정 머리 칸 바탕 = 다른 머리 칸 | 0.4·0.5 |
| DataTable | 넘치는 표의 스크롤 영역이 Tab으로 닿는다 — 화면 변화는 그 포커스 링뿐 | 0.6 |
| DropdownMenu | `destructive` 글자·아이콘 색 `text-danger-ink` — 다크 팝오버 2.73:1 → 7.63:1(라이트 글자색은 같은 값) | 0.4 |

### 화면은 같고 시험만 바뀌는 것

- Toast: Escape로 닫고, 닫은 뒤 포커스는 들어오기 직전 요소(없으면 `main`)다 (0.4). 닫기 버튼 크기·위치(32 → 38/44, 위 10 → 7.75/4.75)·긴 문구 줄바꿈 위치를 단정하던 시험 (0.7).
- DataTable: 문구 `N개 선택` → 도구 줄 빈 글자(0.4·0.5) · 부분 로드 내보내기 버튼 `{N}건 내보내기`(0.4) · 넘치는 표는 Tab 정지점이 하나 는다(`role=region`, 이름 = caption) (0.6).
- 필수 표시: Combobox(단일)·MultiSelect 트리거에 `button[aria-required]`가 없다 — 라벨의 "필수 입력"이나 열린 검색 입력·목록을 본다 (0.6).
- DatePicker 오류 문구·빠른 선택 단추 이름 (0.4).
- Hint·Tour·Peek를 닫자마자 다시 열어도 포커스가 말풍선으로 간다 (0.7 고침 — 화면 변화 없음).

### 새 부품 (공개 컴포넌트 102 → 125)

| 판 | 부품 | 그 밖의 새 API |
|---|---|---|
| 0.4 (102 → 115) | `AppShell` · `SideNav`(`SideNavGroup`·`SideNavItem`) · `PageHeader` · `SheetContent`·`SheetBody` · `Pagination` · `FileUpload` · `StatTile` · `SegmentedControl` · `Steps` · `FormRow` | DatePicker `time` · Input `leadingIcon` · 토큰 `--status-neutral-*`·`--bg-selected-row`·`--overlay-scrim`·`--side-nav-*` |
| 0.5 (115 → 119) | `FilterBar` · `BulkActionBar` · `DescriptionList` · `FormActionBar` | DataTable `summary`(합계 행) · Input `unit`(단위 접미사) |
| 0.6 (119 → 121) | `FieldList` · `SectionHeader` | 비제어 초기값 `defaultExpanded`·`defaultValue`·`defaultSelectedIds` |
| 0.7 (121 → 125) | `ContextSwitcher` · `ContextSwitcherGroup` · `NotificationCenter` · `CountBadge` | AppShell `headerEnd` · `toast.notify` · EmptyState·ErrorState `size="page"` · SideNavItem·TabsTrigger `count` · 사용자 메뉴 조합 예시(저장소 `packages/ui/docs/examples/user-menu.tsx`) |

0.3.0에 없던 부품(AppShell·SideNav·PageHeader·FormActionBar 등)을 미게시 빌드로 먼저 쓴 앱은 판 사이의 변경도 받는다 — AppShell header 64px 고정·가로 한 줄과 폼 하단 고정 줄 위 토스트(0.7, 변경 기록 0.7.0 「앱이 할 일」), PageHeader 바깥 여백 없음·SideNav 미오픈 "출시 예정"(0.4).
