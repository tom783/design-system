# R03-B 후속 · 포커스 복구 조사 — **제품 버그 아님 (2026-11-14 종결)**

> ## 결론: 코드는 정상이다. 고치지 마라.
>
> 아래 "증상"은 **헤드리스 Chrome 의 측정 결함**이었다.
> 헤드리스는 문서가 시스템 포커스를 갖지 않으면 `focus`/`focusin` 이벤트를 억제한다.
> 그래서 `onFocusCapture`(`keepFocusVisible`)가 호출되지 않았고 `focusedRow.current`
> 가 비어 있었다. CDP 의 `Emulation.setFocusEmulationEnabled: true` 를 켜고 재측정하니:
>
> ```
> ① 행 focus()  → keepFocusVisible 호출됨 (rowId: ORD-LARGE-00001)
> ② 멀리 스크롤 → hasRef=true connected=false → 복구 실행
>                → activeElement = DIV[data-table-scroll]   ✓
> ```
>
> `가상화_1만행` play 를 포함해 **14개 스토리 play 전부 통과**한다.
> 검증 하네스는 `docs/qa/render-verify.mjs` 에 있고 이 설정이 들어가 있다.
>
> Codex 는 이 지시서를 받고도 **브라우저 계측이 막혀 원인을 확인할 수 없다는 이유로
> 코드를 바꾸지 않았다.** 그 판단이 옳았다 — 지시서가 틀렸고, 추측으로 고쳤다면
> 멀쩡한 코드를 망가뜨렸을 것이다.

---

## (이하는 당시의 잘못된 보고 — 기록용)



렌더 검증에서 발견했다. **당신이 작성한 play 테스트가 이것을 잡는다** —
브라우저 접근이 막혀 실행하지 못했을 뿐이다.

**이 버그 하나만 고친다. 다른 동작·API·스타일을 바꾸지 마라.**

---

## 1. 증상 — 실측

`packages/ui/src/stories/data-table.stories.tsx` 의 `가상화_1만행` play 가 실패한다:

```
expect(element).toHaveFocus()
Expected element with focus:
  <div data-slot="data-table-scroll" tabindex="-1"> …
```

헤드리스 Chrome(CDP)으로 단계별 계측한 결과:

| 단계 | 관측값 |
|---|---|
| ① 첫 행에 `focus()` | `activeElement` = `TR[data-table-row]` · `tabindex=0` · 스크롤 컨테이너 안에 있음 |
| ② `scrollTop = 200000` 로 멀리 스크롤 | 그 행이 DOM 에서 제거됨 (`querySelector('[aria-rowindex="2"]')` → null) |
| ③ 100ms 후 | `activeElement` = **`BODY`** |
| ④ 1,000ms 후 | `activeElement` = **`BODY`** (복구되지 않음) |
| ⑤ 수동으로 `scrollRef.focus()` 호출 | `activeElement` = `DIV[data-table-scroll]` → **컨테이너는 포커스 가능하다** |

추가 계측 — `HTMLElement.prototype.focus` 를 가로채 호출을 기록했다:

- 행이 언마운트될 때 **복구용 `focus()` 가 한 번도 호출되지 않는다.**
- 행이 제거될 때 **`focusout` 이벤트도 발생하지 않는다.**
  (브라우저는 포커스된 요소가 제거되면 이벤트 없이 `activeElement` 를 `body` 로 되돌린다)

즉 `data-table.tsx` 의 이 effect 가 의도대로 동작하지 않는다:

```tsx
React.useLayoutEffect(() => {
  const focused = focusedRow.current;
  if (!focused || focused.element.isConnected) return;
  if (document.activeElement === document.body) scrollRef.current?.focus({ preventScroll: true });
  focusedRow.current = null;
});
```

## 2. 유력한 원인 — 확인하고 고쳐라

단정하지 않는다. 다만 가장 유력한 것은 **마지막 줄의 무조건 초기화**다.

