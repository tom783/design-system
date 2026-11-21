# R26b · R26 검수 수정 — 줄바꿈 보존 · 깨끗한 예시 · 문서 페이지 구조

R26 결과를 브라우저로 검수했다. 세 가지가 의도와 다르다. 첫째는 **내 명세 오류**다.

기준점: **R26 이전 = `74a73b9`**, R26 결과 = `4b9afa0`(체크포인트 커밋, 지금 HEAD).
R26 지시서는 `docs/tasks/R26-dogfood2-fixes.md`. 아래 "되돌린다"는 `74a73b9` 의 본문으로
되돌린다는 뜻이다. `pnpm qa` 는 R26 결과로 19개 하네스 전부 통과했다 — 아래 세 문제는
하네스가 보지 않던 것이다.

---

## 1. ClampText — `white-space: normal` 이 사용자 줄바꿈을 지운다 (내 명세 오류)

R26 명세대로 `white-space: normal` 을 넣었더니, 기존 스토리 `나중에긴글` 이 쓰던
`<ClampText style={{ whiteSpace: 'pre-line' }}>` 패턴이 깨졌다. 비고처럼 사용자가 입력한
줄바꿈이 한 줄로 뭉개진다. 너는 픽스처를 `<br />` 로 바꿔 테스트를 맞췄는데, 그건 회귀를
가린 것이다.

**실측** (Chrome 151, 폭 320px, 3줄 입력 / 긴 글):

| 조상 | `white-space: normal` | `text-wrap-mode: wrap` |
|---|---|---|
| `nowrap` | 줄바꿈 · 가로 넘침 없음 | 줄바꿈 · 가로 넘침 없음 |
| `pre-line` | **20px — 1줄로 뭉개짐** | 60px — 3줄 보존 (`pre-line`) |
| `pre` | **20px — 1줄로 뭉개짐** | 60px — 3줄 보존 (`pre-wrap`) |
| 없음 | 줄바꿈 | 줄바꿈 |

`text-wrap-mode` 는 `white-space` 의 줄바꿈 절반만 정한다. 공백·개행 보존
(`white-space-collapse`)은 상속값을 그대로 둔다. 우리가 필요한 건 "줄이 바뀔 수 있다"
하나뿐이다.

- `.ds-clamp-text-content` 의 `white-space: normal` → **`text-wrap-mode: wrap`**.
  `overflow-wrap: anywhere` 는 유지. CSS 주석에 위 표의 요지를 한 줄로.
- `나중에긴글` 스토리를 **R26 이전 그대로 되돌려라** (`style={{ whiteSpace: 'pre-line' }}`
  + `'\n'` 문자열). 이 스토리가 줄바꿈 보존의 회귀 방어선이다.
- `collapse-render-verify.mjs` 에 단정 추가: `나중에긴글` 초기 상태에서 내용의 computed
  `whiteSpaceCollapse === 'preserve-breaks'` 이고 높이가 2줄이다.

## 2. 예시 코드에 테스트 장치가 섞였다

docs 의 "Show code" 는 소비자가 **복사해 가는 코드**다. 지금 `docs/examples/` 6개 중 4개가
테스트 픽스처를 옮겨 놓은 것이다:

- combobox: `검증용 선택 개수` 버튼 8개, `<output data-slot="combobox-demo-value">`,
  `data-probe="before-chips"` 버튼, 주석 "320px 툴바에서 … 검증한다"
- media-viewer: `기본 Dialog 열기` 비교 버튼, `outside-escape` 카운터, `data-probe` 다수
- carousel: `캐러셀 앞`/`캐러셀 뒤` 버튼, `data-probe`
- multi-select: `<output data-slot="multi-select-demo-value">`, `props = { options }` 기본 인자

내 하네스 기준("태그가 있고 Demo 가 없다")이 약했다. 기준을 올린다.

**방식**: 테스트 스토리는 **R26 이전 본문으로 되돌린다** (meta 의 `tags`·`parameters.manifest`
는 유지). 그리고 6개 페이지마다 **새 첫 스토리 `사용법`** 을 추가해 Primary 로 만든다.
그 스토리가 `docs/examples/*.tsx` 의 깨끗한 예시를 렌더하고, 그 파일 원문을 코드 보기로
보여준다(지금의 `?raw` 방식 유지).

예시 파일 규칙:
- 소비자가 실제 화면에 붙여 넣을 코드. 공개 import 만 (`'@s2life/ui'` 로 치환되는 경로)
- `data-probe` · `data-slot` · `<output>` · 검증용 버튼 · 비교용 요소 · 테스트 설명 주석 **0**
- 상태가 필요하면 `useState` 로 제어 컴포넌트 패턴을 보여준다
- B2B 관리 화면의 실제 맥락 (사업장·배너·상품 설명·주문 추이)
- Combobox 는 `multiple` + `Field` 안. MediaViewer 는 썸네일/버튼 → popup 한 가지

검증용 장치가 꼭 필요하면 **스토리 쪽 래퍼**에 둔다. 예시 파일에 넣지 마라.

`docs-render-verify.mjs` 의 Primary 코드 단정에 추가:
`data-probe`, `data-slot=`, `<output`, `검증` 이 **없다**.

## 3. 부품마다 부모 규칙이 반복된다

실측 (정적 빌드, 1280px):

| 페이지 | Intent 블록 | 부모 규칙 반복 | 첫 props 표 y | Primary y |
|---|---|---|---|---|
| Dialog | 17 | **15** | 8,815px | **10,593px** |
| DropdownMenu | 15 | **14** | 7,501px | 9,100px |
| Carousel | 2 | 1 | 1,268px | 1,712px |

`Intent` 는 부품에 부모 규칙을 붙여 보여준다. 02-choosing 처럼 부품 카드가 홀로 있을 때는
맞다. 하지만 autodocs 페이지에는 부모가 이미 있다. 사용 예시가 10,000px 아래에 있으면
아무도 못 찾는다.

- autodocs 템플릿에서 **Intent 는 같은 페이지에 부모가 없는 이름에만** 렌더한다
  (`partOf` 가 페이지 목록에 있으면 생략). `Intent` 컴포넌트 자체 동작은 바꾸지 마라 —
  02-choosing 이 쓴다.
- 부품의 `purpose` 는 그 부품의 props 섹션 제목 아래 한 줄로 보여준다.
- 순서: 제목 → Intent → **Primary(코드 보기)** → ManifestProps → 나머지 Stories.
  사용법이 규칙 바로 다음에 와야 한다.

`docs-render-verify.mjs` 단정 추가 (모든 Components docs 페이지):
- `[aria-label^="부모 "]` 0
- `[data-intent-block]` 수 = 그 페이지의 최상위 이름 수
- `[data-doc-primary]` 가 첫 `[data-manifest-props]` 보다 위에 있다

## 4. 하지 마라

- 기준선 픽스처 수정, `Intent` 컴포넌트 동작 변경, 버전 범프
- 기존 테스트 스토리의 play·ID 변경 (되돌리는 것만)

## 5. 보고할 것

1. 바꾼 파일 목록
2. 6개 `사용법` 예시 각각의 코드 전문
3. 되돌린 스토리 목록 — R26 이전과 본문이 같은지 `git diff 74a73b9 -- <파일>` 로 확인한 결과
4. `pnpm verify` 결과
5. 명세와 다르게 한 부분

브라우저는 네 샌드박스에서 못 띄운다. `pnpm qa` 는 내가 돌린다.
