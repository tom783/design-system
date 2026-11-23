# 변경 기록

`@s2life/tokens` · `@s2life/ui` · `@s2life/mcp` 는 **버전을 함께 올린다**(lockstep).
세 패키지의 버전이 어긋나면 배포 워크플로가 떨어진다.

태그는 **게시된 것에만** 붙인다(`v<버전>`). 배포 워크플로는 `contents: read` 만 갖기
때문에(의도된 제약) 태그는 게시 후 로컬에서 단다. 배포 절차는 `DESIGN.md §15`.

---

## 미출시

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

### 바뀐 동작 (마이그레이션)

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

- DatePicker: "onValueChange로 받은 확정 날짜를 쓴다"(이전 onChange). props에 `onValueChange`가 더해지고 `onChange`는 선택이며
  "옛 이름. onValueChange와 같다."는 설명이 붙는다.
- `get_component`의 상속 표기(`extends`) 37곳: `React.*HTMLAttributes<…>`·`ComponentPropsWithoutRef<…>` → `React.ComponentProps<…>`
  (ref 포함). StatTile은 `React.RefAttributes<HTMLElement>`를 더했다(목표 49).
- SegmentedControl `aria-label`·`aria-labelledby` 설명이 같은 문장으로 두 번 이어 붙던 것을 한 번으로 고쳤다. 생성기가 합집합
  갈래마다 다시 잡히는 같은 선언의 JSDoc을 겹쳐 붙였다.
- 위 세 가지를 `docs/qa/mcp-response-diff.mjs`로 main 서버(cd294ae — MCP는 R49와 같다)와 대조하면 1,363건 중 42건(이름 39개 + 대소문자·공백 변형
  3건)만 다르고 모두 의도 목록이다. 색인·목록·토큰·규칙·`which_component` 응답은 바이트가 같고 정답 세트도 top-1 52 · top-3 72
  그대로다. 저장 카탈로그는 88,863 → 88,622바이트(응답 아님).

### 문서

- DESIGN.md §6.3 공개 API 규약(목표 49) — 제어/비제어 쌍 `X`·`defaultX`·`onXChange`, 값 알림 `on{X}Change`와 DOM 전용 `onChange`,
  ref prop, 루트 `index.ts` 이름 나열, deprecated 별칭으로 이름 바꾸기. 조사 스냅숏 `docs/research/api-conventions-survey.md`.
  스토리·문서 예제의 DatePicker를 `onValueChange`로, §13.3의 Button `extends` 예시를 지금 표기로 바꿨다.

### 내부

- 공개 API 규약 검사(목표 49): `scripts/check-api-conventions.mjs`가 매니페스트·루트 `index.ts`·소스를 읽어 DESIGN.md §6.3을
  검사하고 `pnpm test`·pre-commit(`packages/ui/src/lib/api-conventions.test.mjs`)에서 돈다. 기존 위반 11건은
  `scripts/api-conventions-allow.mjs`에 이유와 함께 두며, 고친 항목이 목록에 남으면 실패한다. ref 타입은
  `ref-props.typecheck.tsx`가 고정한다. 루트 `index.ts`의 `export *` 27곳을 이름 나열로 바꿨다(공개 이름 224개 그대로).

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
