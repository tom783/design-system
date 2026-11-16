# R21 · 다중 선택 — MultiSelect(요약) · Combobox(태그)

사용자가 **컴포넌트별로 다른 방식**을 골랐다.

- **MultiSelect** — 요약 트리거 + 체크 목록. 순수 고르기.
- **Combobox `multiple`** — 태그를 컨트롤 안에. 타이핑 커서가 안에 있으니 자연스럽다.

대상 섹션: `DESIGN.md §20`.

---

## 0. 전제 — 내가 측정한 것

### 0.1 Radix Select 로는 못 만든다

`value?: string | undefined`. `multiple` prop 이 없다. **Select 를 고쳐 쓰려 하지 마라.**
`MultiSelect` 는 별도 컴포넌트이고 `internal/popover` 위에 직접 짓는다.

### 0.2 태그를 컨트롤 안에 넣으면 높이가 폭주한다 (320px 툴바 기준)

| 태그 수 | 상한 없음 | **2줄 상한 + × 24px** |
|---|---|---|
| 1~3개 | 38px | **38px** |
| 4개 | 68px | **68px** |
| 8개 | 100px | **68px (칩 영역 스크롤)** |
| 12개 | 100px | **68px (칩 영역 스크롤)** |

상한이 없으면 고를 때마다 아래 표가 밀린다. **2줄로 묶으면 38 → 68 로 한 번만
늘고 그 뒤로는 영원히 68px 다.** 이게 이번 라운드가 지켜야 할 수치다.

### 0.3 기본 태그의 × 는 16px 이다 — 우리 터치 타깃 기준 미달

붙어 있는 × 16px 은 오타격을 부른다. **24px 로 키운다**(실측으로 확보 확인).
칩 높이는 28px 이 된다.

---

## 1. MultiSelect

`packages/ui/src/components/multi-select/`.

```ts
interface MultiSelectProps {
  options: { value: string; label: string; disabled?: boolean }[];
  value?: string[];
  onValueChange?: (value: string[]) => void;
  placeholder?: string;      // 기본 "선택하세요"
  /** 요약 문구를 앱이 바꾼다. 기본은 "{첫 라벨} 외 {n-1}개". */
  summary?: (selected: { value: string; label: string }[]) => string;
  clearLabel?: string;       // 기본 "전체 해제"
  disabled?: boolean; invalid?: boolean; required?: boolean;
  maxHeight?: number | string;
}
```

- **트리거 높이는 `--control-h-md` 고정이다.** 선택이 몇 개든 변하지 않는다.
  요약 문구가 길면 말줄임하고 `title` 에 전체를 둔다.
- 패널은 `role="listbox" aria-multiselectable="true"`, 항목은 `role="option"` +
  `aria-selected`. **메뉴(`menuitemcheckbox`)로 만들지 마라** — 값 선택기이고
  Combobox 와 의미가 같아야 한다.
- **고를 때 닫지 않는다.** 연속으로 고르는 게 다중 선택의 전부다.
- 푸터에 `전체 해제`와 `n개 선택`. 선택이 0이면 해제 버튼은 비활성.
- 키보드: 화살표가 활성 항목 이동, **Space/Enter 가 토글**, Escape 로 닫고 트리거 복귀,
  Home/End. DOM 포커스는 목록에 두고 `aria-activedescendant` 로 활성을 가리킨다.
- 체크 표시를 색만으로 하지 마라(§2.4). 체크 아이콘 + `aria-selected`.

## 2. Combobox 의 `multiple`

기존 `Combobox` 에 **옵트인**으로 더한다. **`multiple` 을 주지 않으면 지금 동작이
한 글자도 바뀌면 안 된다** — R17 의 검색 선택 29건이 그걸 지킨다.

```ts
multiple?: boolean;
// multiple 일 때 value/onValueChange 는 string[] 다. 타입으로 갈라라 —
// 런타임에 배열인지 검사하게 만들지 마라.
```

### 2.1 칩

- 컨트롤 안, 검색 입력 **앞**에 놓는다. 입력은 남은 폭을 차지한다.
- 칩 높이 28px, × 는 **24px 타깃**. 칩 라벨은 말줄임 + `title`.
- **칩 영역은 2줄까지만 늘고 그 뒤로는 안에서 스크롤한다**(0.2 의 수치).
  `max-height` 를 2줄로 두고 `overflow-y:auto`.
- 칩 제거 버튼의 접근명은 `"{라벨} 선택 해제"` 다. 그냥 "삭제" 로 하지 마라 —
  스크린리더에서 어느 것을 지우는지 알 수 없다.

### 2.2 칩이 Tab 정지점을 늘리면 안 된다

칩 8개가 Tab 8번이 되면 폼을 못 쓴다. **칩 묶음은 roving tabindex 로 정지점 하나**다.
- 좌우 화살표로 칩 사이 이동, `Delete`/`Backspace` 로 제거, 제거 후 이웃으로 포커스.
- 마지막 칩을 지우면 검색 입력으로 간다.

### 2.3 빈 입력에서 Backspace 는 **두 번**이다

한 번에 지우면 보이지 않는 파괴다. 첫 Backspace 는 마지막 칩을 **강조만** 하고,
그 상태에서 다시 누르면 지운다. 다른 키를 치면 강조가 풀린다.

