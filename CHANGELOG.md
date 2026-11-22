# 변경 기록

`@s2life/tokens` · `@s2life/ui` · `@s2life/mcp` 는 **버전을 함께 올린다**(lockstep).
세 패키지의 버전이 어긋나면 배포 워크플로가 떨어진다.

태그는 **게시된 것에만** 붙인다(`v<버전>`). 배포 워크플로는 `contents: read` 만 갖기
때문에(의도된 제약) 태그는 게시 후 로컬에서 단다. 배포 절차는 `DESIGN.md §15`.

---

## 0.3.1 — 미게시

### 추가

- 같은 줄 정렬 FormRow(2026-11-22 오너 확정 — 폼 밀도 F98 · (b)): 같은 줄 Field들이 레이블·설명·입력·오류 네 행을 함께 쓴다(CSS subgrid). 한쪽만 설명이 있어도 입력칸 y 차이 0, 둘 다 없으면 높이 증가 0(Field 하나와 같은 86px), 오류 2개에도 입력칸 이동 0이다. 행은 Field 자식의 DOM 순서가 아니라 data-slot으로 배정하고, 컨테이너 480px 미만에서는 한 열로 접어 빈 설명 행을 남기지 않는다. 필드 피치 98px은 그대로다. Field의 부품으로 매니페스트·문서(Components/Form)에 올렸고 카탈로그는 88,651바이트(90KB 안)다. 하네스 `form-row-render-verify`(9건)를 전체 QA에 등록했다.

- 등록 화면 스토리 `Screens/ProductCreate`(기본·오류 2개): 상품 등록 F98 · (b) — 카드 세 묶음, 같은 줄 여섯 곳을 FormRow로 정렬, 하단 고정 저장 줄. 폼 카드 묶음·하단 고정 줄 부품은 없어 Card와 sticky 유틸리티로 조립했다.

- 대표 화면 스토리(2026-11-22 디자인 검토 확정안): `Screens/OrderList`(제목 display 34/40·700, 검색·필터 한 줄 툴바·`N건 선택` 일괄 동작·DataTable 다중 선택·Pagination), `Screens/OrderDetail`(D2 — 머리 오른쪽 ⋯ 더보기·수정·출고 처리, 삭제는 더보기 메뉴의 destructive 항목 → AlertDialog 기본 포커스 취소·확정 채운 danger; 기본·메뉴 열림·삭제 확인), `Screens/Dashboard`(StatTile 4개·TrendBand·BulletRow·최근 주문). 정식 부품만 조립하고 스토리 전용 CSS는 없다. 라이트·다크 1440×900 하네스 `screens-render-verify`(14건)를 전체 QA에 등록했다.

- 단계 표시(R43): Steps의 0 기준 현재 위치·완료/진행 중/예정 자동 계산·오류 덮어쓰기, 완료 단계 버튼, 640px 미만 요약과 전체 라벨 보존을 추가했다. 단계마다 FormFlow 하나를 사용하는 상품 등록·제목 포커스 예시, 매니페스트 문서·MCP 갈림길·작성 전용 하네스를 포함한다. 세로 배치·폼 상태 관리·버전 변경은 없다.

- 세그먼트 컨트롤(R42): options 배열 기반 SegmentedControl의 제어·비제어 단일 선택, 아이콘·비활성·sm/md·fullWidth·한 줄 말줄임, 그룹 이름·라디오 의미·로빙 키보드를 추가했다. Tabs·RadioGroup 갈림길, 독립 사용 예시·다크·표/카드 조립 스토리·MCP·작성 전용 하네스를 포함한다. 새 색 토큰·다중 선택·버전 변경은 없다.

- KPI 지표 타일(R41): StatTile의 값·한국어 만/억/조 축약·원문 보존, 방향 아이콘·부호·goodDirection별 증감 색, 접근성 문장, 로딩·오류·재시도와 href/asChild 상세 링크를 추가했다. 4개 그리드·좁은 폭·다크·독립 사용 예시·매니페스트 문서·MCP 검색과 작성 전용 하네스를 포함한다. 스파크라인·새 색 토큰은 추가하지 않고 버전은 유지한다.

- 날짜+시각(R40): DatePicker의 single에 `time=true | { step: 1 | 5 | 10 | 15 | 30 }`을 추가했다. 24시간 직접 입력·시/분 Select·최근접 분 칸 맞춤(동률 올림)과 알림, 날짜·빠른 선택의 시각 보존, Field 오류 연결·다크·독립 사용 예시·MCP 검색·작성 전용 하네스를 포함한다. 브라우저 지역 시간이며 서버 변환은 앱이 맡는다. range+시각은 타입으로 금지하고 버전은 유지한다.

