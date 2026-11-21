# 도그푸딩 2 · 마케팅관리 (Next.js App Router)

`@s2life/ui@0.3.0` 팩 tarball 을 소비자 입장에서 설치해 캠페인 화면을 만들었다.
0.3.0 에서 새로 생긴 컴포넌트(MultiSelect · Combobox 다중 · ClampText · Carousel ·
MediaViewer)를 실제 화면 맥락에 처음 넣어 본 회차다. 저장소 소스는 참조하지 않았고
Storybook 문서와 타입 선언만 봤다.

- Next 16.4.6 · React 19.3.1 · App Router · pnpm
- 만든 것: 캠페인 목록(채널·상태 MultiSelect 필터 + DataTable) · 캠페인 상세
  (설명 ClampText · 배너 Carousel → 이미지 팝업 · 소재 영상 floating · TrendBand ·
  고급 설정 Collapsible 안에 Combobox 다중 + Switch)
- 검증: chrome-headless-shell CDP 로 실제 렌더·상호작용 확인, 콘솔 오류 0건

---

## 통과한 것

| 확인 | 결과 |
|---|---|
| MultiSelect 필터 (채널) | 16행 → "네이버" 선택 후 4행, 트리거 요약 "네이버" |
| MultiSelect 툴바 폭 | `className="w-auto min-w-40"` 로 160px · 160px (0.2 의 G5 해소 확인) |
| 상세 설명 ClampText (2줄) | 126자가 912px 에서 정확히 2줄 → 버튼 없음 (넘치지 않을 때 렌더 안 함) |
| Carousel autoplay | 정지 버튼 항상 렌더 |
| 배너 클릭 → MediaViewer popup | 열림, 이미지 alt "겨울 세일 배너 1" |
| popup Escape | 닫히고 포커스가 누른 배너(banner-0)로 돌아감 |
| MediaViewer floating + 실제 webm | 열림, `readyState` 4, PiP 버튼 있음 |
| floating 중 바깥 조작 | 바깥 버튼에 포커스 가능 (작업 흐름 유지) |
| Collapsible(forceMount) 안 Combobox 다중 | 칩 1개 선택 유지, Switch `role="switch"` |
| 콘솔 오류 | **0건** |

**우리 결함이 아니었던 것:** TrendBand 의 `summary` 가 화면 글자로 보이지 않는다.
DESIGN.md §7.5 5번이 "`<svg role="img">` + `aria-label` 에 차트가 말하는 결론을 한 문장으로
적는다"로 정했고, 실제로 svg `aria-label` 에 들어가 있다. 의도된 동작이다.
(단 소비자가 이 사실을 알 길이 없다는 점은 아래 G3 에 포함한다.)

---

## 찾은 간극

### G1 · nowrap 조상 안의 ClampText 가 글을 말없이 잘라 버린다 — 중대

목록의 설명 열을 `cell: i => <ClampText lines={1}>{i.getValue()}</ClampText>` 로 썼다.
긴 설명이 오른쪽에서 잘렸는데 **더보기 버튼이 하나도 없다.**

DataTable 셀의 `white-space: nowrap` 이 ClampText 내용까지 상속됐다. 줄바꿈이 없으니
글은 1줄로 끝없이 길어지고, ClampText 는 세로 넘침만 재므로 "넘치지 않음"으로 판정한다.

| 실측 (설명 셀, 16행) | 값 |
|---|---|
| 셀·내용 `white-space` | `nowrap` · `nowrap` |
| 내용 `clientHeight` / `scrollHeight` | 20 / 20 → 넘침 없음 판정 |
| 내용 `scrollWidth` / `clientWidth` | **1210 / 576** → 가로로 잘림 |
| 더보기 버튼 | **0 / 16** |

ClampText 가 약속하는 것은 "잘렸다면 반드시 펼칠 수 있다"인데, 조상의 스타일 하나로
그 약속이 깨진다. 소비자는 잘린 줄도 모른다.

**수정 가설 실측:** 내용에 `white-space: normal` 을 주입하면 더보기 0 → 10 (긴 설명 행
수와 일치), 가로 잘림 해소. `-webkit-line-clamp` 는 줄바꿈이 있어야 동작하므로
ClampText 내용이 자기 줄바꿈 규칙을 스스로 가져야 한다. 전역 규칙(`normal` +
`keep-all`)을 되돌리는 것이라 기존 dont "전역과 다른 줄바꿈 규칙을 넣지 마라"와도 맞다.

### G2 · 표 셀에는 ClampText 가 맞지 않는데 그걸 알 길이 없다 — 보통

G1 을 고쳐도 표 셀에서는 행 높이가 들쭉날쭉해진다 (주입 후 짧은 행 40px · 긴 행 57px).
DataTable 은 이미 긴 값을 처리한다:

| 실측 (ClampText 없이 그냥 accessor) | 값 |
|---|---|
| `.data-table-value` | `text-overflow: ellipsis`, 폭 576px (36rem) |
| 전체 값 | `title` 에 남음 |
| 행 높이 | 전 행 40px 균일 |