```tsx
if (document.activeElement === document.body) scrollRef.current?.focus(...);
focusedRow.current = null;   // ← 가드가 실패해도 지워진다
```

이 effect 는 의존성 배열이 없어 **렌더마다** 실행된다. 어떤 렌더에서
`focused.element.isConnected === false` 이지만 `document.activeElement` 가
그 순간 정확히 `document.body` 가 **아니면**(iframe 안에서 `null` 이거나,
아직 분리 중인 노드이거나), focus 호출은 건너뛰면서 **참조는 지워진다.**
그 뒤로는 복구할 기회가 영영 없다.

확인할 것:
- `focusedRow.current` 가 실제로 채워지는지 (`keepFocusVisible` 가 `onFocusCapture` 로 불리는지)
- effect 가 언마운트 직후 렌더에서 실행되는지
- 그 시점 `document.activeElement` 가 정확히 무엇인지

**원인을 추측으로 고치지 말고, 임시 로그라도 넣어 확인한 뒤 고쳐라.**
(확인용 로그는 제출 전에 반드시 제거한다.)

## 3. 고칠 때 지켜야 할 것

- **복구 조건을 넓혀라.** "정확히 `document.body`" 보다, **포커스가 우리 테이블 밖으로
  떨어졌는가**로 판단하는 편이 맞다 —
  `!scrollRef.current?.contains(document.activeElement)` 같은 형태.
  단, 사용자가 **의도적으로** 테이블 밖(다른 버튼 등)으로 포커스를 옮긴 경우까지
  빼앗아오면 안 된다. 기존 `onBlurCapture` 가 그 구분을 위해 있으니 함께 보라.
- **참조 초기화는 복구에 성공했을 때만** 하거나, 복구 시도가 유효하지 않은 렌더에서는
  남겨 두어라.
- `preventScroll: true` 는 유지한다. 포커스 이동이 스크롤을 되돌리면 안 된다.
- 포커스가 테이블 안의 다른 요소(체크박스 등)에 있으면 **아무것도 하지 마라.**

## 4. 완료 조건

```bash
pnpm verify
node --test packages/ui/src/components/data-table/*.test.mjs
```

그리고 **브라우저에서 play 테스트를 실제로 실행해 `가상화_1만행` 이 통과하는 것을
확인하라.** 이번에는 브라우저 접근이 열려 있다. 정적 빌드를 쓰면 다음처럼 띄울 수 있다:

```bash
pnpm build-storybook
python3 -m http.server 6099 --directory storybook-static &
# http://localhost:6099/iframe.html?id=components-datatable--가상화-1만행&viewMode=story
```

통과 여부를 **어떻게 확인했는지 보고에 적어라.** "통과했습니다" 만으로는 부족하다.

가능하면 회귀를 막을 수 있게, 포커스 복구 판정 로직을 순수 함수로 분리해
단위 테스트를 추가하는 것을 검토하라 (DOM 없이 검증 가능한 형태라면).
억지로 분리해 코드가 더 복잡해진다면 하지 않아도 된다 — 판단해서 보고하라.

## 5. 범위 밖

- 다른 play 테스트 13개는 전부 통과한다. 건드리지 마라.
- 가상화·무한스크롤·선택·내보내기의 동작과 API 를 바꾸지 마라.
- `should-load-more.ts`, `export-csv.ts`, `use-data-table.ts`,
  `selection-column.tsx`, `checkbox.tsx` 는 이 버그와 무관하다.
- 토큰 생성기·`DESIGN.md`·`AGENTS.md`·기존 컴포넌트를 고치지 마라.
- 새 의존성 추가 금지. 커밋·푸시 금지.

## 6. 보고할 것

- 실제 원인 (확인한 방법과 함께)
- 고친 내용과, 왜 그 방식이 "사용자가 의도적으로 밖으로 나간 경우"를 깨뜨리지 않는지
- play 테스트를 브라우저에서 어떻게 실행해 확인했는지
- 순수 함수 분리 여부와 그 판단 근거
