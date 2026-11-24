# which_component 추천 순위 — 규칙과 대조 (R38 기준선)

`node docs/qa/compare-match-baseline.mjs` 가 이 문서를 다시 쓴다. 손으로 고치지 않는다.

## 지금 순위 규칙 (packages/mcp/match.mjs · 0.6.0 목표 64)

which_component 는 외부 모델 없이 키워드 점수로 후보 여러 개와 근거(`reasons`)를 돌려주고, 최종 판단은 호출자가 한다.
응답 형태(`{ candidates: [{ name, score, reasons, purpose, useWhen, dont }] }`, 기본 5개, 후보가 없으면 `isError`)는 그대로다.

**질의를 두 갈래로 본다.**
- **원문**: NFKC·소문자·공백 제거(구두점은 남긴다). 한국어 키워드는 이 안에 들어 있는지(조사 결합 흡수), 라틴 키워드는
  낱말 경계와 영어 줄기로 맞춘다 — `enter` 가 "center" 안에서 맞지 않는다.
- **번역**: 같은 순서로 낱말을 메타데이터 어휘로 바꾼 것. 영어 낱말·구절은 대응표(`ENGLISH_TERMS`, 약 320개)로 한국어가 되고
  (`filter`→필터, `stuck … bottom`→하단 고정, `kpi card`→KPI 지표), 한국어 활용형은 대표 어휘가 된다(`걸러`·`거르는`→필터,
  `한꺼번에`→일괄, `골라`→선택, `바로`→즉시). 대응표에 없는 영어 낱말은 버린다. 구두점 자리는 끊는다("선택·해제" 는 '선택 해제' 구절이 아니다).
- 영어 줄기: 복수형·진행형·과거형·끝 e 를 뗀다(`rows`→row, `saving`·`saved`·`save`→sav, `shipping`→ship).

**점수** — 원문과 번역 중 더 센 일치를 쓴다.

| 근거 | 점수 |
|---|---|
| 질의 전체가 부품 이름 | 2000 |
| 이름을 식별자로 씀: 적힌 그대로(`Button`·`DataTable`) 또는 두 낱말 이상 이름을 낱말 경계에서(`filter bar`·`date picker`) | 1000 |
| 질의 전체가 키워드(원문에서만) | 80 |
| 여러 낱말 키워드가 연속으로 | 40 |
| 한 낱말 키워드가 연속으로 | 20 × min(1, 4 ÷ 그 낱말이 키워드에 든 부품 수) |
| 여러 낱말 키워드의 낱말이 모두 있고 순서도 같음 / 순서가 다름(한국어 낱말은 활용형 줄기도 인정) | 24 / 8 |
| 한 글자 키워드 | 4 |
| 목적(purpose) · 쓰임새(useWhen) 문장에 질의 낱말(두 글자 이상·일반어 제외, 조사·어미 뗀 줄기 포함)이 있음 | 낱말마다 2 · 5 |

- **소문자 영어 낱말은 이름 일치가 아니다.** "page title with a primary create button" 의 button 은 낱말이다. 예전 규칙은 포함만으로
  +1000점을 줘 다른 후보가 이길 수 없었다(물류 영어 16개 중 7개가 Button·Select·Label·Card·Input 이름 일치를 받았고 6개가 그 때문에 1위를 놓쳤다). "selector" 는 Select 가 아니다.
- **같은 글자를 두 번 세지 않는다.** 한 부품 안에서 긴 연속 키워드('주문 상태')에 든 짧은 키워드('상태')는 더하지 않고,
  떨어진 낱말 일치는 이미 연속으로 맞은 낱말 키워드 점수를 뺀다(R38).
- **흔한 낱말 키워드는 덜 친다.** '선택'(키워드에 든 부품 8개)·'목록'(10개)이 '날짜'·'예정일'(1개)과 같은 20점을 받아 "출고 예정일 선택" 이
  Checkbox 로 갔다. 문장 토큰에도 같은 가중을 곱해 봤으나 정답 세트가 오르지 않고 아래 대조의 1순위만 더 흔들려 쓰지 않는다.
- 부품(`partOf`)은 고유 키워드나 이름이 맞을 때만 후보가 된다. 목적 한 토큰(2점)만 맞은 후보는 버린다(점수 > 2).
- 점수 가중치를 테스트 통과용으로 조작하지 않는다(DESIGN.md §13.4). 특정 질의를 하드코딩하지 않는다 — 대응표는 낱말 단위이고
  한국어 어휘는 component-intent.mjs 의 keywords·purpose·useWhen 에 실제로 있는 말이다.

## 정답 세트 수치 (`docs/qa/fixtures/which-component-golden.json`)

`node docs/qa/which-component-golden.mjs` 로 재현한다. 하한 top-1 161 · top-3 181 · 후보 0개 0 아래로
떨어지면 `which-component-golden.test.mjs`(pnpm test = verify·pre-commit·CI)가 실패한다. 정확도 분모는 정답이 있는 문항(부품 공백 2개 제외), 후보 0개 분모는 전체 질의다.
보류 세트(`which-component-holdout.json`)는 튜닝을 마친 뒤 따로 쓴 질의로, 과적합을 재기만 하고 게이트는 걸지 않는다.

