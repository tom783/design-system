# R09 · 폼 — 끊기지 않는 연속 입력

`AGENTS.md` 와 `DESIGN.md` 3절(타이포)·4절(치수)을 먼저 읽어라.

이 화면들은 **하루 종일 입력하는 사람**이 쓴다 (물류 접수, 주문 등록).
한 건 넣는 데 드는 키 입력 수와 손이 마우스로 가는 횟수가 그대로 피로가 된다.

`input.tsx` 주석에 이미 이렇게 적혀 있다 — **"Field 컴포넌트가 묶어준다."**
그 Field 가 아직 없다. 이번에 만든다.

---

## 1. 먼저 — 내가 브라우저에서 측정한 한글 IME 사실 두 가지

**추측이 아니다. Chrome 157 에서 CDP 로 실제 조합 이벤트를 넣어 확인했다.**
이 두 가지를 모르면 한국어 폼은 반드시 깨진다.

### 1.1 조합 중 `input` 이벤트는 자모마다 발생한다

"한" 한 글자를 치는 동안:
```
compositionstart → input(ㅎ) → input(하) → input(한) → input(한) → compositionend
```
**조합 중 `input` 이 4회.** 즉 `onChange` 핸들러가 글자가 완성되기 전에 네 번 돈다.

### 1.2 가드 없이 조합 중에 포커스를 옮기면 글자가 쪼개진다

3글자가 차면 다음 칸으로 넘기는 흔한 패턴에 "한글입력"을 입력한 결과:

| | 본칸 | 다음칸 |
|---|---|---|
| 조합 가드 **없음** | `"한글ㅇ"` | `"입력"` |
| 조합 가드 **있음** | `"한글입"` | `"력"` |

**"입" 이라는 한 글자가 자모 단위로 두 칸에 찢어졌다.**

### 1.3 조합 중 Enter 는 `isComposing: true` 다

조합 중에 Enter 를 누르면 `keydown` 이 `isComposing: true` 로 온다. 가드가 없으면
**사용자가 "한"을 확정하려고 누른 Enter 가 다음 칸으로 튀는 데 쓰인다.**
한 번의 Enter 로 두 가지 일이 일어나므로 사용자는 글자를 잃었다고 느낀다.

### 1.4 그래서 규칙

> **조합 중(`isComposing`)에는 값을 변형하지도, 포커스를 옮기지도, 검증하지도 않는다.**

가드는 `e.nativeEvent.isComposing` 으로 읽는다 (React 합성 이벤트에는 없다).
`compositionstart` / `compositionend` 로 직접 추적해도 되지만,
**두 방법을 섞지 마라** — 어느 쪽을 썼는지 보고하라.

참고: **순수 제어 입력(변형 없이 `value`/`onChange` 만)은 한글이 멀쩡하다**
(측정: "한글입력" → `"한글입력"`). 제어 입력 자체를 피할 이유는 없다.
문제는 **값을 되쓰거나 포커스를 옮길 때**다.

---

## 2. 만들 것

```
packages/ui/src/components/form/
  field.tsx                  # 레이블·설명·오류 묶음 + a11y 배선
  form-flow.tsx              # FormFlow · useFormFlow (Enter 이동)
  use-composition.ts         # 조합 상태 추적
  should-validate.ts         # 순수 함수
  should-validate.test.mjs
  next-focusable.ts          # 순수 함수
  next-focusable.test.mjs
  form.css
  index.ts
packages/ui/src/stories/form.stories.tsx
```

`packages/ui/src/index.ts` 와 `styles.css` 에 연결한다.

---

## 3. `Field`

```tsx
<Field label="수취인" description="주문서에 인쇄됩니다" error={errors.receiver} required>
  <Input />
</Field>
```

- 자식은 **하나**. `cloneElement` 로 `id` · `aria-describedby` · `aria-invalid` ·
  `required` 를 주입한다. 자식이 이미 가진 값이 있으면 **덮지 말고 합쳐라.**
  (`guide/use-anchored.ts` 의 `useGuideChild` 가 같은 일을 한다 — 참고하되
  거기 코드를 고치지는 마라.)
