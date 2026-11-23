# 도그푸딩 6 · 바이브코딩 — 물류 출고 관리 (목표 57 3단계)

1차 목표의 완료 조건을 확인했다. **AI 가 사람 손 없이 디자인 시스템만으로 한 제품의 기본 화면 네 가지(목록·상세·등록·대시보드)를 만들 수 있는가.**
도그푸딩 5 와 같은 방식으로 했다. 저장소를 모르는 별도 AI 세션에 짧은 한국어 요청을 **한 번** 주고, npm tarball 로 설치한 패키지만 쓰게 한 뒤 결과를 쟀다.
요청에는 **부품 이름을 쓰지 않았다** — 업무 말만으로 MCP 목록·추천에서 제 부품을 찾는지까지 본다. 목표 57 2단계에서 넣은 폼 하단 고정 줄(FormActionBar)·
표 합계 행(DataTable `summary`)과, 그 전에 있던 필터 바·일괄 작업 바·설명 목록·입력 단위 접미사를 AI 가 **스스로 골라 쓰는지**가 이번 판정의 핵심이다.

**판정: 통과** — 사람 수정 0 · `next build` 통과 · 콘솔 오류 0 · 가로 스크롤 0 · 여섯 부품 모두 AI 가 스스로 골라 씀.
axe 위반 1건(등록 화면 거래처 Combobox 트리거의 `aria-required`)은 목표 57 2b 에서 이미 기록된 디자인 시스템 쪽 기존 문제다.

## 조건

- 패키지: 이 브랜치 `0ac786c` 에서 `pnpm --filter @s2life/tokens build && … ui build` → `pnpm … pack` (2026-11-24 08:29:49 +0900).
  `@s2life/ui`·`@s2life/tokens`·`@s2life/mcp` 0.4.0 tarball. 설치된 `ui/dist` 전체와 `mcp/manifest.json` 이 저장소 빌드 산출물과 바이트 단위로 같다는 것을 확인했다.
- 앱: 저장소 밖 빈 Next.js 16.4.6 앱(App Router) · react 19.3.1 · pretendard 1.3.9. **디자인 시스템 CSS·부품을 미리 넣지 않았다**(시작 상태는 `layout.tsx`·`page.tsx` 최소본).
  앱 폴더의 상위 경로에 `CLAUDE.md` 가 없는 곳을 골랐다 — 봇 작업 폴더 아래에는 봇 지침 `CLAUDE.md` 가 있어 AI 세션에 섞인다.
- 실행: `claude -p`(Claude Code 2.1.330, 모델 claude-opus-5-5) `--mcp-config mcp.json --strict-mcp-config --disable-slash-commands`,
  허용 도구 Read·Write·Edit·Glob·Grep·`mcp__s2life`·`pnpm build`·`npx tsc`, `--permission-mode acceptEdits`. Orca 환경 변수는 빼고 실행했다.
  시작 이벤트 기준 MCP 는 `s2life` 하나만 연결됐고 스킬은 0개였다.
- 도그푸딩 5 와 다른 점: 사용자 스킬 설명이 섞이지 않게 `--disable-slash-commands` 를 더했고, Orca 환경 변수를 뺐다.
- Claude Code 는 읽기 전용 셸 명령(`ls`·`cat`·`grep`)을 따로 허용하지 않아도 실행한다. AI 는 이것으로 **설치된 패키지 안**
  (`node_modules/@s2life/ui/dist` 의 `.d.ts`·`tokens.css`, `@s2life/mcp/manifest.json`)을 읽었다. npm 으로 받아 쓰는 개발자도 볼 수 있는 범위다.
  허용 목록 밖 명령은 거부됐다 — 서버 실행 `pnpm start` 2건, 변수를 쓴 셸 1건, `cd` 뒤 `git status` 1건(거부 4건).
