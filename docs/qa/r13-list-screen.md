# R13 · 주문 목록 구성 요소 구현·검증 보고

구현은 끝났고 `pnpm verify`는 통과했다. 실제 브라우저 검증은 이 실행 환경의 macOS 샌드박스가 headless shell의 Mach 포트 등록을 거부해 수행하지 못했다. 따라서 Enter 동작·실측 높이·가상화 포커스·테마 렌더가 확인됐다고 주장하지 않는다.

## 만든 파일과 수정한 파일

- `packages/ui/src/components/select/{select.tsx,index.ts}`: Radix 단일 선택, Field 배선, 20개 초과 개발 경고.
- `packages/ui/src/components/dropdown-menu/{dropdown-menu.tsx,index.ts}`: Radix 행 메뉴, destructive 삭제 아이콘.
- `packages/ui/src/components/toast/{toast.tsx,toast.css,index.ts}`: Sonner 래퍼·상태 토큰·오류 유지 정책.
- `packages/ui/src/components/date-picker/{date-picker.tsx,calendar.tsx,popover.tsx,date-value.ts,date-value.test.mjs,index.ts}`: 한국어 단일 날짜·기간·직접 입력·빠른 선택. Calendar·Popover는 내부 전용이다.
- `packages/ui/src/stories/{select,dropdown-menu,toast,date-picker,list-screen}.stories.tsx`: 15개 스토리. 주문 목록은 기간·상태로 데이터를 실제 필터링하고 행 저장·삭제를 실행한다.
- `packages/ui/src/index.ts`: 공개 API 추가. 독립 Popover·Calendar는 내보내지 않는다.
- `docs/research/component-intent.mjs`, `packages/mcp/manifest.json`: 새 공개 API를 기존 MCP 검증 계약에 등록하고 매니페스트 재생성.
- `docs/research/r13/{select,dropdown-menu,popover,calendar,sonner}.json`: 가져온 shadcn 원본 보관.
- `docs/research/r13/translation.diff`: 원본과 구현 사이의 변경 줄 전체.
- `docs/qa/list-screen-contract-verify.mjs`: 실제 React 서버 렌더·Sonner 저장소를 사용하는 통합 검사.
- `docs/qa/list-screen-render-verify.mjs`: 15개 play 및 시스템 light/dark에서 테마 3상태, 총 17개 브라우저 검사.
- `docs/qa/run-all.mjs`: 새 브라우저 하네스를 `pnpm qa`에 연결.
- 이 보고서.

## shadcn 원본에서 바꾼 줄과 이유

정확한 줄별 차이는 [translation.diff](../research/r13/translation.diff)에 있다. 원본 URL은 `https://ui.shadcn.com/r/styles/new-york/<이름>.json`이며 CLI를 실행하지 않았다.

| 대상 | 변경 | 이유 |
| --- | --- | --- |
| 공통 | `"use client"` 제거, `cn` 경로를 `../../lib/cn`으로 변경 | Vite와 저장소 구조에 맞춤 |
| 공통 | 한국어 JSDoc, DOM 주요 요소의 `data-slot` 추가 | 근거 보존과 하네스 탐색 |
| 공통 | `rounded-md/sm` 등을 `--radius-md`로 연결 | 우리 반경 규약 |
| Select Trigger | `h-9` → `h-[var(--control-h-md)]`, 최소 너비 토큰, `shadow-sm` 제거 | Input과 같은 높이, 값에 고정 폭 금지, 평면 그림자 금지 |
| Select | Root의 id·ARIA를 Context로 Trigger에 전달 | Field의 cloneElement 배선이 DOM까지 도달해야 함 |
| Select Item | 옵션 등록·해제, 개발 모드에서 20개 초과 1회 경고 | 그룹·동적 옵션까지 세고 Combobox 사용을 유도 |
| DropdownMenu Item | `destructive` API와 삭제 아이콘 추가 | 파괴적 동작을 색만으로 구분하지 않음 |
| 떠 있는 Content | 기존 `bg-popover`·`text-popover-foreground` 유지, `border-border` 추가 | 기존 브리지 활용. 원본이 전제한 shadcn 전역 border 초기화가 우리 전역에는 없으므로 지역적으로 지정 |
| CSS 변수 유틸리티 | `[--변수]` → `[var(--변수)]` | Tailwind 4에서 명시적인 CSS 변수 값 사용 |
| Calendar | 기존 Button 경로·`size="sm" iconOnly`, `.tabular`, 날짜 슬롯, 캡션 글자 토큰 | 기존 Button을 교체하지 않고 날짜 그리드에 사용 |
| Calendar | 바탕·선택·범위의 shadcn 색 클래스 유지 | 이미 검증된 브리지 사용 |
| Sonner | `next-themes` 제거, OS·html 속성 구독으로 변경 | 프로젝트의 테마 3상태 준수 |
| Sonner | 톤별 의미 토큰과 실루엣이 다른 아이콘, 오류 alert·무한 duration·닫기 | 결과를 색 외 신호로 읽고 오류를 놓치지 않게 함 |

