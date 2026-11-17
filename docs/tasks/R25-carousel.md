# R25 · Carousel — scroll-snap 기반, 자동재생은 정지 버튼과 한 몸

배너·콘텐츠 슬라이딩. **Swiper 를 쓰지 않는다.** 대상 섹션: `DESIGN.md §23`.

---

## 0. 전제 — 내가 측정한 것

### 0.1 CSS scroll-snap 이면 충분하다. 전부 네이티브로 된다

`display:flex` + `overflow-x:auto` + `scroll-snap-type:x mandatory`, 슬라이드는
`flex:0 0 100%` + `scroll-snap-align:start`, 트랙에 `tabindex="0"`:

| 측정 | 결과 |
|---|---|
| 트랙에 포커스 후 `ArrowRight` ×2 | index 0 → **2** (한 번에 한 칸, 스냅) |
| `scrollBy({left: clientWidth})` | 0 → **408** (이전/다음 버튼 구현에 충분) |
| Tab 경로 | 트랙이 **정지점 하나**. 슬라이드는 정지점을 늘리지 않는다 |
| `IntersectionObserver({root: 트랙, threshold: .6})` | 현재 슬라이드를 **정확히 보고한다** |

**Swiper 를 쓰지 않는 이유를 §23 에 적어라** — 우리가 필요한 건 배너 슬라이딩이고,
그 격차가 비용이다(현재 패키지가 85.7KB 인데 Swiper 가 그에 맞먹는다). 더 중요한 건
접근성이다. 캐러셀 라이브러리는 슬라이드를 transform 으로 밀어내며 화면 밖을
aria-hidden 으로 가리는 곡예를 하는데, **scroll-snap 은 그냥 스크롤 컨테이너라
스크린리더·키보드·터치 관성이 기본으로 동작한다**(위 표).

### 0.2 `scroll-behavior: smooth` 는 reduced-motion 을 **존중하지 않는다**

| 모드 | computed | 30ms 후 | 600ms 후 | 즉시 도달 |
|---|---|---|---|---|
| no-preference | smooth | 11px | 408px | 아니오 |
| **reduce** | **smooth** | **12px** | 408px | **아니오** |

`styles.css` 의 전역 reduced-motion 은 animation·transition 만 건드린다.
**스크롤은 안 덮는다.** `@media (prefers-reduced-motion: reduce)` 에서
`scroll-behavior: auto` 를 명시해라. 사용자가 직접 스크롤할 때도 적용된다.

---

## 1. 구조

`packages/ui/src/components/carousel/`.

```ts
interface CarouselProps {
  label: string;                 // 필수. "배너" 같은 그룹 이름
  children: React.ReactNode;     // CarouselSlide 들
  /** 자동 넘김 간격(ms). 주면 자동재생이 켜진다. */
  autoplay?: number;
  showArrows?: boolean;          // 기본 true
  showDots?: boolean;            // 기본 true
}
```

- 내보낼 것: `Carousel`, `CarouselSlide`.
- 트랙: `role="group"` + `aria-roledescription="캐러셀"` + `aria-label={label}` +
  `tabindex="0"`. **tabindex 없이는 화살표 스크롤이 안 된다**(0.1 의 전제).
- 슬라이드: `role="group"` + `aria-roledescription="슬라이드"` +
  `aria-label="{n}번째, 총 {total}개"`.
- 이전/다음 버튼: `scrollBy({left: ±clientWidth})`. 처음/끝에서는 **비활성**한다
  (순환은 기본이 아니다 — 끝을 알 수 없으면 사용자가 헤맨다).
- 점(dots): 각 슬라이드로 `scrollTo`. 현재 점은 `aria-current="true"`.
  색만으로 구분하지 마라(§2.4) — 크기나 테두리도 함께 바꿔라.
- 현재 인덱스는 `IntersectionObserver({root: 트랙, threshold: 0.6})` 로 읽는다.
  스크롤 이벤트를 세지 마라.

## 2. 자동재생 — 정지 버튼과 한 몸이다

`autoplay` 를 주면 **일시정지 버튼이 자동으로 함께 렌더된다.** 끌 수 없다.
WCAG 2.2.2 가 5초 넘게 자동으로 움직이는 콘텐츠에 정지 수단을 요구한다.
버튼을 끌 수 있게 만들면 결국 꺼진 채로 배포된다. §23 에 이 판단을 적어라.

**멈춰야 하는 조건 — 전부 구현해라:**

| 조건 | 이유 |
|---|---|
| 일시정지 버튼 | WCAG 2.2.2 |
| 포인터 호버 | 읽는 중에 넘어가면 안 된다 |
| 안에 포커스(`focus-within`) | 키보드 사용자가 조작 중이다 |
| `prefers-reduced-motion: reduce` | 아예 시작하지 않는다 |
| `document.hidden` | 안 보이는 탭에서 타이머를 돌리지 않는다 |
| 사용자가 직접 넘김(스크롤·화살표·점·버튼) | 의도를 존중한다. **영구 정지**다 |