- `description` 과 `error` **둘 다** `aria-describedby` 에 들어간다. 순서는 오류 먼저.
- **오류 자리를 미리 비워둬라.** `min-height: var(--text-caption-lh)`.
  오류가 떴다 사라질 때 아래 필드가 위아래로 튀면 입력하던 손이 어긋난다.
  이게 "흐름이 끊기지 않게"의 절반이다.
- 레이블은 `--text-caption`(13px/20px/weight 500). 이 시스템의 최소 크기다.
- `required` 는 레이블 옆에 표시하되 **별표만 쓰지 마라.** 색·기호만으로 전달하면
  안 된다 — 스크린리더에는 `required` 속성으로, 눈으로는 기호 + `aria-label` 로.
- 오류 문구는 `danger-ink`. **색만으로 구별하지 마라** — 아이콘을 함께 쓴다
  (`chart-frame.tsx` 의 오류 처리가 같은 규칙을 따른다).

## 4. `useComposition`

```ts
const composition = useComposition();   // { isComposing(): boolean, bind: {...} }
<input {...composition.bind} />
```

`ref` 로 들고 있어라. **상태로 두면 조합마다 리렌더가 나서 입력이 느려진다.**
읽는 쪽은 함수 호출로 현재 값을 본다.

## 5. `FormFlow` — Enter 로 다음 칸

```tsx
<FormFlow onSubmit={save} restartOnSubmit>
  <Field label="송장번호"><Input autoFocus /></Field>
  <Field label="수취인"><Input /></Field>
  <Field label="메모"><textarea /></Field>
  <Button type="submit">등록</Button>
</FormFlow>
```

규칙:

1. **Enter 는 다음 칸으로.** 마지막 칸에서는 제출한다.
2. **조합 중 Enter 는 아무것도 하지 않는다** (1.3). 글자 확정에만 쓰인다.
3. **`<textarea>` 에서 Enter 는 줄바꿈이다.** 절대 이동하지 마라.
   `Ctrl/Cmd+Enter` 로만 제출한다.
4. **`<select>` · `<button>` 에서는 네이티브 동작을 유지하라.**
5. **이동 순서는 Tab 순서와 같아야 한다.** Enter 와 Tab 이 다른 곳으로 가면
   사용자가 둘 다 못 믿게 된다. `disabled` · `hidden` · `tabindex="-1"` 를
   Tab 과 똑같이 건너뛴다. **`readOnly` 는 건너뛰지 마라** — Tab 이 안 건너뛴다.
6. `restartOnSubmit` 이면 제출 성공 후 첫 칸으로 포커스를 되돌린다.
   같은 종류를 연달아 넣는 접수 화면용이다. 기본값은 `false`.
7. **Shift+Enter 는 이전 칸.** 되돌아가기가 없으면 오타를 고치러 마우스를 잡아야 한다.

**이건 옵트인이다.** HTML 의 기본 Enter 동작(암묵적 제출)을 전역으로 바꾸지 마라.
`FormFlow` 로 감싼 폼에서만 적용된다. 검색창 하나짜리 폼은 감싸지 않는다.

### 5.1 `next-focusable.ts` — 순수 함수로 분리

```ts
export type FocusCandidate = { disabled?: boolean; hidden?: boolean; tabIndex?: number };
export function nextFocusable(items: FocusCandidate[], from: number, dir: 1 | -1): number | null;
```

DOM 을 읽지 마라. 호출자가 목록을 만들어 넘긴다. 테스트:
- 중간에 disabled 가 있으면 건너뛴다
- 끝에서 `dir=1` 이면 `null` (= 제출 신호)
- 처음에서 `dir=-1` 이면 `null`
- `tabIndex: -1` 은 건너뛴다, `readOnly` 는 건너뛰지 않는다
- 전부 비활성이면 `null`
- 빈 배열 → `null`

## 6. 검증 시점 — "늦게 혼내고 일찍 풀어준다"

입력 중에 글자마다 빨개지는 폼은 **아직 다 치지도 않았는데 혼내는 것**이다.
"hong@" 까지 쳤을 때 "올바른 이메일이 아닙니다"는 틀린 말이 아니라 무례한 말이다.

```ts
export function shouldValidate(
  { trigger, hasErrored, isComposing }:
  { trigger: 'change' | 'blur' | 'submit'; hasErrored: boolean; isComposing: boolean },
): boolean;
```

