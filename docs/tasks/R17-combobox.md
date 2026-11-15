# R17 · Combobox — 한글 조합 중에 거짓말하지 않는 자동완성

`Select` 의 규칙이 이미 "20개 초과는 Combobox 를 사용한다"고 말하는데 **그 Combobox 가 없다.**
이번 라운드가 그걸 만든다. 대상 섹션: `DESIGN.md §18`.

의존성은 설치돼 있다: `cmdk@^1.1.1` (런타임 의존). `@radix-ui/react-popover` 도 이미 있다.

---

## 0. 전제 — 내가 브라우저에서 직접 측정한 결과

### 0.1 한글 IME 는 자모마다 `input` 을 쏜다 (언어 사실)

"서울" 을 칠 때 실제로 일어난 일:

```
compositionstart
compositionupdate "ㅅ"   → input value="ㅅ"   isComposing=true
compositionupdate "서"   → input value="서"   isComposing=true
compositionupdate "설"   → input value="설"   isComposing=true     ← 실제 중간 음절이다
compositionupdate "서울" → input value="서울" isComposing=true
compositionend     "서울"
```

`설` 은 오타가 아니다. `ㅅ`+`ㅓ`+`ㄹ` 로, "서울" 을 치는 **정상 경로**에 나타난다.

### 0.2 그래서 cmdk 의 기본 필터는 단어 중간에 "결과 없음" 을 두 번 깜빡인다 (실측)

후보 6개(`서울 본사`·`서산 물류센터`·`성남 지점`·`부산 지점`·`대구 물류센터`·`수원 창고`):

| 조합 단계 | 보이는 항목 | "결과 없음" |
|---|---|---|
| `ㅅ` | **0** | **표시** |
| `서` | 2 | — |
| `설` | **0** | **표시** |
| `서울` | 1 | — |

**비었다 → 2개 → 비었다 → 1개.** 사용자는 한 단어를 치는 동안 "결과 없음" 을 두 번 본다.

### 0.3 자모 매칭은 절반만 고친다 (내가 종이 위에서 계산해 봤다)

| 단계 | 부분 문자열만 | 자모·초성 매칭 |
|---|---|---|
| `ㅅ` | 0 | **6** |
| `서` | 2 | 3 |
| `설` | 0 | **0 — 여전히 비었다** |
| `서울` | 1 | 1 |

`설` = `ㅅㅓㄹ` 은 `서울` = `ㅅㅓㅇㅜㄹ` 의 **연속 부분이 아니고**, 초성만 입력한 것도 아니다.
그래서 자모 매칭만으로는 깜빡임이 남는다. **두 가지를 같이 해야 한다.**

### 0.4 조합 중 Enter 를 cmdk 가 막지 않는다 (실측)

조합 중 Enter 의 `keydown` 에서 본 값: `{ isComposing: true, defaultPrevented: false }`.
한국어 사용자가 `서` 를 확정하려고 Enter 를 누르면 **엉뚱한 항목이 선택된다.**
이건 우리가 막아야 한다.

### 0.5 cmdk 의 ARIA 배선은 올바르다 (실측)

| 측정 | 결과 |
|---|---|
| 입력 | `role="combobox"` · `aria-expanded="true"` · `aria-controls` → 목록 id · `aria-autocomplete="list"` |
| 목록 | `role="listbox"` |
| 항목 | `role="option"`, id 있음 |
| ArrowDown 1회 | `aria-activedescendant` → `서산 물류센터` |
| ArrowDown 2회 | → `성남 지점` |
| DOM 포커스 | **항상 입력에 남는다** (combobox 패턴대로) |

단, **ArrowDown 전에는 `aria-activedescendant` 가 null** 인데 첫 항목에는
`aria-selected="true"` 가 붙어 있다. cmdk 는 "활성" 과 "선택" 을 한 속성으로 쓴다.
우리 기준에서 `aria-selected` 는 **고른 값**이고 활성은 `aria-activedescendant` 다.
싸우지 말고 §18 에 **우리가 어느 쪽을 쓰는지 적고** 그에 맞춰 배선해라.

### 0.6 cmdk 는 `Command.Input` 의 `id` 를 덮어쓴다

내가 넘긴 `id="cmd-input"` 이 `radix-_r_2_` 로 바뀌었다. 하네스에서 id 로 찾지 못한다.
`[cmdk-input]` 같은 속성으로 찾아라. **우리 컴포넌트는 `data-slot` 을 붙여라.**

---

## 1. 설계

### 1.1 필터는 우리가 소유한다

`cmdk` 를 `shouldFilter={false}` 로 쓴다. 키보드 탐색·`aria-activedescendant`·
스크롤 추적은 cmdk 가 맞게 하고 있으니(0.5) 그건 맡긴다. **필터만 가져온다.**

### 1.2 두 가지 규칙을 함께 적용한다