## Field + Select

그냥 연결되지는 않는다. Radix Root는 실제 DOM이 아니므로 Select Root가 받은 `id`, `aria-describedby`, `aria-invalid`, 접근성 이름을 Context로 트리거에 전달했다. 필수 여부는 Radix `required` 계약을 사용한다. 기존 Field 소스는 수정하지 않았다.

실제 React 서버 렌더에서 `<label for="order-state">`와 트리거 button의 id·오류/설명 연결·`aria-invalid`·`aria-required`를 확인했다. 브라우저의 레이블 클릭과 포커스 동작은 별도 play로 작성했지만 미실행이다.

## FormFlow Enter와 높이

기존 FormFlow의 button early return을 유지했다. `셀렉트-폼흐름`은 Enter로 목록이 열리고 다음 입력칸에는 포커스가 가지 않으며 Escape 후 트리거로 복귀함을 단언한다. **실제 브라우저 결과는 미확인이다.**

Input과 Select 모두 `--control-h-md`를 참조한다. `셀렉트-높이일치`는 `getBoundingClientRect().height`가 서로 같고 38px인지 단언한다. **38px는 토큰에 따른 기대값이고 이번 실행에서 측정한 결과가 아니다.**

## 가상화 행 언마운트

`메뉴-가상화-언마운트`는 500행 DataTable에서 첫 행 메뉴를 키보드로 열고 12,000px 스크롤해 트리거의 언마운트와 포털 메뉴 제거를 단언한다. 마지막 활성 요소의 data-slot/태그를 `data-focus-after-unmount`에 기록한다.

**미실행이므로 DataTable 포커스 복구와의 충돌 여부는 아직 판정할 수 없다.** 기존 DataTable과 Radix 포커스 복구 코드는 수정하지 않았다.

## Sonner 테마와 알림 정책

- `data-theme="dark"`이면 dark, `"light"`이면 light.
- 그 외 미지정 상태는 `matchMedia('(prefers-color-scheme: dark)')`를 따른다.
- MutationObserver로 html 속성 변경, MediaQueryList change로 OS 설정 변경을 구독하고 언마운트 시 해제한다.
- 성공·오류·정보·경고의 바탕과 글자는 각각 `status-*-bg/fg`를 사용한다. 오류는 danger 토큰이다.
- 일반 결과는 `role="status"`, 오류는 `role="alert"`다. 오류는 `duration: Infinity`와 닫기 버튼을 강제한다. `toast.promise`의 실패에도 같은 규칙을 적용한다.
- 실제 Sonner 저장소에서 짧은 duration을 요청한 오류도 Infinity가 되는 것, 성공 duration 유지, 비동기 실패의 Infinity 및 ARIA 역할을 확인했다.
- `토스트-다크`는 세 상태를 바꾸면서 테마 문자열과 실제 글자색을 비교한다. 하네스는 OS light/dark 두 조건으로 반복한다. 렌더 검증은 미실행이다.

## 날짜 정책과 가정

