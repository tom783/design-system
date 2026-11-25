# @s2life 디자인 시스템

B2B 커머스 SaaS용 토큰·React 컴포넌트·읽기 전용 MCP 서버를 세 패키지로 배포한다. 세 패키지는 항상 같은 버전으로 배포한다. React와 React DOM은 소비 앱이 제공한다(Node.js 22 이상).

**0.3.0에서 올리는 앱:** npm에는 0.3.0 다음 판이 0.7.0이라 0.4.0~0.6.0의 변경이 한 번에 온다. 기본 글꼴 Pretendard CSS를 앱이 먼저 불러야 하고 DatePicker `onChange`가 `onValueChange`로 바뀌었다 — [변경 기록 0.7.0 「0.3.0에서 0.7.0으로 올릴 때」](CHANGELOG.md#030에서-070으로-올릴-때)를 먼저 본다.

## 기본 설치: Tailwind 없이 사용

```sh
npm install @s2life/ui pretendard
```

React·React DOM 19(19.0 이상)는 peer 의존성이며 React 18은 지원하지 않는다. 앱에 없다면 `npm install @s2life/ui pretendard react react-dom`으로 함께 설치한다.
앱에 `@s2life/tokens`를 따로 설치하지 않는다 — ui가 같은 버전을 고정해 가져오며, 따로 설치하면 버전이 어긋날 수 있다.

앱의 공통 진입점에서 아래 두 줄의 CSS를 한 번 불러온다. Next.js App Router에서는 루트 `app/layout.tsx`, Vite에서는 `src/main.tsx`에 둔다. 상태·이벤트를 쓰는 Next.js 컴포넌트는 클라이언트 컴포넌트에서 사용한다.

```tsx
import { Button, Field, Input } from '@s2life/ui';
import { Check } from '@s2life/ui/icons';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@s2life/ui/styles.css';

export function Example() {
  return <Field label="상품명"><Input /></Field>;
}
```

글꼴 파일은 용량과 호스팅 방식을 앱이 정하도록 ui 패키지에 넣지 않는다. 위 Pretendard CSS는 화면에 쓰인 글자의 동적 서브셋을 번들러가 앱에서 자체 호스팅하게 하며 외부 CDN을 사용하지 않는다. 불러오지 않으면 시스템 글꼴로 그려져 숫자 폭·줄바꿈이 디자인과 달라진다. Pretendard는 Google Fonts에 없어 `next/font/google` 대신 위 CSS import를 사용한다.

`styles.css`는 토큰·Tailwind 유틸리티·컴포넌트 CSS를 모두 사전 컴파일한 자립형 파일이다. 소비 앱에 Tailwind나 PostCSS 설정이 필요하지 않다. JS에서 CSS를 자동으로 불러오지 않으므로 위 import를 생략하면 스타일이 적용되지 않는다. `@s2life/ui/internal`은 공개 API가 아니다.

`styles.css`는 앱 전체에 적용되는 기본 초기화(Tailwind preflight)와 유틸리티를 포함한다. **앱 전체를 이 디자인 시스템으로 만드는 것을 전제로 한다.** 기존 앱의 일부 화면에만 넣는 부품 전용 CSS(preflight 없는 파일)는 제공하지 않는다 — `styles.css`든 `tailwind.css`든 불러오면 앱 전체의 기본 스타일이 함께 바뀐다. 우리 고유 클래스는 `ds-`로 시작한다. 앱 CSS 클래스는 `ds-`로 시작하지 않으며, `.flex`·`.hidden` 같은 유틸리티 이름을 다시 정의하지 않는다.

제공하는 유틸리티: `.sr-only`는 스크린리더용 문구를 화면에서 숨기고, `.tabular`는 숫자 열을 고정폭으로 정렬한다. `styles.css`·`tailwind.css` 두 경로에서 제공하며 `.truncate`는 공개 계약에 포함하지 않는다.

토큰 파일을 직접 써야 한다면 `@s2life/ui/tokens.css`, Tailwind 이름 매핑은 `@s2life/ui/theme.css`, 기계 판독용 값은 `@s2life/ui/tokens.json`으로 가져온다. `styles.css`에는 토큰이 이미 포함되어 있으므로 `tokens.css`를 중복으로 불러오지 않는다.

## 이미 Tailwind v4를 쓰는 앱

사전 컴파일 CSS 대신 아래 CSS를 사용하면 앱과 라이브러리의 유틸리티·preflight를 앱의 Tailwind 빌드에서 한 번만 생성한다. 예시는 `src/app.css` 기준이며 `@source` 경로는 해당 CSS 파일 위치에 맞춘다.

```css
@import "tailwindcss";
@import "@s2life/ui/tailwind.css";
@source "../node_modules/@s2life/ui/dist";
```

`tailwind.css`에는 토큰·테마 브리지·컴포넌트 원본 CSS·공통 base 규칙이 포함된다. 이 경로에서는 `@s2life/ui/styles.css` 대신 앱 진입점에서 위 `pretendard` CSS와 `./app.css`를 불러온다.

## MCP 설치

```sh
claude mcp add s2life -- npx -y @s2life/mcp
```

서버는 npm으로 제공하는 CLI이며 `npx @s2life/mcp`로도 실행한다. 런타임 의존성은 없고 stdout은 JSON-RPC 전용이다. 자세한 프로토콜은 [MCP README](packages/mcp/README.md)를 참고한다.

## 빌드와 버전

세 패키지는 따로 개발·배포한다. tokens를 고치면 lockstep으로 셋 다 같은 버전으로 배포하고, ui가 그 버전의 tokens를 정확히 고정해 의존하므로 앱은 ui만 업데이트하면 된다.

버전은 병합마다가 아니라 목표가 끝날 때 한 번 올린다. 1.0 전에는 새 부품·공개 API 추가·호환 깨짐이면 `0.x.0`, 고침·내부 개선만이면 `0.x.y`다. 버전 확정은 게시가 아니다 — 변경 기록에 `미게시`로 남고, 태그·npm 게시는 오너 승인을 받아서만 한다([CHANGELOG](CHANGELOG.md)·AGENTS.md "버전·릴리스").

```sh
pnpm install
pnpm build                  # 토큰·매니페스트·ESM·선언·CSS
pnpm version:set 0.7.0       # 세 버전·상호 의존 범위·lockfile 동시 갱신
pnpm verify                 # 기존 토큰·MCP·타입·Storybook 게이트
pnpm qa:pack                # tarball 설치·타입·Vite·MCP·브라우저 렌더
pnpm qa                     # 기존 QA + 배포 리허설
```

JS는 기존 Vite 라이브러리 빌드로 ESM만 만들고, 기존 TypeScript로 `.d.ts`를 생성한다. 새 JS 빌드 도구 없이 현재 스택을 사용하며 React와 모든 런타임 의존성은 외부화한다. CSS 빌드에만 `@tailwindcss/cli`를 추가했다. `prepack`은 각 패키지를 다시 빌드하므로 낡은 산출물이 들어가지 않는다.

`pnpm qa:pack`은 실행마다 새 임시 폴더에 tarball을 만들고 최소 앱을 구성한다(통과하면 지우고, 실패하면 경로를 알리고 남긴다). 경로를 고정하려면 `S2_PACK_DIR`, `S2_CONSUMER_DIR`를 준다. 미리보기 서버도 빈 포트를 쓴다. 소비 앱의 React는 기본으로 저장소와 같은 버전이고, `S2_PACK_REACT=19.0.0 pnpm qa:pack`처럼 정확한 버전을 주면 React·React DOM은 그 버전, `@types/react`·`@types/react-dom`은 같은 minor로 설치해 peer 하한을 확인한다. 어느 쪽이든 번들에 들어간 React 버전이 하나인지 검사한다. 헤드리스 브라우저는 기존 `docs/qa/browser.mjs`만 사용하며 없거나 실행할 수 없으면 렌더 검증 실패로 보고한다. npm 레지스트리 접근이 필요하다.

`src/internal/`의 Radix 재export 모듈만 `@radix-ui/*`를 직접 참조한다. 컴포넌트 구현은 기존 위치를 유지하며 이 경계를 사용한다. MCP 생성기와 UI 빌드에서 경계 밖의 정적 import·재export·동적 import·require, JS에서의 CSS import를 차단한다.

## 소개 사이트 (로컬 전용)

부품·파운데이션·조립 화면을 실제 렌더로 보는 사이트다. `apps/site`(Vite + React Router 정적 SPA)에 있고 **배포하지 않는다** — 저장소에서 띄워 본다.

```sh
pnpm site           # 개발 서버 http://localhost:6200 (포트 고정 — 차 있으면 다른 포트로 옮기지 않고 멈춘다)
pnpm site:build     # 정적 빌드 → apps/site/dist
pnpm site:preview   # 빌드 결과를 http://localhost:6201 로 띄운다
```

내용은 이 커밋의 생성물에서만 읽는다 — 부품은 `packages/mcp/manifest.json`, 토큰은 `@s2life/tokens/tokens.json`, 규칙 출처의 절 이름은 `DESIGN.md`, 렌더 예시는 Storybook 스토리(`packages/ui/src/stories`, 각 meta 의 `parameters.manifest`)를 그대로 쓴다.
시작하기는 이 README, AI로 쓰기는 `packages/mcp/README.md` 의 단락·코드 블록을 빌드 때 읽고, MCP 도구·리소스·추천 예시는 빌드 때 서버를 띄워 받은 응답이다. 부품마다 "npm 게시판에 있음/없음"은 게시판 태그(`v0.3.0` 등)의 매니페스트로 판정한다.
사이트는 소비 앱처럼 앱 루트에서 Pretendard CSS 와 `@s2life/ui/styles.css` 를 한 번 불러온다. `@s2life/ui` 는 workspace 소스로 해석하고(스토리와 같은 모듈 한 벌, `pnpm build` 불필요), CSS 는 배포 `dist/styles.css` 와 같은 입력(`scripts/ui-styles-source.mjs`)으로 컴파일한다.
첫 화면의 번짐·격자·상단 바 블러·조립 움직임은 사이트 입구 전용 효과 층(`apps/site/src/pages/home/effects.css`)이다 — 디자인 시스템 부품·토큰(정밀 플랫)에는 없고, 표본 표·부품은 `@s2life/ui` 그대로 그린다.