**(가) 조합 중에는 "결과 없음" 을 말하지 않는다.** 이게 하드 규칙이다.
"결과 없음" 은 **완성된 질의**에 대한 진술이다. 음절 중간에는 거짓이다.

```
조합 중이고 이번 결과가 0개면 → 직전의 0개 아닌 결과를 계속 보여준다
조합이 끝나면 → 참인 결과를 보여준다 (0개면 그때 "결과 없음")
```

직전 결과는 ref 에 들고 있어라. `filtered.length > 0` 일 때마다 갱신한다.

**(나) 기본 매처는 한글을 안다.** 아래 순서로 판정한다:

1. 정규화(NFC · `toLocaleLowerCase('ko-KR')` · 공백 제거) 후 부분 문자열
2. 질의가 **초성만**이면 후보의 초성 열에서 부분 문자열 (`ㅅㅇ` → `서울 본사`)
3. 양쪽을 자모로 분해한 뒤 부분 문자열 (`물ㄹ` → `서산 물류센터`)

`comboboxFilter(query, value)` 를 **순수 함수로 분리해 내보내고 단위 테스트해라.**
`filter` prop 으로 교체할 수 있어야 한다 — 매칭은 앱이 더 잘 아는 경우가 있다.

**§11.6 경계:** 우리가 제공하는 것은 **언어 처리**(한글 자모 분해)다. 도메인 규칙이
아니다. 이메일 정규식이나 사업자등록번호 체크섬은 여전히 넣지 않는다.
`initials()` 가 `Intl.Segmenter` 를 쓰는 것과 같은 층이다.

### 1.3 조합 중 Enter 를 막는다

0.4 대로 cmdk 는 막지 않는다. 기존 `useComposition()` 자산을 써라
(`packages/ui/src/components/form/use-composition.ts`). 새로 만들지 마라.

- 조합 중 Enter → **선택하지 않는다.** IME 가 음절을 확정하게 둔다.
- 조합 중 ArrowUp/Down → 활성 항목을 옮기지 **않는다.** IME 후보 창이 쓰는 키다.
- 조합 중 Escape → 목록을 닫지 **않는다.** IME 조합 취소가 먼저다.

### 1.4 컴포넌트 모양

`packages/ui/src/internal/command.ts` 에 `cmdk` 재수출.
**`internal/` 밖에서 `cmdk` 를 import 하면 경계 검사를 추가해 떨어뜨려라** —
`scripts/check-boundaries.mjs` 가 지금은 `@radix-ui/*` 만 본다. `cmdk` 도 넣어라.

`packages/ui/src/components/combobox/` :
- `combobox.tsx` — `Combobox`
- `combobox-filter.ts` — `comboboxFilter` + 자모 유틸 (순수, 테스트 대상)
- `combobox.css`

API:

```ts
interface ComboboxOption { value: string; label: string; disabled?: boolean }
interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;                      // 고른 값 (제어)
  onValueChange?: (value: string) => void;
  placeholder?: string;                // 트리거에 보일 문구
  searchPlaceholder?: string;          // 검색 입력의 문구
  emptyText?: string;                  // 기본 "결과가 없습니다"
  filter?: (query: string, option: ComboboxOption) => boolean;
  disabled?: boolean;
  invalid?: boolean;                   // Field 배선용. Input·Textarea 와 같은 이름을 쓴다
  maxHeight?: number | string;         // 목록 상한. 기본 240px, 넘으면 스크롤
}
```

- 트리거는 `Select` 와 같은 높이(`--control-h-md`)와 경계(`--border-input`)를 쓴다.
  **3:1 비텍스트 대비가 필요한 컨트롤 경계다**(§3.4) — 기존 토큰을 쓰고 새로 만들지 마라.
- 목록은 기존 `internal/popover` 를 쓴다. 새 포털을 만들지 마라.
- `Field` 안에서 동작해야 한다. `Select` 가 하는 배선을 그대로 따라라.

### 1.5 범위에서 뺀 것

- **다중 선택.** 이번엔 단일 선택만이다. §18 에 "다중 선택은 아직 없다" 고 적어라.
- **가상 스크롤.** 500개를 넘기면 서버에서 걸러 내려주는 게 앱의 책임이다(§11.6).
  §18 에 그 경계를 적어라. `maxHeight` + 스크롤로 끝낸다.

## 2. 스토리

`packages/ui/src/stories/combobox.stories.tsx`.

- 기본(20개 넘는 후보) · 비활성 · 오류(`invalid`) · `Field` 안에서
- **한글조합** 스토리 — 0.2 의 깜빡임을 재현할 수 있는 후보 목록으로 만들어라.
  0.1 의 후보 6개를 그대로 써도 좋다.
- 초성검색 스토리 — `ㅅㅇ` 로 찾는 것을 보여준다

`play` 를 붙여라. **`play` 는 열었다가 전부 닫고 끝난다.**

## 3. 검증 하네스