| 묶음 | top-1 · top-3 · 후보 0개 |
|---|---|
| 전체 | 165/184 · 183/184 · 0/186 |
| 한국어 | 119/135 · 134/135 · 0/136 |
| 영어 | 46/49 · 49/49 · 0/50 |
| R49 기준 | 116/128 · 127/128 · 0/128 |
| 도그푸딩 6 물류 | 27/30 · 30/30 · 0/32 |
| 0.5.0 부품 | 22/26 · 26/26 · 0/26 |
| 보류 세트(튜닝에 안 씀) | 37/48 · 47/48 · 0/48 |

목표 64 이전(0.5.0 main) 같은 세트 수치는 전체 top-1 96/184 · top-3 129/184 · 후보 0개 28/186(영어 27/50)이었다.

### 1위가 아닌 문항

| 질의 | 정답 | 정답 순위 | 실제 상위 3 |
|---|---|---|---|
| 매장 카드 목록을 불러오는 동안 카드 모양 자리 표시 | CardSkeleton | 2 | Skeleton · CardSkeleton · Card |
| 필터 조건을 옆에서 나오는 패널에 모아두기 | SheetContent | 2 | FilterBar · SheetContent · Tabs |
| 태그를 검색해서 여러 개 붙이기 | Combobox | 2 | Input · Combobox · MultiSelect |
| 판매 채널 여러 개를 골라 거르는 필터 | MultiSelect | 2 | Select · MultiSelect · FilterBar |
| 창고 네 곳 중 여러 곳 선택 | MultiSelect | 3 | Checkbox · RadioGroup · MultiSelect |
| 수정 폼 데이터를 불러오는 동안 입력칸 모양 자리 표시 | FormSkeleton | 2 | Skeleton · FormSkeleton · Input |
| 입점 신청을 3단계로 나눠 현재 위치 표시 | Steps | 2 | Breadcrumb · Steps · Tour |
| multi-step form progress indicator | Steps | 2 | ProgressTrack · Steps · Tour |
| 공지 본문 문단이 로딩되는 동안 줄 모양 자리 표시 | SkeletonText | 2 | Skeleton · SkeletonText · FormActionBar |
| 대시보드 위젯 내용이 오기 전에 같은 모양의 회색 자리 | Skeleton | 4 | FormActionBar · DescriptionList · Peek |
| 목록이 로딩되는 동안 행 모양 자리 표시 | ListSkeleton | 2 | Skeleton · ListSkeleton · DataTable |
| 차트 영역이 로딩 중일 때 자리 표시 | ChartSkeleton | 2 | Skeleton · ChartSkeleton · ChartFrame |
| 출고 목록을 상태·기간·창고로 필터링 | FilterBar | 2 | DatePicker · FilterBar · Select |
| 목록 위에서 상태·기간·창고로 걸러 보기 | FilterBar | 2 | DatePicker · FilterBar · Select |
| 품목 표 맨 아래에 수량·금액 합계 | DataTable | 2 | Input · DataTable · BulletRow |
| 등록 폼에서 품목 줄 추가(품목·수량·중량) | (부품 없음) | 공백 | Input · FormActionBar · DataTable |
| add repeated line item rows in a form | (부품 없음) | 공백 | FilterBar · DataTable · FormSkeleton |
| bulk | BulkActionBar | 2 | TaskProgress · BulkActionBar · FileUpload |
| 선택한 상품 여러 개를 한 번에 숨김 처리 | BulkActionBar | 3 | Hint · MultiSelect · BulkActionBar |
| action bar that replaces the toolbar when rows are selected | BulkActionBar | 3 | Checkbox · Button · BulkActionBar |
| 표 마지막 줄에 총 수량 보여주기 | DataTable | 2 | Input · DataTable · FormActionBar |

## 1순위 대조 (`fixtures/r38-match-baseline.json`)

R38 작업 전 manifest의 모든 components(부품·상수 포함)의 keywords·useWhen·purpose와 요청한 3개 질의를 중복 제거한 439건이다.
작업 전 알고리즘과 매니페스트로 고정한 1순위가 "이전 1순위"다. 서버와 동일하게 저장 형태의 manifest.components를 matchComponents에 전달한다.
아래 표에 없는 1순위 변화가 생기면 `packages/mcp/match.test.mjs` 가 실패한다.

전체 439건 · 불변 425건 · 의도한 변화 14건 · 의도하지 않은 변화 0건.

### 바뀐 1순위 전부