- 파일 업로드(R37): 제어형 FileUpload·FileUploadItem, 선택/드롭 공통 형식·크기·개수 검증, 파일별 상태·진행률·오류, Thumbnail 미리보기와 단일 대표 이미지 바꾸기·삭제를 추가했다. Field 오류 자리·ARIA·polite 알림·삭제 포커스와 object URL 정리를 제공한다. 전송·재시도·취소는 앱이 맡는다. 독립 사용 예시·매니페스트 문서·MCP 검색·작성 전용 하네스를 포함하며 버전은 유지한다.

- 옆 패널(R36): SheetContent·SheetBody를 Dialog 부품과 조립한다. 좌우 배치·3가지 폭·본문 독립 스크롤·공유 닫기 보호와 모션, AppShell 선택형 narrowNavigation="drawer", 사용 예시·MCP 갈림길·작성 전용 하네스를 추가했다. 기본 레일과 버전은 유지한다.

- 페이지네이션(R35): 제어형 Pagination의 범위·전체 건수·페이지 크기·번호 접기·이전/다음, polite 알림과 포커스 보존, 실제 폭 640px 미만의 간략 표시. DataTable 서버 페이징·800ms 지연·로딩 중 선택 유지와 새 응답 후 선택 해제 예시, 매니페스트 기반 문서·MCP·작성 전용 브라우저 하네스를 추가했다. URL 동기화는 앱이 맡으며 버전은 유지한다.

- 앱 셸(R34): AppShell의 건너뛰기 링크·선택 상단 슬롯·독립 본문 스크롤, SideNav의 240px/64px 메뉴·자동 레일·그룹·배지·준비 중·링크 합성, PageHeader의 제목·경로·상태·반응형 액션. 접힘 저장은 앱이 맡는다. 사용 문서·MCP·라이트/다크 목록 조립 스토리와 작성 전용 브라우저 하네스를 추가했다. 버전은 유지한다.
- Input `leadingIcon` 장식 슬롯. `type="search"`는 돋보기를 기본 제공하며 `leadingIcon={null}`로 끈다. 지우기·비밀번호 보기와 함께 쓸 수 있다.
- 공개 유틸리티 `.sr-only`·`.tabular`를 두 CSS 경로에 직접 정의하고 README·시작하기에 용도를 안내한다. `.truncate`는 공개하지 않는다.

- ui 토큰 하위 경로 `@s2life/ui/tokens.css`·`theme.css`·`tokens.json`. tokens 패키지 원본을 빌드 시 바이트 그대로 복사한다.
- Carousel 루트 스타일을 확장하는 `className`.
- 중립 상태 색 토큰 `--status-neutral-fg`·`--status-neutral-bg` (라이트·다크·OS 테마). 차트의 "대기·기타" 계열과
  StatusChip neutral 이 쓴다 — 칩의 색 값은 그대로다. 계열 색으로 쓸 수 있는 변수가 다섯 개가 됐다.

### 바뀐 동작

- 표 선택 행 전용 토큰 `--bg-selected-row`(Tailwind `bg-selected-row`, 2026-11-22 디자인 검토): DataTable 선택 행과 달력 범위가 쓴다. 다크는 brand-900 와인색(`#6A1021`)에서 채도를 절반으로 내린 `#552D32`(OKLCH 35% 0.06 H12)로 바뀐다 — 선택 행이 '취소 요청' danger 칩과 같은 계열로 읽히던 문제다. 호버 행과 대비 1.35·ΔE 10.7, 선택 행 위 danger 칩 바탕과 대비 1.39·ΔE 10.2, 본문 10.76·링크 7.05. 라이트는 brand-100 그대로다. SideNav 현재 메뉴·FileUpload 드래그 면은 `--bg-selected`를 유지한다. 생성기에 대비 8건·ΔE 2건 회귀 검사를 더했다. 앱이 `--bg-selected`로 표 선택 행을 직접 칠하고 있었다면 `--bg-selected-row`로 바꾼다.

