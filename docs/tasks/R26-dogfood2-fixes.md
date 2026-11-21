# R26 · 도그푸딩 2 수정 — ClampText 줄바꿈 소유 · 소비자 문서

근거: `docs/dogfood/02-marketing-nextjs.md` 의 G1–G4. 0.3.1 후보다. **버전은 올리지 마라.**

---

## 0. 전제 — 내가 측정한 것

### 0.1 ClampText 는 조상의 `white-space` 를 물려받으면 말없이 자른다

DataTable 셀(`white-space: nowrap`) 안에 `<ClampText lines={1}>` 를 넣은 16행:

| 측정 | 지금 | 내용에 `white-space: normal` 주입 후 |
|---|---|---|
| 내용 `white-space` | `nowrap` (상속) | `normal` |
| 내용 client / scroll 높이 | 20 / 20 → "안 넘침" | 20 / 60 |
| 내용 scrollWidth / clientWidth | **1210 / 576** | 가로 넘침 없음 |
| 더보기 버튼 | **0 / 16** | 10 / 16 (긴 설명 행 수와 일치) |
| 행 높이 | 40 | 짧은 행 40 · 긴 행 57 |

`-webkit-line-clamp` 는 **줄이 바뀌어야** 동작한다. ClampText 는 세로 넘침만 재므로
가로로 흘러 넘친 글은 "넘치지 않음"으로 판정된다. 약속("잘렸다면 펼칠 수 있다")이
조상 스타일 하나에 깨진다.

### 0.2 표 셀에는 ClampText 가 필요 없다

같은 열을 ClampText 없이 그냥 accessor 로 두면:
`.data-table-value` 가 `text-overflow: ellipsis` · 폭 576px(36rem) · 전체 값 `title` 보존 ·
전 행 40px 균일. **DataTable 이 이미 처리한다.** 그 사실을 알려 줄 문장이 없을 뿐이다.

### 0.3 Storybook autodocs 를 전역으로 켜 봤다 (임시 설정, 32개 docs 페이지)

