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
| `packages/ui/src/lib/runtime-tokens.ts` | 동일 — 부품이 JS 로 읽는 토큰 값만(목록 `docs/research/ui-runtime-tokens.mjs`) |

색·활자·간격 수치는 **`docs/research/tokens-build.mjs` 안에서만** 고치고 `pnpm tokens`로 재생성한다.
생성된 CSS를 직접 편집하면 다음 재생성에서 날아가고, 검증도 우회된다.

## 검증

```bash
pnpm tokens       # 토큰 재생성 + 대비 · 의미분리 · 테마 3상태 검증
pnpm typecheck
pnpm build-storybook
pnpm size         # 앱 번들 크기 — tarball 을 Vite 앱처럼 묶어 Button ≤ 60kB · lucide 전체·tokens.json 없음 (docs/qa/bundle-size.md)
pnpm verify       # 위 네 개를 순서대로
```

### 게이트는 자동으로 돈다

```
pre-commit  토큰·매니페스트 재생성 + 산출물 동기 확인 + 타입 + 단위·함정 린트
pre-push    깨끗한 체크아웃 typecheck + pnpm verify + pnpm qa(엄격 — dirty 빌드 거부)
            origin/main 대비 .github/** 만 바뀌었으면 qa 를 건너뛴다 · SKIP_QA=1 로 qa 만 건너뛸 수 있다
            보내는 sha 전부의 원격 gate 가 이미 녹색이면 qa 를 건너뛰고 근거 run URL 을 찍는다
CI          verify.yml — build·checks·node·harness 병렬 job 을 `gate` 하나로 모은다 (CI=true 라 엄격)
            `gate` 는 main 브랜치 보호의 필수 체크다 — 아래 "main 통합"
```

훅은 `.githooks/` 에 있고 `pnpm install` 이 `core.hooksPath` 를 걸어준다
(husky 없음 — git 기본 기능이다). **가장 중요한 검사는 "생성 파일이 소스와 맞는가"** 다.
생성기를 고치고 산출물 커밋을 잊는 것이 가장 흔한 사고라 pre-commit 이 재생성 후
`git diff` 로 막는다.

`pnpm verify`가 통과하지 않은 작업은 완료가 아니다.
토큰을 건드렸으면 `pnpm tokens` 출력의 실패 항목을 반드시 읽어라 — 종료 코드 1로 막는다.

### 브라우저 하네스

```bash
pnpm qa           # 전부(배포 리허설 포함) — 빈 포트에 정적 서버를 띄우고 출처를 확인한 뒤 돈다
pnpm qa --build   # 스토리북부터 다시 빌드 — 빌드가 HEAD 와 다르면 qa 가 거부한다
pnpm qa --only steps-render-verify,mcp-client-verify   # 일부만. 모르는 이름·틀린 인자는 서버 띄우기 전 exit 2
pnpm qa --jobs 2  # 서버 하나에 브라우저 2개로 병렬 (pack-verify 는 혼자 먼저)
pnpm qa --group storybook --shard 1/2 --timings out.json   # CI 샤드: 그룹 안에서 기준선 시간으로 등분 + 하네스별 초·결과
pnpm qa --port 6099   # 포트를 고정할 때만. 차 있으면 즉시 실패한다 (기본 0 = 빈 포트)
pnpm build        # 패키지 빌드 (ui dist + CSS)
pnpm qa:pack      # 배포 리허설만 — tarball → 샘플 앱 설치 → 실제 렌더 (임시 폴더)
pnpm publish:check # 세 패키지 npm publish --dry-run 의 자동 교정 경고 검사 (닫힌 레지스트리 — 올라가지 않는다)
pnpm version:set  # 세 패키지 버전을 함께 올린다 (lockstep)

# 하네스 하나를 손으로 (빌드는 HEAD 와 같아야 한다 — pnpm build-storybook)
node docs/qa/static-server.mjs                       # 빈 포트에 storybook-static 을 띄우고 주소를 알려 준다
DS_SB_URL=<그 주소> node docs/qa/render-verify.mjs     # DS_SB_URL 이 없으면 6099 를 보되, 출처 확인은 똑같이 한다
```

하네스 목록·인자·샤드 배분은 `docs/qa/run-plan.mjs` 에 있다. 새 하네스는 거기 `HARNESSES` 에 넣는다
(기준선 `docs/qa/timings/` 에 없으면 중간값으로 배분된다). 키·클릭은 하네스마다 다시 쓰지 말고
`browser.mjs` 의 `actions(browser)`(key·press·enter·click·pointerClick·pointerAt·computed·findPortal)를 쓴다.
기계로 잡히는 함정은 `docs/qa/traps.test.mjs` 가 막는다.

전부 `docs/qa/browser.mjs` 를 거친다. **GUI Chrome 을 직접 띄우지 마라** —
이유는 "이미 밟은 함정" 절에 있다.

