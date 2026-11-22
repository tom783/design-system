# 도그푸딩 5 · 바이브코딩 — 상품 관리 (P1 검증)

P1(검색 입력 R33 · 앱 셸 R34 · 페이지네이션 R35 · 옆 패널 R36 · 파일 업로드 R37)을 넣은 뒤, 도그푸딩 4 와 같은 방식으로
**저장소를 모르는 별도 AI 세션에 짧은 한국어 요청 한 번**만 주고 결과를 쟀다. 요청에는 **부품 이름을 쓰지 않았다** —
MCP 추천과 목록만으로 제 부품을 찾는지까지 본다. 만든 화면은 측정 후 버린다.

## 조건

- 빈 Next.js 16 앱 · `@s2life/ui` + `pretendard` + `@s2life/mcp` (main `956a0b6` 팩) · 디자인 시스템 CSS 를 미리 넣지 않음
- `claude -p`, MCP 는 s2life 하나(`--strict-mcp-config`). 절차는 메모리 `vibe-dogfood-procedure`
- 요청 원문:
  > 상품 관리 화면을 만들어줘.
  > - 왼쪽에 메뉴(대시보드·주문·상품·정산, 정산은 아직 준비 중), 화면 위에는 페이지 제목과 "상품 등록" 버튼
  > - 상품 목록: 상품명 검색, 카테고리 필터, 표(상품명·카테고리·가격·재고·상태). 전체 1,284개라 50개씩 페이지로 넘겨 봐야 해
  > - 목록에서 상품을 누르면 화면을 떠나지 않고 옆에서 바로 편집(상품명·가격·재고·상품 이미지 여러 장). 저장 안 하고 닫으려 하면 한 번 물어봐줘
  > - 상품 등록 화면: 상품명, 카테고리, 가격, 대표 이미지 1장, 상세 이미지 여러 장
  > 디자인은 설치해 둔 @s2life/ui 디자인 시스템으로 맞춰줘. 데이터는 가짜로 넣어도 돼.

## 실행 전 사전 점검 — `which_component` 의 약점

| 자연어 질의 | 1순위 | 기대 |
|---|---|---|
| "옆에서 열리는 편집 패널" | Dialog (SheetContent 는 후보에도 없음) | SheetContent |
| "상품 이미지 여러 장 업로드" | Thumbnail (FileUpload 2위) | FileUpload |
| "상품명 검색" | Combobox | Input `type="search"` |
| "왼쪽 메뉴" · "50개씩 페이지" · "페이지 제목과 버튼" | SideNav · Pagination · PageHeader | ✓ |

원인: 키워드를 질의 안의 **연속 구절**로만 맞춘다. "옆 패널" 사이에 말이 끼면("옆에서 열리는 … 패널") 놓친다.

## 결과 — 한 번의 요청으로

| | 도그푸딩 4 (P1 전) | 도그푸딩 5 |
|---|---|---|
| 소요 | 46턴 · 231초 | 65턴 · 335초 · 사람 개입 0 |
| MCP | list 1 · rules 1 · which 2 · get 10 | list 1 · rules 1 · which 1 · get 15 · tokens 2 |
| 결과물 | 약 680줄, 셸 CSS 약 80줄을 AI 가 직접 | 약 1,220줄, **앱 CSS 82줄은 페이지 배치·툴바·폼 배치뿐 — 셸 CSS 0** |
| 빌드·런타임 | 타입·`next build` 통과, 콘솔 오류 0 | 타입·`next build` 통과, 콘솔 오류 0 (라이트·다크·900px) |

`get_component` 15개: AppShell · SideNav · SideNavItem · PageHeader · DataTable · Pagination · **SheetContent** · **FileUpload** ·
Field · StatusChip · AlertDialog · Select · Input · FormFlow · Toaster. **추천 약점은 결과에 영향이 없었다** — AI 는 `list_components`
목록에서 P1 부품을 직접 골랐다(추천 질의는 1번, 등록 폼 전체 문장).

## 지침을 따른 것 (실측)

| | 결과 |
|---|---|
| 앱 셸 | AppShell + SideNav(현재 "상품" `aria-current`, "정산 · 준비 중" `aria-disabled`) + PageHeader(h1 하나·주요 버튼). 1024px 미만은 `narrowNavigation="drawer"` 로 "메뉴 열기" 서랍 |
| 검색 | `Input type="search"` — 돋보기 내장, 아이콘을 따로 겹치지 않음(도그푸딩 4 V1 해소) |
| 페이지네이션 | "1–50 / 1,284건" · 20/50/100개씩 · 크기 변경 시 1페이지 · 페이지를 URL 에 동기화(규칙대로 앱 몫) |
| 옆 패널 | 행 클릭 → `<Dialog><SheetContent>` 560px, Dialog 헤더·푸터 재사용, `SheetBody` 스크롤. 수정 후 Escape → 형제 AlertDialog 확인 → "계속 편집" 후 **포커스가 입력칸으로 복귀**(R36b 고침이 소비자 앱에서도 동작) |
| 파일 업로드 | 패널: 상품 이미지 여러 장(첫 장이 대표) · 등록: 대표 이미지 1장 + 상세 이미지 여러 장, 가짜 진행률 |
| 그 밖 | Pretendard 로드 · 표 숫자 오른쪽 정렬 · 이름 없는 버튼 0 · 가로 넘침 0 · Breadcrumb · FormFlow · EmptyState·오류·로딩 상태 |

## 고쳐야 할 것 — 4건, 모두 디자인 시스템 쪽 원인

| | 증상 (실측) | 원인 |
|---|---|---|
| S1 | 본문 첫 글자가 본문 가장자리에서 **56px** (AppShell 본문 24 + 앱 `.page` 32) | AppShell 이 본문 여백을 내장한다는 안내가 MCP 규칙에 없다. AI 가 페이지 여백을 다시 줬다 |
| S2 | 페이지 머리와 툴바 사이 약 **60px** | PageHeader 가 바깥 아래 여백 24px 를 내장한다. 앱의 `gap: 24px` 와 겹친다 — 부품이 바깥 여백을 가지면 소비자 배치와 충돌한다 |
| S3 | 카테고리 Select 가 검색칸 옆이 아니라 **다음 줄 전체 폭** | SelectTrigger 기본이 칸 채우기(`w-full`). AI 는 `min-width` 만 줬다. 필터 줄에서는 폭을 정해야 한다는 안내가 없다 |
| S4 | 선택 기능이 없는 표 위에 **"0개 선택"**, 내보내기 버튼 라벨이 문장 **"로드된 50건만 내보냅니다"** | DataTable 은 `exportFileName` 만 줘도 선택 상태 줄을 그린다. 부분 로드 라벨이 버튼이 아니라 안내문 형태다 |

그리고 사전 점검의 `which_component` 약점(연속 구절만 매칭) — 이번 결과에는 영향이 없었지만 P2 로 부품이 늘면 목록 훑기가 어려워진다.