- 요청 원문:
  > 물류 출고 관리 화면을 만들어줘. 화면은 네 개야.
  > - 공통: 왼쪽 메뉴(대시보드·출고 관리)로 화면을 오가고, 각 화면 위에 페이지 제목. 휴대폰(폭 390px)에서도 가로로 넘치지 않게, 시스템 다크 모드에서도 어색하지 않게.
  > 1. 출고 목록(/shipments): 표(출고번호·출고 예정일·창고·거래처·품목 수·총수량·상태). 상태·기간·창고로 걸러 볼 수 있어야 해. 여러 건을 체크해서 한꺼번에 "출고 확정"·"출고 취소"를 할 수 있고, 전체 432건이라 페이지로 넘겨 봐야 해. 출고번호를 누르면 상세로 가고, 화면 위에 "출고 등록" 버튼.
  > 2. 출고 상세(/shipments/[id]): 출고 한 건. 기본 정보(출고번호·상태·창고·거래처·출고 예정일·담당자·배송지)를 보여주고, 품목 표(품목명·SKU·수량·단가·금액) 맨 아래에 수량·금액 합계. 그 아래 상품 금액·배송비·할인·결제 금액 내역.
  > 3. 출고 등록(/shipments/new): 창고, 거래처, 출고 예정일, 품목(품목명·수량·중량)을 줄 단위로 추가·삭제, 메모. 수량 칸에는 "개", 중량 칸에는 "kg" 단위가 붙어 보여야 해. 폼이 길어도 저장·취소 버튼은 화면 아래에 늘 보이게.
  > 4. 대시보드(/): 오늘 출고 건수·지연 건수·완료율 같은 핵심 지표, 기간 선택(오늘·이번 주·이번 달), 최근 출고 표.
  >
  > 디자인은 설치해 둔 @s2life/ui 디자인 시스템으로 맞춰줘. 데이터는 가짜로 넣어도 돼. 다 만들면 pnpm build 로 빌드가 통과하는지 확인해줘.

## 실행 전 사전 점검 — `which_component` (한국어·영어)

설치된 `@s2life/mcp` 서버에 같은 뜻의 한국어·영어 질의를 보내 5위까지 받았다(`limit: 5`). "놓침"은 기대 부품이 5위 안에 없다는 뜻이다.

| 기대 부품 | 한국어 질의 | 순위 (1~3위) | 영어 질의 | 순위 (1~3위) |
|---|---|---|---|---|
| FilterBar | 출고 목록을 상태·기간·창고로 필터링 | **놓침** (DatePicker·Select·StatusChip) | filter the shipment list by status, date range and warehouse | **후보 0** |
| FilterBar | 목록 위에서 상태·기간·창고로 걸러 보기 | **놓침** (ListSkeleton·StatusChip·DataTable) | narrow down the list by status, period and warehouse | **후보 0** |
| BulkActionBar | 여러 건을 골라 한꺼번에 출고 확정·취소 | **놓침** (Hint·Combobox·MultiSelect) | select several rows and confirm or cancel them in bulk | **놓침** (Select) |
| Pagination | 432건 목록을 페이지로 넘겨 보기 | 3 | page through a list of 432 shipments | **후보 0** |
| DescriptionList | 출고 기본 정보를 항목과 값으로 보여주기 | **놓침** (Card·Pagination) | show shipment basic info as label and value pairs | **놓침** (Label) |
| DataTable `summary` | 품목 표 맨 아래에 수량·금액 합계 | 2 (1위 Input) | line items table with total quantity and amount at the bottom | **후보 0** |
| DescriptionList | 배송비·할인·결제 금액 내역 | 1 | shipping fee, discount and payment amount breakdown | **후보 0** |
| Input `unit` | 수량·중량 입력칸에 단위(개·kg) 붙이기 | 1 | number input with a unit suffix like kg | 1 |
| FormActionBar | 폼이 길어도 저장·취소 버튼을 화면 아래에 늘 붙어 있게 | 1 | keep save and cancel buttons stuck to the bottom of a long form | **놓침** (Button) |
| DatePicker | 출고 예정일 선택 | **놓침** (Checkbox·BulkActionBar·RadioGroup) | pick a planned shipping date | **후보 0** |
| SegmentedControl·DatePicker | 대시보드 기간 선택(오늘·이번 주·이번 달) | 2 (1위 Checkbox) | period selector: today, this week, this month | **놓침** (Select) |
| StatTile | 오늘 출고 건수·지연 건수·완료율 같은 핵심 지표 | 1 | KPI cards for today shipments, delays and completion rate | 2 (1위 Card) |
| (반복 입력 줄) | 등록 폼에서 품목 줄 추가(품목·수량·중량) | **놓침** (Input·FormActionBar·DataTable) | add repeated line item rows in a form | **후보 0** |
| SideNav·AppShell | 왼쪽 메뉴로 화면 오가기 | 1 | left sidebar navigation between pages | **후보 0** |
| PageHeader | 페이지 제목과 출고 등록 버튼 | 1 | page title with a primary create button | **놓침** (Button) |
| StatusChip | 출고 상태 표시(대기·확정·지연·완료·취소) | 1 | show shipment status badge | **후보 0** |