| 측정 | 결과 |
|---|---|
| 렌더 · 콘솔 오류 | 32/32 렌더, 오류 0 |
| props 표가 1행 이상인 페이지 | **12 / 26** (Components/*) |
| props 0행 | Card · Collapsible · Switch · RadioGroup (meta 에 component 가 있는데도 0 — Radix 얇은 래퍼라 docgen 이 못 읽는다), Charts · Select · DropdownMenu · DatePicker · Peek · Form · State · Loading · Toast (meta 에 component 없음) |
| 불완전 | Combobox **1행**(`options` 만 — 단일/다중 판별 유니온을 docgen 이 못 편다) |
| Guide | 로드 직후 `[role=dialog]` 1 · `:popover-open` 1 — Tour/Hint 가 문서 페이지에서 열린 채 겹친다 |
| Carousel 등 스토리 | `render: () => <Demo …/>` 라 "Show code" 가 `<Demo />` 를 보여준다 |

**결론: props 표의 원천은 docgen 이 아니라 매니페스트다.** 매니페스트는 TS 컴파일러로
뽑아서 유니온·래퍼·차트까지 전부 있고(`TrendBand` 의 `yLow` doc 까지), MCP 가 AI 에게 주는
것과 같은 원천이다. 문서와 AI 가 같은 말을 해야 한다.

---

## 1. ClampText — 자기 줄바꿈을 소유한다 (G1)

`clamp-text.css` 의 `.ds-clamp-text-content` 에:

```css
white-space: normal;       /* line-clamp 는 줄바꿈이 있어야 동작한다 */
overflow-wrap: anywhere;   /* 끊을 곳 없는 긴 문자열도 가로로 새지 않게 */
```

- 둘 다 **전역 body 값을 되돌리는 것**이다. `word-break` 는 넣지 마라 — 약속(잘린 것은 전부
  세로 넘침이다)에 필요한 건 위 둘뿐이고, `keep-all` 은 상속으로 이미 온다.
- 위 근거를 CSS 주석 한 줄로 남겨라 (0.1 의 수치 포함).
- 기존 dont "전역과 다른 줄바꿈 규칙을 넣지 마라" 와 충돌하지 않는다. 이건 전역 규칙을
  **조상이 바꿔도 지키는** 것이다.

## 2. 지침 — 표 셀에는 쓰지 않는다 (G2)

`docs/research/component-intent.mjs`:

- `ClampText` dont 에 추가: `"DataTable 셀에 쓰지 마라. 셀이 말줄임과 전체 값 title 을 이미 제공한다"`
- `DataTable` dont 에 추가: `"긴 글 열을 ClampText 로 감싸지 마라"`

**기준선 픽스처(`docs/qa/fixtures/get-component-baseline.json`)는 고치지 마라.**
`server.test.mjs` 의 기준선 비교에서 ClampText·DataTable 두 항목만 **명시적 델타**로
덮어 비교해라 — 지금 `list_components` 가 신규 가족을 앞에 붙여 비교하는 방식과 같다.
델타 외에 한 글자라도 다르면 실패해야 한다.

## 3. Carousel `className` (G4)

`CarouselProps` 에 `className?: string` — 루트에 `cn('ds-carousel', className)`.
JSDoc 한 줄. 다른 prop 은 바꾸지 마라.

## 4. 문서 — props 표와 코드 예시 (G3)

### 4.1 `ManifestProps` 블록

`packages/ui/docs/` 에 매니페스트 기반 props 표 블록을 만든다.

- 입력: 매니페스트 컴포넌트 이름. **`packages/mcp/catalog.mjs` 의 `restoreComponent`** 로
  복원한 결과를 쓴다(MCP 응답과 같은 모양). 복원 로직을 복사하지 마라.
- 열: 이름 · 타입 · 필수 · 설명(doc). `extends` 가 있으면 표 아래 한 줄
  ("이 외에 `React.ComponentProps<'div'>` 를 받는다").
- props 가 0개이고 extends 만 있는 부품(`CarouselSlide` 등)도 그 한 줄은 보여야 한다.
- 모르는 이름이면 `resolveIntent` 처럼 **렌더 전에 throw** 한다.
- `data-manifest-props="{이름}"` 와 행마다 `data-prop="{prop 이름}"` 을 달아라 (하네스용).

### 4.2 컴포넌트 docs 페이지 (autodocs)

- `Components/*` 스토리 파일에 autodocs 를 켠다. Foundation·Screens 는 켜지 마라.
- 페이지 구성은 `parameters.docs.page` 템플릿 하나로 통일한다:
  제목 → **Intent** (기존 블록) → **ManifestProps** → Primary(코드 보기 포함) → Stories.
  기본 ArgTypes 표는 쓰지 마라 (0.3 — 12/26 만 채워진다).
- 페이지가 다룰 매니페스트 이름은 각 meta 에 **명시한다** (예: `parameters: { manifest:
  ['Carousel', 'CarouselSlide'] }`). 추측해서 매핑하지 마라.
- **Guide** 는 스토리가 문서 위에 겹친다(0.3). 문서 페이지에서는 스토리를 iframe 으로
  격리해라(`docs.story.inline: false` 등). 문서 본문 위를 덮는 열린 오버레이가 0 이어야 한다.
- 기존 MDX 5개와 `DocumentationContainer`(테마)는 그대로 동작해야 한다.

### 4.3 Primary 스토리 = 복사해서 쓸 수 있는 코드

이번 회차 신규 5개(**Carousel · MediaViewer · ClampText · MultiSelect · Combobox 다중**)와
**Charts** 는, docs 페이지의 Primary 스토리 "Show code" 가 **그 컴포넌트를 직접 쓴 코드**여야
한다. 지역 `Demo` 래퍼를 보여주면 안 된다. 상태가 필요하면 `docs.source` 로 실제 render
코드를 보여줘도 된다. **그 코드가 실제로 렌더되는 코드**여야 한다 — 별도 문자열로 적은
예시는 금지 (거짓말이 될 수 있다).

### 4.4 차트 안내 페이지 (MDX)

`packages/ui/docs/06-charts.mdx` — 기존 01–05 와 같은 형식.

- 무엇을 언제: `ChartFrame` · `TrendBand` · `BulletRow` · `CompositionArea` 를 `<Intent>` 로
- **`summary` 는 화면 글자가 아니라 svg `aria-label` 로 간다**는 것과 그 이유
  (`<DesignLink section="7.5">`). 화면에도 결론을 보여주고 싶을 때 소비자가 할 일을 적어라
  (ChartFrame 이 무엇을 제공하는지 소스를 읽고 사실대로).
- 각 컴포넌트 `ManifestProps`.

## 5. 하지 마라

- 기준선 픽스처 수정
- `rules` 문구 재작성 (구현자 메모라는 지적은 맞지만 별도 라운드다 — G3 의 5번)
- ClampText 에 가로 넘침 측정 추가 (CSS 소유로 해결한다. 측정을 늘리지 마라)
- Storybook 애드온 추가 · 버전 변경
- 버전 범프

## 6. 검증

`pnpm verify`(단위 포함) 를 돌려 결과를 보고해라.

하네스 (작성만 — 실행은 내가 한다):

**`collapse-render-verify.mjs` 에 ClampText 케이스 추가** — 스토리를 하나 만든다
(`nowrap 조상`): 조상 `white-space: nowrap; overflow-wrap: normal; width: 20rem` 안에
`lines={1}` 긴 글(공백 없는 긴 URL 포함).
- 더보기 버튼이 **있다**
- 내용 `scrollWidth <= clientWidth + 1` (가로로 새지 않는다)
- 더보기 → 전체가 보이고, 간략히 → 1줄로 돌아온다
- 기존 ClampText 케이스 전부 그대로 통과

**`docs-render-verify.mjs` 확장**:
- 문서 페이지 목록에 차트 페이지 추가
- `index.json` 에서 `type === 'docs'` 이고 `Components/` 로 시작하는 **모든** 엔트리를 돈다:
  - `[data-intent-block]` ≥ 1, `[data-manifest-props]` ≥ 1
  - 각 `[data-manifest-props]` 의 `data-prop` 집합이 **매니페스트 복원 결과의 props 이름 집합과
    정확히 같다** (빠짐·덧붙임 0)
  - 로드 직후 문서 본문 위의 열린 `[role=dialog]`·`:popover-open` 0
  - 콘솔 오류 0
- **커버리지**: 모든 docs 페이지의 `data-manifest-props` 합집합이 매니페스트의 `kind: component`
  전체를 덮는다. 빠진 게 있으면 이름을 출력하고 실패한다 (예외 목록을 만들 거면 이유와 함께
  하네스 안에 적어라)
- 4.3 의 6개 페이지: Primary 의 코드 보기를 열고 코드에 `<Carousel` 등 해당 태그가 있고
  `Demo` 가 없다

하네스 함정 — `ev()` 가 DOM 요소를 돌려주면 직렬화가 터진다. docs 페이지는 스토리 캔버스와
진입 경로가 다르다(`viewMode=docs`). 렌더 대기는 고정 sleep 말고 조건 대기.

## 7. 유지보수 꼬리

- `CHANGELOG.md` 에 `## 0.3.1 — 미게시` 섹션 (추가 / 고침 / 문서). **버전은 올리지 마라**
- 매니페스트 예산(compact 80,000 바이트) 안인지 `mcp:build` 출력으로 확인
- `match.test.mjs`: `"표 셀 긴 설명"` 같은 질의를 추가하지 마라 — 이번엔 dont 만 바꾼다

## 8. 보고할 것

1. 바꾼 파일 목록
2. 기준선 델타를 어떻게 표현했는지 (코드 인용)
3. 각 docs 페이지의 `parameters.manifest` 매핑 표 (페이지 → 이름들)
4. 커버리지에서 예외로 둔 이름과 이유
5. 4.3 의 6개 Primary 를 어떻게 바꿨는지 (기존 play 함수 영향 포함)
6. `pnpm verify` 결과
7. 명세와 다르게 한 부분, 0 번 측정과 다르게 나온 것

브라우저는 네 샌드박스에서 못 띄운다. `pnpm qa` 는 내가 돌린다.