- `isComposing` 이면 **무조건 false** (1.4)
- `submit` → 항상 true
- `blur` → 항상 true  ← **첫 검증은 여기서만**
- `change` → `hasErrored` 일 때만 true
  (한 번 틀린 뒤에는 고치는 즉시 오류가 사라져야 한다. 안 그러면
   고쳐놓고도 빨간 채로 남아 사용자가 뭘 더 해야 하나 멈춘다)

테스트에서 9가지 조합을 전부 덮어라.

**검증이 포커스를 옮기면 안 된다.** blur 에서 오류가 떠도 포커스는 사용자가
간 곳에 그대로 둔다. 제출 시에만 첫 오류 필드로 보낸다.

## 7. 스토리

1. `기본` — Field 하나. 레이블·설명·오류 배선 확인 (`aria-describedby` 단언)
2. `오류-레이아웃` — 오류가 떴다 사라져도 **아래 요소 좌표가 안 변한다**를 단언
3. `검증시점` — 입력 중에는 안 빨개지고, blur 에서 빨개지고, 고치면 즉시 풀린다
4. `Enter-이동` — Enter 로 다음, Shift+Enter 로 이전, 마지막에서 제출
5. `Enter-textarea` — textarea 에서 Enter 는 줄바꿈, Ctrl+Enter 로 제출
6. `Enter-비활성건너뜀` — disabled 필드를 Tab 과 같은 순서로 건너뛴다
7. `한글-자동이동` — **1.2 의 회귀 테스트.** 3글자 자동이동 칸에 한글을 조합 입력해
   자모가 쪼개지지 않음을 단언한다
8. `한글-Enter` — 조합 중 Enter 가 칸을 옮기지 않음을 단언 (1.3)
9. `연속등록` — `restartOnSubmit` 으로 제출 후 첫 칸으로 돌아온다

**7·8 을 어떻게 테스트할지**: Storybook `play` 에서는 진짜 IME 를 못 쓴다.
`new CompositionEvent('compositionstart')` 와 `isComposing: true` 를 실은
`KeyboardEvent` 를 직접 디스패치해서 **가드가 동작하는지**를 본다.
실제 IME 조합은 내가 CDP 로 따로 검증한다 — 그건 네 일이 아니다.
`play` 에서 확인할 것은 "가드 조건문이 실제로 막는가"다.

`play` 작성 시 주의:
- `getComputedStyle` 은 라이브 객체다. 상태를 바꾸기 전에 문자열로 복사하라.
- 좌표 비교는 `getBoundingClientRect()` 값을 숫자로 떠서 비교하라.

## 8. 완료 조건

```bash
pnpm verify
node --test packages/ui/src/components/form/*.test.mjs
node --test packages/ui/src/lib/*.test.mjs packages/ui/src/components/*/*.test.mjs
```

## 9. 하지 마라

- 전역 `keydown` 리스너로 Enter 를 가로채는 것. `FormFlow` 안에서만 처리한다.
- 폼 상태 관리 라이브러리 도입 (react-hook-form 등). **새 의존성 금지.**
  `Field` 는 값을 소유하지 않는다 — 앱이 소유하고 우리는 표시와 배선만 한다.
- 검증 규칙 자체(이메일 정규식, 사업자번호 체크섬 등)를 이 패키지에 넣는 것.
  **시점만 다루고 내용은 앱이 정한다.**
- `Input` · `Checkbox` 의 기존 공개 API 변경
- 토큰 생성기 · `packages/tokens/*` · `DESIGN.md` · `AGENTS.md` 수정
- 안내(`guide/`) · 차트 · 테이블 수정
- 커밋 · 푸시

## 10. 보고할 것

- 조합 추적을 `nativeEvent.isComposing` 으로 했는지 `composition*` 이벤트로 했는지, 왜
- `Field` 가 자식의 기존 `aria-describedby` / `id` 를 어떻게 합쳤는지
- `nextFocusable` 과 `shouldValidate` 의 최종 시그니처
- 오류 자리 예약으로 폼 전체 높이가 얼마나 늘어났는지 (측정값)
- `play` 에서 IME 가드를 어떤 이벤트로 흉내 냈는지
- 의도적으로 하지 않은 것
