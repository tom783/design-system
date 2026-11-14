# R07-B · 안내 링 충돌 + 가장자리 여백

R07 구현을 **브라우저에서 실제로 보고** 찾은 두 가지다. 둘 다 수치 검사로는
통과했고 스크린샷에서만 드러났다. `guide.css` 만 고치면 된다.

작업 전 `DESIGN.md` 10.3.1 과 10.4 를 읽어라.

---

## 1. 말풍선이 자기 자신에게 링을 그린다 (진짜 문제)

`Hint`·`Tour` 말풍선은 `tabIndex={-1}` 로 포커스를 받는다. 그런데 Chrome 은
이 프로그래밍 포커스에도 **`:focus-visible` 을 매치**시킨다. 그래서
`styles.css` 의 기본 규칙이 발동한다:

```css
:focus-visible { outline: var(--focus-width) solid var(--border-focus); }
```

`--border-focus` 는 `#d33e58`, `--hint-ring` 도 `#d33e58` — **같은 색이다.**
결과: 말풍선과 대상에 똑같은 크림슨 링이 동시에 그려져서
"지금 무엇을 가리키는가"라는 링의 유일한 역할이 사라진다.
10.3.1 에서 화살표를 버리고 링을 택한 이유가 바로 이 지목 기능이다.

측정값: 말풍선 `outline: 2px solid rgb(211,62,88)`, `:focus-visible` 매치 `true`.

### 고치는 법

```css
/* 말풍선 자체는 포커스 링을 그리지 않는다.
   키보드로 도달하는 요소가 아니라(tabindex -1) 포커스가 착지만 하는 자리다.
   링은 "대상을 가리키는" 신호로만 남겨둔다 — 10.3.1. */
[data-slot="guide-bubble"]:focus,
[data-slot="guide-bubble"]:focus-visible { outline: none; }
```

**안쪽 버튼의 포커스 링은 절대 건드리지 마라.** `:focus-visible` 전역 규칙을
수정하거나 `*` 로 끄는 방식은 금지다. 선택자는 말풍선 자신에게만 걸어라.
확인했다 — 위 두 줄로 안쪽 "다음"·"건너뛰기" 버튼은 `2px solid rgb(211,62,88)`
포커스 링을 그대로 유지한다.

## 2. CSS 경로가 가장자리 여백을 지키지 않는다

JS 폴백은 `--anchor-edge-pad`(8px)를 지키는데 CSS 경로는 `position-area` 의
자동 클램프가 **화면 끝에 딱 붙인다**(측정: `left: 0`). 같은 컴포넌트가 환경에
따라 다르게 보인다.

```css
[data-slot="guide-bubble"][data-place="css"] {
  /* position-area 의 클램프 영역을 좁혀 가장자리 여백을 만든다.
     여유가 있을 때의 중앙 정렬에는 영향이 없다. */
  margin-inline: var(--anchor-edge-pad);
}
```

이 선언은 **기존 `margin-block: var(--anchor-gap)` 를 지우지 말고 추가**하라.
`margin-inline` 과 `margin-block` 은 다른 축이다.

확인했다 — 적용 후 `left: 0 → 8`, 화면 안 유지, 안쪽 버튼 포커스 링 정상.

---

## 3. 스토리로 못 박아라

회귀하면 또 스크린샷에서만 보인다. `guide.stories.tsx` 의 **기존 투어 스토리
play 에 단언을 추가**하라 (새 스토리를 만들지 마라):

- 투어가 열린 상태에서 **말풍선의 `outlineStyle` 이 `'none'`** 이다
- 같은 시점에 **대상의 `outlineStyle` 은 `'solid'`** 이고 색이 `--hint-ring` 이다
  (두 개를 한 단언 묶음으로 둬야 "둘 다 링" 회귀가 잡힌다)
- 말풍선 안의 버튼에 포커스를 주면 그 버튼의 `outlineStyle` 은 `'solid'` 다

`getComputedStyle` 은 **라이브 객체다.** 상태를 바꾸기 전에 필요한 값을
문자열로 복사해 두고 비교하라 — 내가 검증하면서 이걸로 한 번 틀렸다.

## 4. 하지 마라

- `styles.css` 의 전역 `:focus-visible` 규칙 수정
- 토큰 변경 (`--border-focus` 와 `--hint-ring` 이 같은 색인 것 자체는 의도다 —
  브랜드 강조색이 하나이기 때문이다. 문제는 두 링이 동시에 뜨는 것이다)
- `guide.css` 외 파일의 CSS 변경
- 컴포넌트 로직·구조 변경
- 커밋·푸시

## 5. 완료 조건

```bash
pnpm verify
node --test packages/ui/src/components/guide/*.test.mjs
```

## 6. 보고할 것

- 추가한 CSS 정확히 그대로
- 어느 스토리 play 에 어떤 단언을 넣었는지
- 안쪽 버튼 포커스 링이 살아 있음을 무엇으로 확인했는지