### 2.4 목록

- 고른 항목도 목록에 남고 체크 표시가 붙는다. **고를 때 닫지 않는다.**
- `aria-multiselectable="true"`.
- **R17 규칙은 전부 그대로다** — 조합 중 "결과 없음" 금지, 조합 중 Enter·화살표·
  Escape 는 IME 에 양보, `role="combobox"` 는 **입력 하나뿐**.

## 3. Field·FormFlow 와의 관계

- 둘 다 `Field` 안에서 동작한다. `invalid`·`required`·`aria-describedby` 배선은
  기존 컴포넌트와 같은 이름으로.
- **FormFlow Enter 계약**(§11.5): `MultiSelect` 트리거는 버튼이다.
  Combobox 와 같은 규칙 — 닫혀 있으면 Enter 가 **연다**. 다만 다중 선택은
  "고르면 끝"이 아니므로 **고른 뒤 다음 칸으로 가지 않는다.** 사용자가 Escape 나
  Tab 으로 떠날 때까지 머문다. §11.5 표에 이 줄을 더해라.
- `data-form-control="advance"` 를 붙이지 마라.

## 4. 하지 마라

- `Select` 를 고쳐 다중 선택 만들기 (Radix 가 못 한다 — 0.1)
- 칩 영역 높이 상한 제거
- × 를 24px 미만으로
- 칩마다 Tab 정지점
- 빈 입력 Backspace 한 번에 삭제
- 고를 때 패널 닫기
- `multiple` 없는 Combobox 의 동작 변경 — R17 29건이 그대로 통과해야 한다
- 메뉴 역할(`menuitemcheckbox`)로 값 선택기 만들기
- 새 토큰·새 z-index

## 5. 스토리

- `multi-select.stories.tsx` — 기본 · 많은 옵션 · 비활성 · 오류 · Field 안 · 툴바 필터
- `combobox.stories.tsx` 에 추가 — `다중선택` · `다중선택-많음`(칩 8개 이상) ·
  `다중선택-한글조합`

## 6. 검증

`docs/qa/multi-select-render-verify.mjs` 를 새로 만들고 `run-all.mjs` 에 등록해라.

**이 라운드의 핵심 검사 — 0.2 의 수치를 그대로 단정해라:**

- 320px 폭에서 칩 1·2·3개 → 컨트롤 높이가 **38px 로 같다**
- 4개 → 68px
- **8개와 12개도 68px 다** (늘지 않는다). 칩 영역이 스크롤한다
- 모든 × 의 실제 크기가 **24px 이상**이다

그 밖에:

- `MultiSelect` 트리거 높이가 선택 0·1·5개에서 **전부 같다**
- 패널이 `role=listbox` + `aria-multiselectable=true`, 항목이 `role=option`
- 고른 뒤에도 **열려 있다** (둘 다)
- 칩 묶음이 Tab 정지점 **하나**다 — 칩 5개를 두고 Tab 으로 지나가며 세어라
- 좌우 화살표로 칩 이동, Delete 로 제거, 제거 후 포커스가 이웃으로
- 빈 입력 Backspace **1회 = 강조, 2회 = 제거**
- 조합 중에는 Backspace 강조도 일어나지 않는다 (IME 양보)
- `multiple` 없는 Combobox 의 단일 선택 동작이 그대로다
- 콘솔 오류 0건
- **기존 브라우저 370건 전부 통과.** 깨지면 고치지 말고 보고해라

하네스 함정은 이미 밟은 것들이다 — `rawKeyDown`→대기→`keyUp`, Enter 의 `text:'\r'`,
`id` 로 찾지 말 것, 포커스 단정 앞 대기 루프, 좌표 클릭을 내부 버튼에 쓰지 말 것.

## 7. 유지보수 꼬리

- `component-intent.mjs` 에 `MultiSelect` 추가(독립, `partOf` 없음) + `Combobox` 의
  rules 에 다중 선택 한 줄. 섹션 `20`. `Select`·`Combobox` 의 `related` 갱신.
  키워드: `다중 선택`, `여러 개 선택`, `복수 선택`, `태그 선택`, `체크 목록`
- `match.test.mjs`: `"여러 사업장 고르기"` → `MultiSelect`,
  `"검색해서 여러 개 고르기"` → `Combobox`, 기존 단일 케이스는 그대로
- `packages/ui/docs/02-choosing.mdx` 에 `MultiSelect` ↔ `Combobox multiple` 갈림길 추가
  (`<Intent>` 로 렌더. 규칙 문장을 손으로 쓰지 마라)
- `CHANGELOG.md` 의 `0.3.0 — 미게시` 에 추가. **버전은 올리지 마라**
- 매니페스트 여유 11KB

## 8. 보고할 것

1. 새 파일 목록
2. 0.2 수치(38/68/68)가 실제로 나오는지 — 안 나오면 값과 이유
3. 칩 roving tabindex 를 어떻게 구현했는지
4. `pnpm verify`(단위 포함) 결과
5. 기존 검사 중 손댄 것 (있으면 무엇을 왜)
6. 명세와 다르게 한 부분

브라우저는 네 샌드박스에서 못 띄운다. `pnpm qa` 는 내가 돌린다. 하네스는 작성만 해라.