`docs/qa/combobox-render-verify.mjs` 를 새로 만들고 `docs/qa/run-all.mjs` 에 등록해라.
**반드시 `docs/qa/browser.mjs` 를 쓴다.**

### 이 라운드의 핵심 검사 — 이게 통과해야 라운드가 끝난다

**"서울" 을 자모 단계로 재생하면서 보이는 항목 수가 한 번도 0 이 되지 않는다.**
그리고 "결과 없음" 이 한 번도 보이지 않는다. 0.1 의 네 단계(`ㅅ`→`서`→`설`→`서울`)를
`Input.imeSetComposition` 으로 그대로 재생하고 매 단계마다 세어라.

그 밖에:

- 조합 중 Enter 가 **선택하지 않는다**(값이 그대로다). 조합이 끝난 뒤 Enter 는 선택한다
- 조합 중 ArrowDown 이 `aria-activedescendant` 를 바꾸지 않는다
- 조합이 끝난 뒤 ArrowDown 이 `aria-activedescendant` 를 **실재하는 option id** 로 옮긴다
- 목록이 열려 있는 동안 **DOM 포커스가 입력에 남는다**
- `role=combobox` · `aria-expanded` 가 열림/닫힘을 따라간다 · `aria-controls` 가
  실재하는 `role=listbox` 를 가리킨다
- 초성 `ㅅㅇ` 로 `서울 본사` 가 남는다
- 진짜로 없는 질의(조합 아님)에서는 "결과 없음" 이 보인다 — **(가) 규칙이 거짓을
  숨기지 않는지** 반대 방향으로도 확인해라
- Escape 로 닫히고 포커스가 트리거로 돌아온다
- 콘솔 오류 0건

### 하네스 함정 — 내가 이번 라운드에 밟은 것들

- **`id` 로 찾지 마라.** cmdk 가 덮어쓴다(0.6). `data-slot` 으로 찾아라.
- **화살표는 `rawKeyDown` → 대기 → `keyUp` 으로 떼어 보내라.** 붙여 보내면
  라이브러리가 keydown/keyup 사이에 보는 상태가 지워진다 (R16 에서 밟았다).
- **textarea 가 아니어도 Enter 에 `text` 가 필요한 경우가 있다.** 값이 삽입돼야 하는
  검사라면 `text: '\r'` 을 넣어라. `'\n'` 은 아무 일도 하지 않는다 (R16 에서 밟았다).
- **포커스 단정 앞에는 대기 루프.**

## 4. 유지보수 꼬리 — 빼먹으면 verify 가 떨어진다

- `docs/research/component-intent.mjs` 에 `Combobox` 추가. 섹션 `18`.
  **독립 컴포넌트다** — 부품이 아니다(`partOf` 없음).
  키워드: `콤보박스`, `자동완성`, `검색 선택`, `많은 옵션`, `초성 검색`,
  `목록에서 찾기`, `타이핑으로 찾기`
  `related` 에 `Select` 를 넣고, `Select` 의 `dont` 가 이미 가리키는
  "20개 초과는 Combobox" 와 짝이 맞는지 확인해라.
- `packages/mcp/match.test.mjs` 에 케이스 추가: `"많은 옵션에서 검색해 선택"` → `Combobox`,
  `"초성으로 찾기"` → `Combobox`. 그리고 `"상태 필터 20개 이하"` 가 여전히 `Select` 인 것.
- `scripts/check-boundaries.mjs` 에 `cmdk` 추가 (1.4)
- `packages/ui/src/index.ts` 내보내기. `components.css` 에 CSS 연결.
- 예산 여유는 15,383 바이트다. 1개면 충분하다. 떨어지면 **보고해라.** 올리지 마라.

## 5. 하지 마라

- `cmdk` 의 기본 필터 사용 (`shouldFilter` 를 켠 상태로 두기)
- 조합 중 "결과 없음" 표시
- 조합 중 Enter 로 선택 · 화살표로 활성 이동 · Escape 로 닫기
- `aria-activedescendant` 없이 DOM 포커스를 목록으로 옮기기
- 새 포털·새 z-index·새 토큰 (R15 실측: top layer 가 이미 이긴다)
- `internal/` 밖에서 `cmdk`·`@radix-ui/*` import
- JS 에서 CSS import
- 다중 선택이나 가상 스크롤 구현 (범위 밖, 1.5)
- 이메일·사업자번호 같은 도메인 검증 추가 (§11.6)

## 6. 보고할 것

1. 새로 만든 파일 목록
2. `pnpm verify` · `pnpm typecheck` 결과
3. `comboboxFilter` 단위 테스트가 덮은 경우 목록
4. `components` 매니페스트 크기 (이전 64,617)
5. 0 번 표와 **다르게 나온 측정** (있으면 값과 재현 방법)
6. 명세와 다르게 구현한 부분 (있으면 반드시)

브라우저는 네 샌드박스에서 못 띄운다. `pnpm qa` 는 내가 돌린다. 하네스는 **작성만** 해라.