- 한국어 16개: 1위 8 · 3위 안 11 · **놓침 5**. 영어 16개: 1위 1 · 3위 안 2 · **후보 0개 9**.
- 짧은 낱말로 다시 물었다. "일괄 작업"→BulkActionBar(84점) · "선택한 행 작업"→BulkActionBar · "합계 행"→DataTable(89) ·
  "하단 고정"→FormActionBar(82) · "sticky footer"→FormActionBar · "date picker"→DatePicker 는 잡는다.
  **못 잡는 것:** "필터"(DatePicker·EmptyState 5점, FilterBar 없음) · "목록 필터"(ListSkeleton 1위) · "상태 필터"(Select 1위) · "예정일"(후보 0) ·
  "기본 정보"·"상세 정보"(DescriptionList 2·3위, 5·7점) · "filter"·"bulk"·"totals"(후보 0).
- "선택"이 든 질의("날짜 선택"·"기간 선택"·"출고 예정일 선택")는 모두 Checkbox 가 27점으로 1위였다.

## 결과 — 한 번의 요청으로

| | 도그푸딩 5 (상품 관리) | 도그푸딩 6 (출고 관리) |
|---|---|---|
| 소요 | 65턴 · 335초 | **67턴 · 343초**(08:32:13 → 08:38:01) · 사람 개입 0 · 비용 $2.15 · 출력 37k 토큰 |
| MCP | list 1 · rules 1 · which 1 · get 15 · tokens 2 | **list 1 · rules 1 · which 0 · get 20 · tokens 0** |
| 그 밖 도구 | — | Bash 25(앱 폴더·설치된 패키지 읽기 19 · `pnpm build` 2 · 거부 4) · Write 14 · Edit 4 · ToolSearch 1 |
| 결과물 | 약 1,220줄, 앱 CSS 82줄 | **14파일 1,362줄**(가짜 데이터 188줄 포함), 앱 CSS 126줄 — 페이지 배치·섹션 머리·품목 줄 상자 |
| 빌드·런타임 | 타입·`next build` 통과, 콘솔 오류 0 | 타입·`next build` 통과(AI 실행 중 2회, 내가 `.next` 지우고 1회), 콘솔 오류 0 |

`get_component` 20개: AppShell · SideNav · PageHeader · DataTable · **FilterBar** · **BulkActionBar** · Pagination · StatusChip ·
**DescriptionList** · **FormActionBar** · Field · **Input** · StatTile · DatePicker · SegmentedControl · FormRow · Combobox · Card · Button · MultiSelect.

**부품 추천(`which_component`)에서 고른 것은 없다 — 0회 호출.** AI 는 `list_components` 전체 목록(응답 20.7KB · 약 1만 7천 자)을 한 번 읽고 이름·용도로 20개를 골라
`get_component` 로 연달아 조회했다. 사전 점검의 추천 약점(위 표)은 이번 결과에 영향이 없었다. 도그푸딩 5 와 같은 양상이다.

앱에 쓰인 `@s2life/ui` 이름(정적 분석): AppShell·SideNav·SideNavGroup·SideNavItem·Toaster/toast · PageHeader·Breadcrumb 6종 ·
DataTable·createDataTableColumnHelper·Pagination·StatusChip · FilterBar·BulkActionBar·Select 5종·DatePicker(range·single)·MultiSelect ·
AlertDialog 8종 · Card 4종·DescriptionList · Field·FormRow·Input·Combobox·Textarea·FormActionBar · StatTile·SegmentedControl · Button ·
아이콘 6개(`@s2life/ui/icons`).

## 판정 기준

