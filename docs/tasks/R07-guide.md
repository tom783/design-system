# R07 · 안내 — Tooltip · Hint · Tour

`AGENTS.md` 와 `DESIGN.md` **10절 전체**를 먼저 읽어라. 10절이 이 작업의 근거다.

**핵심 제약 하나만 미리 말한다: 투어를 자동으로 실행하는 코드를 쓰지 마라.**
완주율 데이터(10.1)가 그걸 금지한다. 투어는 앱이 준 트리거로만 시작한다.

아래 CSS·배치 코드는 **내가 Chrome 157 에서 실측해 확인한 것**이다. 그대로 써라.
"더 나은 방법"이 떠오르면 바꾸지 말고 보고하라 — 이 영역은 조용히 실패한다.

---

## 1. 만들 것

```
packages/ui/src/components/guide/
  place-fallback.ts        # 순수 함수. 앵커 미지원 환경의 좌표 계산
  place-fallback.test.mjs
  resolve-step.ts          # 순수 함수. 투어 단계 전진/후진 + 대상 없을 때 처리
  resolve-step.test.mjs
  use-anchored.ts          # 두 경로(CSS/JS)를 감추는 훅
  tooltip.tsx
  hint.tsx
  tour.tsx
  guide.css
  index.ts
packages/ui/src/stories/guide.stories.tsx
```

`packages/ui/src/index.ts` 와 `styles.css` 에 연결한다.

---

## 2. 배치 — 두 경로

### 2.1 기능 탐지

```ts
// 모듈 로드 시 한 번. SSR 에서는 false 로 두고 마운트 후 갱신한다.
export const supportsAnchor = () =>
  typeof CSS !== 'undefined' && CSS.supports('anchor-name', '--x');
```

### 2.2 CSS 경로 (약 90%)

말풍선은 **`popover="manual"`** 로 띄운다. 이유는 둘이다.
- 최상위 레이어로 올라가므로 `DataTable` 의 `overflow:auto` 안에서도 잘리지 않는다.
  **실측 확인** — 스크롤 컨테이너 안의 트리거에 붙은 말풍선이 컨테이너를 벗어나 보였다.
- **포커스를 가져가지 않는다**(실측: `activeElement` 가 `BODY` 유지). 툴팁에 필요한 성질이다.

`anchor-name` 은 dashed-ident 여야 한다. `useId()` 는 `:r0:` 처럼 콜론을 포함하니
반드시 걸러라:

```ts
const id = useId();
const anchorName = `--g${id.replace(/[^a-zA-Z0-9]/g, '')}`;
```

### 2.3 JS 폴백 (약 10%)

`place-fallback.ts` — **순수 함수로 쓴다. DOM 을 읽지 마라.** 호출자가 측정값을 넘긴다.

```ts
export type Rect = { top: number; left: number; width: number; height: number };
export type Placement = 'top' | 'bottom';

export function placeFallback(
  target: Rect,
  tip: { width: number; height: number },
  viewport: { width: number; height: number },
  opts: { gap: number; pad: number },
): { x: number; y: number; placement: Placement } {
  const { gap, pad } = opts;
  const below = target.top + target.height + gap;
  const above = target.top - gap - tip.height;
  const fitsBelow = below + tip.height + pad <= viewport.height;
  const y = fitsBelow ? below : Math.max(pad, above);
  const x = Math.min(
    Math.max(pad, target.left + target.width / 2 - tip.width / 2),
    Math.max(pad, viewport.width - tip.width - pad),
  );
  return { x, y, placement: fitsBelow ? 'bottom' : 'top' };
}
```

이 로직은 내가 브라우저에서 확인했다 — 여유 있을 때 아래, 하단 대상에서는 위로
뒤집히고, 좌우 가장자리에서 화면 안으로 밀려 들어온다.

**폴백은 스크롤을 추적하지 않는다. 스크롤이 생기면 닫는다.**
(`scroll` 리스너는 `{ capture: true, passive: true, once: true }`.)
어긋난 자리에 떠 있는 말풍선은 닫힌 말풍선보다 나쁘다.

