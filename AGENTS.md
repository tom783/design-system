# AGENTS.md — 이 저장소에서 일하는 에이전트가 먼저 읽을 것

B2B 커머스 SaaS(판매·물류·마케팅·CMS)용 React 디자인 시스템.
화면의 대부분이 **데이터 조회와 입력**이고 사용자는 하루 종일 그 화면을 본다.

설계 의도와 수치의 근거는 **`DESIGN.md`** 에 있다. 토큰이나 컴포넌트를 만지기 전에 읽어라.

## 스택

React 19.3.1 · Storybook 10.6.7 · Tailwind CSS **4**.3.5 · TypeScript **7**.0.2 · Vite 8.3.8 · pnpm 워크스페이스

버전을 추측하지 마라. Tailwind 4와 TypeScript 7은 3/5세대와 호환되지 않는 부분이 있다
(예: TS7은 `baseUrl`을 제거했다. `paths`만 쓴다).

## 손으로 고치면 안 되는 파일

| 파일 | 생성자 |
|---|---|
| `packages/tokens/tokens.css` | `docs/research/tokens-build.mjs` |
| `packages/tokens/theme.css` | 동일 |
| `docs/research/tokens.json` | 동일 |

색·활자·간격 수치는 **`docs/research/tokens-build.mjs` 안에서만** 고치고 `pnpm tokens`로 재생성한다.
생성된 CSS를 직접 편집하면 다음 재생성에서 날아가고, 검증도 우회된다.

## 검증

```bash
pnpm tokens       # 토큰 재생성 + 대비 74건 · 의미분리 8건 · 테마 3상태 검증
pnpm typecheck
pnpm build-storybook
pnpm verify       # 위 세 개를 순서대로
```

### 게이트는 자동으로 돈다

```
pre-commit  토큰·매니페스트 재생성 + 산출물 동기 확인 + 타입 + 단위 (약 1.5초)
pre-push    깨끗한 체크아웃 typecheck(약 5초) + pnpm verify + pnpm qa   SKIP_QA=1 로 qa 만 건너뛸 수 있다
CI          pnpm gate — --no-verify 로 빠져나간 푸시를 받는 마지막 그물
```

훅은 `.githooks/` 에 있고 `pnpm install` 이 `core.hooksPath` 를 걸어준다
(husky 없음 — git 기본 기능이다). **가장 중요한 검사는 "생성 파일이 소스와 맞는가"** 다.
생성기를 고치고 산출물 커밋을 잊는 것이 가장 흔한 사고라 pre-commit 이 재생성 후
`git diff` 로 막는다.

`pnpm verify`가 통과하지 않은 작업은 완료가 아니다.
토큰을 건드렸으면 `pnpm tokens` 출력의 실패 항목을 반드시 읽어라 — 종료 코드 1로 막는다.

### 브라우저 하네스

```bash
pnpm qa           # 아래를 전부 — 빌드·서버 기동·10개 하네스 (배포 리허설 포함)
pnpm qa --only steps-render-verify,mcp-client-verify   # 일부만. 모르는 이름·틀린 인자는 서버 띄우기 전 exit 2
pnpm qa --shard 1/4 --timings out.json  # 리눅스 CI 기준선(docs/qa/timings/)으로 4등분한 1번째 + 하네스별 초·결과 JSON
pnpm build        # 패키지 빌드 (ui dist + CSS)
pnpm qa:pack      # 배포 리허설만 — tarball → 샘플 앱 설치 → 실제 렌더
pnpm version:set  # 세 패키지 버전을 함께 올린다 (lockstep)

# 개별 실행
pnpm build-storybook
npx http-server storybook-static -p 6099 -s &
node docs/qa/render-verify.mjs         # 기본 컴포넌트·테이블   10건
node docs/qa/charts-render-verify.mjs  # 차트 로딩·오류         22건
node docs/qa/loading-render-verify.mjs # 스켈레톤·진행률        42건
node docs/qa/state-render-verify.mjs   # 상태·아바타·썸네일      26건
node docs/qa/guide-render-verify.mjs   # Tooltip·Hint·Tour      30건
node docs/qa/form-render-verify.mjs    # 폼·한글 IME            19건
node docs/qa/peek-render-verify.mjs    # Peek·다녀온 행         22건
node docs/qa/mcp-client-verify.mjs     # MCP 서버 (브라우저 없음) 36건
```

