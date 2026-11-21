# R27 · 설치는 `@s2life/ui` 하나 — 토큰은 따라온다

사용자 요청: "ui 만 받으면 토큰도 같이 들어 있게. 개발·수정은 따로 하되 업데이트는 반영되게."
패키지는 **지금처럼 세 개로 따로 개발·배포**한다. 바뀌는 건 소비자가 설치하는 방식과 그걸
보장하는 장치다. **버전은 올리지 마라.**

---

## 0. 전제 — 내가 측정한 것

`@s2life/ui@0.3.0` 은 이미 `"@s2life/tokens": "0.3.0"`(정확 고정)을 의존성으로 갖는다.
lockstep 배포라 ui 를 올리면 tokens 도 같은 버전으로 따라온다. 빈 새 디렉터리에
**`@s2life/ui` 만** 설치해 쟀다 (레지스트리 0.3.0):

| | npm | pnpm (엄격) |
|---|---|---|
| tokens 자동 설치 | ✓ | ✓ |
| `@s2life/ui/styles.css` | ✓ | ✓ |
| Tailwind v4 경로 (`@import "@s2life/ui/tailwind.css"`) 빌드 · 토큰 포함 | ✓ | ✓ |
| 앱 코드에서 `@s2life/tokens/tokens.css` · `tokens.json` | ✓ (호이스팅 우연) | **✗ 해석 실패** |

그리고 문서가 이 깨지는 길을 안내한다:

- `packages/ui/docs/01-getting-started.mdx` — `npm install @s2life/ui @s2life/tokens` 다음에
  `import '@s2life/tokens/tokens.css'; import '@s2life/ui/styles.css';` 두 줄.
  `styles.css` 가 토큰을 이미 포함하므로 첫 줄은 **중복**(31KB 두 번)이고, pnpm 에서 ui 만
  설치하면 **그 줄에서 빌드가 깨진다.** 같은 문서의 "0.3.0 미게시 변경에 포함됩니다" 도 이제 거짓이다.
- `README.md`, `packages/ui/README.md` — `npm install @s2life/ui @s2life/tokens react react-dom`.
  README 의 "토큰만 필요하다면 `@s2life/tokens/…`" 도 같은 문제.
- `docs/qa/pack-verify.mjs` — 소비자 앱이 세 패키지를 **전부 직접 의존**한다. 그래서
  "ui 만 설치" 경로는 한 번도 검증되지 않았다.

앱이 tokens 를 따로 직접 설치하면 버전이 어긋날 수도 있다(ui@Y 가 고정한 tokens@Y 와
앱의 tokens@X 가 공존). 설치 경로가 하나면 이 문제가 생기지 않는다.

## 1. ui 가 토큰 파일을 하위 경로로 제공한다

`@s2life/ui` exports 에 추가:

- `./tokens.css`, `./theme.css`, `./tokens.json`

`scripts/build-ui.mjs` 가 `packages/tokens/` 의 세 파일을 `packages/ui/dist/` 로 **바이트 그대로
복사**한다. CSS 를 `@import` 로 감싸는 스텁은 쓰지 마라 — JSON 은 감쌀 수 없고, `<link>` 로
직접 쓰는 소비자도 있다. 출처는 tokens 패키지 하나여야 한다(손으로 고치는 파일을 늘리지 마라).

## 2. 안내를 한 길로

- `README.md`, `packages/ui/README.md`, `01-getting-started.mdx`:
  - 설치: `npm install @s2life/ui` (React·React DOM 19.3+ 는 peer — 없으면 함께)
  - CSS: `import '@s2life/ui/styles.css';` **한 줄**. tokens import 줄은 지운다
  - 토큰을 직접 써야 할 때: `@s2life/ui/tokens.css` · `theme.css` · `tokens.json`
  - 한 문장 경고: **앱에 `@s2life/tokens` 를 따로 설치하지 않는다** — ui 가 같은 버전을 고정해
    가져온다. 따로 설치하면 버전이 어긋날 수 있다
  - "0.3.0 미게시" 같은 시점 문장은 지운다
- `packages/tokens/README.md`: 맨 위에 "React 앱은 `@s2life/ui` 만 설치한다. 이 패키지 단독 설치는
  React 없이 토큰만 쓰는 프로젝트용이다" 를 둔다. 나머지 내용은 유지.
- 개발 구조 설명(README 의 "빌드와 버전" 근처)에 세 패키지의 관계를 짧게:
  tokens 를 고치면 → lockstep 으로 셋 다 같은 버전으로 배포 → ui 가 그 버전을 고정 의존 →
  앱은 ui 만 올리면 된다.

## 3. 검증 — 이 길을 실제로 지킨다

**`pack-verify.mjs`** — 소비자 앱의 직접 의존을 **`@s2life/ui` 와 `@s2life/mcp` 만**으로 바꾼다
(MCP 는 앱 의존이 아니라 npx 검사용이라 유지). tokens tarball 은 이미 있는 `pnpm.overrides` 로
공급된다(아직 게시 안 된 버전 대응 — R25 에서 고친 그 장치). 단정 추가:

- 앱에서 `@s2life/tokens/tokens.css` 해석이 **실패한다** (pnpm 격리 — 이 검사가 "ui 만" 경로임을 보증)
- 앱에서 `@s2life/ui/tokens.css` · `theme.css` · `tokens.json` 이 해석되고, 각 파일이 tokens
  tarball 의 같은 파일과 **바이트 동일**
- `import tokens from '@s2life/ui/tokens.json' with { type: 'json' }` 가 node 에서 동작
- 기존 styles.css 렌더 · Tailwind 경로 · MCP 검사는 그대로 통과

**문서 단위 테스트** (새 파일이든 기존 파일이든) — `README.md`, `packages/ui/README.md`,
`packages/ui/docs/*.mdx` 에:
- `npm install` 줄에 `@s2life/tokens` 가 없다
- `'@s2life/tokens/` · `"@s2life/tokens/` import 가 없다
(`packages/tokens/README.md` 는 대상 밖)

기존 `package-boundary.test.mjs` · `package-version.test.mjs` 가 새 exports 와 충돌하면 고치되,
lockstep 과 정확 고정(`"@s2life/tokens": "<같은 버전>"`) 검사는 **약하게 만들지 마라.**

## 4. 하지 마라

- 패키지를 합치거나 tokens 를 ui 에 번들해 의존을 없애기 (따로 개발·배포가 요구사항이다)
- tokens 의존을 범위 버전(`^`)으로 바꾸기 — 정확 고정이 "같이 올라간다"의 보증이다
- MCP 를 ui 의존성에 넣기
- 버전 범프

## 5. 유지보수 꼬리

- `CHANGELOG.md` `0.3.1 — 미게시`: 추가(ui 토큰 하위 경로), 바뀐 안내(설치는 ui 하나)
- `AGENTS.md` 의 패키지 설명에 세 패키지 관계가 있으면 맞춰라

## 6. 보고할 것

1. 바꾼 파일 목록
2. 복사 방식 (build-ui.mjs 코드 인용)과 바이트 동일 검사 코드
3. pack-verify 소비자 package.json 이 어떻게 바뀌었는지
4. `pnpm verify` 결과 (레지스트리 시간 초과가 나면 `npm_config_offline=true` 로 재실행하고 그렇게 적어라)
5. 명세와 다르게 한 부분

`pnpm qa` 와 브라우저는 내가 돌린다.