`gap` / `pad` 는 `--anchor-gap` / `--anchor-edge-pad` 에서 읽는다.
**읽은 값이 NaN 일 수 있다** — R06 에서 `Math.max(100, NaN)` 이 NaN 이 되어 차트가
`height="NaN"` 으로 렌더된 적이 있다. `chart-frame.tsx` 의 `defaultChartHeight()` 가
쓰는 폴백 패턴을 그대로 따라라.

### 2.4 화살표는 만들지 마라

근거는 `DESIGN.md` 10.3.1 이다. 요약: 말풍선의 자식에서는 `anchor(center)` 가 무효고
(실측: 앵커 중심 140px 자리에 정적 위치 161px 로 떨어짐), 뒤집힘을 CSS 로 감지할 수도
없다. Tooltip 은 근접으로, Hint·Tour 는 **대상 둘레 링**으로 가리킨다.

---

## 3. `guide.css` — 검증된 코드

```css
[data-slot="guide-bubble"] {
  margin: 0;
  border: var(--border-width) solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-overlay);
  /* 진입 모션 — popover 는 display 전환이라 allow-discrete 가 없으면 조용히 안 움직인다 */
  opacity: 0;
  translate: 0 2px;
  transition:
    opacity   var(--dur-fast) var(--ease-decelerate),
    translate var(--dur-fast) var(--ease-decelerate),
    overlay   var(--dur-fast) allow-discrete,
    display   var(--dur-fast) allow-discrete;
}
[data-slot="guide-bubble"]:popover-open { opacity: 1; translate: 0 0; }
@starting-style {
  [data-slot="guide-bubble"]:popover-open { opacity: 0; translate: 0 2px; }
}

/* CSS 경로 */
[data-slot="guide-bubble"][data-place="css"] {
  position-anchor: var(--guide-anchor);
  position-area: var(--guide-area, block-start);
  position-try-fallbacks: flip-block, flip-inline;
  margin-block: var(--anchor-gap);
}
/* JS 폴백 경로 — 덮어쓰기가 아니라 분리된 선택자다 */
[data-slot="guide-bubble"][data-place="js"] {
  position: fixed;
  top: var(--guide-y);
  left: var(--guide-x);
}

/* 툴팁 — 표면과 반전 */
[data-slot="guide-tooltip"] {
  max-inline-size: var(--tooltip-max-w);
  padding: var(--space-8) var(--space-12);
  background: var(--tooltip-bg);
  color: var(--tooltip-fg);
  border-color: transparent;
  font-size: var(--text-body-sm);
  line-height: var(--text-body-sm-lh);
}
/* 힌트·투어 — 읽을 분량이 있으므로 반전하지 않는다 */
[data-slot="guide-hint"] {
  max-inline-size: var(--hint-max-w);
  padding: var(--space-16);
  background: var(--hint-bg);
  color: var(--text-primary);
}

/* 대상 표시 — outline 은 레이아웃을 밀지 않는다(실측 확인) */
[data-guide-target="active"] {
  outline: var(--focus-width) solid var(--hint-ring);
  outline-offset: var(--focus-offset);
  border-radius: var(--radius-sm);
}

@media (prefers-reduced-motion: reduce) {
  [data-slot="guide-bubble"] { transition: none; translate: none; }
}
```

`transition: none` + `translate: none` 조합이 **reduce 에서 즉시 불투명**이 되는 것까지
실측했다(t0 에서 opacity 1). 이 블록을 지우거나 `animation: none` 으로 바꾸지 마라.

간격 스케일은 `0 2 4 8 12 16 20 24 32 40 48 64 80 96` 뿐이다 — 6·10·14 같은 값은
없다. 글자 토큰 이름은 `--text-body-sm` / `--text-body-sm-lh` 다
(`--font-size-*` 가 아니다). **없는 토큰이 필요해지면 토큰 생성기를 고치지 말고
보고하라.**

---

## 4. `Tooltip`

```tsx
<Tooltip content="주문이 창고에 접수된 시각">
  <Button variant="ghost" size="sm" aria-label="설명">?</Button>
</Tooltip>
```

- 자식은 **하나**다. `cloneElement` 로 `anchor-name`, `aria-describedby`,
  핸들러, ref 를 합친다. 우리 컴포넌트는 `forwardRef` 를 쓰므로 ref 병합이 된다.
  자식의 기존 핸들러를 **덮지 말고 둘 다 호출하라.**