하네스 목록·인자·샤드 배분은 `docs/qa/run-plan.mjs` 에 있다. 새 하네스는 거기 `HARNESSES` 에 넣는다
(기준선에 없으면 중간값으로 배분된다).

전부 `docs/qa/browser.mjs` 를 거친다. **GUI Chrome 을 직접 띄우지 마라** —
이유는 "이미 밟은 함정" 절에 있다.

## 상시 규칙

문서는 매니페스트에서 렌더한다. 규칙을 MDX에 복사하지 마라.

글꼴은 앱이 로드한다 — Storybook도 소비자와 같은 Pretendard CSS import를 사용한다.

1. **색은 단독 신호가 되지 않는다.** 상태·에러는 아이콘 + 문장 + 색 세 가지를 함께 쓴다(WCAG 1.4.1).
   같은 모양 아이콘을 색만 바꿔 쓰는 것은 이 요구를 만족시키지 못한다 — 실루엣이 달라야 한다.
2. **원시 색상(`--color-brand-600` 등)을 컴포넌트에서 직접 쓰지 않는다.** 의미 토큰을 거친다.
   클래스에 색 이름이 박히면 브랜드 교체가 불가능해진다.
3. **그림자는 떠 있는 레이어(팝오버·드롭다운·모달)에만.** 평면 위 요소는 경계선과 여백으로 구조를 만든다.
   스타일이 "A 정밀 플랫"으로 확정됐고, 그 정의가 그림자 0이다.
4. **값이 들어가는 자리에 고정 너비를 주지 않는다.** 최소 너비 + 말줄임 + 전체값 보존(`title` 등).
5. **숫자가 열로 정렬되는 곳은 고정폭 숫자**(`.tabular`). 금액 자릿수가 흔들리면 비교가 불가능해진다.
6. **본문 대비 하한 4.5:1**, 큰 텍스트·비텍스트 3:1. 입력 필드 경계선은 `border-field`를 쓴다
   (연회색 `neutral-200`은 1.31:1로 규격 위반).
7. **주석에 "왜"를 쓴다.** 수치가 어디서 나왔는지 적어라. 6개월 뒤에 조절할 수 있어야 한다.
8. 컴포넌트는 shadcn/ui 방식으로 **소스를 직접 소유**한다. `data-slot` 속성을 유지해 외부에서 덮어쓸 수 있게 한다.

## 이미 밟은 함정 — 반복하지 마라

**Radix Tabs는 `click`이 아니라 `mousedown`에서 선택한다.**
`element.click()`은 `click`만 보내므로 **선택이 바뀌지 않는다.** 하네스에서 이걸로
5건이 거짓 실패했다. `dispatchEvent(new MouseEvent('mousedown', {bubbles:true, button:0}))`
를 쓰거나 포커스 + 키보드를 쓴다. 좌표 CDP 클릭은 가로 스크롤 때문에 엉뚱한 곳을 누른다.

**`CANVAS`는 선택자 문자열이 아니라 JS 표현식이다.**
`` `${CANVAS} [data-x]` ``를 `querySelector`에 넘기면 `SyntaxError`다.
문서 전역에서 유일한 선택자를 쓰거나 `${CANVAS}.querySelector(...)`로 평가해라.

**하네스에서 내부 버튼을 좌표로 누르지 마라.**
`scrollIntoView`가 문서를 움직여서 "문서가 안 밀린다" 같은 검사를 스스로 깨고,
애니메이션 중 좌표가 흔들려 플레이키해진다. 요소에 `.click()`을 보내고,
좌표 포인터는 **바깥 클릭처럼 진짜 포인터가 필요할 때만** 쓴다.