일회성 사전 계측 스크립트(R40~R43 CoreText·폭 계측)는 `docs/qa/measure/` 에 있다. 게이트·CI 는 돌리지 않는다.

### 소개 사이트 (apps/site · 로컬 전용)

```bash
pnpm site           # 개발 서버 http://localhost:6200 — 고정(strictPort). 6006 Storybook·6099 하네스와 겹치지 않는다
pnpm site:build     # 정적 빌드 → apps/site/dist (.gitignore). CI 에 넣을지는 DevOps 몫
pnpm site:preview   # 빌드 결과를 6201 로
```

배포하지 않는다(2026-11-24 오너 결정). 6200 을 쓰기 전에 `lsof -nP -iTCP:6200 -sTCP:LISTEN` 으로 주인(작업 폴더)을 확인하고,
끌 때는 띄운 PID 로만 끈다. `pnpm typecheck` 가 `apps/site/tsconfig.json` 도 검사하고, `docs/qa/site.test.mjs` 가
사이트의 경계(공개 진입점만 import · `site-` 클래스·의미 토큰만 · 토큰 분류 전부 파운데이션에 실림 · 포트)를 막는다.
사이트 데이터는 생성물(manifest.json·tokens.json·DESIGN.md·스토리)에서만 읽는다 — 부품 목록·값을 사이트에 손으로 옮겨 적지 않는다.

## main 통합

main 에는 브랜치 보호가 걸려 있고 **관리자도 예외가 아니다**(`enforce_admins`).

- **필수 체크 `gate`**(verify.yml, GitHub Actions 앱). 그 sha 의 `gate` 가 녹색이 아니면 main 으로 가는 push 는
  거절된다(`GH006 … Required status check "gate" is expected`). main 에서 커밋을 만들어 바로 올리는 직접 push 는 안 된다.
- **강제 push 금지 · 삭제 금지.** 그래서 main 은 빨리 감기로만 움직인다.
- **GitHub 병합 버튼은 쓰지 않는다.** 병합·스쿼시·리베이스 버튼은 gate 를 받은 것과 **다른 sha** 를 main 에 만든다.
  main 의 모든 sha 는 그 sha 그대로 gate 를 통과한 것이어야 한다. 같은 저장소 PR 의 `pull_request` run 은 일부러
  건너뛰므로(push run 이 판정한다) PR 화면의 체크 표시도 판정 근거가 아니다.
- **`--no-verify` 금지.** pre-push 를 건너뛰는 길은 훅에 이유와 함께 정해 둔 것(태그만·`.github/**` 만·`SKIP_QA=1`·
  원격 gate 녹색)뿐이다.

절차 — 브랜치 이름·sha 는 자기 것으로:

```bash
# 1. 최신 main 위로 올린다. 빨리 감기만 되니 main 이 앞서 있으면 4번이 거절된다.
git fetch origin && git rebase origin/main

# 2. 작업 브랜치를 push 한다 — pre-push 게이트 전부가 돈다.
GIT_SSH_COMMAND="ssh -o ServerAliveInterval=30 -o ServerAliveCountMax=120" git push -u origin tom783/x

# 3. 그 sha 의 원격 gate 가 녹색이고 headSha 가 내 sha 와 같은지 본다. 진행 중이면 gh run watch <id>.
sha=$(git rev-parse HEAD)
gh run list -R tom783/design-system --branch tom783/x --json databaseId,headSha,status,conclusion,url -L 5
gh api "repos/tom783/design-system/commits/$sha/check-runs?check_name=gate" \
  --jq '.check_runs[] | [.head_sha, .status, .conclusion, .html_url] | @tsv'   # 브랜치 보호가 보는 바로 그 체크

# 4. 바로 그 sha 로 main 을 빨리 감는다. 그 sha 를 HEAD 로 둔 깨끗한 작업 폴더에서 한다(verify 는 작업 트리를 본다).
GIT_SSH_COMMAND="ssh -o ServerAliveInterval=30 -o ServerAliveCountMax=120" git push origin "$sha":main

# 5. main push 가 만든 run 의 gate 도 녹색인지 본다(main run 은 취소되지 않는다).
gh run list -R tom783/design-system --branch main --json headSha,status,conclusion,url -L 3
```

4번의 pre-push 는 보내는 sha 의 원격 gate 가 이미 녹색이면 브라우저 하네스(약 6분)를 건너뛰고 근거 run URL 을
찍는다. typecheck·verify 는 그대로 돈다. gh 가 없거나, 조회가 실패하거나, gate 가 진행 중·실패·없음·headSha 불일치면
평소대로 전부 돈다(`scripts/gate-reuse.mjs`, 시험 `docs/qa/gate-reuse.test.mjs`).