기간 선택이 기본이고 `mode="single"`도 지원한다. 직접 입력은 단일 `YYYY-MM-DD`, 기간 `YYYY-MM-DD ~ YYYY-MM-DD` 형식이다. 빈 입력은 선택 해제다. 조합 중에는 파싱·검증하지 않으며 blur 또는 Enter에서 확정한다. 잘못된 날짜와 역순 기간은 확정값을 바꾸지 않고 아이콘·문장·색으로 알린다.

빠른 선택은 운영자 로컬 날짜를 기준으로 한다. 최근 7일은 오늘 포함 7일, 이번 달은 월 전체, 지난 달은 직전 월 전체다. 단일 모드의 빠른 선택은 해당 구간의 마지막 날짜를 선택한다. 스토리는 재현성을 위해 2026-11-15를 기준일로 고정했다.

목록 스토리는 서버 연결 없이 로컬 주문 36건을 사용한다. 실제 서비스의 시간대·서버 쿼리 정책은 추가하지 않았다.

## 검증 결과

- `pnpm verify`: 통과. 대비 100건, MCP 생성 검증, 타입 검사, Storybook 정적 빌드. 기존 토큰 산출물에는 변경 없음.
- `node --test packages/ui/src/lib/*.test.mjs packages/ui/src/components/*/*.test.mjs`: 138/138 통과. 날짜 윤년·불완전 입력·연도 경계·빠른 선택을 포함한다.
- `node --test packages/mcp/*.test.mjs`: 35/35 통과.
- `node docs/qa/mcp-client-verify.mjs`: 36/36 통과.
- `node docs/qa/list-screen-contract-verify.mjs`: React 배선·Sonner 정책 4개 통합 검사 통과.
- 정적 Storybook 인덱스: R13 스토리 15개 확인.
- `git diff --check`, 신규 하네스 구문 검사: 통과.
- `node docs/qa/list-screen-render-verify.mjs`: 실행 시도, headless shell의 `bootstrap_check_in … MachPortRendezvousServer … Permission denied (1100)`로 CDP 연결 전 중단. 새 play 및 기존 `components-form--*`, `components-guide--*`의 브라우저 회귀 검증은 미완료다.
- 빌드의 500KB 청크 크기 경고는 남아 있으며 빌드는 성공했다.

## 남은 브라우저 검증 실행 순서

현재 샌드박스 밖에서 정상 실행 가능한 저장소 터미널에서 다음 순서로 실행한다. GUI Chrome이나 `--no-sandbox`는 사용하지 않는다.

```bash
cd <저장소 루트>
pnpm verify
node --test packages/ui/src/lib/*.test.mjs packages/ui/src/components/*/*.test.mjs
node docs/qa/list-screen-contract-verify.mjs
pnpm qa
```

`pnpm qa`가 정적 서버를 올리고 기존 하네스와 신규 R13 하네스를 순서대로 실행한다. R13 실패 시 스크린샷은 `.qa-shots/r13`에 저장된다. 스토리북에서 `Components/Select`, `Components/DropdownMenu`, `Components/Toast`, `Components/DatePicker`, `QA/ListScreen`도 확인할 수 있다. 가상화 스토리 실행 후 `#storybook-root`의 `data-focus-after-unmount`를 확인해 DataTable 스크롤 영역으로 포커스가 돌아왔는지 판정한다. 충돌하면 기존 복구를 수정하지 말고 보고한다.

## 의도적으로 하지 않은 것

기존 Button·Input·Checkbox·Card·Tooltip·Peek·Skeleton·Avatar·Field·FormFlow·DataTable과 `use-anchored.ts`를 수정하지 않았다. 토큰 생성기·`packages/tokens/*`·DESIGN.md·AGENTS.md·package.json을 변경하지 않았다. shadcn CLI·next-themes·의존성 설치·독립 Popover 공개·커밋·푸시를 수행하지 않았다. 금지된 다른 AI 시스템 디렉터리를 읽거나 수정하지 않았다. 브라우저 차단을 우회하지 않았다.