**roving tabindex는 지연된다.**
한 번도 포커스를 받지 않은 탭 목록은 선택된 탭까지 `tabIndex=-1`이다. 차가운 DOM에
`선택 0·나머지 -1`을 단언하면 거짓 실패한다. Tab 도달 자체를 검사해라.

**브라우저가 포커스된 요소를 알아서 스크롤해 온다.**
포커스가 움직이는 경로에서는 우리 끌어오기 코드가 `delta=0`으로 조기 반환한다.
그 코드를 검증하려면 **포커스 없이 값만 바뀌는 제어 경로**를 만들어야 한다.


**Tailwind v4의 `--spacing`은 "값"이 아니라 "배수"다.**
`--spacing-4: 4px` 같은 토큰을 `@theme`에 내보내면 `p-4`가 16px 대신 4px이 되고
`size-4` 아이콘이 4px, `min-w-16`이 64px 대신 16px로 컴파일된다.
Tailwind 기본값(`0.25rem` = 4px 배수)이 이미 우리 4px 그리드와 같다. **덮어쓰지 마라.**
`--space-*` 토큰은 `var()`로 직접 쓸 때만 사용한다.

**글자 크기는 `text-[length:var(--x)]`로 명시한다.**
`text-[var(--text-body-sm)]`는 Tailwind가 font-size인지 color인지 판별할 수 없어
`color: var(--text-body-sm)`으로 컴파일되고, `tailwind-merge`도 색상으로 간주해
같이 적용한 글자색(`text-fg-on-brand` 등)을 지워버린다.

**OKLCH 명도가 같아도 WCAG 대비는 같지 않다.**
상대휘도 공식이 녹색에 0.7152 가중치를 준다. 같은 600단계에서 brand는 4.57:1이지만
success는 3.89:1이다. "600단계는 안전하다"는 규칙은 없다. 실측 검증에 맡겨라.

**대비 임계값 판정에 반올림한 값을 쓰지 마라.** 4.4992가 4.50으로 통과한다.

**`@radix-ui/*` 는 `packages/ui/src/internal/` 에서만 import 한다.**
`components/` 는 `internal/` 을 거쳐 쓴다. 어기면 `pnpm verify` 가 `exit 1` 한다
(`scripts/check-boundaries.mjs`). 이 경계가 있어야 나중에 Radix 를 바꿀 수 있다.
`exports` 맵에 `./internal` 을 추가하지 마라 — 경계가 사라진다.

**JS 에서 CSS 를 import 하지 마라.** 컴포넌트 CSS 는 `components.css` 한 곳에
모은다. 섞여 있으면 앱이 JS 만 import 했을 때 일부 컴포넌트가 스타일 없이 렌더된다
(실제로 guide·form·peek 이 그랬다).

**패키지 안에서 자기 이름(`@s2life/ui`, `@s2life/ui/icons`)으로 import 하지 마라.** 자기 참조는
exports 를 거쳐 `packages/ui/dist/` 로 해석된다. dist 는 빌드 뒤에만 생기는 .gitignore 대상이라
오래된 dist 가 남은 로컬은 통과하고 깨끗한 CI 는 TS2307 로 깨진다(실측: R31~R43b 원격 CI 11회 연속
실패를 로컬 게이트가 못 봤다). 소스 안에서는 `../icons`·`../index` 상대 경로를 쓴다.
`scripts/check-boundaries.mjs` 가 pre-commit 에서 막고, pre-push 는 임시 git worktree 에서
dist 없이 typecheck 한다(`pnpm typecheck:clean [커밋]`).

**macOS 에서 `/Applications/*.app/Contents/MacOS/*` 를 직접 실행하지 마라.**
에이전트 샌드박스(Orca/Codex 의 Seatbelt) 안에서 **크래시한다.** 실제 리포트:

