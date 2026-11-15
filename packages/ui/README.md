# @s2life/ui

B2B 커머스 SaaS용 React 디자인 시스템. React·React DOM 19.3 이상을 앱에서 제공한다.

```sh
npm install @s2life/ui @s2life/tokens react react-dom
```

```tsx
import { Button, Field, Input } from '@s2life/ui';
import { Check } from '@s2life/ui/icons';
import '@s2life/ui/styles.css';
```

CSS는 앱 공통 진입점에서 한 번 불러온다. 토큰·유틸리티·모든 컴포넌트 스타일이 사전 컴파일되어 있어 Tailwind 설치가 필요 없다. Next.js에서는 CSS를 `app/layout.tsx`에서 불러오고, 이벤트·상태를 쓰는 컴포넌트는 클라이언트 컴포넌트에서 사용한다.

이미 Tailwind v4를 사용하는 앱은 사전 컴파일 CSS 대신 다음 입력을 사용한다. 경로는 `src/app.css` 기준이다.

```css
@import "tailwindcss";
@import "@s2life/ui/tailwind.css";
@source "../node_modules/@s2life/ui/dist";
```

이 경로는 앱의 Tailwind가 유틸리티를 한 번만 생성한다. `styles.css`를 동시에 불러오지 않는다. `tailwind.css`에는 토큰·테마 브리지·컴포넌트 CSS·공통 base 규칙이 포함된다.

공개 진입점은 루트·`icons`·`styles.css`·`tailwind.css`이며 `internal`은 내보내지 않는다. JS는 ESM, 타입은 `.d.ts`로 제공한다. `@s2life/tokens`, `@s2life/ui`, `@s2life/mcp`는 같은 버전을 사용한다.
