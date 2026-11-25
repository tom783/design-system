# @s2life/tokens

React 앱은 `@s2life/ui`만 설치한다. 이 패키지 단독 설치는 React 없이 토큰만 쓰는 프로젝트용이다.

**0.3.0에서 올리는 프로젝트:** npm에는 0.3.0 다음 판이 0.7.0이라 0.4.0~0.6.0의 변경이 한 번에 온다. 토큰 이름이 빠지거나 바뀐 것은 없고, 기본 글꼴이 Pretendard로 바뀌어 글꼴 CSS를 직접 불러야 한다 — 아래 「0.3.0에서 올릴 때」.

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

## 0.3.0에서 올릴 때

npm에는 0.3.0 다음 판이 0.7.0이다. 0.4.0·0.5.0·0.6.0은 번호와 변경 기록만 확정하고 따로 게시하지 않아 그 변경이 모두 0.7.0에 함께 실렸다. 0.3.0에서 받는 변경 중 토큰에 닿는 것을 모았다 — 문장과 수치는 변경 기록 각 판의 항목 그대로이고, 괄호 안은 그 판(0.4~0.7)이다.
변경 기록은 패키지에 들어가지 않는다. 판마다 자세한 것과 부품(`@s2life/ui`)·MCP 쪽 변경은 저장소의 [변경 기록 「0.3.0에서 0.7.0으로 올릴 때」](https://github.com/tom783/design-system/blob/main/CHANGELOG.md#030에서-070으로-올릴-때)와 [저장소 README](https://github.com/tom783/design-system#readme)에 있고, 0.7.0 뒤 판의 변경은 변경 기록의 그 판 절에 있다.

### 코드가 깨지는 것 — 없다

0.3.0의 이름은 모두 그대로 있다 — `tokens.css`의 CSS 변수, `theme.css`의 Tailwind 이름, `tokens.json`의 최상위 키에서 빠지거나 바뀐 것이 없다. 0.3.0 공개 이름이 빠져 코드가 깨지는 변경(내부 도우미 12개 · DatePicker `onChange`)은 `@s2life/ui`의 JS API다 — `@s2life/ui` README의 같은 절.

### 모든 화면에 걸리는 것

- **기본 글꼴 Pretendard — 글꼴 CSS를 먼저 불러야 한다** (0.4). `--font-sans` 첫 글꼴이 IBM Plex Sans KR → Pretendard Variable이다. `npm install pretendard` 후 진입점에서 `pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css`를 토큰 CSS **앞**에 한 번 불러온다. 불러오지 않으면 시스템 글꼴로 그려져 숫자 폭·줄바꿈이 디자인과 달라진다. 숫자 정렬은 본문 글꼴의 `tabular-nums`, `--font-mono`는 코드용 시스템 고정폭이다.
- **포커스 링: 크림슨 → 중립 고대비** (0.4). `--border-focus`가 라이트 neutral-950 `#262222` · 다크 neutral-50 `#F7F6F5`다. `--border-focus`를 덮어쓰지 않았다면 코드 수정은 없다 — 포커스 상태를 담은 시각 기준선을 갱신하고, 직접 그린 포커스 표시가 브랜드 색이면 `--border-focus`로 바꾼다.

| 무엇 | 0.3.0 → 0.7.0 | 판 | 할 일 |
|---|---|---|---|
| 선택 배경 `--bg-selected` | 라이트 brand-50 → brand-100 · 다크 brand-975 → brand-900 | 0.4 | 없음 |
| 표 선택 행 `--bg-selected-row`(새) | 라이트 brand-100 · 다크 `#552D32` · 달력 범위 중간도 이 값 | 0.4 | 선택 행을 `bg-selected`로 칠했다면 `bg-selected-row`로 |
| 중립 칩 바탕 `--status-neutral-bg`(새) | 0.3.0의 칩 바탕 neutral-100(`bg-sunken`) 라이트 `#EFECEB` → `#E1DCDB` · 다크 `#060505` → `#312D2C` | 0.4 | neutral 칩 화면(양 테마) 기준선 갱신 |
| 대화상자 막 | 본문 글자색 섞던 막 → `--overlay-scrim`(라이트 35% · 다크 65%) | 0.4 | 없음 |
| 금액 칸 최소 폭 `--cell-min-w-money` | 128px → 140px | 0.4 | 이 값에 맞춘 고정 폭 레이아웃 확인 |

### 새 토큰 (0.4)

`tokens.css`: `--status-neutral-bg`·`--status-neutral-fg` · `--bg-selected-row` · `--overlay-scrim` · `--side-nav-w`·`--side-nav-rail-w`.
`theme.css`(Tailwind 이름): `--color-neutral-tint`·`--color-neutral-ink` · `--color-selected-row` · `--color-overlay-scrim`.
