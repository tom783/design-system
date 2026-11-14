# R05 · 스켈레톤과 로딩 모션

`AGENTS.md` 와 **`DESIGN.md` 9절(로딩)** 을 먼저 읽어라.
9절의 표와 규칙이 이 작업의 합격 기준이다. 9.1 의 대기 시간 구간을 임의로 바꾸지 마라.

---

## 0. 이미 준비된 것

토큰이 생성되어 있다(검증 통과). **새 색이나 새 시간값을 만들지 마라.**

| 토큰 | 값 | 용도 |
|---|---|---|
| `--skeleton-bg` | neutral-200 / 900 | 스켈레톤 블록 |
| `--skeleton-highlight` | neutral-100 / 800 | shimmer 하이라이트(옵트인) |
| `--progress-track` | neutral-200 / 900 | 진행 막대 트랙 |
| `--progress-fill` | brand-600 / 500 | 진행 막대 채움 |
| `--loading-delay` | 200ms | 이 안에 끝나면 로더를 띄우지 않는다 |
| `--loading-min-visible` | 400ms | 한번 뜬 로더의 최소 유지 시간 |
| `--loading-pulse-dur` | 1400ms | 맥박 주기 |
| `--loading-long-task` | 10000ms | 이 이상이면 떠날 수 있는 경로를 준다 |

기존 `DataTable` 의 스켈레톤이 참고 구현이다
(`data-table.css` 의 `[data-slot="data-table-skeleton"]`, opacity 0.4↔1).
**DataTable 을 고치지 마라.** 새 컴포넌트가 같은 시각 언어를 따르면 된다.

---

## 1. 만들 파일

| 경로 | 내용 |
|---|---|
| `packages/ui/src/lib/use-delayed-loading.ts` | 지연·최소유지 훅 (핵심 로직) |
| `packages/ui/src/lib/loading-state.ts` | 그 로직의 순수 함수 + 타입 |
| `packages/ui/src/components/loading/skeleton.tsx` | `Skeleton` · `SkeletonText` |
| `packages/ui/src/components/loading/skeleton-patterns.tsx` | `CardSkeleton` · `ListSkeleton` · `FormSkeleton` · `ChartSkeleton` |
| `packages/ui/src/components/loading/progress-track.tsx` | `ProgressTrack` (결정적 진행률) |
| `packages/ui/src/components/loading/task-progress.tsx` | `TaskProgress` (10초+ 긴 작업) |
| `packages/ui/src/components/loading/index.ts` | 재수출 |
| `packages/ui/src/stories/loading.stories.tsx` | 스토리 |

`packages/ui/src/index.ts` 에 공개 API 를 추가한다.

---

## 2. `useDelayedLoading` — 이 작업의 핵심

9.1 의 두 규칙을 구현한다. **여기가 가장 중요하고 가장 틀리기 쉽다.**

```ts
// loading-state.ts — DOM·React 없이 테스트 가능한 순수 로직
export type LoadingPhase = 'idle' | 'waiting' | 'visible';
export function nextPhase(input: {
  phase: LoadingPhase; isLoading: boolean; now: number;
  startedAt: number | null;   // waiting 진입 시각
  shownAt: number | null;     // visible 진입 시각
  delay: number; minVisible: number;
}): { phase: LoadingPhase; at: number | null };
```

동작:

| 상황 | 결과 |
|---|---|
| `isLoading` 이 켜짐 | `waiting` 으로. 아직 아무것도 그리지 않는다 |
| `waiting` 에서 `delay` 경과 | `visible` 로. 이때부터 스켈레톤을 그린다 |
| `waiting` 중에 `isLoading` 꺼짐 | **`idle` 로 바로. 로더를 한 번도 보여주지 않는다** |
| `visible` 중에 `isLoading` 꺼짐, `minVisible` 미경과 | `minVisible` 까지 `visible` 유지 후 `idle` |
| `visible` 중에 `isLoading` 꺼짐, `minVisible` 경과 | 즉시 `idle` |

훅:
```ts
export function useDelayedLoading(isLoading: boolean, opts?: { delay?: number; minVisible?: number }): boolean;
```
기본값은 토큰에서 읽는다(200 / 400). 컴포넌트 언마운트 시 타이머를 반드시 정리한다.

