# R13-B · 스토리 play 5개가 실패한다

**`pnpm verify` 와 단위 테스트는 play 를 돌리지 않는다.** 그래서 녹색이었다.
브라우저에서 돌려보니 15개 중 5개가 `playComplete: false` 로 끝난다.
내가 측정한 실제 오류를 그대로 옮긴다. 추측하지 말고 이걸로 시작해라.

재현:
```bash
pnpm build-storybook
npx http-server storybook-static -p 6099 -s &
node docs/qa/list-screen-render-verify.mjs   # 또는 개별 스토리를 직접 연다
```

---

## 1. `components-toast--다크` — 색이 틀렸다 (제품 버그)

```
AssertionError: expected 'rgb(247, 246, 245)' to be 'rgb(255, 137, 110)'
```

`rgb(247,246,245)` 는 neutral-50(본문색), `rgb(255,137,110)` 은 danger-400.
**다크 테마에서 오류 토스트가 danger 토큰을 쓰지 않고 본문색으로 나온다.**

sonner 는 자체 CSS 를 주입한다. 우리 클래스가 그 뒤에 와야 이긴다.
`toastOptions.classNames` 로 준 클래스가 sonner 기본값에 밀리는지 확인하라.
**라이트에서는 맞고 다크에서만 틀리다면** 3상태 테마 판정(`data-theme` 감시)이
sonner 에 전달되는 시점 문제일 수 있다.

고친 뒤 **라이트·다크 양쪽에서 성공/오류/정보 세 톤을 전부** 확인하라.

## 2. `components-datepicker--기간선택` · `--단일날짜` — 고른 값이 안 보인다

```
expect(element).toHaveTextContent()
Expected: 2026-11-10 ~ 2026-11-15     Received: (빈 문자열)
Expected: 2026-11-12                  Received: (빈 문자열)
```

날짜를 고른 뒤 표시가 비어 있다. **DatePicker 의 핵심 기능이다.**

내가 확인한 것:
- 트리거는 `aria-label="달력 열기"` 인 **아이콘 전용 버튼**이고 텍스트가 없다.
- `한국어` 스토리에서는 달력이 열리고 "2026년 11월 일 월 화…" 가 보인다.
  즉 **달력 자체는 뜬다.**
- `단일날짜` 스토리에서 같은 방식으로 눌렀을 때는 날짜 셀을 찾지 못했다.

그러니 둘 중 하나다 — **선택이 상태로 전파되지 않거나, 표시 요소가 값을 안 받거나.**
어느 쪽인지 **브라우저에서 직접 눌러 확인하고 보고하라.** 스토리 단언을 고쳐
통과시키는 것은 금지다. 기능이 되는지부터 확인해라.

그리고 **선택한 값을 어디에 보여줄지 정해라.** 지금 트리거에 텍스트가 없다.
기간 필터는 "2026-11-10 ~ 2026-11-15" 가 **닫힌 상태에서 보여야** 쓸모가 있다.
운영자는 달력을 열지 않고도 지금 어떤 기간을 보고 있는지 알아야 한다.

## 3. `components-select--필드` · `--폼흐름` — Radix 가 페이지를 aria-hidden 으로 덮는다

```
필드:   expect(element).toHaveFocus()
        <button aria-hidden="true" aria-expanded="true" …>
폼흐름: Unable to find an accessible element with the role "textbox"
        There are no accessible roles. … <div aria-hidden="true">
```

Radix Select 가 **열리면 포털 밖의 모든 것을 `aria-hidden="true"` 로 만든다.**
그 상태에서 `getByRole` 이나 `toHaveFocus` 를 쓰면 아무것도 못 찾는다.

이건 Radix 의 정상 동작이다(모달 의미). **스토리가 팝업이 열린 채로 단언하고 있다.**

고치는 방향:
- 단언 전에 **팝업을 닫아라**(선택 또는 Escape). 닫힌 뒤에 포커스·역할을 본다.
- 열린 상태를 꼭 봐야 하면 `getByRole(..., { hidden: true })` 를 쓰되
  **왜 hidden 인지 주석으로 남겨라.**
- `폼흐름` 의 목적은 "Enter 가 목록을 열고 다음 칸으로 가지 않는다" 다.
  그 단언은 **열기 전/후 포커스 위치**로 확인하면 된다 — textbox 를 찾을 필요가 없다.

**단언을 약하게 만들어 통과시키지 마라.** 검사 자체를 지우는 것도 금지다.

## 4. 하네스에 새 스토리를 연결하라

`docs/qa/list-screen-render-verify.mjs` 가 **15개 신규 스토리를 전부** 돌게 하고
`docs/qa/run-all.mjs` 의 목록에 들어가 있는지 확인하라.
지금처럼 play 실패가 `pnpm qa` 를 빠져나가면 안 된다.

각 스토리를 열고 `playComplete` 가 `true` 인지 **명시적으로 단언**하라.
"예외 없음" 만으로는 play 실패를 못 잡는다 — 이번에 그래서 놓쳤다.

## 5. 하지 마라

- 단언을 지우거나 약화해서 통과시키기
- `use-anchored.ts` · 기존 컴포넌트 수정
- 토큰 생성기 · `packages/tokens/*` · `DESIGN.md` · `AGENTS.md` 수정
- 새 의존성
- 커밋 · 푸시

## 6. 완료 조건

```bash
pnpm verify
node --test packages/ui/src/lib/*.test.mjs packages/ui/src/components/*/*.test.mjs
```
그리고 **15개 스토리가 전부 `playComplete: true`** 여야 한다.
브라우저를 쓸 수 없으면 그렇게 보고하라 — 내가 돌린다.

## 7. 보고할 것

- 2번이 제품 버그였는지 스토리 버그였는지, 어떻게 확인했는지
- 선택한 기간을 닫힌 상태에서 어디에 어떻게 보여주기로 했는지
- 1번에서 sonner 클래스가 왜 밀렸는지
- 3번에서 단언을 어떻게 바꿨는지 (약화가 아님을 보여라)
