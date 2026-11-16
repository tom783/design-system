# R20 · Storybook 사용 문서 — 어긋나지 않게 만든다

스토리는 있는데 **"언제 무엇을 어떻게 쓰는가"가 사람이 읽을 곳에 없다.**
설계 근거는 `DESIGN.md`(1,700줄)에 있고 기계가 읽을 의도는 MCP 에 있는데,
사람이 처음 붙일 때 볼 것이 없다.

`@storybook/addon-docs@10.6.7` 는 **이미 설치했고 `.storybook/main.ts` 에 등록해
MDX 가 빌드되는 것까지 확인했다.** 설정은 건드리지 마라.

대상: `packages/ui/docs/*.mdx` (게시 대상 아님 — `files: ["dist"]`).

---

## 0. 무엇을 쓸지는 추측하지 않았다

도그푸딩(`docs/dogfood/01-ecommerce-nextjs.md`)에서 **내가 실제로 막힌 지점**이
문서의 목차다. 그 문서를 먼저 읽어라.

| 막힌 곳 | 문서로 풀 것 |
|---|---|
| 설치하고 CSS 두 개를 어디서 넣는지 몰랐다 | 시작하기 |
| `DataTable` 컬럼을 만들 방법을 못 찾았다 | 표 만들기 |
| `Select` 가 툴바에서 폭을 다 먹었다 | 표 만들기(툴바) |
| `Button` 으로 링크를 만드는 법 | 시작하기(asChild) |
| 더티 폼 보호를 어떻게 거는지 | 폼 만들기 |

## 1. 구조 — 손으로 다시 쓰면 반드시 어긋난다

`docs/research/component-intent.mjs` 의 `purpose`·`useWhen`·`dont`·`rules` 는
**생성기가 소스와 대조해 검증**한다. 문서가 같은 내용을 손으로 베끼면 하나만
고쳐도 거짓말이 된다.

그러니 **렌더해라.** `packages/ui/docs/_intent.tsx` 에 블록을 만들고
`packages/mcp/manifest.json` 을 읽어 보여줘라:

```tsx
/** 이름으로 매니페스트를 찾아 purpose·useWhen·dont·rules 를 렌더한다. */
export function Intent({ name }: { name: string }): JSX.Element;
```

- **이름이 매니페스트에 없으면 눈에 띄게 실패해라.** 조용히 빈 블록을 그리면
  컴포넌트가 사라져도 문서는 멀쩡해 보인다. 던지거나 붉은 경고를 그려라.
- 부품(`partOf` 있음)이면 부모의 규칙을 함께 보여줘라(R15B 의 합쳐 읽기와 같은 뜻).
- `related` 가 있으면 링크로 걸어라.

**손으로 쓰는 것은 레시피와 시작하기뿐이다.** 규칙 문장을 MDX 에 복사하지 마라.

## 2. 쓸 페이지

제목은 한국어로, `문서/` 아래에 둔다. 순서가 중요하니 `Meta` 의 title 로 정렬되게 해라.

### `문서/시작하기`
- 설치: `npm install @s2life/ui @s2life/tokens`
- CSS 두 줄을 **어디에** 넣는지 (앱 진입점 / Next `app/layout.tsx`)
- **Tailwind 설정이 필요 없다** — 사전 컴파일 CSS 다 (도그푸딩에서 확인)
- Next.js App Router 에서 동작한다. `"use client"` 는 패키지가 이미 달고 나온다.
  그래서 서버 컴포넌트 페이지에서 import 해도 된다(도그푸딩에서 확인)
- 다크 모드 3상태(`data-theme` 미지정 = OS 추종)
- `Button asChild` 로 링크를 버튼처럼. `buttonVariants()` 도 쓸 수 있다

### `문서/컴포넌트 고르기`
갈림길만 다룬다. 각 항목은 `<Intent>` 두 개를 나란히 놓고 **한 줄 판단 기준**을 더해라.
- `Select` ↔ `Combobox` (옵션 20개 경계)
- `Switch` ↔ `Checkbox` (즉시 적용 ↔ 제출 대기)
- `Dialog` ↔ `AlertDialog` (되돌릴 수 있나)
- `Tooltip` ↔ `Hint` ↔ `Tour` ↔ `Peek`
- `DatePicker` ↔ `<input type="date">` (§17 실측 — 폭 고정·UTC 자정·영어 검증 문구)
- 금액·수량에 `type="number"` 를 쓰지 않는 이유 (§17 실측 표를 **링크**하고 요약만)

