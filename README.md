# @s2life 디자인 시스템

B2B 커머스 SaaS용 토큰·React 컴포넌트·읽기 전용 MCP 서버를 세 패키지로 배포한다. 세 패키지는 항상 같은 버전으로 배포한다. React와 React DOM은 소비 앱이 제공한다(Node.js 22 이상).

## 기본 설치: Tailwind 없이 사용

```sh
npm install @s2life/ui @s2life/tokens react react-dom
```

앱의 공통 진입점에서 CSS를 한 번 불러온다. Next.js App Router에서는 `app/layout.tsx`, Vite에서는 `src/main.tsx`에 둔다. 상태·이벤트를 쓰는 Next.js 컴포넌트는 클라이언트 컴포넌트에서 사용한다.

```tsx
import { Button, Field, Input } from '@s2life/ui';
import { Check } from '@s2life/ui/icons';
import '@s2life/ui/styles.css';

export function Example() {
  return <Field label="상품명"><Input /></Field>;
}
```

`styles.css`는 토큰·Tailwind 유틸리티·컴포넌트 CSS를 모두 사전 컴파일한 자립형 파일이다. 소비 앱에 Tailwind나 PostCSS 설정이 필요하지 않다. JS에서 CSS를 자동으로 불러오지 않으므로 위 import를 생략하면 스타일이 적용되지 않는다. `@s2life/ui/internal`은 공개 API가 아니다.

토큰만 필요하다면 `@s2life/tokens/tokens.css`, Tailwind 이름 매핑은 `@s2life/tokens/theme.css`, 기계 판독용 값은 `@s2life/tokens/tokens.json`으로 가져온다.

## 이미 Tailwind v4를 쓰는 앱

사전 컴파일 CSS 대신 아래 CSS를 사용하면 앱과 라이브러리의 유틸리티·preflight를 앱의 Tailwind 빌드에서 한 번만 생성한다. 예시는 `src/app.css` 기준이며 `@source` 경로는 해당 CSS 파일 위치에 맞춘다.

```css
@import "tailwindcss";
@import "@s2life/ui/tailwind.css";
@source "../node_modules/@s2life/ui/dist";
```

`tailwind.css`에는 토큰·테마 브리지·컴포넌트 원본 CSS·공통 base 규칙이 포함된다. 이 경로에서는 `@s2life/ui/styles.css`를 함께 불러오지 않는다.

## MCP 설치

```sh
claude mcp add s2life -- npx -y @s2life/mcp
```

서버는 npm으로 제공하는 CLI이며 `npx @s2life/mcp`로도 실행한다. 런타임 의존성은 없고 stdout은 JSON-RPC 전용이다. 자세한 프로토콜은 [MCP README](packages/mcp/README.md)를 참고한다.

## 빌드와 버전

```sh
pnpm install
pnpm build                  # 토큰·매니페스트·ESM·선언·CSS
pnpm version:set 0.2.0       # 세 버전·상호 의존 범위·lockfile 동시 갱신
pnpm verify                 # 기존 토큰·MCP·타입·Storybook 게이트
pnpm qa:pack                # tarball 설치·타입·Vite·MCP·브라우저 렌더
pnpm qa                     # 기존 QA + 배포 리허설
```

JS는 기존 Vite 라이브러리 빌드로 ESM만 만들고, 기존 TypeScript로 `.d.ts`를 생성한다. 새 JS 빌드 도구 없이 현재 스택을 사용하며 React와 모든 런타임 의존성은 외부화한다. CSS 빌드에만 `@tailwindcss/cli`를 추가했다. `prepack`은 각 패키지를 다시 빌드하므로 낡은 산출물이 들어가지 않는다.

`pnpm qa:pack`은 `/tmp/s2`에 tarball을 만들고 `/tmp/s2-consumer`에 최소 앱을 구성한다. 경로는 `S2_PACK_DIR`, `S2_CONSUMER_DIR`로 변경할 수 있다. 헤드리스 브라우저는 기존 `docs/qa/browser.mjs`만 사용하며 없거나 실행할 수 없으면 렌더 검증 실패로 보고한다. npm 레지스트리 접근이 필요하다.

`src/internal/`의 Radix 재export 모듈만 `@radix-ui/*`를 직접 참조한다. 컴포넌트 구현은 기존 위치를 유지하며 이 경계를 사용한다. MCP 생성기와 UI 빌드에서 경계 밖의 정적 import·재export·동적 import·require, JS에서의 CSS import를 차단한다.
