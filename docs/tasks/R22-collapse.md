# R22 · 접고 펴기 — Collapsible · ClampText

사용자 요청: "collapse 처럼 '더보기', '간략히' 같이 **내용에 따라서** 펼쳤다 접었다하는 요소".

두 개가 필요하다. 섞지 마라.

- **`Collapsible`** — 임의의 내용을 접고 편다. 트리거가 **항상** 보인다. (패널·고급 설정)
- **`ClampText`** — 글을 N줄로 자르고, **넘칠 때만** 더보기를 보여준다. (상품 설명·비고)

`@radix-ui/react-collapsible` 는 **이미 설치했다.** 대상 섹션: `DESIGN.md §21`.

---

## 0. 전제 — 내가 측정한 것

### 0.1 넘침 판정은 `scrollHeight > clientHeight` 로 된다. 폭 변화도 따라온다

`-webkit-line-clamp: 2` 한국어 문단, `ResizeObserver` 로 재판정:

| 폭 | 짧은 글 | 중간 글 | 긴 글 |
|---|---|---|---|
| 360px | false (22/22) | false (45/45) | **true** (45/112) |
| 240px | false | **true** (45/67) | **true** (45/157) |
| 640px | false | false (22/22) | **true** (45/67) |

폭을 줄이면 중간 글이 넘치고, 늘리면 다시 안 넘친다. 판정이 정확히 따라온다.

### 0.2 **ResizeObserver 만으로는 부족하다 — 조용히 글이 사라진다**

클램프된 상자는 높이가 **고정**이다. 그래서 내용만 길어지면 박스 크기가 안 변하고
`ResizeObserver` 가 **울리지 않는다.** 실측:

```
교체 전: client 45 / scroll  45 / 넘침 false / RO 1회 / 표시 false
교체 후: client 45 / scroll 112 / 넘침 true  / RO 1회 / 표시 false  ← 안 울렸다
```

정확히 2줄만큼 차 있던 글을 3배 긴 글로 바꿨더니 **실제로는 넘치는데 더보기가
나타나지 않는다.** 사용자는 잘린 글을 펼칠 방법 없이 본다. **내용 손실이다.**

→ `MutationObserver`(`childList`·`characterData`·`subtree`)로 **내용 변화도 감시**해라.
두 관찰자를 같이 써야 한다. 이 두 경우를 하네스가 각각 검사해야 한다.

### 0.3 한국어 줄바꿈은 이번 라운드에서 건드리지 않는다

저장소 어디에도 `word-break: keep-all` 이 없다. 한국어가 어절 중간에서 끊기고 있고,
그건 클램프가 어디서 잘리는지에도 영향을 준다. **하지만 전역 활자 결정이라 모든
화면과 브라우저 검사 404건에 영향을 준다.** 이번 라운드에서 바꾸지 마라.
`ClampText` 에만 따로 넣어 다른 글과 다르게 끊기게 만드는 것도 **하지 마라.**
`DESIGN.md §21` 에 "열린 질문: 전역 word-break" 로 한 줄만 남겨라.

---

## 1. Collapsible

`internal/collapsible.ts` 재수출 + `components/collapsible/`.

- 내보낼 것: `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`.
- Radix 가 `aria-expanded`·`aria-controls`·`data-state` 를 준다. 덮어쓰지 마라.
- 높이 전환은 Radix 의 `--radix-collapsible-content-height` 를 쓴다.
  **`prefers-reduced-motion: reduce` 에서는 전환을 끈다**(§5).
- 트리거 라벨은 앱이 준다. 기본값을 "더보기/간략히" 로 **강제하지 마라** —
  이건 임의 내용을 접는 용도고 라벨이 상황마다 다르다.
- 닫힌 내용은 Radix 가 DOM 에서 **뺀다**. 안에 입력이 있으면 값이 사라진다는 뜻이다.
  `forceMount` 로 유지하는 법을 §21 에 적어라.

## 2. ClampText

`components/clamp-text/`.

```ts
interface ClampTextProps extends React.ComponentProps<'div'> {
  /** 접었을 때 보여줄 줄 수. 기본 2. */
  lines?: number;
  /** 제어하려면 주고, 아니면 스스로 관리한다. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  moreLabel?: string;   // 기본 "더보기"
  lessLabel?: string;   // 기본 "간략히"
}
```

- 접힘: `display:-webkit-box` + `-webkit-box-orient:vertical` + `-webkit-line-clamp`
  + `overflow:hidden`. 펼침: 제한 해제.
- **넘치지 않으면 버튼을 렌더하지 마라.** `hidden` 으로 숨기지도 마라 — DOM 에 없어야
  스크린리더가 읽지 않는다.