거절되면: `non-fast-forward` 는 main 이 앞서 있다는 뜻이다 — 1번부터 다시(rebase 하면 sha 가 바뀌니 2·3번도).
`GH006 … "gate" is expected` 는 3번이 끝나지 않은 sha 를 보낸 것이다.

## 버전·릴리스 (2026-11-24 오너 결정)

- **병합마다 올리지 않는다. 오너 목표가 끝날 때 한 번 올린다.** 목표 중간의 병합은 CHANGELOG `## 미출시` 에만 쌓는다.
- **어느 자리를 올리나(1.0 전):** 새 부품·공개 API 추가·호환 깨짐이 하나라도 있으면 `0.x.0`, 고침·내부 개선만이면 `0.x.y`.
- **버전 확정 = 번호와 변경 기록 확정이다. 게시가 아니다.**
  1. `pnpm version:set <x.y.z>` — 세 패키지(tokens·ui·mcp)·상호 의존·lockfile 을 함께(lockstep, DESIGN.md §15.3).
  2. CHANGELOG `## 미출시` → `## <x.y.z> — 미게시`(지난 판 이후 그 목표들의 변경 전부와 **앱이 할 일**), 위에 빈 `## 미출시`.
  3. `pnpm publish:check`(세 패키지 `npm publish --dry-run`, 레지스트리에 올라가지 않는다)까지만 돌린다.
- **태그(`v<버전>`)·npm 게시·release 워크플로 실행은 하지 않는다** — 받아 쓰는 앱이 그 판을 필요로 하거나 오너가 요청할 때,
  오너 승인을 받아서만 한다. 태그는 게시된 판에만 붙인다(CHANGELOG 머리말). 게시하면 그 판 제목의 `미게시` 를 날짜로 바꾼다.

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
실패를 로컬 게이트가 못 봤다). 소스 안에서는 상대 경로를 쓴다 — 스토리는 `../icons`·`../index`, **부품·lib 은 `lucide-react`·부품 파일을
직접**(공개 진입점을 가져오면 앱 번들이 진입점 전체를 받는다 — lucide 전체가 실렸다, DESIGN.md §15.6.1).
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
`LANG=C.UTF-8`)로 된다 — `--no-sandbox` 는 쓰지 않는다. 포트는 run-all 이 빈 포트를 받으니 호스트와 겹치지 않는다.

**하네스가 남의 서버를 검사하고 통과할 수 있다.** 2026-11-22 작업 폴더 여럿이 6099 를 번갈아 쓰다가
run-all 이 다른 폴더의 서버를 자기 것으로 받아들였다 — `npx http-server` 는 바인드 실패를 조용히 넘겼고,
준비 확인은 그 포트에서 응답하는 아무 서버나 받았다. 지금은 구조로 막는다.
- run-all 은 내장 정적 서버(`static-server.mjs`)를 **빈 포트**(`--port 0`)에 띄운다. 지정한 포트가 차 있으면
  즉시 실패한다(macOS 는 127.0.0.1 bind 가 남의 `*:port` 를 가로챌 수 있어 bind 전에 접속해 본다).
- 빌드 폴더에 무작위 `__qa-nonce.txt` 를 쓰고 서버에서 같은 값을 읽어야 진행한다.
- `pnpm build-storybook` 이 남기는 `build-info.json` 의 sha 가 HEAD 와 다르면 거부한다. dirty 빌드는 로컬에서
  경고, pre-push(`DS_QA_STRICT=1`)·CI(`CI=true`)에서 거부한다.
- 하네스는 고정 주소 대신 `storybookBase()`(`DS_SB_URL`)를 쓰고 같은 확인을 한 번 더 한다. CDP 포트도
  브라우저가 고른다(`DevToolsActivePort`). 고정 6099·고정 CDP 포트·`http-server` 는 함정 린트가 막는다.

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
MCP 응답 예산은 `packages/mcp/budget.mjs` 한 곳(R49) — `design://components` 선택 색인 23KB / 40KB · `list_components` 20KB / 36KB ·
상세 한 건 7KB(0.6.0 전 6KB). 요약 응답은 가장 큰 가족 4개분 여유를 늘 남기고, 모자라면 `mcp:build` 가 실패한다(P3 4가족은 이 여유 안이다).
근거와 순서는 `docs/research/ui-coverage-review.md` (2026-11-21).

고유 CSS 클래스 37개는 R39에서 `ds-` 이름 공간으로 옮겼다. 새 CSS 클래스도 반드시 `ds-`로
시작한다(공개 `.sr-only`·`.tabular` 예외). 앱 CSS 클래스에 `ds-`를 쓰거나 Tailwind 유틸리티
이름을 다시 정의하지 않는다. `styles.css`는 앱 전체 preflight·유틸리티를 포함한다.