- **호버는 `--tooltip-delay-in`(400ms) 뒤에, 포커스는 즉시** 띄운다.
  키보드 사용자를 기다리게 할 이유가 없고, 호버는 스쳐가는 커서로 깜빡인다.
- 닫기는 `--tooltip-delay-out`(120ms) 뒤. 인접 트리거 사이를 지날 때 깜빡임을 막는다.
- **Escape 로 닫힌다.** `popover="manual"` 은 light dismiss 가 없으니 직접 붙여라.
- 툴팁 자체는 포커스 대상이 아니고 상호작용 요소를 담지 않는다.
  `content` 에 버튼을 넣고 싶어지면 그건 `Hint` 다.
- 언마운트·비활성화 시 타이머를 정리하라.
- `content` 가 비어 있으면 아무것도 띄우지 않는다(자식은 그대로 렌더).

## 5. `Hint`

한 번만 알리는 코치마크. **보였는지 기억하는 책임은 앱에 있다** — 우리는
`open` / `onDismiss` 만 받는다. localStorage 를 이 컴포넌트에 넣지 마라.

```tsx
<Hint
  open={!seen.csvExport}
  title="선택한 행만 내보낼 수 있습니다"
  onDismiss={() => markSeen('csvExport')}
  action={{ label: '지금 해보기', onClick: runExport }}
>
  <Button>내보내기</Button>
</Hint>
```

- `role="dialog"` + `aria-labelledby`(제목) + `aria-describedby`(본문).
- 열릴 때 말풍선으로 포커스를 옮기고, 닫을 때 트리거로 되돌린다.
- **포커스를 가두지 마라**(10.4). 사용자가 Tab 으로 빠져나갈 수 있어야 한다.
- 대상에 `data-guide-target="active"` 를 붙여 링을 그린다. 닫을 때 제거한다.
- 닫기 버튼(`aria-label="닫기"`)과 Escape 둘 다 동작한다.

## 6. `Tour`

```tsx
const tour = useTour({ steps, onFinish, onSkip });
<Button onClick={tour.start}>둘러보기</Button>   {/* 트리거는 앱이 제공 */}
<Tour {...tour} />
```

```ts
export type TourStep = {
  id: string;
  target: string | (() => Element | null);
  title: string;
  body: string;
};
export type UseTourOptions = {
  steps: TourStep[];
  onFinish?: () => void;
  onSkip?: (atIndex: number) => void;
  onMissingTarget?: 'skip' | 'center';   // 기본 'skip'
};
```

규칙:
- **`start()` 없이는 절대 열리지 않는다.** `useEffect` 로 자동 시작하는 코드 금지.
- `steps.length > 3` 이면 **개발 모드에서 경고**하라 (10.1). 던지지는 마라 —
  앱이 과도기에 4개를 넘길 수 있다. 메시지에 완주율 근거를 한 줄 넣어라.
- 모든 단계에 **건너뛰기**와 Escape. 둘 다 `onSkip(현재 index)` 를 부른다.
- 진행 표시는 "2 / 3" 텍스트로 한다. 점 세 개는 쓰지 마라 —
  같은 모양의 점은 색 외 신호가 없다(R02 에서 지적된 문제와 같은 종류다).
- **모달이 아니다**(10.4). 배경을 덮는 오버레이를 만들지 마라. 포커스도 가두지 마라.
- 마지막 단계의 다음 버튼은 "완료"이고 `onFinish` 를 부른다.

### 6.1 대상이 DOM 에 없을 때 — `resolve-step.ts`

**이게 이 작업에서 가장 틀리기 쉬운 부분이다.** 우리 `DataTable` 은 가상화되어 있어
화면 밖 행은 DOM 에 없다(10.5). 순수 함수로 분리해서 테스트하라:

```ts
export function resolveStep(
  steps: TourStep[],
  from: number,
  dir: 1 | -1,
  find: (step: TourStep) => Element | null,   // 주입. 테스트에서는 가짜를 넣는다
  onMissing: 'skip' | 'center',
): { index: number; target: Element | null } | null   // null = 투어 종료
```

- `onMissing: 'skip'` — 대상을 못 찾으면 `dir` 방향으로 계속 건너뛴다.
  끝까지 못 찾으면 `null`(종료).