마지막 줄이 중요하다. 사용자가 한 번 조작하면 자동재생은 **다시 켜지지 않는다.**
호버·포커스는 떠나면 재개하지만, 명시적 조작은 "내가 운전한다"는 뜻이다.

- 일시정지 버튼은 `aria-pressed` 로 상태를 알린다. 접근명은
  `"자동 넘김 멈춤"` / `"자동 넘김 시작"`.
- 자동재생 중에는 트랙에 `aria-live="off"`. 사용자가 넘길 때만 `polite` 로 바꿔
  "3개 중 2번째" 를 알린다. **자동으로 넘어갈 때마다 읽어주면 소음이다.**

## 3. reduced-motion

- 0.2 대로 `@media (prefers-reduced-motion: reduce)` 에서 `scroll-behavior: auto`.
- 자동재생을 시작하지 않는다. `matchMedia` 변경도 구독해서 도중에 켜지면 멈춘다.

## 4. 하지 마라

- Swiper·Embla 등 캐러셀 라이브러리 추가 (0.1)
- `transform` 으로 슬라이드 밀기 (스크롤 컨테이너의 접근성을 버리게 된다)
- `autoplay` 에서 일시정지 버튼 숨기기·끄기 (2번)
- 기본 순환(loop) — 끝에서 비활성
- 스크롤 이벤트로 인덱스 세기 (IntersectionObserver 를 써라)
- 슬라이드마다 Tab 정지점 추가
- 새 z-index·새 토큰
- 전역 `scroll-behavior` 변경 — 이 컴포넌트 안에서만

## 5. 스토리

`carousel.stories.tsx` — 기본 · 자동재생 · 점없음 · 화살표없음 · 슬라이드하나 ·
**슬라이드 안에 링크**(포커스 가능한 내용이 있을 때) · **MediaViewer 조합**
(배너 이미지를 눌러 확대)

## 6. 검증

`docs/qa/carousel-render-verify.mjs` + `run-all.mjs` 등록.

**핵심 검사 — 0.1·0.2 를 그대로 단정해라:**

- 트랙에 포커스 후 `ArrowRight` 로 인덱스가 **한 칸씩** 늘고 스냅된다
- 이전/다음 버튼이 한 칸씩 옮기고, **처음·끝에서 비활성**이다
- 점을 누르면 그 슬라이드로 간다. 현재 점에 `aria-current="true"`
- **Tab 정지점**: 슬라이드가 정지점을 늘리지 않는다. 단 **슬라이드 안의 링크는
  정지점이다**(그 스토리로 확인)
- `reduce` 에서 `getComputedStyle(트랙).scrollBehavior === 'auto'` ← 0.2 의 구멍
- **자동재생**:
  - 간격 뒤 인덱스가 는다
  - 호버하면 멈추고 떠나면 재개한다
  - 안에 포커스가 있으면 멈춘다
  - `reduce` 에서는 **시작하지 않는다**
  - 일시정지 버튼이 **항상 있다**. 누르면 멈추고 `aria-pressed` 가 바뀐다
  - **사용자가 직접 넘기면 다시 켜지지 않는다**
  - 자동재생 중 `aria-live="off"`, 사용자 조작 후 `polite`
- 콘솔 오류 0건
- **기존 브라우저 457건 전부 통과.** 깨지면 고치지 말고 보고해라

하네스 함정 — 화살표는 `rawKeyDown`→대기→`keyUp`, Enter 로 버튼을 누르려면
`keyDown`+`text:'\r'`, `id` 로 찾지 말 것, 포커스 단정 앞 대기 루프,
**`ev()` 가 DOM 요소를 그대로 돌려주면 직렬화가 터진다**(R24 에서 밟았다),
**`innerWidth` 는 스크롤바를 포함한다** — 고정 요소와 비교하면 어긋난다(R24).
자동재생 대기는 고정 `sleep` 말고 **조건 대기**를 써라.

## 7. 유지보수 꼬리

- `component-intent.mjs` 에 `Carousel`·`CarouselSlide`(부품, `partOf` 명시). 섹션 `23`.
  키워드: `캐러셀`, `배너`, `슬라이드`, `슬라이더`, `자동 넘김`, `가로 스크롤`
- `match.test.mjs`: `"배너 슬라이드"` → `Carousel`
- `packages/ui/docs/02-choosing.mdx` 에 갈림길 추가 (`<Intent>` 로)
- `CHANGELOG.md` `0.3.0 — 미게시`. **버전은 올리지 마라**
- 매니페스트 여유 13,197 바이트

## 8. 보고할 것

1. 새 파일 목록
2. 자동재생의 여섯 정지 조건을 각각 어디서 처리했는지
3. "사용자 조작 후 영구 정지" 를 어떻게 구현했는지
4. `pnpm verify`(단위 포함) 결과
5. 0 번 측정과 다르게 나온 것
6. 명세와 다르게 한 부분

브라우저는 네 샌드박스에서 못 띄운다. `pnpm qa` 는 내가 돌린다. 하네스는 작성만 해라.