| 질의 | 이전 1순위 | 변경 후 1순위 | 바꾼 라운드 · 이유 |
|---|---|---|---|
| 사이드 메뉴와 본문을 같은 업무 화면 틀로 배치한다. | SideNav | AppShell | 목표 64 — AppShell 자기 목적 문장 — 조사 뗀 줄기로 화면·틀·본문이 맞음 |
| 상태·정렬 필터에서 하나를 고른다. | StatusChip | Select | R38 — 상태+필터 떨어진 낱말 |
| 선택할 옵션 목록을 표시한다. | DataTable | Select | 목표 64 — SelectContent 문장이 가족 루트로 — Select 키워드 옵션 목록 |
| 선택 옵션 하나를 표시한다. | Checkbox | RadioGroup | 목표 64 — SelectItem 문장 — 전후 모두 가족(Select) 밖. 선택 키워드를 덜 쳐 Checkbox 에서 옮김 |
| 행 액션 메뉴를 연다. | SideNav | DropdownMenu | R38 — 행+메뉴 떨어진 낱말 |
| 실행할 액션 목록을 표시한다. | DataTable | DropdownMenu | 목표 64 — DropdownMenuContent 문장이 가족 루트로 — 키워드 액션 목록 |
| 저장·오류 알림을 표시한다. | Field | Toaster | R38 — 저장+알림 떨어진 낱말 |
| 라디오 선택지 하나를 표시한다. | Checkbox | RadioGroup | 목표 64 — RadioGroupItem 문장이 가족 루트로 — Checkbox 의 흔한 선택 키워드를 덜 침 |
| KPI | BulletRow | StatTile | R41 — 단일 KPI 는 지표 타일 |
| 표시할 데이터가 없음을 알리고 선택적 액션을 제공한다. | Button | EmptyState | R38 — 데이터+없음 떨어진 낱말 |
| 단계 | Tour | Steps | R43 — 일반 단계는 폼 위치 표시 |
| 옆에서 열리는 편집 패널 | Dialog | SheetContent | R38 — 요청 질의 |
| 상품 이미지 여러 장 업로드 | Thumbnail | FileUpload | R38 — 요청 질의 |
| 상품명 검색 | Combobox | Input | R38 — 요청 질의 |

### 전체 질의

