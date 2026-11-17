# R24 · MediaViewer — 이미지·동영상을 팝업/플로팅으로

사용자 요청 둘을 하나로 묶는다. "이미지 클릭 시 확대 popup" 과 "동영상이 popup 이나
floating 형태로 보여지는 것". **플레이어를 만드는 게 아니다** — 보여주는 방식이다.

대상 섹션: `DESIGN.md §22`.

---

## 0. 전제 — 내가 측정한 것

### 0.1 `popover="manual"` 이 floating 에 그대로 맞는다

```
보임               true
스크롤해도 고정      true
바깥이 inert 인가   false
바깥 입력에 포커스   true   ← 페이지를 계속 쓸 수 있다
```

R15 에서 이미 쟀듯 native popover 는 **top layer 라 z-index 를 이긴다.**
Tooltip·Hint·Tour 가 쓰는 것과 같은 기제다. **새 z-index 를 만들지 마라.**

### 0.2 네이티브 Picture-in-Picture 는 쓸 수 있다 — 단 진짜 제스처가 필요하다

| 측정 | 결과 |
|---|---|
| `document.pictureInPictureEnabled` | `true` |
| `video.requestPictureInPicture` | 있음 |
| `disablePictureInPicture` 속성 | 있음 |
| 스크립트로 호출 (`readyState: 4`) | **`NotAllowedError`** — 사용자 제스처 없음 |
| **진짜 마우스 클릭으로 호출** | **성공.** `document.pictureInPictureElement` 가 그 video |

→ 동영상에는 PiP 를 **열어준다.** 브라우저가 공짜로 주고, 탭을 바꿔도 살아남는다.
단 기능 탐지를 하고 `disablePictureInPicture` 를 존중해라.
**하네스는 진짜 CDP 클릭으로 끝까지 검증할 수 있다**(내가 확인했다).

### 0.3 우리 Dialog 는 라이트박스에 좁다

`.ds-dialog-content { max-width: 36rem; }` = 576px. 800×600 이미지도 못 담는다.
**폭 변형이 필요하다.** 기본값은 바꾸지 마라 — 상세 화면 36건이 그걸 지킨다.

---

## 1. MediaViewer

`packages/ui/src/components/media-viewer/`.

```ts
type Media =
  | { type: 'image'; src: string; alt: string; width?: number; height?: number }
  | { type: 'video'; src: string; poster?: string; captions?: { src: string; lang: string; label: string }[] };

interface MediaViewerProps {
  media: Media;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** popup = 모달 확대, floating = 페이지를 계속 쓰면서 구석에 떠 있음. 기본 popup. */
  mode?: 'popup' | 'floating';
  /** floating 위치. 기본 'bottom-end'. */
  placement?: 'bottom-end' | 'bottom-start' | 'top-end' | 'top-start';
  title?: string;
}
```

### 1.1 popup

- 우리 `Dialog` 를 쓴다. **새 모달을 만들지 마라.**
- `DialogContent` 에 폭 변형을 더한다(예: `size?: 'default' | 'wide'`).
  `default` 는 지금 그대로 36rem. `wide` 는 뷰포트에 맞춘다
  (가장자리 여백을 남기고 `max-width`/`max-height` 를 뷰포트 기준으로).
- 이미지는 **종횡비를 지키며** 뷰포트 안에 들어간다. 확대·이동(pan/zoom)은 **범위 밖**이다.
  §22 에 "현재 범위 아님" 으로 적어라.
- `alt` 는 **필수다**(타입으로 강제). 확대 이미지에 대체 텍스트가 없으면 안 된다.

### 1.2 floating

- `popover="manual"` 을 쓴다(0.1). `Dialog` 를 쓰지 마라 — **모달이면 안 된다.**
- **바깥이 계속 동작해야 한다.** 포커스를 가두지 않고 `inert` 를 걸지 않는다.
  이게 floating 의 존재 이유다.
- 닫기 버튼을 **반드시** 둔다. Escape 로도 닫되, 페이지의 다른 Escape 동작을 가로채지 마라.
- 끌어서 옮기기(drag)는 **범위 밖**이다. `placement` 로 모서리만 고른다. §22 에 적어라.
- 등장 전환은 `prefers-reduced-motion` 을 지킨다.

### 1.3 동영상 — 플레이어를 만들지 않는다

- 네이티브 `controls` 를 쓴다. 커스텀 컨트롤을 만들지 마라 — 자막·탐색·전체화면의
  접근성을 다시 구현하는 건 손해다. §22 에 이 판단과 이유를 적어라.