- 판정은 0.1·0.2 대로 **두 관찰자**를 쓴다. 폰트 로딩 후에도 한 번 더 재야 한다
  (`document.fonts.ready`).
- 버튼은 `aria-expanded` 와 `aria-controls`(글 요소 id)를 갖는다. 접근명은
  라벨만으로 충분하지 않다 — 같은 화면에 여러 개면 "더보기" 가 여럿이 된다.
  `aria-describedby` 나 보이지 않는 맥락으로 **어느 글인지** 알 수 있게 해라.
- 펼침/접힘 전환에도 reduced-motion 을 지킨다.
- **접었을 때 잘린 글을 복사할 수 있어야 한다.** `-webkit-line-clamp` 는 시각만
  자르므로 기본적으로 된다. `text-overflow` 로 바꾸지 마라.

## 3. 하지 마라

- `Collapsible` 과 `ClampText` 를 한 컴포넌트로 합치기 (트리거가 항상 보이는지가 다르다)
- 넘치지 않는데 더보기 버튼 렌더
- `ResizeObserver` 만으로 판정 (0.2 — 조용히 글이 사라진다)
- 전역 `word-break` 변경, 또는 `ClampText` 에만 다른 줄바꿈 규칙 적용 (0.3)
- 새 토큰·새 z-index
- `internal/` 밖에서 `@radix-ui/*` import

## 4. 스토리

- `collapsible.stories.tsx` — 기본 · 기본 열림 · 안에 폼(forceMount) · reduced-motion
- `clamp-text.stories.tsx` — **짧은 글(버튼 없음)** · 긴 글 · 3줄 · 좁은 폭 ·
  **내용이 나중에 길어지는 경우**(0.2 재현) · 여러 개가 한 화면에

## 5. 검증

`docs/qa/collapse-render-verify.mjs` 를 새로 만들고 `run-all.mjs` 에 등록해라.

**핵심 검사 — 0.1·0.2 를 그대로 단정해라:**

- 짧은 글에는 더보기 버튼이 **DOM 에 없다**
- 긴 글에는 있다
- 폭을 240px 로 줄이면 중간 글에 버튼이 **생긴다**. 640px 로 늘리면 **사라진다**
- **폭을 그대로 두고 내용만 길게 바꾸면 버튼이 생긴다** ← 0.2 의 결함을 막는 검사
- 펼치면 전체가 보이고 `aria-expanded=true`, 접으면 다시 N줄
- 접힌 상태에서도 전체 글이 DOM 에 있다 (복사 가능)
- `Collapsible` 의 `aria-expanded`·`aria-controls` 가 실재 요소를 가리킨다
- reduced-motion 에서 전환 시간이 0 이다
- 같은 화면에 여러 개일 때 각 버튼이 **서로 다른 것**을 가리킨다
- 콘솔 오류 0건
- 기존 브라우저 404건 그대로 통과. 깨지면 고치지 말고 보고해라

하네스 함정은 이미 밟은 것들이다 — 화살표는 `rawKeyDown`, Enter 로 버튼을 누르려면
`keyDown` + `text:'\r'`, `id` 로 찾지 말 것, 포커스 단정 앞 대기 루프,
좌표 클릭을 내부 버튼에 쓰지 말 것.

## 6. 유지보수 꼬리

- `component-intent.mjs` 에 `Collapsible`(+부품 2개, `partOf` 명시)·`ClampText` 추가.
  섹션 `21`. 키워드: `더보기`, `간략히`, `접기`, `펼치기`, `말줄임`, `긴 글`,
  `아코디언 아님`, `고급 설정`
- `match.test.mjs`: `"긴 설명 더보기"` → `ClampText`, `"고급 설정 접기"` → `Collapsible`
- `packages/ui/docs/02-choosing.mdx` 에 갈림길 추가 (`<Intent>` 로 렌더)
- `CHANGELOG.md` `0.3.0 — 미게시`. **버전은 올리지 마라**
- 매니페스트 여유는 5,476 바이트뿐이다. 넘으면 **보고해라.** 올리지 마라

## 7. 보고할 것

1. 새 파일 목록
2. 0.2 의 두 관찰자를 어떻게 묶었는지
3. 넘치지 않을 때 버튼을 어떻게 "없게" 했는지
4. `pnpm verify`(단위 포함) 결과
5. 매니페스트 크기 (이전 74,524 / 80,000)
6. 명세와 다르게 한 부분

브라우저는 네 샌드박스에서 못 띄운다. `pnpm qa` 는 내가 돌린다. 하네스는 작성만 해라.