- **포커스 링 색이 크림슨에서 진한 회색(라이트 `#262222`)/밝은 회색(다크 `#F7F6F5`)으로 바뀌었다**(R01 일부 변경, 오너 결정 2026-11-22). `--border-focus` 가 brand-600/brand-400 대신 neutral-950/neutral-50(본문색과 같은 값)을 가리킨다. 크림슨 링이 브랜드 채움·오류 빨강과 겹쳐 읽혔기 때문이다(다크 포커스 `#FF8394` vs 오류 `#FF896E` ΔE76 22.6 → 새 값 60.6). 두께 2px·offset 2px·안쪽 링 예외(Tabs·팝오버 안 Combobox 검색 입력)는 그대로다. `--border-focus` 를 쓰는 전역 `:focus-visible`·shadcn `ring`(Select·Calendar)·DataTable 행·SegmentedControl·Steps·StatTile·Combobox 포커스가 함께 바뀐다. Tour·Hint 대상 링(`--hint-ring`)·선택 바탕(`--bg-selected`)·FileUpload 드래그 중 드롭존 테두리는 크림슨 그대로다(드롭존은 포커스 토큰 대신 브랜드 윤곽 `--action-primary-border` 를 쓴다). 앱은 포커스 상태를 담은 시각 회귀 기준선을 갱신해야 하며, `--border-focus` 를 덮어쓰지 않았다면 코드 수정은 필요 없다. 생성기에 포커스 링 vs 오류 글자 ΔE 검사(양 테마)를 추가했다.

- MCP 예산(R42): 한 번에 전송되지 않는 전체 매니페스트 160KB 상한을 실제 응답인 design://tokens 80KB·get_rules 전체 8KB로 바꿨다. 카탈로그 90KB·목록 24KB·상세 6KB는 유지하며 경계값·UTF-8 초과 테스트를 추가했다.

- CSS 이름 공간(R39): loading·data-table·state·thumbnail·avatar의 내부 클래스 이름 37개를 `ds-<기존 이름>`으로 바꾸고 MediaViewer의 재사용 선택자도 맞췄다. 앱 CSS가 옛 이름을 덮어쓰고 있었다면 해당 선택자를 `ds-` 이름으로 바꿔야 한다. `data-slot`·공개 API·계산 스타일은 유지한다. `styles.css`의 앱 전체 preflight·유틸리티 계약과 앱 클래스 이름 규칙을 README·시작하기·MCP 원칙에 명시했다.

- 기본 글꼴을 Pretendard Variable로 바꿨다. 차트 숫자·진행률 퍼센트와 숫자 정렬 스토리는 본문 글꼴의 `tabular-nums`를 쓰며, `--font-mono`는 코드 표시용 시스템 고정폭이다.
  이전 IBM Plex 는 Storybook 에서만 로드되고 소비 앱에는 오지 않았다(도그푸딩 3 G7: 로드된 웹폰트 0개).
  글꼴 파일은 패키지에 넣지 않는다 — 앱이 `pretendard` 를 불러오지 않으면 시스템 글꼴로 그려진다.
- 금액 칸 최소 폭 `--cell-min-w-money` 128px → **140px**. `₩1,248,500,000` 을 Pretendard tabular 14px 로
  잰 폭 111.73px + 좌우 여백 28px (브라우저 실측). IBM Plex Mono 기준값으로는 12px 모자랐다.
- **DataTable: `data` 에서 빠진 행은 선택에서 자동 해제된다.** 필터를 바꿔도 화면에 없는 행이 선택된 채 남아
  일괄 작업 대상이 되던 문제(도그푸딩 3: 앱 1,250건 / 툴바 0개). 제어형이면 `onSelectedIdsChange(교집합)` 를
  한 번 부른다. `state` 가 `loading`·`error` 일 때는 유지한다. 행을 덧붙이는 무한 스크롤에는 영향이 없다.

### 고침

- DataTable 내장 툴바의 선택 상태를 `N개 선택`에서 `N건 선택`으로 바꿨다(천 단위 쉼표 포함). Pagination(`1–20 / 1,284건`)·부분 로드 안내·전체 선택 라벨과 단위가 갈렸다. 선택 상태 줄을 찾던 스토리·하네스 단정도 함께 고쳤다. MultiSelect의 `N개 선택`(고른 값의 개수)은 그대로다.

- StatTile 축약 값: 앞수가 네 자리일 때 천 단위 쉼표가 빠져 38,420,000원이 `3842만원`으로 나왔다. compact 서식의 기본 useGrouping(`min2`)을 `true`(always)로 바꿔 `3,842만원`으로 표시한다. 같은 줄의 `1,284건`과 표기가 맞는다. `format`으로 덮을 수 있고 원문(`full`)은 그대로다.

