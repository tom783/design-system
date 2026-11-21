# R30 · 기본 글꼴을 Pretendard 로 — 로드 방법은 문서로, 검증은 리허설로

사용자 결정 두 가지:
1. 기본 글꼴을 IBM Plex 에서 **Pretendard** 로 바꾼다
2. 패키지에 글꼴 파일을 넣지 않는다. **로드 방법을 문서로 안내하고, 배포 리허설이 그 안내대로 한 앱에서
   글꼴이 실제로 로드되는지 검사**한다

0.3.1 후보. **버전은 올리지 마라.**

---

## 0. 전제 — 내가 측정한 것

- 토큰: `--font-sans: 'IBM Plex Sans KR', 'IBM Plex Sans', -apple-system, …` ·
  `--font-mono: 'IBM Plex Mono', ui-monospace, …`
- 글꼴을 불러오는 곳은 `.storybook/preview-head.html` 의 Google Fonts 링크 **하나뿐**. 패키지 CSS 에
  `@font-face` 없음, README·문서에 로드 방법 없음 → 도그푸딩 3 앱의 `document.fonts` 에 로드된 웹폰트 **0개**
  (같은 플레이스홀더가 Storybook 185px, 앱 238px)
- `--font-mono` 를 쓰는 제품 코드: `chart/chart-frame.tsx` 의 `numericStyle`(차트 숫자),
  `loading/loading.css` 의 `.loading-progress-percent`. 나머지는 스토리
- `pretendard@1.3.9`(OFL-1.1)를 **루트 devDependency 로 내가 이미 설치했다** (네 샌드박스는 오프라인).
  `pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css` 의 글꼴 이름은 `'Pretendard Variable'`.
  동적 서브셋이라 화면에 쓰인 글자 범위의 파일만 내려받는다
- Pretendard 는 Google Fonts 에 없다 → `next/font/google` 은 못 쓴다. 위 CSS 를 앱 진입점에서 import 하는 방법은
  Next(App Router 의 layout)·Vite 모두에서 번들러가 글꼴 파일을 자체 호스팅한다. 외부 CDN 의존이 없다

## 1. 토큰

- `--font-sans`: `'Pretendard Variable', 'Pretendard'` 를 앞에, 그 뒤 시스템 폴백. 한국어 시스템 글꼴
  (`'Apple SD Gothic Neo'`, `'Malgun Gothic'` 등) 을 넣을지와 순서는 근거를 주석에
- `--font-mono`: IBM Plex Mono 를 빼고 **시스템 고정폭만** (`ui-monospace`, `'SF Mono'`, `Menlo`, `Consolas`, …).
  이제 코드 표시용이다
- 생성기(`docs/research/tokens-build.mjs`)가 원본이면 거기서 바꾸고 산출물은 재생성

## 2. 숫자는 Pretendard 의 고정폭 숫자로

차트 숫자와 진행률 퍼센트가 `--font-mono` 를 쓰던 이유는 **자릿수 정렬**이다. 글꼴을 하나로 줄이려고
이 둘을 `--font-sans` + `font-variant-numeric: tabular-nums` 로 바꾼다.
- **전제를 측정해라**: Pretendard 에서 `tabular-nums` 를 켜면 0–9 의 폭이 같은가. 같지 않으면 바꾸지 말고
  보고해라 (그때는 숫자용 글꼴을 따로 유지해야 한다)
- 스토리의 `font-mono` 사용은 숫자 정렬 목적이면 같은 방식으로, 코드 표시 목적이면 그대로 둔다

## 3. Storybook 은 소비자와 같은 방법으로

- `.storybook/preview-head.html` 의 Google Fonts `<link>`·`preconnect` 를 지운다
- `.storybook/preview.tsx` 에서 `pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css` 를 import —
  문서에 적을 소비자 방법과 **같은 줄**이다

## 4. 문서

`README.md`, `packages/ui/README.md`, `packages/ui/docs/01-getting-started.mdx` 의 CSS 절에 글꼴을 더한다:

```sh
npm install @s2life/ui pretendard
```
```tsx
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@s2life/ui/styles.css';
```

- 왜 패키지에 넣지 않는지 한 문장 (용량·호스팅을 앱이 정한다)
- 안 불러오면 시스템 글꼴로 그려진다는 것 — 숫자 폭·줄바꿈이 디자인과 달라진다
- Next.js App Router 는 루트 `app/layout.tsx` 에 두 줄, Vite 는 `src/main.tsx`
- `package-docs.test.mjs` 에: 위 세 문서가 pretendard 설치·import 를 안내한다 (빠지면 실패)

DESIGN.md:
- §3.3 서체 표와 근거를 Pretendard 로 (한글 가독성, 가변 굵기, 고정폭 숫자 `tnum`, OFL)
- **글꼴 폭에서 나온 수치를 전부 찾아라** — 예: §? "금액 칸 128px 의 산출 근거: `₩1,248,500,000` 을
  IBM Plex Mono 14px …". Pretendard tabular 로 다시 계산할 식을 적되, **실측값은 내가 브라우저로 채운다**.
  측정이 필요한 자리는 `<!-- R30 실측 필요: … -->` 로 표시하고 목록으로 보고해라. 숫자를 추측해서 바꾸지 마라
- `tokens-build.mjs`·DESIGN.md 외에 `IBM Plex` 가 남으면 목록으로 (`.visual-feedback/` 의 과거 실험 파일은 제외)

## 5. 배포 리허설이 안내대로 한 앱을 검사한다

`docs/qa/pack-verify.mjs` 소비자 앱:
- 의존에 `pretendard` 를 더한다 (버전은 루트 devDependency 와 같게)
- 진입점이 문서와 같은 두 줄을 import 한다
- 브라우저 렌더 단계에서: `document.fonts.ready` 뒤 **`'Pretendard Variable'` 글꼴 면이 하나 이상 `loaded`**,
  본문 요소의 계산된 `font-family` 첫 항목이 `Pretendard Variable`. 한글이 화면에 있어야 서브셋이 내려온다
- Tailwind 경로 앱도 같은 검사

## 6. 하지 마라

- 글꼴 파일을 `@s2life/ui` 에 넣기, `@font-face` 를 styles.css 에 넣기, Google Fonts·jsDelivr 같은 CDN 링크
- 하네스의 측정 기대값 수정 — 글꼴이 바뀌면 여러 하네스의 폭·줄 수가 달라질 것이다. **브라우저를 못 띄우는
  네가 숫자를 맞추면 안 된다.** 내가 실측해서 판단한다
- 버전 범프

## 7. 유지보수 꼬리

- `CHANGELOG.md` `0.3.1 — 미게시`: 바뀐 동작(기본 글꼴 Pretendard, 숫자 tabular), 문서(글꼴 로드 안내)
- `AGENTS.md` 에 "글꼴은 앱이 로드한다 — Storybook 도 소비자와 같은 import" 한 줄

## 8. 보고할 것

1. 바꾼 파일 목록
2. 2번 tabular 전제 측정 방법과 결과 (브라우저 없이 잰 방법이면 그 한계도)
3. `<!-- R30 실측 필요 -->` 표시 목록
4. 남은 `IBM Plex` 목록
5. `npm_config_offline=true pnpm verify`, `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify` 결과
6. 명세와 다르게 한 부분