즉 정답은 "셀에는 아무것도 감싸지 않는다"인데, ClampText 의 dont 에도 DataTable 문서에도
그 말이 없다. 첫 시도에서 ClampText 를 넣는 건 자연스러운 선택이었다.

### G3 · Storybook 이 소비자에게 "어떻게 쓰는지"를 보여주지 않는다 — 중대

설치한 사람이 화면을 만들 때 막힌 지점들:

- **props 표가 어디에도 없다.** 스토리 32개 중 `tags: ['autodocs']` 0개, preview 전역 설정도
  없다. `Carousel` 의 `label` 이 필수라는 것, 슬라이드는 `CarouselSlide` 로 감싼다는 것을
  `.d.ts` 를 열어서 알았다.
- **안내 페이지의 "사용 규칙"이 구현자 메모다.** Carousel 카드: "현재값은
  IntersectionObserver threshold=0.6으로만 읽는다 … reduce는 시작하지 않고 변경을 구독하며
  컴포넌트 CSS에서 scroll-behavior:auto를 지정한다." 소비자가 할 일은 한 줄도 없다.
  ClampText · MediaViewer 카드도 같다.
- **차트 안내가 없다.** `Components/Charts` 스토리 16개는 있지만 안내 MDX 5개 어디에도
  ChartFrame · TrendBand · BulletRow · CompositionArea 가 나오지 않는다. 언제 무엇을 쓰는지,
  `summary` 가 화면이 아니라 `aria-label` 로 간다는 것(위 "결함 아님")을 알 수 없다.
- **코드 예시가 없다.** autodocs 가 없으니 "Show code"도 없다.

### G4 · `CarouselProps` 에 `className` 이 없다 — 경미

이번 화면은 Carousel 을 Card 본문에 바로 넣어 폭 지정이 필요 없었다. 다만 `.d.ts` 를
확인하다 보니, 같은 회차의 `ClampText` · `MultiSelect` 와 짝인 `CarouselSlide` 는 루트
`className` 을 받는데 `Carousel` 만 받지 않는다. 배너 폭이나 여백을 바꾸려면 감싸는
`div` 를 하나 더 둬야 한다.

---

## 우선순위

| | 간극 | 영향 | 처리 |
|---|---|---|---|
| 1 | G1 ClampText nowrap | 잘린 글을 펼칠 수 없고 잘린 사실도 안 보인다 | 0.3.1 |
| 2 | G3 문서 (autodocs · 차트 안내) | 설치 후 d.ts 를 읽어야 쓸 수 있다 | 0.3.1 |
| 3 | G2 표 셀 지침 | 잘못된 조합을 막을 말이 없다 | 0.3.1 (G1 과 함께) |
| 4 | G4 Carousel className | 일관성 문제, 감싸는 div 로 우회 가능 | 0.3.1 |
| 5 | G3 "사용 규칙" 소비자용 재작성 | 매니페스트 전체 문구 구조 변경 | 별도 라운드 |

---

## 반영 결과 (R26 · R26b, 0.3.1 후보)

수정본 팩을 같은 앱에 다시 설치해 확인했다.

| | 결과 |
|---|---|
| G1 | 표 셀 더보기 **0/16 → 10/16** (긴 설명 행 수와 일치), 가로 넘침 576/576 → 없음. 하이드레이션 뒤에 생긴다 (+117ms 0 → +627ms 10) |
| G1 부작용 | 처음 명세한 `white-space: normal` 은 `pre-line` 개행을 지웠다 (3줄 → 1줄). `text-wrap-mode: wrap` 으로 바꿔 둘 다 만족 |
| G2 | ClampText·DataTable dont 추가. MCP 기준선은 두 문장만 명시적 델타로 비교 |
| G3 | `Components/*` 28개 문서 페이지: 사용 의도 → 사용법(코드) → 매니페스트 props → 스토리. 공개 컴포넌트 101/101. 차트 안내 페이지 |
| G3 부작용 | 부품마다 부모 규칙 반복(Dialog 15회) → 0. 미리보기가 화면 높이를 채워 Combobox 문서 15,471px → 4,635px. Guide iframe play 포커스 경쟁 → 문서 안에서 play 생략 |
| G4 | `Carousel` `className` |

부작용 다섯 가지(개행 소실, 예시 코드에 섞인 테스트 장치, 부모 규칙 반복, 미리보기 높이,
Guide 포커스 경쟁)는 모두 하네스가 통과한 뒤 화면을 직접 보거나 반복 실행해서 찾았다.
개행·예시 코드·부모 반복은 하네스 단정을 추가했고, Guide 는 원인(문서 iframe 의 play)을
없앤 뒤 문서 하네스 5회 연속 통과를 확인했다. 미리보기 높이는 후속으로 단정을 넣었다 —
창 높이를 900→600 으로 바꿔도 미리보기 높이가 변하지 않아야 한다. 넣자마자 테스트용
`180vh` 를 쓰는 스토리 4개(1,620px 빈 상자)를 더 찾았고, 결함을 되살리면 27개 페이지가 실패한다.