| 질의 | 이전 1순위 | 변경 후 1순위 |
|---|---|---|
| 파일 업로드 | FileUpload | FileUpload |
| 이미지 업로드 | FileUpload | FileUpload |
| 첨부 | FileUpload | FileUpload |
| 드래그 앤 드롭 | FileUpload | FileUpload |
| 대표 이미지 | FileUpload | FileUpload |
| 엑셀 업로드 | FileUpload | FileUpload |
| CMS 대표 이미지·상품 이미지·엑셀 일괄 등록·첨부 파일을 고를 때 | FileUpload | FileUpload |
| 파일을 고르고 검증하며 미리보기·목록·전송 상태를 표시한다. | StatusChip | StatusChip |
| 페이지 | Pagination | Pagination |
| 페이징 | Pagination | Pagination |
| 페이지 이동 | Pagination | Pagination |
| 페이지 크기 | Pagination | Pagination |
| 몇 개씩 | Pagination | Pagination |
| 주문·출고·게시글을 서버에서 페이지 단위로 조회할 때 | Pagination | Pagination |
| 목록의 페이지를 옮기고 표시 범위·전체 건수·페이지 크기를 확인한다. | Pagination | Pagination |
| 앱 셸 | AppShell | AppShell |
| 공통 화면 | AppShell | AppShell |
| 레이아웃 | AppShell | AppShell |
| 사이드바와 본문 | AppShell | AppShell |
| 화면 틀 | AppShell | AppShell |
| 제품의 공통 화면 틀을 구성할 때 | AppShell | AppShell |
| 사이드 메뉴와 본문을 같은 업무 화면 틀로 배치한다. | SideNav | AppShell |
| 사이드바 | SideNav | SideNav |
| 메뉴 | SideNav | SideNav |
| 내비게이션 | SideNav | SideNav |
| 사이드 메뉴 | SideNav | SideNav |
| 브랜드 | SideNav | SideNav |
| 왼쪽 메뉴 | SideNav | SideNav |
| 사이드바에 제품 메뉴를 배치할 때 | SideNav | SideNav |
| 브랜드와 그룹별 메뉴로 현재 위치와 이동 경로를 보여준다. | SideNav | SideNav |
| 사이드 메뉴 항목을 제목으로 묶는다. | SideNav | SideNav |
| 아이콘·라벨·개수와 현재 위치 또는 준비 중 상태를 표시한다. | StatusChip | StatusChip |
| 페이지 제목 | PageHeader | PageHeader |
| 화면 머리 | PageHeader | PageHeader |
| 페이지 머리 | PageHeader | PageHeader |
| 제목과 버튼 | PageHeader | PageHeader |
| 페이지 헤더 | PageHeader | PageHeader |
| 페이지 제목이나 화면 머리를 구성할 때 | PageHeader | PageHeader |
| 페이지 제목과 설명·상태·주요 액션을 같은 위치에 배치한다. | PageHeader | PageHeader |
| 캐러셀 | Carousel | Carousel |
| 배너 | Carousel | Carousel |
| 슬라이드 | Carousel | Carousel |
| 슬라이더 | Carousel | Carousel |
| 자동 넘김 | Carousel | Carousel |
| 가로 스크롤 | Carousel | Carousel |
| 배너 슬라이드 | Carousel | Carousel |
| 콘텐츠를 한 장씩 가로로 넘길 때 | Carousel | Carousel |
| 배너·콘텐츠 슬라이드를 한 장씩 넘겨 보여준다. | Carousel | Carousel |
| 캐러셀 안의 콘텐츠 한 장을 표시한다. | Carousel | Carousel |
| 이미지 확대 | MediaViewer | MediaViewer |
| 라이트박스 | MediaViewer | MediaViewer |
| 사진 크게 | MediaViewer | MediaViewer |
| 동영상 재생 | MediaViewer | MediaViewer |
| 영상 팝업 | MediaViewer | MediaViewer |
| 떠 있는 창 | MediaViewer | MediaViewer |
| 화면 속 화면 | MediaViewer | MediaViewer |
| PiP | MediaViewer | MediaViewer |
| 이미지 크게 보기 | MediaViewer | MediaViewer |
| 영상 보면서 작업 | MediaViewer | MediaViewer |
| 이미지나 영상을 확대해서 볼 때 | MediaViewer | MediaViewer |
| 이미지 확대와 동영상 팝업·플로팅 표시를 제공한다. | MediaViewer | MediaViewer |
| 접기 | Collapsible | Collapsible |
| 펼치기 | Collapsible | Collapsible |
| 아코디언 아님 | Collapsible | Collapsible |
| 고급 설정 | Collapsible | Collapsible |
| 고급 설정 접기 | Collapsible | Collapsible |
| 패널을 접고 펼칠 때 | Collapsible | Collapsible |
| 고급 설정 같은 내용을 항상 보이는 버튼으로 접고 펼친다. | Collapsible | Collapsible |
| 항상 보이는 버튼으로 내용을 접고 펼친다. | Button | Button |
| 접고 펼칠 내용을 담는다. | Collapsible | Collapsible |
| 더보기 | ClampText | ClampText |
| 간략히 | ClampText | ClampText |
| 말줄임 | ClampText | ClampText |
| 긴 글 | ClampText | ClampText |
| 긴 설명 더보기 | ClampText | ClampText |
| 상품 설명·비고 등 긴 설명 더보기 | ClampText | ClampText |
| 긴 글을 N줄로 자르고 넘칠 때만 더보기·간략히를 제공한다. | ClampText | ClampText |
| 콤보박스 | Combobox | Combobox |
| 자동완성 | Combobox | Combobox |
| 검색 선택 | Combobox | Combobox |
| 많은 옵션 | Combobox | Combobox |
| 초성 검색 | Combobox | Combobox |
| 목록에서 찾기 | Combobox | Combobox |
| 타이핑으로 찾기 | Combobox | Combobox |
| 초성으로 찾기 | Combobox | Combobox |
| 많은 옵션에서 검색해 선택 | Combobox | Combobox |
| 검색해서 여러 개 고르기 | Combobox | Combobox |
| 태그 선택 | MultiSelect | MultiSelect |
| 20개를 넘는 후보에서 타이핑으로 찾을 때 | Combobox | Combobox |
| 많은 옵션에서 검색해 단일 값 또는 multiple로 여러 개를 고른다. | Combobox | Combobox |
| 다중 선택 | MultiSelect | MultiSelect |
| 여러 개 선택 | MultiSelect | MultiSelect |
| 복수 선택 | MultiSelect | MultiSelect |
| 체크 목록 | MultiSelect | MultiSelect |
| 여러 사업장 고르기 | MultiSelect | MultiSelect |
| 검색 없이 여러 개 선택할 때 | MultiSelect | MultiSelect |
| 요약 트리거와 체크 목록으로 여러 값을 고른다. | MultiSelect | MultiSelect |
| 탭 | Tabs | Tabs |
| 탭으로 나누기 | Tabs | Tabs |
| 분류별 패널 | Tabs | Tabs |
| 상세 화면을 분류별 패널로 나눌 때 | Tabs | Tabs |
| 상세 정보를 탭별 패널로 나눠 보여준다. | Tabs | Tabs |
| 탭 헤더를 한 줄로 배치하고 넘치면 스크롤한다. | Tooltip | Tooltip |
| 패널을 선택하는 탭 버튼이다. | Button | Button |
| 선택한 상세 패널을 표시한다. | Checkbox | Checkbox |
| 경로 | Breadcrumb | Breadcrumb |
| 빵부스러기 | Breadcrumb | Breadcrumb |
| 뒤로 | Breadcrumb | Breadcrumb |
| 목록으로 돌아가는 경로 | Breadcrumb | Breadcrumb |
| 상세에서 상위 목록과 뒤로 가는 경로가 필요할 때 | Breadcrumb | Breadcrumb |
| 목록으로 돌아가는 경로를 빵부스러기로 표현한다. | Breadcrumb | Breadcrumb |
| 경로 항목의 순서 목록이다. | Breadcrumb | Breadcrumb |
| 경로의 개별 항목이다. | Breadcrumb | Breadcrumb |
| 라우터를 지정하지 않는 상위 경로 링크다. | Breadcrumb | Breadcrumb |
| 링크가 아닌 현재 경로 항목이다. | Breadcrumb | Breadcrumb |
| 보조기기가 읽지 않는 경로 구분자다. | Breadcrumb | Breadcrumb |
| 접힌 경로 수를 읽을 수 있는 생략 표시다. | Breadcrumb | Breadcrumb |
| 모달 | Dialog | Dialog |
| 모달 띄우기 | Dialog | Dialog |
| 다이얼로그 | Dialog | Dialog |
| 팝업 | Dialog | Dialog |
| 편집 | Dialog | Dialog |
| 되돌릴 수 있는 입력이나 편집을 팝업으로 띄울 때 | Dialog | Dialog |
| 입력·편집·선택을 모달로 제공한다. | Dialog | Dialog |
| 입력 창을 여는 트리거다. | Input | Input |
| 입력 창의 내용과 닫기 보호를 제공한다. | Input | Input |
| 옆 패널 | SheetContent | SheetContent |
| 사이드 패널 | SheetContent | SheetContent |
| 서랍 | SheetContent | SheetContent |
| 드로어 | SheetContent | SheetContent |
| 슬라이드 패널 | SheetContent | SheetContent |
| 목록에서 상세·편집·필터를 열거나 좁은 화면 메뉴를 서랍으로 열 때 | SheetContent | SheetContent |
| 목록 맥락을 유지하는 모달 옆 패널이다. side는 right·left, size는 sm 400·md 560·lg 720px다. | SheetContent | SheetContent |
| SheetContent의 스크롤 본문이다. 헤더·푸터는 이 바깥에 둔다. | SheetContent | SheetContent |
| 입력 창 제목·설명 그룹이다. | Input | Input |
| 입력 창의 필수 제목이다. | Input | Input |
| 입력 창의 필수 설명이다. | Input | Input |
| 입력 창 하단의 액션 그룹이다. | Input | Input |
| 입력 창을 닫는 버튼을 제공한다. | Input | Input |
| 확인창 | AlertDialog | AlertDialog |
| 삭제 확인 | AlertDialog | AlertDialog |
| 되돌릴 수 없 | AlertDialog | AlertDialog |
| 취소 확인 | AlertDialog | AlertDialog |
| 영구 삭제·작성 취소 확인이 필요할 때 | AlertDialog | AlertDialog |
| 삭제 확인 등 되돌릴 수 없는 선택을 요구하는 확인창이다. | AlertDialog | AlertDialog |
| 확인 창을 여는 트리거다. | AlertDialog | AlertDialog |
| 되돌릴 수 없는 선택을 확인하는 내용을 표시한다. | AlertDialog | AlertDialog |
| 확인 제목·설명 그룹이다. | PageHeader | PageHeader |
| 확인 창의 필수 제목이다. | AlertDialog | AlertDialog |
| 되돌릴 수 없는 결과의 설명이다. | AlertDialog | AlertDialog |
| 확인·취소 액션 그룹이다. | Button | Button |
| 확인한 작업을 실행하고 확인창을 닫는다. | AlertDialog | AlertDialog |
| 초기 포커스를 받는 필수 취소 버튼이다. | Button | Button |
| 선택 필터 | Select | Select |
| 셀렉트 | Select | Select |
| 상태 필터 | Select | Select |
| 20개 이하 | Select | Select |
| 20개 이하의 상태·정렬 옵션을 선택할 때 | Select | Select |
| 상태·정렬 필터에서 하나를 고른다. | StatusChip | Select |
| 선택 목록을 연다. | Checkbox | Checkbox |
| 선택값이나 플레이스홀더를 표시한다. | Checkbox | Checkbox |
| 선택할 옵션 목록을 표시한다. | DataTable | Select |
| 관련 선택 항목을 묶는다. | Checkbox | Checkbox |
| 선택 그룹의 이름을 표시한다. | Checkbox | Checkbox |
| 선택 옵션 하나를 표시한다. | Checkbox | RadioGroup |
| 선택 그룹을 구분한다. | Checkbox | Checkbox |
| 선택 목록을 위로 넘긴다. | Checkbox | Checkbox |
| 선택 목록을 아래로 넘긴다. | Checkbox | Checkbox |
| 행 메뉴 | DropdownMenu | DropdownMenu |
| 드롭다운 액션 | DropdownMenu | DropdownMenu |
| 표의 행에서 액션을 실행할 때 | DropdownMenu | DropdownMenu |
| 행에서 실행할 액션을 메뉴로 제공한다. | DropdownMenu | DropdownMenu |
| 행 액션 메뉴를 연다. | SideNav | DropdownMenu |
| 실행할 액션 목록을 표시한다. | DataTable | DropdownMenu |
| 메뉴 액션 하나를 실행한다. | SideNav | SideNav |
| 메뉴에서 켜고 끌 항목을 표시한다. | SideNav | SideNav |
| 메뉴에서 하나만 고를 항목을 표시한다. | SideNav | SideNav |
| 메뉴 그룹 이름을 표시한다. | SideNav | SideNav |
| 메뉴 그룹을 구분한다. | SideNav | SideNav |
| 메뉴의 단축키를 표시한다. | SideNav | SideNav |
| 관련 메뉴 항목을 묶는다. | SideNav | SideNav |
| 메뉴를 다른 화면 요소 위에 표시한다. | SideNav | SideNav |
| 하위 메뉴를 제공한다. | SideNav | SideNav |
| 하위 메뉴 목록을 표시한다. | SideNav | SideNav |
| 하위 메뉴를 연다. | SideNav | SideNav |
| 메뉴에서 하나만 고를 항목을 묶는다. | SideNav | SideNav |
| 토스트 | Toaster | Toaster |
| 저장 알림 | Toaster | Toaster |
| 사용자 작업 결과를 알릴 때 | Toaster | Toaster |
| 저장·오류 알림을 표시한다. | Field | Toaster |
| 날짜 | DatePicker | DatePicker |
| 기간 필터 | DatePicker | DatePicker |
| 달력 | DatePicker | DatePicker |
| 주문·물류 목록의 기간 필터가 필요할 때 | DatePicker | DatePicker |
| 한국어 단일 날짜·기간 입력과 빠른 선택을 제공한다. | DatePicker | DatePicker |
| 버튼 | Button | Button |
| 저장 | Button | Button |
| 삭제 | Button | Button |
| 액션 | Button | Button |
| 저장·취소·삭제 버튼이 필요할 때 | Button | Button |
| 명시적인 사용자 동작을 실행한다. | Button | Button |
| 입력 | Input | Input |
| 텍스트 | Input | Input |
| 금액 | Input | Input |
| 입력칸 | Input | Input |
| 숫자 입력 | Input | Input |
| 통화 | Input | Input |
| 가격 | Input | Input |
| 비밀번호 | Input | Input |
| 검색창 | Input | Input |
| 전화번호 | Input | Input |
| 수량 | Input | Input |
| 금액 입력 | Input | Input |
| 텍스트·금액 한 칸을 입력할 때 | Input | Input |
| 단일 값·비밀번호·검색어를 입력한다. | Input | Input |
| 여러 줄 | Textarea | Textarea |
| 메모 | Textarea | Textarea |
| 비고 | Textarea | Textarea |
| 메모·비고를 여러 줄로 작성할 때 | Textarea | Textarea |
| 여러 줄 메모와 긴 글을 입력한다. | Textarea | Textarea |
| 라디오 | RadioGroup | RadioGroup |
| 하나만 선택 | RadioGroup | RadioGroup |
| 택일 | RadioGroup | RadioGroup |
| 여러 옵션 중 하나만 선택하는 택일 항목을 모두 보여줄 때 | RadioGroup | RadioGroup |
| 여러 선택지 중 하나만 선택한다. | RadioGroup | RadioGroup |
| 라디오 선택지 하나를 표시한다. | Checkbox | RadioGroup |
| 스위치 | Switch | Switch |
| 토글 | Switch | Switch |
| 켜기 끄기 | Switch | Switch |
| 즉시 적용 | Switch | Switch |
| 알림·자동 재고 차감처럼 저장 버튼 없이 즉시 적용할 때 | Switch | Switch |
| 켜기 끄기 설정을 즉시 적용한다. | Switch | Switch |
| 레이블 | Field | Field |
| 입력 이름 | Label | Label |
| Field를 쓰지 않는 Switch·Checkbox·Radio 옆에 입력 이름이 필요할 때 | Checkbox | Checkbox |
| 컨트롤 옆의 레이블로 입력 이름을 연결한다. | Label | Label |
| 상태 | StatusChip | StatusChip |
| 완료 | StatusChip | StatusChip |
| 경고 | StatusChip | StatusChip |
| 칩 | StatusChip | StatusChip |
| 주문 상태 | StatusChip | StatusChip |
| 배송 상태 | StatusChip | StatusChip |
| 상태 표시 | StatusChip | StatusChip |
| 완료·경고·오류 상태를 표시할 때 | StatusChip | StatusChip |
| 레코드의 상태를 라벨과 실루엣으로 표시한다. | StatusChip | StatusChip |
| 카드 | Card | Card |
| Card | Card | Card |
| 관련 정보를 카드로 묶을 때 | Card | Card |
| 관련 정보를 평면 카드로 묶는다. | Card | Card |
| 카드 제목과 보조 동작을 배치한다. | Card | Card |
| 카드 제목을 표시한다. | Card | Card |
| 카드 본문을 담는다. | Card | Card |
| 카드 하단의 보조 정보를 담는다. | Card | Card |
| 체크 | Checkbox | Checkbox |
| 선택 | Checkbox | Checkbox |
| 혼합 | Checkbox | Checkbox |
| 행 선택이나 복수 선택이 필요할 때 | Checkbox | Checkbox |
| 선택·해제·일부 선택 상태를 표시한다. | Checkbox | Checkbox |
| 표 | DataTable | DataTable |
| 테이블 | DataTable | DataTable |
| 행 | DataTable | DataTable |
| 정렬 | DataTable | DataTable |
| 목록 | ListSkeleton | ListSkeleton |
| 레코드 | DataTable | DataTable |
| 여러 건 선택 | DataTable | DataTable |
| 일괄 선택 | DataTable | DataTable |
| 주문 목록 | DataTable | DataTable |
| 많은 레코드를 열로 비교할 때 | DataTable | DataTable |
| 정렬·선택·가상화가 가능한 데이터 표다. | DataTable | DataTable |
| 선택 열 식별자 | Checkbox | Checkbox |
| 선택 열 고정을 지정할 때 | Checkbox | Checkbox |
| DataTable 선택 열의 식별자 상수다. | DataTable | DataTable |
| 차트 프레임 | ChartFrame | ChartFrame |
| 범례 | ChartFrame | ChartFrame |
| 차트 공통 외곽과 상태가 필요할 때 | ChartFrame | ChartFrame |
| 차트의 제목·범례와 로딩·빈 상태·오류를 함께 표시한다. | ChartFrame | ChartFrame |
| 추세 | TrendBand | TrendBand |
| 추이 | TrendBand | TrendBand |
| 시계열 | TrendBand | TrendBand |
| 밴드 | TrendBand | TrendBand |
| 선 그래프 | TrendBand | TrendBand |
| 변동 범위 | TrendBand | TrendBand |
| 상하한 | TrendBand | TrendBand |
| 편차 | TrendBand | TrendBand |
| 시계열 추세와 밴드를 비교할 때 | TrendBand | TrendBand |
| 시간 추세와 상하 범위를 보여준다. | TrendBand | TrendBand |
| 실적 | BulletRow | BulletRow |
| 목표 | BulletRow | BulletRow |
| KPI | BulletRow | StatTile |
| 불릿 | BulletRow | BulletRow |
| 달성률 | BulletRow | BulletRow |
| 목표 대비 | BulletRow | BulletRow |
| 실적 비교 | BulletRow | BulletRow |
| KPI 목표 달성도를 비교할 때 | BulletRow | BulletRow |
| 목표 대비 실적을 행으로 비교한다. | BulletRow | BulletRow |
| 구성비 | CompositionArea | CompositionArea |
| 구성 비율 | CompositionArea | CompositionArea |
| 비중 | CompositionArea | CompositionArea |
| 누적 | CompositionArea | CompositionArea |
| 면적 | CompositionArea | CompositionArea |
| 점유율 | CompositionArea | CompositionArea |
| 비율 변화 | CompositionArea | CompositionArea |
| 시간별 구성 | CompositionArea | CompositionArea |
| 구성 비중 변화를 비교할 때 | CompositionArea | CompositionArea |
| 시간별 구성비를 누적 면적으로 보여준다. | CompositionArea | CompositionArea |
| 빈 상태 | EmptyState | EmptyState |
| 데이터 없음 | EmptyState | EmptyState |
| 필터 초기화 | EmptyState | EmptyState |
| 필터 결과가 비었을 때 | EmptyState | EmptyState |
| 표시할 데이터가 없음을 알리고 선택적 액션을 제공한다. | Button | EmptyState |
| 불러오기 실패 | ErrorState | ErrorState |
| 재시도 | ErrorState | ErrorState |
| 데이터 오류 | ErrorState | ErrorState |
| 데이터 요청이 실패했을 때 | ErrorState | ErrorState |
| 불러오기 실패와 재시도 경로를 제공한다. | ErrorState | ErrorState |
| 아바타 | Avatar | Avatar |
| 이니셜 | Avatar | Avatar |
| 사용자 사진 | Avatar | Avatar |
| 사용자 이름과 사진을 표시할 때 | Avatar | Avatar |
| 사진이나 이니셜로 사람을 식별한다. | Avatar | Avatar |
| 썸네일 | Thumbnail | Thumbnail |
| 상품 사진 | Thumbnail | Thumbnail |
| 이미지 실패 | Thumbnail | Thumbnail |
| 상품·미디어 이미지를 표시할 때 | Thumbnail | Thumbnail |
| 이미지 공간을 예약하고 실패를 대체한다. | Thumbnail | Thumbnail |
| 스켈레톤 | Skeleton | Skeleton |
| 자리 표시 | Skeleton | Skeleton |
| 로딩 | Skeleton | Skeleton |
| 불러오는 | Skeleton | Skeleton |
| 불러오기 | Skeleton | Skeleton |
| 데이터 대기 | Skeleton | Skeleton |
| 콘텐츠 대기 | Skeleton | Skeleton |
| 로딩 중 | Skeleton | Skeleton |
| 콘텐츠 모양을 미리 알 때 | Skeleton | Skeleton |
| 알려진 콘텐츠 형태의 자리 표시자다. | Skeleton | Skeleton |
| 문단 로딩 | SkeletonText | SkeletonText |
| 텍스트 스켈레톤 | SkeletonText | SkeletonText |
| 여러 줄 텍스트를 기다릴 때 | Textarea | Textarea |
| 문단 형태의 로딩 자리 표시자다. | Skeleton | Skeleton |
| 카드 로딩 | CardSkeleton | CardSkeleton |
| 카드 스켈레톤 | CardSkeleton | CardSkeleton |
| 카드 불러오는 중 | CardSkeleton | CardSkeleton |
| 카드 불러오기 | CardSkeleton | CardSkeleton |
| 카드의 콘텐츠 배치와 치수를 알 때 | CardSkeleton | CardSkeleton |
| 카드 형태의 로딩 자리 표시자다. | Skeleton | Skeleton |
| 목록 로딩 | ListSkeleton | ListSkeleton |
| 목록 스켈레톤 | ListSkeleton | ListSkeleton |
| 목록 불러오는 중 | ListSkeleton | ListSkeleton |
| 목록 불러오기 | ListSkeleton | ListSkeleton |
| 목록의 콘텐츠 배치와 치수를 알 때 | ListSkeleton | ListSkeleton |
| 목록 형태의 로딩 자리 표시자다. | Skeleton | Skeleton |
| 폼 | FormSkeleton | FormSkeleton |
| 폼 로딩 | FormSkeleton | FormSkeleton |
| 폼 스켈레톤 | FormSkeleton | FormSkeleton |
| 폼 불러오는 중 | FormSkeleton | FormSkeleton |
| 폼 불러오기 | FormSkeleton | FormSkeleton |
| 폼의 콘텐츠 배치와 치수를 알 때 | FormSkeleton | FormSkeleton |
| 폼 형태의 로딩 자리 표시자다. | Skeleton | Skeleton |
| 차트 | ChartSkeleton | ChartSkeleton |
| 차트 로딩 | ChartSkeleton | ChartSkeleton |
| 차트 스켈레톤 | ChartSkeleton | ChartSkeleton |
| 차트 불러오는 중 | ChartSkeleton | ChartSkeleton |
| 차트 불러오기 | ChartSkeleton | ChartSkeleton |
| 차트의 콘텐츠 배치와 치수를 알 때 | ChartSkeleton | ChartSkeleton |
| 차트 형태의 로딩 자리 표시자다. | Skeleton | Skeleton |
| 진행률 | ProgressTrack | ProgressTrack |
| 진행 표시 | ProgressTrack | ProgressTrack |
| 대기 | ProgressTrack | ProgressTrack |
| 남은 시간 | ProgressTrack | ProgressTrack |
| 예상 시간 | ProgressTrack | ProgressTrack |
| 진행 바 | ProgressTrack | ProgressTrack |
| 긴 작업의 진행 정도를 알릴 때 | ProgressTrack | ProgressTrack |
| 진행률과 예상 시간을 표시한다. | ProgressTrack | ProgressTrack |
| 대량 | TaskProgress | TaskProgress |
| 일괄 | TaskProgress | TaskProgress |
| 장기 작업 | TaskProgress | TaskProgress |
| 내보내기 | TaskProgress | TaskProgress |
| 오래 걸리는 | TaskProgress | TaskProgress |
| 진행 상황 | TaskProgress | TaskProgress |
| 작업 단계 | TaskProgress | TaskProgress |
| 백그라운드 작업 | TaskProgress | TaskProgress |
| 대량 내보내기·일괄 작업을 기다릴 때 | TaskProgress | TaskProgress |
| 드문 장기 작업의 단계와 진행을 표시한다. | TaskProgress | TaskProgress |
| 툴팁 | Tooltip | Tooltip |
| 호버 | Tooltip | Tooltip |
| 한 줄 | Tooltip | Tooltip |
| 컨트롤 설명 | Tooltip | Tooltip |
| UI 설명 | Tooltip | Tooltip |
| 호버·키보드 포커스로 UI 의미를 확인할 때 | Tooltip | Tooltip |
| 컨트롤의 뜻을 한 줄로 설명한다. | Tooltip | Tooltip |
| 힌트 | Hint | Hint |
| 새 기능 | Hint | Hint |
| 한 번 | Hint | Hint |
| 맥락형 안내 | Hint | Hint |
| 새 기능을 2~3줄과 액션으로 알릴 때 | Hint | Hint |
| 새 기능·놓치기 쉬운 UI를 한 번 알린다. | Hint | Hint |
| 투어 | Tour | Tour |
| 온보딩 | Tour | Tour |
| 단계 | Tour | Steps |
| 단계별 | Tour | Tour |
| 단계별 안내 | Tour | Tour |
| 사용법 | Tour | Tour |
| 흐름 학습 | Tour | Tour |
| 기능 흐름 | Tour | Tour |
| 처음 온 사용자 | Tour | Tour |
| 둘러보기 | Tour | Tour |
| 시작 안내 | Tour | Tour |
| 사용자가 전체 흐름 학습을 요청할 때 | Tour | Tour |
| 사용자가 요청한 UI 흐름을 단계로 안내한다. | Tour | Tour |
| 필드 | Field | Field |
| 오류 | Field | Field |
| 폼 검증 | Field | Field |
| 입력값 검증 | Field | Field |
| 틀렸을 때 | Field | Field |
| 오류 문구 | Field | Field |
| 유효성 검사 | Field | Field |
| 폼 필드의 설명과 검증 오류를 표시할 때 | Field | Field |
| 레이블·설명·오류와 입력 접근성을 연결한다. | Field | Field |
| 연속 입력 | FormFlow | FormFlow |
| 반복 입력 | FormFlow | FormFlow |
| Enter | FormFlow | FormFlow |
| 폼 이동 | FormFlow | FormFlow |
| 다음 입력칸 | FormFlow | FormFlow |
| 키보드 이동 | FormFlow | FormFlow |
| 다음 칸 | FormFlow | FormFlow |
| 이전 칸 | FormFlow | FormFlow |
| 반복 입력에서 마우스 이동을 줄일 때 | FormFlow | FormFlow |
| 반복 입력 폼의 Enter 이동과 제출 흐름을 제공한다. | FormFlow | FormFlow |
| 요약 | Peek | Peek |
| 미리보기 | Peek | Peek |
| peek | Peek | Peek |
| 팝오버 | Peek | Peek |
| 행 상세 | Peek | Peek |
| 레코드 내용 | Peek | Peek |
| 표의 행을 열지 않고 내용을 확인할 때 | Peek | Peek |
| 레코드를 열지 않고 핵심 내용을 요약해 보여준다. | Peek | Peek |
| 옆에서 열리는 편집 패널 | Dialog | SheetContent |
| 상품 이미지 여러 장 업로드 | Thumbnail | FileUpload |
| 상품명 검색 | Combobox | Input |
