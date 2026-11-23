# @s2life/ui

B2B 커머스 SaaS용 React 디자인 시스템. React·React DOM 19(19.0 이상)를 앱에서 제공한다.

```sh
npm install @s2life/ui pretendard
```

React·React DOM 19(19.0 이상)는 peer 의존성이며 React 18은 지원하지 않는다. 앱에 없다면 `npm install @s2life/ui pretendard react react-dom`으로 함께 설치한다.
앱에 `@s2life/tokens`를 따로 설치하지 않는다 — ui가 같은 버전을 고정해 가져오며, 따로 설치하면 버전이 어긋날 수 있다.

```tsx
import { Button, Field, Input } from '@s2life/ui';
import { Check } from '@s2life/ui/icons';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@s2life/ui/styles.css';
```

두 줄의 CSS는 앱 공통 진입점에서 한 번 불러온다. Next.js App Router는 루트 `app/layout.tsx`, Vite는 `src/main.tsx`에 둔다. 토큰·유틸리티·모든 컴포넌트 스타일이 사전 컴파일되어 있어 Tailwind 설치가 필요 없다. 이벤트·상태를 쓰는 Next.js 컴포넌트는 클라이언트 컴포넌트에서 사용한다. 부품은 파일마다 `"use client"`가 있어 서버 컴포넌트에서 import하면 쓴 부품만 클라이언트 번들에 들어간다. `next build --webpack`으로 빌드하면 `experimental.optimizePackageImports: ['@s2life/ui']`를 켠다(Next 16 기본 Turbopack은 필요 없다).

`styles.css`는 앱 전체에 적용되는 기본 초기화(Tailwind preflight)와 유틸리티를 포함한다. **앱 전체를 이 디자인 시스템으로 만드는 것을 전제로 한다.** 기존 앱의 일부 화면에만 넣는 부품 전용 CSS(preflight 없는 파일)는 제공하지 않는다 — `styles.css`든 `tailwind.css`든 불러오면 앱 전체의 기본 스타일이 함께 바뀐다. 우리 고유 클래스는 `ds-`로 시작한다. 앱 CSS 클래스는 `ds-`로 시작하지 않으며, `.flex`·`.hidden` 같은 유틸리티 이름을 다시 정의하지 않는다.

글꼴 파일은 용량과 호스팅 방식을 앱이 정하도록 ui 패키지에 넣지 않는다. Pretendard CSS의 동적 서브셋은 번들러가 앱에서 자체 호스팅하며 외부 CDN이 필요 없다. 이 CSS를 불러오지 않으면 시스템 글꼴로 그려져 숫자 폭·줄바꿈이 디자인과 달라진다. Pretendard는 Google Fonts에 없으므로 `next/font/google` 대신 위 CSS import를 사용한다.

제공하는 유틸리티: `.sr-only`는 스크린리더용 문구를 화면에서 숨기고, `.tabular`는 숫자 열을 고정폭으로 정렬한다. `styles.css`·`tailwind.css` 두 경로에서 제공하며 `.truncate`는 공개 계약에 포함하지 않는다.

토큰 파일을 직접 써야 한다면 `@s2life/ui/tokens.css`, Tailwind 이름 매핑은 `@s2life/ui/theme.css`, 기계 판독용 값은 `@s2life/ui/tokens.json`으로 가져온다. `styles.css`에는 토큰이 이미 포함되어 있으므로 `tokens.css`를 중복으로 불러오지 않는다.

이미 Tailwind v4를 사용하는 앱은 사전 컴파일 CSS 대신 다음 입력을 사용한다. 경로는 `src/app.css` 기준이다.

```css
@import "tailwindcss";
@import "@s2life/ui/tailwind.css";
@source "../node_modules/@s2life/ui/dist";
```

이 경로는 앱의 Tailwind가 유틸리티를 한 번만 생성한다. 앱 진입점에서 `styles.css` 대신 위 `pretendard` CSS와 `./app.css`를 불러온다. `tailwind.css`에는 토큰·테마 브리지·컴포넌트 CSS·공통 base 규칙이 포함된다.

공개 진입점은 루트·`icons`·`styles.css`·`tailwind.css`·`tokens.css`·`theme.css`·`tokens.json`이며 `internal`은 내보내지 않는다. JS는 ESM, 타입은 `.d.ts`로 제공한다. `@s2life/tokens`, `@s2life/ui`, `@s2life/mcp`는 따로 개발·배포하며 같은 버전을 사용한다. tokens 수정도 lockstep으로 배포하고 ui가 그 버전을 고정해 가져오므로 앱은 ui만 업데이트한다.