- Input 검색·비밀번호·앞 아이콘: className의 폭·배치 클래스(w-·min-w-·max-w-·flex-1·basis·grow·shrink·order·self·col-/row-·m*)를 바깥 래퍼 `.ds-input-control`에 붙인다. 안쪽 input에만 붙어 `className="w-80"`을 줘도 래퍼(width:100%)가 툴바 한 줄을 차지했다. 글자·테두리·안쪽 여백은 input에 남고, 래퍼 없는 입력은 그대로다. 분리 규칙 단위 테스트와 툴바 한 줄 하네스 검사를 추가했다.

- DropdownMenuItem `destructive`: 글자·삭제 아이콘 색을 채움용 `text-destructive`(danger-700 `#B42800`)에서 테마별 글자 토큰 `text-danger-ink`(`--status-danger-fg`)로 바꿨다. 다크 팝오버에서 2.73:1로 본문 하한 4.5:1에 못 미쳤다. 이제 라이트 6.47:1·하이라이트 5.51:1, 다크 7.63:1·하이라이트 6.79:1이다. 토큰 생성기에 메뉴 파괴적 항목 대비 4건, 레이어 하네스에 계산 색 대비 검사를 추가했다. 라이트 글자색은 같은 값이다.

- 도그푸딩 5 보정(R38): PageHeader의 바깥 여백을 페이지의 gap 24px로 옮기고 기존 예시 간격을 보존했다. AppShell 내장 여백·필터 Select 폭 규칙을 안내한다. DataTable은 선택 기능 없이 선택 상태를 표시하지 않으며 부분 로드 내보내기를 짧은 버튼과 범위 안내로 나눈다. 추천은 떨어진 낱말과 검색 입력을 찾으며 전체 기존 질의의 1순위를 대조한다. 버전·공개 API·Select 기본 폭·카탈로그 상한은 유지한다.

- Dialog·SheetContent `dismissible=false`: 확인 AlertDialog 를 형제로 두면 Escape·닫기 버튼 한 번에 `onDismissAttempt` 가 두 번 불렸다.
  확인창으로 포커스가 나가는 것은 시도로 세지 않는다. 막을 눌러도 포커스가 BODY 로 빠지지 않는다.
- AlertDialog: 트리거 없이 상태로 연 확인창이 닫히면 열리기 직전 포커스 요소로 돌아간다(이전: BODY). 트리거·앱의 `onCloseAutoFocus` 가 우선한다.
- R35 선행 보정(별도 변경): 페이지네이션 안의 페이지 크기 Select만 38px → 32px로 맞추고 번호 버튼과 높이가 같은지 하네스 단정을 추가했다. Select 공개 API는 유지한다.

- 도그푸딩 4 V1–V3(R33): 입력 바탕 위에 앞쪽 아이콘을 그리고, 헤더 없는 CardBody의 위 여백을 16px로 맞춘다.
- Select 계열 4종의 표면·경계·38px 높이·빈 상태 시작선과 꺾쇠(16px·text-tertiary·불투명도 1·오른쪽 13px)를 통일한다. 다중 Combobox 태그 영역의 밀도는 유지한다.
- MCP Input·Card 소비자 규칙과 스토리를 갱신했다. 검색·카드·선택 트리거·공개 유틸리티 계산 스타일 하네스는 작성만 하며 브라우저 실행은 사용자 검증에 맡긴다.

- 레이어 디테일(R32): Dialog·AlertDialog·MediaViewer popup의 막을 테마별 검정 의미 토큰으로 분리해 다크에서도 뒤 화면을 어둡게 한다.
- 닫기 버튼이 없는 Dialog·AlertDialog 제목과 설명이 상자 안쪽 폭을 모두 쓴다.
- Combobox 단일/다중·MultiSelect의 활성 후보를 Select와 같은 배경·outline 없음으로 맞추고, 팝오버 안 검색 입력의 2px 포커스 링을 안쪽에 그린다.
- 아이콘이 섞인 메뉴의 글자 시작을 자동 정렬하고, Select·DropdownMenu(하위 메뉴 포함)·DatePicker/Popover·Combobox·MultiSelect의 기본 충돌 여백을 기존 8px 토큰으로 통일한다.
- 선택 배경 `--bg-selected` 를 라이트 brand-50 → **brand-100**, 다크 brand-975 → **brand-900**. 이전 값은 표면 대비
  1.08 · 1.02 로 표의 선택된 행과 달력 범위가 거의 보이지 않았다(다크에서 사실상 구별 불가). 이제 1.18 · 1.44,
  본문 글자 대비 13.29 · 11.38. 달력 범위 중간도 이 토큰을 써서 호버와 구별된다.