### `문서/표 만들기`
도그푸딩에서 못 했던 바로 그것. **실행되는 코드**를 보여줘라(MDX `Canvas`/`Story` 로
기존 DataTable 스토리를 끌어다 쓰고, 코드 블록은 소비자 관점으로).
- `createDataTableColumnHelper<T>()` → `h.columns([...])`
- **`@tanstack/react-table` 을 설치하지 않는다**는 점을 분명히
- 선택·정렬·밀도·상태(`loading`/`empty`/`error`)·CSV 내보내기
- 툴바 배치: `SelectTrigger` 는 `Field` 안에서 `w-full` 이 기본이니 툴바에서는
  폭을 지정한다 (R19 에서 추가한 `Components/Select` 의 **툴바 필터** 스토리를 참조)

### `문서/폼 만들기`
- `Field` 가 레이블·설명·오류·접근성 배선을 소유한다
- `FormFlow` 의 **Enter 이동 계약 표**는 `DESIGN.md §11.5` 에 있다. 베끼지 말고
  요약 한 줄 + 링크. 대신 **동작하는 예제**를 보여라
- `data-form-control="advance"` 로 앱의 자체 컨트롤을 끼우는 법
- 더티 폼 보호: `dismissible={!dirty}` + `onDismissAttempt` → 확인 `AlertDialog`
- 한글 IME: 조합 중에는 검증·이동·필터가 멈춘다는 사실만 (근거는 §11.2 링크)

### `문서/토큰`
- `Foundation/색상`·`Foundation/활자와 간격` 스토리가 이미 값을 보여준다. **중복하지 마라.**
- 여기서는 **"무엇에 어떤 토큰을 쓰나"** 표만: 배경·글자·경계·액션·상태별로
  토큰 이름과 쓰는 자리. 값은 적지 마라(바뀐다). Foundation 스토리로 링크해라
- 원시 색 금지, `text-[length:var(--토큰)]` 규칙 한 줄

## 3. 하지 마라

- `DESIGN.md` 의 규칙 문장을 MDX 로 복사 (어긋난다 — 링크하거나 `<Intent>` 로 렌더)
- `Foundation` 스토리가 이미 보여주는 토큰 값을 다시 나열
- 존재하지 않는 컴포넌트 이름을 `<Intent>` 에 넘기고 조용히 넘어가기
- `.storybook/main.ts` 변경 (이미 맞춰 뒀다)
- 새 컴포넌트·새 토큰·공개 API 변경 — **이번 라운드는 문서뿐이다**
- 영어 제목

## 4. 검증

`docs/qa/docs-render-verify.mjs` 를 새로 만들고 `docs/qa/run-all.mjs` 에 등록해라.
**`docs/qa/browser.mjs` 를 쓴다.**

- 다섯 페이지가 전부 렌더된다 (`index.json` 에서 `type === 'docs'` 로 찾아라)
- 각 페이지의 본문이 비어 있지 않다 (빈 MDX 가 통과하면 안 된다)
- **`<Intent>` 가 렌더한 이름이 전부 매니페스트에 있다.** 문서에 등장하는 컴포넌트
  이름을 모아 `packages/mcp/manifest.json` 과 대조해라 — 이게 이 라운드의 핵심 검사다
- 다크 테마에서도 렌더된다
- 콘솔 오류 0건
- 기존 브라우저 354건은 그대로 통과한다. 깨지면 **고치지 말고 보고해라**

단위 테스트로 할 수 있는 것은 단위로 해라 — `Intent` 의 이름 해소는 순수 함수로
분리하면 브라우저 없이 검사할 수 있다. `pnpm verify` 가 이제 단위 테스트를 돈다.

## 5. 유지보수 꼬리

- `CHANGELOG.md` 의 `0.3.0 — 미게시` 에 한 줄 (문서는 게시물에 안 들어가지만 기록은 한다)
- `AGENTS.md` 에 "문서는 매니페스트에서 렌더한다. 규칙을 MDX 에 복사하지 마라" 한 줄
- 버전은 **올리지 마라**

## 6. 보고할 것

1. 만든 파일 목록
2. `<Intent>` 가 이름을 못 찾았을 때 어떻게 실패하는지
3. `pnpm verify`(단위 포함) 결과
4. 도그푸딩 문서와 다르게 나온 사실 (있으면)
5. 명세와 다르게 한 부분

브라우저는 네 샌드박스에서 못 띄운다. `pnpm qa` 는 내가 돌린다. 하네스는 작성만 해라.