| 기준 | 결과 | 근거 (실측) |
|---|---|---|
| 사람 수정 0 | ✓ | 앱 git: `9a8ddb4` 시작 상태 → `ab2ac88` AI 결과(실행 직후 그대로 커밋). 그 뒤 변경 없음. `tsconfig.json` 변경은 AI 실행 중 `next build` 가 자동으로 고친 것이다 |
| `next build` 통과 | ✓ | Next 16.4.6 Turbopack, TypeScript 통과, 라우트 `/`·`/shipments`·`/shipments/[id]`·`/shipments/new` |
| 콘솔 오류 0 | ✓ | 4화면 × 1440·390 × 라이트·다크 16회 + 상호작용(두 건 선택·필터 패널 열기·품목 줄 4개 추가) 모두 0 |
| 가로 스크롤 0 | ✓ | 16회 모두 문서 `scrollWidth = clientWidth`. 390 에서 넓은 표는 표 안에서만 스크롤(`data-table-scroll` 356/870 등) |
| 폼 하단 고정 줄 | ✓ **FormActionBar** | 등록: `position: sticky`, 뷰포트 바닥과 간격 0(1440·390). 품목 줄을 5개로 늘려도 바닥에 붙어 있고 "저장하지 않은 변경 있음"을 띄움 |
| 표 합계 행 | ✓ **DataTable `summary`** | 상세 품목 표 `tfoot` "합계 · 327 · 6,036,000원". 390 에서는 금액 열을 `pinnedEnd` 로 고정 |
| 필터 바 | ✓ **FilterBar** | 목록: 검색 + "필터" 패널(상태 Select · 기간 DatePicker range · 창고 MultiSelect) + 적용 칩 |
| 일괄 작업 바 | ✓ **BulkActionBar** | 두 건 체크 → 필터 바 자리에 "2건 선택 · 선택 해제 · 출고 확정 · 출고 취소". 취소는 AlertDialog 확인을 거침 |
| 설명 목록 | ✓ **DescriptionList** ×2 | 상세 "기본 정보"(2열, 390 에서 1열) · "결제 내역"(`align="end"`, 마지막 쌍 `emphasis`) |
| 입력 단위 접미사 | ✓ **Input `unit`** | 수량 "개" · 중량 "kg" (`numeric`) |

## CDP 측정 (`next start` 프로덕션 빌드)

서버 PID 의 cwd 가 생성 앱 폴더인 것을 확인한 뒤 쟀다. 헤드리스 셸, 배율 1, 캐시 끔. 클라이언트 JS 는 페이지가 받은 `.js` 리소스의 합이다(`decodedBodySize` / `encodedBodySize`).

| 화면 | 클라이언트 JS 1440 (전송) | 390 (전송) | axe (wcag2a·2aa·21a·21aa·22aa) | 콘솔 오류 | 가로 넘침 |
|---|---|---|---|---|---|
| 대시보드 `/` | 925.8kB (281.8kB) · 12개 | 925.8kB (281.8kB) · 12개 | 0 | 0 | 0 |
| 목록 `/shipments` | 994.1kB (304.1kB) · 14개 | 980.6kB (298.3kB) · 13개 | 0 | 0 | 0 |
| 상세 `/shipments/SH-261201-00412` | 936.5kB (286.3kB) · 13개 | 923.0kB (280.4kB) · 12개 | 0 | 0 | 0 |
| 등록 `/shipments/new` | 994.1kB (304.1kB) · 14개 | 980.6kB (298.3kB) · 13개 | **1** | 0 | 0 |

- 라이트·다크 값이 같다. 폭에 따른 파일 1개 차이는 화면에 보이는 링크를 Next 가 미리 가져오기 때문으로 보인다(확인하지 않았다).
  Next 런타임만으로 약 570kB 다(`docs/qa/bundle-size.md`).
- axe 1건: `aria-allowed-attr`(critical) — 거래처 **Combobox 트리거**(`button`, role 없음)에 Field 가 넣은 `aria-required="true"`.
  창고 Select 트리거는 `role="combobox"` 라 같은 속성이 허용된다. 목표 57 2b QA 에서 기록된 기존 문제다(미수정).
- 네 화면 모두 Pretendard Variable 로드, `h1` 하나, 이름 없는 버튼 0, 사이드 메뉴 `aria-current`. 390 에서는 메뉴가 "메뉴 열기" 서랍으로 바뀐다.

## 부품 대신 직접 만든 곳

**sticky div 0 · 표 밖 `dl` 0 · 날 `table`·`tfoot` 0 · 인라인 `style` 0 · 원시 색(hex·rgb) 0.** 앱 CSS 126줄은 모두 `var(--…)` 토큰이다.
px 는 3곳(격자 최소 200px · 필터 패널 폭 320px · 밑줄 간격 2px)뿐이다. 부품을 두고 같은 것을 다시 만든 곳은 없다. 직접 만든 곳은 아래와 같다.

