# 변경 기록

`@s2life/tokens` · `@s2life/ui` · `@s2life/mcp` 는 **버전을 함께 올린다**(lockstep).
세 패키지의 버전이 어긋나면 배포 워크플로가 떨어진다.

태그는 **게시된 것에만** 붙인다(`v<버전>`). 배포 워크플로는 `contents: read` 만 갖기
때문에(의도된 제약) 태그는 게시 후 로컬에서 단다. 배포 절차는 `DESIGN.md §15`.

---

## 0.3.1 — 미게시

### 추가

- ui 토큰 하위 경로 `@s2life/ui/tokens.css`·`theme.css`·`tokens.json`. tokens 패키지 원본을 빌드 시 바이트 그대로 복사한다.
- Carousel 루트 스타일을 확장하는 `className`.

### 고침

- ClampText가 `white-space: nowrap` 조상(예: DataTable 셀) 안에서 긴 글을 더보기 없이
  자르던 문제. 글이 가로로만 길어져 세로 넘침 측정이 "안 넘침"으로 판정했다
  (도그푸딩 2: 1210/576px, 더보기 0/16). 내용이 `text-wrap-mode: wrap` 과
  `overflow-wrap: anywhere` 를 소유한다. `white-space: normal` 이 아니라서
  `pre-line`·`pre` 로 보존한 사용자 개행은 그대로 남는다.

### 바뀐 지침 (MCP)

- `purpose`·`useWhen`·`dont`·`rules`를 화면을 만드는 소비자의 말로 정리했다.
  구현 메모는 DESIGN.md에 보존하고, 규칙마다 한 생각과 출처를 둔다.
  빌드에서 구현 금지어·120자 초과·컴포넌트 사이 규칙 복제를 차단한다.
  MCP 상세 기준선 8개와 목록의 용도를 갱신하고 R26의 임시 dont 델타를 흡수했다.
- ClampText: "DataTable 셀에 쓰지 마라" — 셀이 말줄임과 전체 값 `title` 을 이미 제공한다.
- DataTable: "긴 글 열을 ClampText 로 감싸지 마라".

### 문서

- React 앱 설치 안내를 `npm install @s2life/ui` 하나와 `@s2life/ui/styles.css` 한 줄로 통일했다. 토큰 직접 접근도 ui 하위 경로를 사용하며, tokens는 ui가 같은 버전으로 고정해 가져온다.
  이전 "시작하기"가 안내하던 `import '@s2life/tokens/tokens.css'` 는 `styles.css` 와 중복이었고,
  pnpm 에서 ui 만 설치하면 해석에 실패해 빌드가 깨졌다. 배포 리허설이 이제 ui 만 설치한 앱으로 검증한다.
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