- `onMissing: 'center'` — 못 찾아도 그 단계를 보여주되 `target: null` 로 반환한다.
  호출자는 말풍선을 화면 중앙에 띄우고 **링을 그리지 않는다.**
- 어느 쪽이든 개발 모드에서 어느 단계의 어느 선택자가 실패했는지 경고하라.
- **빈 좌표를 가리키는 경로가 없어야 한다.** 이것이 합격 기준이다.

### 6.2 대상을 화면 안으로

대상이 뷰포트 밖이면 `scrollIntoView({ block:'center', behavior:'smooth' })` 로
가져온다. `prefers-reduced-motion: reduce` 면 `behavior:'auto'`.
스크롤이 끝난 **뒤에** 말풍선을 띄워라 — 폴백 경로는 스크롤 중 좌표가 어긋난다.

---

## 7. 테스트

### 7.1 단위 (`node --test`)

`place-fallback.test.mjs`:
- 위아래 여유 충분 → `bottom`
- 하단 대상 → `top` 으로 뒤집힘
- 위아래 둘 다 부족 → `pad` 아래로 내려가지 않음
- 좌측·우측 가장자리 → `pad` 안으로 밀려 들어옴
- 말풍선이 뷰포트보다 넓음 → 음수 좌표가 나오지 않음
- 모든 반환값이 유한수 (NaN 금지)

`resolve-step.test.mjs`:
- 전부 존재 → 순서대로 전진·후진
- 가운데 하나 없음 + `skip` → 건너뛴다
- 전부 없음 + `skip` → `null`
- 가운데 하나 없음 + `center` → `target: null` 로 그 단계 반환
- 마지막에서 전진 → `null`
- 첫 단계에서 후진 → `null`

### 7.2 스토리 (`guide.stories.tsx`)

`play` 로 단언하라. 스크린샷은 **play 가 끝난 뒤 상태**다 — R05 에서 이걸 잊어서
"렌더되지 않는다"고 오진했다.

필요한 스토리:
1. `툴팁-기본` — 호버 지연 뒤 표시, 떠나면 닫힘, Escape 로 닫힘
2. `툴팁-포커스` — 포커스에서는 **즉시** 뜬다
3. `툴팁-테이블안` — 스크롤 컨테이너 안에서 **잘리지 않는다**.
   말풍선의 `getBoundingClientRect()` 가 컨테이너 바깥에 있음을 단언하라
4. `힌트` — 열림, 포커스 이동, 닫으면 트리거로 복귀, 링이 대상에 붙음
5. `투어-3단계` — 트리거로 시작, 전진/후진, 완료 시 `onFinish`
6. `투어-건너뛰기` — 어느 단계에서든 닫힘 + `onSkip(index)`
7. `투어-대상없음` — 선택자가 없는 단계를 건너뛰고 **빈 곳을 가리키지 않는다**
8. `투어-단계초과` — 4단계를 넘기면 경고가 나온다(동작은 유지)
9. `모션-감소` — reduce 에서 전환이 없다

### 7.3 완료 조건

```bash
pnpm verify
node --test packages/ui/src/lib/*.test.mjs packages/ui/src/components/*/*.test.mjs
```

기존 테스트·스토리가 전부 통과해야 한다.

---

## 8. 하지 마라

- **투어 자동 실행.** 어떤 형태로도.
- 배경을 덮는 모달 오버레이, 포커스 트랩.
- 화살표·꼬리 (근거 10.3.1).
- Floating UI 등 새 의존성. `package.json` 을 건드리지 마라.
- 토큰 생성기 · `packages/tokens/*` · `DESIGN.md` · `AGENTS.md` 수정.
- 영속 저장(localStorage)을 컴포넌트 안에 넣는 것.
- 기존 컴포넌트 수정. `DataTable` 에 툴팁을 끼워넣지 마라 — 이번 범위가 아니다.
- 커밋 · 푸시.

## 9. 보고할 것

- `place-fallback` 과 `resolve-step` 의 공개 시그니처 (바꿨다면 왜)
- 없어서 다른 값으로 맞춘 토큰이 있는지
- `cloneElement` ref 병합에서 막힌 자식 유형이 있었는지
- 3절 CSS 에서 **한 줄이라도** 바꿨다면 무엇을 왜
- 의도적으로 하지 않은 것