| 곳 | AI 가 직접 만든 것 | 부품·지침 | 분류 |
|---|---|---|---|
| 등록 · 품목 줄 | `ul.item-list > li.item-row` 테두리 상자 + "품목 N" 제목 + 삭제 버튼. Card 안에 테두리 상자가 겹친다 | 반복 입력 줄 부품 없음. 사전 점검 "품목 줄 추가" 후보에도 없음 | **부품 공백** |
| 등록 · 품목 0개 오류 | `p.section-note role="alert"` — 회색 보조 글자. Field 오류 모양(위험 색·아이콘)이 아니다. `aria-invalid` 를 "품목 추가" 버튼에 달았다 | Field 밖 묶음(목록) 오류를 어떻게 보일지 부품·지침이 없음 | **부품 공백** |
| 섹션 머리 | `.section-head` + `h2.section-title`(`--text-title-sm`) — 대시보드 "오늘 핵심 지표"+기간 선택, "최근 출고"+전체 보기, 상세 "품목 5개" | 카드 밖 섹션 제목 부품 없음(CardHeader 는 카드 안) | 부품 공백 · 토큰으로 맞춤 |
| 대시보드 KPI 격자 | `.stat-grid` (`auto-fit minmax(min(100%,200px),1fr)`) | StatTile 묶음 배치 안내 없음 | 앱 배치 |
| 목록 필터 패널 안 | `.filter-panel` 세로 쌓기, 폭 `min(320px, 100vw - 48px)` | FilterBar `filterContent` 안 배치는 앱 몫 | 앱 배치 |
| 표 안 출고번호 링크 | `.text-link` = `--text-link` + 밑줄 | 링크 부품 없음. 토큰 지침("밑줄과 함께 쓴다")대로 | 토큰 사용 · 정상 |
| SKU 열 | `.cell-sku` = `--font-mono` + 보조 색 | — | 앱 판단 |
| 페이지 배치 | `.page`·`.table-section`·`.form-page`·`.form-stack`(최대 48rem). AppShell 여백을 알고 padding 을 주지 않았다 | 앱 몫 | 정상 |
| `body` | 배경 `--bg-canvas`·글자 `--text-primary` | `styles.css` 가 이미 같은 값을 준다 | 중복(무해) |

## 디자인 시스템 쪽 발견 (고치지 않음 — 발견만)

| | 증상 (실측) | 비고 |
|---|---|---|
| D1 | 두 건 선택 시 **선택 수가 두 번** 보인다 — BulkActionBar "2건 선택" + DataTable 도구 줄 "2건 선택". 선택이 없을 때도 도구 줄에 "0건 선택 · 전체 432건 중 20건" | 스크린샷 `list-selected-*` · `list-1440-light-*` |
| D2 | Combobox 트리거의 `aria-required` → axe critical | 기존(목표 57 2b QA) |
| D3 | 목록 단위 오류(품목 0개)를 보일 자리가 없어 AI 가 회색 글자로 만들었다 | 위 "부품 공백" |
| D4 | 반복 입력 줄(품목·수량·중량 줄 추가·삭제) 부품·지침이 없어 Card 안 테두리 상자를 직접 만들었다 | 위 "부품 공백" |
| D5 | 규칙과 요청이 부딪혔다 — DescriptionList 규칙은 "표 아래면 상품 합계를 다시 쓰지 않는다"인데, 요청은 "상품 금액·배송비·할인·결제 금액 내역"이다. AI 는 요청대로 상품 금액을 넣고, 표와 떨어진 "결제 내역" 카드에 두었다(완료 보고에 이유를 적음) | 판단 기록 |

도그푸딩 5 의 S1·S2·S4 는 재발하지 않았다(1440, 세 화면 실측).
S1: 본문 첫 글자는 본문 가장자리에서 24px 이다(AppShell 본문 패딩 24 + 앱 패딩 0).
S2: 페이지 머리 바깥 아래 여백은 0, 머리와 다음 요소 사이는 24px 이다.
S4: 대시보드·상세의 선택 없는 표 위에는 내보내기 버튼만 있다.

## MCP·부품 추천이 놓친 것 (백로그 판단용)

1. **한국어 추천 놓침 5개** — FilterBar(“필터링”·“걸러 보기”·“필터”), BulkActionBar(“여러 건을 골라 한꺼번에”),
   DescriptionList(“항목과 값”·“기본 정보”), DatePicker(“출고 예정일 선택”·“예정일”), 반복 입력 줄(부품 없음).