```
Parent Process: node   ·   Responsible Process: Orca
Termination Reason: SIGNAL 6, Abort trap
  abort() → ___RegisterApplication_block_invoke → _RegisterApplication
  → TransformProcessType → ChromeMain
```

Chrome 이 GUI 앱으로 등록(`TransformProcessType`)을 시도하는데 샌드박스 안에서는
coreservicesd 체크인이 실패해 abort 한다. **`--headless=new` 도 안전하지 않다** —
그건 GUI 바이너리를 창 없이 돌리는 것이라 같은 경로를 탄다.

`--no-sandbox` · Chrome 재설치 · 프로필 삭제는 해결책이 아니다.
Chrome 내부 샌드박스와 Orca 의 외부 Seatbelt 는 별개이고, 끄면 보안만 약해진다.

**리눅스 CI 의 `No usable sandbox!` 는 이것과 다른 문제다.** Ubuntu 23.10+ 가
AppArmor 로 비특권 user namespace 를 막아 Chromium zygote 가 초기화에 실패하는
것이다. 증상만 비슷하다. 거기서도 `--no-sandbox` 를 쓰지 않고 워크플로에서
커널 제한만 푼다 — 샌드박스는 켜둔다.

**하네스를 쓴 macOS(트랙패드) 와 실제 사용 환경은 세 가지가 다르다.** 2026-11-22 첫 리눅스 CI 에서
R31·R41 하네스가 15건 실패한 원인이다.
- 리눅스 헤드리스는 포인터 장치가 없어 `(hover: hover)` 가 false 라 Tailwind v4 `hover:` 가 안 먹는다.
  `browser.mjs` 의 `parityArgs()` 가 마우스 있는 데스크톱 조건을 준다(Playwright 와 같은 값).
- 리눅스는 글꼴 힌팅으로 같은 tnum 숫자 폭이 1px 까지 갈린다. 폭 단정은 1px 허용 + 비례 숫자와 비교로 쓴다.
- **클래식 스크롤바(Windows·리눅스·마우스를 연결한 macOS)는 10~11px 자리를 차지한다.** 이 차이로
  탭 기준선이 스크롤바에 가려지던 제품 결함이 드러났다(DESIGN.md §16.1). 그래서 `--hide-scrollbars`
  같은 인자로 가리지 않는다. 스크롤바가 결과를 바꾸는 단정은 두께(`offsetHeight − clientHeight`)를
  실측하고, CDP `Emulation.setScrollbarsHidden` 으로 두께 0 상태도 함께 돌린다. 선이 실제로 보이는지는
  계산 스타일로 알 수 없으니 `decodePng` 로 그려진 픽셀을 본다.
리눅스 재현은 Docker(`node:22-bookworm` + headless shell, 일반 사용자, `--security-opt seccomp=unconfined`,
`LANG=C.UTF-8`)로 된다 — `--no-sandbox` 는 쓰지 않는다. 컨테이너 안 6099 는 호스트와 겹치지 않는다.

**브라우저 검증은 `docs/qa/browser.mjs` 를 거친다.** 거기서
`chrome-headless-shell`(AppKit 을 링크하지 않는 별도 바이너리)을 찾아 띄우고,
GUI 앱 번들 경로는 **거부**한다. 없으면 `npx playwright install chromium-headless-shell`.

**헤드리스 브라우저로 포커스 동작을 검증할 때는 포커스 에뮬레이션을 켜라.**
헤드리스 Chrome 은 문서가 시스템 포커스를 갖지 않으면 `focus`/`focusin` 이벤트를
억제한다. CDP 의 `Emulation.setFocusEmulationEnabled: true` 를 빠뜨리면
포커스 관련 기능이 전부 "깨진 것처럼" 보인다. `docs/qa/browser.mjs` 의 `launchBrowser()` 가 이미 켜고 있으니 그것을 쓴다.

