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

`pnpm verify`가 통과하지 않은 작업은 완료가 아니다.
토큰을 건드렸으면 `pnpm tokens` 출력의 실패 항목을 반드시 읽어라 — 종료 코드 1로 막는다.

### 브라우저 하네스

```bash
pnpm qa           # 아래를 전부 — 빌드·서버 기동·7개 하네스 (181건)

# 개별 실행
pnpm build-storybook
npx http-server storybook-static -p 6099 -s &
node docs/qa/render-verify.mjs         # 기본 컴포넌트·테이블   10건
node docs/qa/charts-render-verify.mjs  # 차트 로딩·오류         22건
node docs/qa/loading-render-verify.mjs # 스켈레톤·진행률        42건
node docs/qa/guide-render-verify.mjs   # Tooltip·Hint·Tour      30건
node docs/qa/form-render-verify.mjs    # 폼·한글 IME            19건
node docs/qa/peek-render-verify.mjs    # Peek·다녀온 행         22건
node docs/qa/mcp-client-verify.mjs     # MCP 서버 (브라우저 없음) 36건
```

전부 `docs/qa/browser.mjs` 를 거친다. **GUI Chrome 을 직접 띄우지 마라** —
이유는 "이미 밟은 함정" 절에 있다.

## 상시 규칙

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

## 작업 규율

- 커밋·푸시하지 않는다. 작업 트리를 더티 상태로 남긴다. 히스토리는 오케스트레이터가 관리한다.
- 전역 패키지를 설치하지 않는다. 프로젝트 로컬 설치는 괜찮다.
- 요청받지 않은 파일을 삭제하거나 리팩터링하지 않는다.
- 끝나면 보고한다: 만든/고친 파일, 검증한 것, 의도적으로 하지 않은 것.
- `.claude/`, `~/.claude/`, `agents/` 는 읽지도 고치지도 않는다. 다른 AI 시스템의 설정이다.

## 아직 없는 것

데이터 테이블(TanStack) · 차트 라이브러리 · 스켈레톤·로딩 모션 · 온보딩 투어 ·
폼 연속 입력 UX · MCP 제공 레이어. `DESIGN.md` 8절 참조.
