# R14 · 배포 가능한 패키지로 — @s2life/*

지금 상태로는 **셋 중 하나도 배포할 수 없다.** 사람이 정한 방향이다:

- 스코프는 **`@s2life/*`**
- **3개 패키지**: `tokens`(CSS·JSON) · `ui`(React) · `mcp`(CLI)
- **버전은 묶어서 올린다(lockstep)** — MCP 매니페스트가 UI 를 기술하므로
  따로 가면 "MCP 는 v2 를 말하는데 ui 는 v1" 이 된다
- npm 과 MCP 는 **대체재가 아니다.** MCP 서버 자체가 `npx @s2life/mcp` 로
  배달되므로 npm 배포가 전제다

---

## 1. 먼저 고칠 결함 — CSS 가 두 경로로 로드된다 (실측)

| 방식 | 컴포넌트 |
|---|---|
| `.tsx` 에서 `import './x.css'` | thumbnail · loading · toast · state · avatar · data-table |
| `styles.css` 의 `@import` 로만 | **guide · form · peek** |

지금은 스토리북이 `styles.css` 를 불러서 가려져 있다. **패키지로 내보내면
앱이 JS 만 import 했을 때 Tooltip·Tour·Field·Peek 이 스타일 없이 렌더된다.**

**고치는 방향: JS 에서 CSS import 를 전부 없앤다.** 컴포넌트 CSS 10개를
한 진입 CSS 로 모으고, 소비자는 `import '@s2life/ui/styles.css'` 한 줄만 쓴다.
번들러마다 다른 CSS-in-JS-import 동작에 기대지 않는 게 안전하다.

## 2. CSS 빌드 — 사전 컴파일 (내가 검증했다)

Tailwind CLI 로 우리 소스를 훑으면 **47KB 자립형 CSS** 가 나온다.
토큰·유틸리티·`h-[var(--control-h-md)]` 같은 임의값·shadcn 브리지 이름이
전부 포함된다. **소비 앱은 Tailwind 가 없어도 된다.**

검증한 입력:
```css
@import "tailwindcss" source(none);
@source "<repo>/packages/ui/src";
@import "<repo>/packages/tokens/tokens.css";
@import "<repo>/packages/tokens/theme.css";
```

이 방식으로 `dist/styles.css` 를 만들어라. `@tailwindcss/cli` 를 devDependency 로
추가하는 것은 허용한다(빌드 전용).

**README 에 두 번째 경로도 적어라** — 앱이 이미 Tailwind v4 를 쓴다면
`@source "../node_modules/@s2life/ui/dist"` 로 유틸리티를 중복 없이 합칠 수 있다.
둘 다 되게 하되 기본은 사전 컴파일이다.

## 3. JS 빌드

- **ESM 만.** 소비처는 Next.js/Vite 다. CJS 는 만들지 않는다
- `.d.ts` 필수
- `react` · `react-dom` 은 **peerDependencies**. 번들에 넣지 마라
- `@radix-ui/*` · `react-day-picker` · `date-fns` · `sonner` · `lucide-react` ·
  `clsx` · `tailwind-merge` · `class-variance-authority` 는 **dependencies**
  (지금 루트에 있다 — `packages/ui/package.json` 으로 옮겨라)
- `@tanstack/react-table` · `@tanstack/react-virtual` · `@visx/*` 도 마찬가지
- 빌드 도구는 네가 골라라(tsup · vite lib · tsc+esbuild). **고른 이유를 보고하라.**
  새 devDependency 하나까지는 허용한다

## 4. 패키지 3개 정비

### `@s2life/tokens`
이미 거의 됐다. 이름만 바꾸고 `sideEffects: false` 는 **넣지 마라**(CSS 다).

### `@s2life/ui`
```jsonc
{
  "name": "@s2life/ui",
  "exports": {
    ".":            { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./styles.css": "./dist/styles.css",
    "./icons":      { "types": "./dist/icons.d.ts", "import": "./dist/icons.js" }
  },
  "files": ["dist"],
  "sideEffects": ["*.css"]
}
```
**`./internal` 을 내보내지 마라. 그게 경계다.**

### `@s2life/mcp`
**package.json 이 아예 없다.** 만들어라.
- `bin`: `{ "s2life-mcp": "./server.mjs" }` — `npx @s2life/mcp` 로 실행
- `files`: 서버·매니페스트·match 모듈. 테스트는 제외
- `server.mjs` 첫 줄에 `#!/usr/bin/env node` 와 실행 권한
- 의존성 0개 유지
- README 에 설치법: `claude mcp add s2life -- npx -y @s2life/mcp`

## 5. internal 경계

`packages/ui/src/internal/` 을 만들고 **Radix 를 직접 쓰는 코드를 거기로 모아라.**
`components/` 는 `internal/` 을 통해서만 Radix 에 닿는다.

**게이트로 막아라.** 생성기(`mcp-build.mjs` 또는 새 스크립트)에 검사를 넣어
`src/internal/` 밖에서 `@radix-ui/*` 를 import 하면 `exit 1` 하게 하라.
eslint 를 도입하지 마라 — 지금까지 쓴 방식(생성기 게이트) 그대로.

디렉터리 이동이 크면 **`internal/` 에 재export 배럴만 두고 점진 이동**해도 된다.
다만 게이트는 지금 켜라. 어디까지 옮겼는지 보고하라.

## 6. 버전 lockstep

`pnpm version:set <x.y.z>` 같은 스크립트 하나로 3개 package.json 의 `version` 과
`@s2life/*` 상호 의존 범위를 함께 올린다. changesets 를 도입하지 마라.

## 7. 배포 리허설 — 이게 완료 조건이다

"배포되겠지" 가 아니라 **확인한다.**

```bash
pnpm -r build          # 또는 네가 만든 빌드 스크립트
npm pack --workspace packages/tokens --pack-destination /tmp/s2
npm pack --workspace packages/ui     --pack-destination /tmp/s2
npm pack --workspace packages/mcp    --pack-destination /tmp/s2
```

그리고 `/tmp/s2-consumer` 에 **최소 Vite+React 앱**을 만들어 tarball 을 설치하고:
- `import { Button, DataTable, Select } from '@s2life/ui'` 가 타입과 함께 동작
- `import '@s2life/ui/styles.css'` 만으로 **Tooltip·Field·Peek 이 스타일을 받는다**
  (1절 결함의 회귀 테스트다)
- `npx @s2life/mcp` 가 뜨고 `initialize` 에 응답한다
- **Tailwind 가 없는 앱에서도** 렌더가 멀쩡하다

이 리허설을 `docs/qa/pack-verify.mjs` 로 **자동화**하고 `pnpm qa` 에 넣어라.
브라우저가 필요하면 `docs/qa/browser.mjs` 를 쓴다.

**브라우저를 못 쓰면 거기까지만 하고 그렇게 보고하라** — 렌더 확인은 내가 한다.

## 8. 하지 마라

- 컴포넌트 동작·스타일 변경. 이번은 포장이다
- `DESIGN.md` · `AGENTS.md` 수정 (내가 한다)
- 토큰 값 변경
- CJS 출력, 번들에 react 포함
- changesets · eslint 도입
- 커밋 · 푸시

## 9. 보고할 것

- 빌드 도구와 고른 이유
- `dist/styles.css` 크기, 그리고 10개 컴포넌트 CSS 가 전부 들어갔는지 확인한 방법
- internal 경계를 어디까지 옮겼고 게이트가 무엇을 잡는지
- 리허설 결과 (소비 앱에서 실제로 렌더됐는지, 못 했으면 왜)
- 의도적으로 하지 않은 것