**테마 토큰을 `@media`나 `[data-theme]` 블록 안에서만 정의하지 마라.**
테마 미지정 상태(사용자 대부분)에서 해소되지 않아 한쪽 테마 글자가 반대 테마 바탕에 얹힌다.
모든 토큰은 `:root`에 기본값을 갖는다. 생성기가 이것을 검사한다.

**글 영역의 줄바꿈을 `white-space: normal` 로 되돌리지 마라.** 조상의 `nowrap` 을
이기려다 사용자가 `pre-line`·`pre` 로 보존한 개행까지 지운다(실측: 3줄 → 1줄).
줄이 바뀌기만 하면 될 때는 `text-wrap-mode: wrap` 을 쓴다. 개행 보존
(`white-space-collapse`)은 상속값 그대로 남는다. ClampText 가 이렇게 한다.

**문서 페이지에서 iframe 으로 격리한 스토리는 play 가 돈다.** 인라인 스토리와 달리
`docs.story.inline: false` 의 iframe 은 스토리 화면과 같아서, 여러 iframe 의 play 가
동시에 포커스를 잡고 서로 빼앗는다(실측: 전체 QA 3회 중 1회 Tour 포커스 단정 실패).
iframe 격리를 쓰는 스토리는 부모가 `viewMode=docs` 일 때 play 를 건너뛴다
(`guide.stories.tsx` 의 `outsideDocs`).

**SSR 앱에서 ClampText 의 더보기는 하이드레이션 뒤에 생긴다.** 서버 HTML 에는 버튼이
없다(설계대로 — 넘침은 브라우저에서만 잰다). 렌더 직후에 세면 0 이다
(실측: +117ms 0 → +627ms 10). 조건 대기로 센다.

**스토리에 화면 채우기(`vh`·`dvh`·`min-h-dvh`)를 문서 모드까지 새게 하지 마라.** 문서 페이지는
스토리를 인라인으로 쌓으므로 미리보기마다 창 높이만큼 빈 상자가 된다(실측: Combobox 문서
15,471px, 테스트용 `180vh` 스토리 1,620px). 스크롤 검증용 여유 높이는
`render: (_, { viewMode }) => …` 로 `viewMode !== 'docs'` 일 때만 준다. 문서 하네스가 창 높이를
900→600 으로 바꿔 미리보기 높이가 그대로인지 검사한다.


## 작업 규율

- 커밋·푸시하지 않는다. 작업 트리를 더티 상태로 남긴다. 히스토리는 오케스트레이터가 관리한다.
- 전역 패키지를 설치하지 않는다. 프로젝트 로컬 설치는 괜찮다.
- 요청받지 않은 파일을 삭제하거나 리팩터링하지 않는다.
- 끝나면 보고한다: 만든/고친 파일, 검증한 것, 의도적으로 하지 않은 것.
- `.claude/`, `~/.claude/`, `agents/` 는 읽지도 고치지도 않는다. 다른 AI 시스템의 설정이다.

## 아직 없는 것

리치 텍스트 편집기 · 계층 카테고리 트리 · 칸반 보드 · 알림 센터 — P3(필요할 때).
P1(검색 입력 R33 · 앱 셸 R34 · 페이지네이션 R35 · 옆 패널 R36 · 파일 업로드 R37)과
P2(날짜+시간 R40 · KPI 타일 StatTile R41 · 세그먼트 R42 · 단계 표시 Steps R43)는 2026-11-22 완료.
MCP 카탈로그는 88KB / 90KB — P3 부품을 넣기 전에 예산을 다시 정한다(응답 단위 예산은 R37·R42).
근거와 순서는 `docs/research/ui-coverage-review.md` (2026-11-21).

고유 CSS 클래스 37개는 R39에서 `ds-` 이름 공간으로 옮겼다. 새 CSS 클래스도 반드시 `ds-`로
시작한다(공개 `.sr-only`·`.tabular` 예외). 앱 CSS 클래스에 `ds-`를 쓰거나 Tailwind 유틸리티
이름을 다시 정의하지 않는다. `styles.css`는 앱 전체 preflight·유틸리티를 포함한다.