**단위 테스트 필수** — `loading-state.test.mjs`. 가짜 시간(`now` 를 인자로 받으므로
타이머 없이 테스트 가능하다). 최소 케이스: 위 표의 5가지 + delay 정확히 경과한 경계 +
`isLoading` 이 빠르게 켜졌다 꺼졌다 반복.

---

## 3. 스켈레톤

### 3.1 `Skeleton`

```ts
interface SkeletonProps {
  /** 'text' 는 글자 높이(0.65em)로, 'block'·'circle' 은 주어진 치수로 */
  variant?: 'text' | 'block' | 'circle';
  width?: string | number;
  height?: string | number;
  /** text 일 때 어느 타입 토큰의 글자 크기를 따를지. 기본 body-sm */
  textStyle?: 'caption' | 'body-sm' | 'body' | 'title';
  /** shimmer 는 옵트인. 기본은 맥박 */
  animation?: 'pulse' | 'shimmer' | 'none';
  className?: string;
}
```

- **텍스트 높이는 행간이 아니라 글자 높이**다(9.2). `calc(<해당 토큰 크기> * 0.65)`.
- 모서리는 `--radius-sm`, 원형은 `--radius-full`.
- 기본 애니메이션은 **맥박**(opacity 0.4↔1, `--loading-pulse-dur`, ease-in-out).
  shimmer 는 옵트인 — 밀도 높은 화면에서 산만하고 비용이 크다.
- `prefers-reduced-motion` 에서 애니메이션 제거, `opacity: 1` 고정.
- 스켈레톤 요소 자체는 **`aria-hidden="true"`**. 콘텐츠로 읽히면 안 된다.

### 3.2 `SkeletonText`

```ts
interface SkeletonTextProps { lines?: number; textStyle?: …; lastLineWidth?: string; className?: string; }
```
기본 3줄, **마지막 줄 너비 기본 60%**. 줄 간격은 해당 타입 토큰의 행간을 따른다.

### 3.3 패턴 4종

실제 컴포넌트의 치수를 **같은 토큰에서** 가져와야 한다(9.2). 눈대중 px 금지.

- `CardSkeleton` — `Card` 의 여백·radius 와 일치. 제목 1줄 + 본문 2줄 + 하단 1줄
- `ListSkeleton` — `rows` prop. 행 높이는 `--row-h-default`
- `FormSkeleton` — `fields` prop. 레이블(caption) + 입력(`--control-h-md`) 쌍
- `ChartSkeleton` — 축 자리 + 플롯 영역. `TrendBand` 기본 높이 220 과 맞춘다

각 패턴의 루트에 `aria-busy="true"` 와 `role="status"` 를 두고,
**스크린리더용 텍스트 한 줄**(`sr-only`)로 "불러오는 중"을 알린다.
`label` prop 으로 그 문구를 바꿀 수 있게 한다(기본 "불러오는 중").

---

## 4. `ProgressTrack` — 3초~10초

```ts
interface ProgressTrackProps {
  /** 0~1. 생략하면 불확정(indeterminate) */
  value?: number;
  label: string;              // "주문 1,284건 내보내는 중"
  /** 남은 시간 대략값(초). 있으면 "약 N초 남음" 으로 표시 */
  etaSeconds?: number;
  className?: string;
}
```

- 높이 6px, 트랙 `--progress-track`, 채움 `--progress-fill`, radius full.
- **`role="progressbar"` + `aria-valuenow/min/max`**. 불확정이면 `aria-valuenow` 를 생략한다.
- 불확정일 때의 움직임은 **좌우 왕복이 아니라 한 방향 흐름**으로 한다.
  왕복은 "되돌아간다"는 잘못된 인상을 준다.
- 퍼센트 숫자는 고정폭(`--font-mono` + tabular). 자릿수가 바뀌며 흔들리면 안 된다.
- `etaSeconds` 는 **정확한 척하지 마라.** 10초 미만은 "곧 완료", 그 이상은 10초 단위로
  반올림해 "약 N초 남음". 1초 단위로 깜빡이는 카운트다운은 더 불안하게 만든다.

## 5. `TaskProgress` — 10초 이상, 드문 작업

9.3 의 세 번째 칸이다. **캐릭터가 허용되는 유일한 자리다.**