- 양 테마에서 실제 포인터로 여는 레이어 디테일 하네스를 전체 QA에 등록했다. 이번 실행 환경의 브라우저 기동 제한으로 실측은 미완료다.

- ClampText가 `white-space: nowrap` 조상(예: DataTable 셀) 안에서 긴 글을 더보기 없이
  자르던 문제. 글이 가로로만 길어져 세로 넘침 측정이 "안 넘침"으로 판정했다
  (도그푸딩 2: 1210/576px, 더보기 0/16). 내용이 `text-wrap-mode: wrap` 과
  `overflow-wrap: anywhere` 를 소유한다. `white-space: normal` 이 아니라서
  `pre-line`·`pre` 로 보존한 사용자 개행은 그대로 남는다.
- DataTable 헤더 체크박스가 보이는 행 중 선택이 0개인데 "일부 선택"으로 보이던 문제. 현재 행 기준으로 센다.
- DatePicker 범위 입력이 고른 기간보다 좁아 잘리던 문제 (입력 198px < 값 216px · 플레이스홀더 238px → 264px).
- DatePicker 가 필터 툴바에서 다른 컨트롤보다 10px 위에 놓이던 문제. 자체 오류 줄을 예약하지 않는다 —
  Field 안에서는 Field 의 오류 자리를 함께 쓰고(이중 예약 해소), Field 밖에서는 입력 아래에 띄운다.
  오류 문구가 고치는 법을 말한다: "YYYY-MM-DD 형식으로 입력하세요." · "시작일 ~ 종료일 순서, YYYY-MM-DD로 입력하세요."

- Tabs 선택 밑줄이 기준선에서 5px 떠 있던 문제. 목록 아래 여백을 없애고 기준선을 안쪽 그림자로 그려 2px 밑줄이
  기준선 위에 앉는다. 탭의 키보드 포커스 링은 스크롤 영역에서 잘리지 않게 안쪽(`outline-offset` 음수)에 그린다.
- Field 안의 RadioGroup 에 접근 이름이 없던 문제. Field 레이블이 `<label htmlFor>` 로는 `div` 루트에 연결되지
  않았다 — 이제 레이블 id 를 `aria-labelledby` 로 넘긴다(소비자의 `aria-label`·`aria-labelledby` 가 우선).
  라디오 묶음 제목을 Field 로 주면 다른 레이블과 같은 모양이 된다.

### 바뀐 지침 (MCP)

- `purpose`·`useWhen`·`dont`·`rules`를 화면을 만드는 소비자의 말로 정리했다.
  구현 메모는 DESIGN.md에 보존하고, 규칙마다 한 생각과 출처를 둔다.
  빌드에서 구현 금지어·120자 초과·컴포넌트 사이 규칙 복제를 차단한다.
  MCP 상세 기준선 8개와 목록의 용도를 갱신하고 R26의 임시 dont 델타를 흡수했다.
- ClampText: "DataTable 셀에 쓰지 마라" — 셀이 말줄임과 전체 값 `title` 을 이미 제공한다.
- DataTable: "긴 글 열을 ClampText 로 감싸지 마라".
- DataTable: 빠진 행의 선택 자동 해제, 화면 라벨이 원본과 다른 열(상태 등)은 `exportValue` 로 CSV 값을 지정.
- 행 액션 트리거는 `Button variant="ghost" size="sm" iconOnly` + `Ellipsis` 아이콘 + 행을 밝히는 `aria-label`.
  문자 `⋯`·테두리 버튼을 쓰지 않는다. 열 제목은 화면에서 숨긴다.
- Input: 숫자 입력은 예상 자릿수에 맞춰 폭을 좁힌다 — 넓은 칸 오른쪽 끝의 숫자는 레이블과 멀어진다.
- RadioGroup: 묶음 제목은 Field 로 준다.
- CompositionArea: 계열 색은 `--status-{neutral,info,warning,success,danger}-fg`. 목록 밖 이름은 검게 그려진다.

### 문서

- DESIGN.md §6.1 선택·현재 표시 표를 네 갈래로 고쳤다: 현재 위치 = 브랜드(SideNav 틴트+600·Tabs 2px 밑줄+600), 선택된 데이터 = 선택 틴트(`--bg-selected-row`), 모드·값 = 중립 칩, 진행 = 브랜드 채움. 달력은 시작·끝·단일 = 브랜드 채움, 범위 중간 = 선택 틴트다. §11.9에서 'Field 옵션'·'추가 부품 후보 4' 언급을 지웠다.