2. **영어 질의는 거의 못 잡는다** — 16개 중 9개가 후보 0개, 1위는 `unit suffix` 하나. "filter"·"bulk"·"totals" 낱말도 후보 0.
3. **"선택"이 Checkbox 로 쏠린다** — "날짜 선택"·"기간 선택"·"출고 예정일 선택" 모두 Checkbox 1위(27점).
4. **`get_component` 에 사용 예가 없다** — AI 가 DataTable 열 정의(`createDataTableColumnHelper`)와 `summary` 모양을 찾으려고
   `@s2life/mcp/manifest.json` 을 셸로 `grep "example|h.columns"` 했고, `ui/dist` 의 `.d.ts` 를 읽었다.
   셸 읽기 19회의 내역: 부품 `.d.ts`·`.js` 확인 10 · MCP manifest 에서 사용 예 찾기 3 · `tokens.css` 4 · 앱 폴더·README 2.
5. **토큰 도구를 쓰지 않았다** — `search_tokens`·`get_token` 0회. AI 메모: "Tailwind 컴파일러가 앱에 없으니, 레이아웃용 앱 CSS를 토큰 변수로 직접 작성할 생각입니다."
   그 뒤 `tokens.css` 를 4번 grep 해 간격·글자 토큰 이름을 찾았다. `get_rules` 의 "font-size 는 `text-[length:var(--토큰)]`" 규칙은 Tailwind 가 있는 앱을 전제로 한다.
6. `which_component` 는 이번에도 결과를 좌우하지 않았다(0회). 부품이 늘면 20KB 넘는 목록 훑기에 기대는 방식이 버거워질 수 있다 — 도그푸딩 5 와 같은 결론.

## 사람이 손댄 곳

없다. 앱 저장소의 AI 결과 커밋 뒤 변경은 0이다. 내가 한 일은 측정(빌드·서버 실행·브라우저 측정)뿐이고, 앱 파일은 바꾸지 않았다.

## 재현·산출물

절차는 메모리 `vibe-dogfood-procedure`(팩 → 빈 앱 → `claude -p` → 측정)와 같다.

- 생성 앱(측정 대상): `/private/tmp/claude-501/-Users-hellground-orca-workspaces-design-system-vibe-logistics/613d29f2-1509-4423-98d8-e6996ae31dde/scratchpad/vibe-logistics`
  — 스크래치라 지워질 수 있어 보존본을 남겼다: `/Users/hellground/.orca/bots/bot-6/work/design-system/goal57-3/app-src/`
  (소스 + `vibe-logistics.bundle` = 시작 상태·AI 결과 두 커밋의 git bundle).
  구성: `app/app-frame.tsx`(AppShell·SideNav) · `app/dashboard.tsx` · `app/shipments/shipment-list.tsx` · `app/shipments/[id]/shipment-detail.tsx` ·
  `app/shipments/new/new-shipment-form.tsx` · `app/_components/*` · `app/app.css` · `lib/data.ts`(가짜 출고 432건, 오늘 2026-11-24 고정).
- tarball: `…/goal57-3/packs/` (sha1 ui `35cc5b5c` · tokens `39692d28` · mcp `e0acda8c`, `logs/packs.sha1`).
- 로그: `…/goal57-3/logs/` — `run.jsonl`(AI 세션 전체) · `prompt.txt` · `precheck.tsv`·`precheck-short.txt`(사전 점검) ·
  `measure.json`·`measure.log`(CDP·axe) · `next-build.log` · 측정 스크립트(`measure.mjs`·`precheck.mjs`·`static.mjs`·`mcp-agg.mjs`·`probe2.mjs`).
- 스크린샷 37장: `/Users/hellground/.orca/bots/bot-6/work/design-system/goal57-3/`
  - `{dashboard|list|detail|new}-{1440|390}-{light|dark}-0ac786c.png` — 전체 높이(AppShell 본문 스크롤까지 펼침), 배율 1
  - 같은 이름 `…-viewport.png` — 실제 뷰포트(1440×900 · 390×844)
  - `list-selected-{1440|390}-light-0ac786c-viewport.png`(두 건 선택 → 일괄 작업 줄) · `new-long-{1440|390}-light-…`(품목 5줄, 저장 줄 고정) ·
    `list-filter-open-1440-light-…`(필터 패널)