```ts
interface TaskProgressProps {
  title: string;              // "출고 일괄 처리"
  value?: number;             // 0~1
  /** 단계 목록. 현재 단계를 강조한다 */
  steps?: { label: string; done: boolean }[];
  etaSeconds?: number;
  /** 있으면 "백그라운드로 보내기" 버튼을 띄운다 — 떠날 수 있는 경로(9.1) */
  onDismiss?: () => void;
  className?: string;
}
```

모션은 **작업의 은유**여야 한다. 장식이 아니라 설명이다(9.3).
구체적인 그림은 네가 정하되 아래를 지켜라:

- 순수 CSS 또는 인라인 SVG. 새 의존성·외부 에셋 금지.
- 한 주기 **2~3초**, 무한 반복. 그보다 빠르면 초조해지고 느리면 멈춘 것처럼 보인다.
- 색은 토큰만. `--progress-fill` · `--skeleton-bg` · `--chart-axis` 범위 안에서.
- `prefers-reduced-motion` 에서 **정지하되 진행률은 계속 갱신**된다.
  모션이 유일한 진행 신호가 되면 안 된다.
- 요소 수를 적게 유지하라. 10초 넘게 도는 애니메이션이 무거우면 그 자체가 체감을 해친다.

**단계 표시(`steps`)가 모션보다 중요하다.** 사용자가 알고 싶은 건
"재미"가 아니라 "어디까지 왔나"다. 모션은 그 위에 얹는 것이다.

---

## 6. 스토리

`loading.stories.tsx`:

1. `대기시간_계층` — 9.1 표를 **실제로 체험**하게 한다.
   150ms / 300ms / 1.5s / 5s 버튼을 두고 각각 눌렀을 때 무엇이 보이는지.
   **150ms 는 아무것도 안 보여야 한다** — 이게 이 스토리의 핵심이다.
2. `깜빡임_방지` — `useDelayedLoading` 있을 때와 없을 때를 나란히.
   빠른 응답(100ms)을 반복 트리거해 로더가 번쩍이는지 비교.
3. `스켈레톤_기본` — variant 3종 · textStyle 4종
4. `스켈레톤_패턴` — Card / List / Form / Chart 4종
5. `스켈레톤_치수일치` — **실제 컴포넌트와 스켈레톤을 위아래로 겹쳐 비교**.
   치수가 어긋나면 눈에 보이게. 이게 9.2 를 검증하는 스토리다.
6. `진행률` — 결정적 / 불확정 / ETA 있는 경우
7. `긴작업` — `TaskProgress` 단계 진행 + 백그라운드 전환 버튼
8. `모션_감소` — `prefers-reduced-motion` 에서 정지하는 것 (설명문으로 확인 방법 안내)

`play` 로 검증을 넣어라. 특히 1·2 번은 타이밍 동작이라 play 로 확인할 가치가 크다.

## 7. 완료 조건

```bash
pnpm verify
node --test packages/ui/src/lib/*.test.mjs packages/ui/src/components/loading/*.test.mjs
```

(`node --test <디렉토리>` 는 Node 24 에서 동작하지 않는다)

## 8. 범위 밖

- **`navigator.vibrate` 를 쓰지 마라.** DESIGN.md 9.5 에 쓰지 않기로 적혀 있다
  (Android Chromium 전용, iOS Safari 미지원).
- 토스트·알림 시스템은 다음 단계. `TaskProgress` 의 완료 알림은 콜백만 노출한다.
- Suspense·데이터 페칭 계층을 만들지 마라. 이 컴포넌트들은 `isLoading` boolean 만 받는다.
- `DataTable` · 차트 · 기존 컴포넌트를 고치지 마라. (스켈레톤을 쓰도록 바꾸는 것은
  다음 단계 — 지금은 새 컴포넌트만 만든다)
- 토큰 생성기 · `DESIGN.md` · `AGENTS.md` 를 고치지 마라.
- 새 외부 의존성 추가 금지. 커밋·푸시 금지.

## 9. 보고할 것

- `nextPhase` 의 상태 전이를 어떻게 구현했고 테스트가 어떤 케이스를 덮는지
- 스켈레톤 패턴이 실제 컴포넌트와 치수를 어떻게 공유하는지(어느 토큰을 읽었는지)
- `TaskProgress` 의 모션으로 무엇을 골랐고 왜 그것이 "작업의 은유"인지
- `prefers-reduced-motion` 에서 각 컴포넌트가 어떻게 바뀌는지
- 의도적으로 하지 않은 것
