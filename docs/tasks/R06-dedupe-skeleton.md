# R06 · 스켈레톤 중복 정리

**동작하는 검증된 코드를 고치는 리팩터링이다.** 기능을 추가하지 말고, 겉보기 동작을
바꾸지 마라(한 곳만 예외 — 2.3). 끝나고 기존 검증이 전부 통과해야 한다.

`AGENTS.md` 와 `DESIGN.md` **9.2절**을 먼저 읽어라.

---

## 1. 무엇이 중복인가

같은 스켈레톤을 두 곳이 각자 정의하고 있다. **구조가 아니라 정의가 중복**이다 —
테이블 행 레이아웃은 테이블에만 필요하므로 그건 중복이 아니다.

| 항목 | `data-table.css` / `.tsx` | `loading.css` / `skeleton.tsx` |
|---|---|---|
| keyframes | `data-table-loading` 0.4↔1 | `loading-pulse` 0.4↔1 — **완전히 같다** |
| 지속시간 | `1.4s` 하드코딩 | `var(--loading-pulse-dur)` |
| 색 | `bg-sunken` (Tailwind) | `var(--skeleton-bg)` — **역할이 같은데 토큰이 다르다** |
| 높이 | `12px` 하드코딩 | 글자 크기 × 0.65 (9.2 규칙) |
| reduced-motion | 자체 블록 | 자체 블록 |

둘이 갈라지면 "테이블 스켈레톤만 다르게 깜빡이는" 버그가 된다.

차트 쪽에도 하나 더 있다 — `skeleton-patterns.tsx` 의 `ChartSkeleton` 이
TrendBand 의 치수(220)를 **주석과 함께 복사**해 들고 있다.

---

## 2. 할 일

### 2.1 `DataTable` 의 스켈레톤 막대를 `Skeleton` 컴포넌트로 바꾼다

`data-table.tsx` 에 `data-slot="data-table-skeleton"` 이 **두 군데** 있다:
- 스켈레톤 행 안의 셀 막대 (280행 부근)
- 하단 "불러오는 중" 옆의 작은 막대 (343행 부근)

둘 다 `<Skeleton>` 으로 교체한다.

**행/셀 레이아웃은 그대로 둔다.** 바꾸는 것은 막대 요소 하나뿐이다.
셀의 `width` / `flex` 인라인 스타일, `cellClass`, 스페이서, 가상화 로직을
건드리지 마라 — 고정 컬럼 오프셋이 실측 너비에 의존한다.

막대 너비 계산(`60 + ((index + cellIndex) % 3) * 10`%)은 유지한다.

### 2.2 중복 CSS 를 지운다

`data-table.css` 에서 제거:
- `@keyframes data-table-loading`
- `[data-slot="data-table-skeleton"]` 규칙
- 그 reduced-motion 블록

`[data-slot="data-table-skeleton-row"] .data-table-cell { display:flex; ... }` 은
**남긴다** — 행 레이아웃이지 스켈레톤 정의가 아니다.

### 2.3 유일하게 허용되는 겉보기 변화 — 막대 높이

지금 12px 하드코딩이다. 테이블 본문 글자는 `body-sm`(14px)이므로
9.2 규칙(글자 높이 ≈ 0.65em)을 따르면 **약 9.1px** 이 된다.

`<Skeleton variant="text" textStyle="body-sm">` 를 써서 규칙에 맞춘다.
이것이 이 작업에서 **의도적으로 바뀌는 유일한 겉보기**다.
하단 "불러오는 중" 옆 막대도 같은 기준을 따른다.

### 2.4 차트 치수 중복 제거

`--chart-h-default: 220px` 토큰을 방금 추가했다.

- `ChartSkeleton` 이 220 을 직접 쓰지 말고 이 토큰을 읽게 한다.
  "차트에는 높이 토큰이 아직 없어" 라고 적힌 주석도 갱신한다.
- `TrendBand` 와 `CompositionArea` 의 `height` 기본값도 이 토큰에서 오게 한다.
  기본값이 숫자여야 하는 자리(prop 기본값)라면, 토큰을 읽는 작은 헬퍼를 쓰거나
  CSS 쪽에서 높이를 주는 방식 중 **타입이 깨끗한 쪽**을 골라라. 판단해서 보고하라.
  억지로 맞추다 코드가 복잡해지면 ChartSkeleton 만 토큰을 쓰고 끝내도 된다.

---

## 3. 하지 마라

- **`ChartSkeleton` 을 차트 컴포넌트에 연결하지 마라.** 차트에는 아직 로딩 상태가
  없고, 그건 API 추가지 중복 정리가 아니다. 다음 단계로 남긴다.
- 테이블의 가상화·무한스크롤·선택·고정 컬럼·내보내기 로직을 건드리지 마라.
- 로딩 패키지의 공개 API 를 바꾸지 마라.
- 토큰 생성기 · `DESIGN.md` · `AGENTS.md` 를 고치지 마라.
- 새 의존성 추가 금지. 커밋·푸시 금지.

## 4. 완료 조건

```bash
pnpm verify
node --test packages/ui/src/lib/*.test.mjs \
  packages/ui/src/components/data-table/*.test.mjs \
  packages/ui/src/components/loading/*.test.mjs \
  packages/ui/src/components/chart/*.test.mjs
```

**기존 스토리의 play 가 전부 통과해야 한다.** 특히:
- `DataTable / 상태` — 스켈레톤이 여전히 렌더되는가
- `DataTable / 가상화_컬럼고정` — 고정 컬럼 오프셋이 그대로인가
- `DataTable / 무한스크롤` — 하단 로딩 막대가 그대로인가

기존 play 단언이 12px 같은 옛 값을 기대하고 있으면 **2.3 에 맞춰 갱신**하되,
단언을 약하게 만들어 통과시키지 마라(예: 높이 검사 자체를 지우는 것).

`data-table.css` 에 `data-table-loading` 이 **한 글자도 남지 않아야 한다**:
```bash
grep -c "data-table-loading" packages/ui/src/components/data-table/data-table.css   # → 0
```

## 5. 보고할 것

- 바꾼 파일과, 각 변경이 "정의 중복 제거"인지 "구조 유지"인지
- 2.4 에서 어느 방식을 골랐고 왜 그쪽이 타입이 깨끗한지
- 기존 play 단언 중 갱신한 것이 있으면 무엇을 왜
- 겉보기가 바뀐 곳(2.3 외에 또 있는지)
- 의도적으로 하지 않은 것