- `preload="metadata"` (자동 다운로드 금지). `autoplay` 금지. `poster` 권장.
- `captions` 가 있으면 `<track kind="captions">` 로 넣는다.
- **PiP 버튼**: `document.pictureInPictureEnabled` 이고 `disablePictureInPicture` 가
  아닐 때만 렌더한다. 접근명은 `"화면 속 화면으로 보기"`.
  이미 PiP 중이면 `"화면 속 화면 끄기"` 로 바뀌고 `document.exitPictureInPicture()`.
- 이미지에는 PiP 버튼이 없다.

### 1.4 로딩·오류

- 로딩 중에는 기존 `Skeleton` 을 쓴다. 종횡비 상자로 **레이아웃이 흔들리지 않게** 한다.
- 실패하면 기존 `ErrorState` 를 쓴다. 깨진 이미지 아이콘을 새로 만들지 마라.

## 2. 하지 마라

- 커스텀 동영상 컨트롤 (1.3)
- floating 에 `Dialog`·모달·포커스 트랩 (1.2 — 존재 이유가 사라진다)
- 새 z-index·새 토큰
- `DialogContent` 의 **기본** 폭 변경 (0.3 — 상세 36건이 지킨다)
- 확대/이동(pan·zoom), 끌어서 옮기기 — 범위 밖. §22 에 명시만
- `alt` 없는 이미지 허용
- `autoplay`

## 3. 스토리

`media-viewer.stories.tsx` — 이미지팝업 · 동영상팝업 · 이미지플로팅 · 동영상플로팅 ·
로딩 · 오류 · PiP불가(`disablePictureInPicture`) · 긴제목

동영상은 **캔버스 `captureStream` 으로 만든 실제 스트림**을 써라. 외부 파일을
받아오지 마라(검증이 네트워크에 묶인다). 내가 그 방법으로 PiP 를 확인했다.

## 4. 검증

`docs/qa/media-viewer-render-verify.mjs` + `run-all.mjs` 등록.

**핵심 검사 — 0.1·0.2 를 그대로 단정해라:**

- floating 이 열린 동안 **바깥 입력에 포커스가 간다**, 바깥이 `inert` 가 아니다
- floating 이 **스크롤해도 제자리**다
- **진짜 CDP 마우스 클릭**으로 PiP 버튼을 눌러 `document.pictureInPictureElement` 가
  그 video 가 된다. 다시 눌러 해제된다
- `disablePictureInPicture` 인 영상에는 PiP 버튼이 **DOM 에 없다**
- popup 의 `wide` 가 기본보다 **실제로 넓다**(폭을 재서 비교)
- popup 은 Escape 로 닫히고 포커스가 트리거로 돌아온다
- 동영상에 `controls` 가 있고 `autoplay` 가 **없다**, `preload="metadata"` 다
- 이미지에 `alt` 가 있다
- 로딩 중 종횡비 상자 높이가 **로드 후와 같다**(레이아웃 흔들림 없음)
- reduced-motion 에서 등장 전환 0
- 콘솔 오류 0건
- **기존 브라우저 429건 전부 통과.** 특히 상세 36건(Dialog). 깨지면 고치지 말고 보고해라

하네스 함정 — 화살표는 `rawKeyDown`, Enter 로 버튼을 누르려면 `keyDown`+`text:'\r'`,
`id` 로 찾지 말 것, 포커스 단정 앞 대기 루프, **PiP 는 진짜 포인터 클릭이어야 한다**
(`element.click()` 으로는 `NotAllowedError` 다 — 실측).

## 5. 유지보수 꼬리

- `component-intent.mjs` 에 `MediaViewer` 추가(독립). 섹션 `22`.
  키워드: `이미지 확대`, `라이트박스`, `사진 크게`, `동영상 재생`, `영상 팝업`,
  `떠 있는 창`, `화면 속 화면`, `PiP`
- `match.test.mjs`: `"이미지 크게 보기"` → `MediaViewer`,
  `"영상 보면서 작업"` → `MediaViewer`
- `packages/ui/docs/02-choosing.mdx` 에 `MediaViewer` ↔ `Dialog` 갈림길 (`<Intent>` 로)
- `CHANGELOG.md` `0.3.0 — 미게시`. **버전은 올리지 마라**
- 매니페스트 여유 15,989 바이트

## 6. 보고할 것

1. 새 파일 목록
2. `DialogContent` 폭 변형을 어떻게 더했는지 (기본이 안 바뀌었다는 근거)
3. PiP 버튼의 기능 탐지·해제 처리
4. `pnpm verify`(단위 포함) 결과
5. 0 번 측정과 다르게 나온 것
6. 명세와 다르게 한 부분

브라우저는 네 샌드박스에서 못 띄운다. `pnpm qa` 는 내가 돌린다. 하네스는 작성만 해라.