- DESIGN.md에 2026-11-22 디자인 검토 문안을 넣었다: §6.1 선택·현재 표시 규칙 표, §6.2 상세 화면의 파괴적 액션(⋯ 더보기 안 삭제·확정 단계에서만 채운 danger), §11.9 폼 세로 리듬과 같은 줄 정렬(FormRow), §24.4 페이지 제목 34 단일, §25 문구(건/개·출시 예정·범위 오류·숫자 축약). 문안은 그대로 옮겼고 현 코드와 다른 곳은 고치지 않았다.

- 앱의 Pretendard 설치·CSS import와 Next.js App Router·Vite 진입점 안내를 추가했다. 글꼴 파일은 앱이 호스팅하며, 배포 리허설이 기본·Tailwind 경로에서 실제 로드를 검사한다.
- React 앱 설치 안내를 `npm install @s2life/ui pretendard`와 Pretendard·`@s2life/ui/styles.css` import 두 줄로 통일했다. 토큰 직접 접근도 ui 하위 경로를 사용하며, tokens는 ui가 같은 버전으로 고정해 가져온다.
  이전 "시작하기"가 안내하던 `import '@s2life/tokens/tokens.css'` 는 `styles.css` 와 중복이었고,
  pnpm 에서 ui 만 설치하면 해석에 실패해 빌드가 깨졌다. 배포 리허설은 이제 tokens 직접 의존 없이 ui·pretendard를 설치한 앱으로 검증한다.
- 모든 `Components/*` 에 문서 페이지: 사용 의도 → 사용법(코드 보기) → props 표 → 스토리.
  props 표는 Storybook docgen(26개 중 12개만 채워짐)이 아니라 MCP 매니페스트에서 그린다.
  공개 컴포넌트 101개 전부 포함. Dialog·Tabs·Breadcrumb 문서 스토리 신설.
- Carousel·MediaViewer·ClampText·MultiSelect·Combobox 다중·차트의 `사용법` 스토리 —
  보여주는 코드가 실제로 렌더되는 코드다.
- 차트 안내 페이지: 무엇을 언제 쓰는지, `summary` 가 화면 글자가 아니라 svg 접근성 이름으로
  간다는 것과 화면에도 보여주는 방법.
- 부품 카드에서 같은 페이지 부모의 규칙 반복 제거 (Dialog 15회 → 0).
- 문서 미리보기가 화면 높이를 채우지 않는다 (Combobox 문서 15,471 → 4,635px).
  테스트용 스크롤 여유 높이(`180vh`)도 스토리 화면에서만 준다 — MediaViewer 플로팅
  3개·Input 숫자휠가드가 문서에서 1,620px 빈 상자였다. 하네스가 창 높이를 900→600 으로
  바꿔도 미리보기 높이가 그대로인지 검사한다.
- Guide 문서의 Tour·Hint 는 iframe 에 격리해 본문을 덮지 않는다.

### 내부

- 테스트 장치 스토리를 `QA/`로 옮겼다: `Screens/ListScreen`·`Screens/DetailScreen`·`Screens/AppShell`·`Screens/CreateScreen`·`Screens/Flow` → `QA/ListScreen`·`QA/DetailScreen`·`QA/AppShell`·`QA/CreateScreen`·`QA/Flow`. 내용(폼 밖 사업장 선택 등 장치 포함)은 그대로이며 스토리 id를 쓰던 하네스(detail·design-detail·app-shell·list-screen·create)와 문서 참조를 함께 고쳤다. `Screens/`에는 디자인 검토를 거친 대표 화면만 둔다.

- MCP 예산(R37)을 실제 소비 경로 기준으로 재설정했다. 카탈로그 80,000→90,000바이트, 전체 160,000바이트 유지, 복원된 목록 24,000바이트·부모 의도를 합친 상세 한 건 6,000바이트를 생성 시 차단한다. 네 경계값/+1바이트 검사와 실제 stdio 응답 검증을 추가했다. 카탈로그 실측은 R36b 76,925→79,416바이트이며 지침은 줄이지 않았다.

- MCP 카탈로그의 중복 부품 소스·빈 API 배열·규칙 출처 접두어를 무손실 압축해 전송량을 70,643 → 66,507바이트로 줄였다(R33b). 도구 응답 110건(부품 102개 get_component 포함)이 이전과 바이트 단위로 같다. 공식 예산·버전은 유지한다.

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
