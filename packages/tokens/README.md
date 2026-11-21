# @s2life/tokens

React 앱은 `@s2life/ui`만 설치한다. 이 패키지 단독 설치는 React 없이 토큰만 쓰는 프로젝트용이다.

디자인 토큰. **의존성이 없고 React 에 묶여 있지 않다** — Figma 플러그인·문서
사이트·이메일 템플릿처럼 React 가 아닌 곳에서도 그대로 쓴다.

모든 값은 생성기(`docs/research/tokens-build.mjs`)가 만들고,
출력 전에 **명도대비 100건과 의미 분리(ΔE) 8건**을 검증한다. 하나라도
실패하면 파일을 쓰지 않는다. **손으로 고치지 마라.**

```sh
npm install @s2life/tokens
```

## 쓰는 법

```css
/* 변수만 필요할 때 */
@import "@s2life/tokens/tokens.css";

/* Tailwind v4 에서 bg-surface · text-fg-muted 같은 이름을 쓰려면 함께 */
@import "@s2life/tokens/theme.css";
```

`@s2life/ui` 를 쓰면 `@s2life/ui/styles.css` 에 이미 포함되어 있다.
그때는 따로 설치할 필요가 없다.

```js
// 값 자체가 필요할 때 (문서 생성·디자인 도구 연동 등)
import tokens from '@s2life/tokens/tokens.json' with { type: 'json' };
```

## 테마

라이트가 기본이고 다크는 세 상태로 동작한다 — `:root`(라이트),
`prefers-color-scheme: dark`(시스템), `[data-theme="dark"]`(명시).
의미 토큰은 **양쪽 테마에 모두 정의되어 있어야** 하며 생성기가 그것을 검사한다.

| 파일 | 내용 |
|---|---|
| `tokens.css` | 원시 팔레트 + 의미 토큰 + 치수·모션 |
| `theme.css` | Tailwind v4 `@theme inline` 이름 매핑 (shadcn 이름 브리지 포함) |
| `tokens.json` | 같은 값의 기계 판독용. 검증 결과도 들어 있다 |

설계 근거는 저장소의 `DESIGN.md` 2~5절에 있다.
