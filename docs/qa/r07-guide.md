# R07 안내 구현·검증 기록

## 변경 파일

- `packages/ui/src/components/guide/`: 요청한 순수 함수 2개와 각각의 테스트, 공통 앵커 훅, Tooltip·Hint·Tour, CSS, 공개 진입점.
- `packages/ui/src/stories/guide.stories.tsx`: 필수 9종과 중앙 대체·ref/핸들러 병합·스크롤 후 표시 3종.
- `packages/ui/src/index.ts`, `packages/ui/src/styles.css`: 공개 API와 스타일 연결.
- `docs/qa/guide-render-verify.mjs`, 이 기록: 기존 CDP 검증 방식의 안내 전용 하네스와 실행 안내.

## 공개 시그니처

요청한 두 시그니처를 변경하지 않았다. `from`은 탐색을 시작할 인덱스이므로 호출자가 전진 시 `현재 + 1`, 후진 시 `현재 - 1`을 넘긴다.

```ts
placeFallback(
  target: Rect,
  tip: { width: number; height: number },
  viewport: { width: number; height: number },
  opts: { gap: number; pad: number },
): { x: number; y: number; placement: Placement }

resolveStep(
  steps: TourStep[],
  from: number,
  dir: 1 | -1,
  find: (step: TourStep) => Element | null,
  onMissing: 'skip' | 'center',
): { index: number; target: Element | null } | null
```

`TourStep`은 Node 단위 테스트가 React·TSX에 의존하지 않도록 `resolve-step.ts`에서 선언하고 `tour.tsx`에서 재수출한다.

## 구현 판단

- 투어는 `start()` 호출에서만 시작한다. 마운트 효과는 단계 수 경고와 정리만 담당한다.
- 대상 탐색은 유효하지 않은 선택자·분리된 노드도 누락으로 처리한다. 열린 대상이 DOM에서 제거되면 안내를 닫는다.
- 스크롤 후 대상 사각형이 160ms 동안 안정되어야 표시한다. 4초간 계속 이동하면 오래된 좌표로 열지 않고 닫는다. 진행 중 다시 시작하거나 건너뛰거나 언마운트하면 이전 대기를 취소한다.
- `DESIGN.md` 10.4의 즉시 닫기 문구보다 이번 요청의 명시적 120ms 지연을 우선했다.
- 토큰 누락·대체는 없다. 읽기 실패에만 기존 차트와 동일한 유한수 검사로 gap/pad 8px, 호버 400ms, 닫기 120ms를 사용한다.
- 제공된 `guide.css`는 모든 선언·선택자·주석을 그대로 유지했다. 수정한 줄은 없다. 하나의 `data-slot`에 두 이름을 넣을 수 없으므로 말풍선 바깥에 `guide-bubble`, 안쪽 표면에 `guide-tooltip`/`guide-hint`를 사용한다. 바깥의 `p-0`은 UA 기본 popover 여백을 제거하고, 안쪽은 부모 모서리를 상속한다. 툴팁 바깥 표면과 경계는 투명하게 지정한다.
- 기존 ref는 객체 ref, 콜백 ref, React 19의 콜백 ref 정리 함수를 병합한다. 기존 스타일·설명 ID·이벤트 핸들러도 보존한다. Button/forwardRef 기반 자식을 사용했다. Fragment나 ref를 DOM으로 전달하지 않는 사용자 컴포넌트는 지원 계약 밖이며 브라우저에서 검증하지 못했다.
- Tooltip의 `content`는 상호작용 요소가 들어가지 않도록 `string`이다.

## 실행 결과

- `node --test packages/ui/src/lib/*.test.mjs packages/ui/src/components/*/*.test.mjs`: **68건 통과**(안내 신규 14건 포함).
- `pnpm tokens`: 대비 70건·의미 분리 6건·테마 검증 통과. 생성 결과에 git 차이 없음.
- `pnpm build-storybook`: 통과.
- `node --check docs/qa/guide-render-verify.mjs`, `git diff --check`: 통과.
- `pnpm verify`: **실패**. 기존 `packages/ui/src/stories/foundation-color.stories.tsx:24`가 `tokens.semantic`의 `hint-bg.hex: null`을 `hex: string`으로 단언해 TS2352 발생. 이 파일과 토큰 생성기는 범위 밖이므로 수정하지 않았다. 안내 파일의 추가 타입 오류는 없다.
- 브라우저 play·스크린샷 검증: **실행 불가**. 관리형 샌드박스가 정적 서버 바인딩을 `PermissionError: Operation not permitted`로 차단했고 Chrome CDP 연결도 성립하지 않았다. 따라서 새 스토리 및 기존 스토리의 브라우저 통과를 주장하지 않는다.

## 브라우저 실행 방법

포트·Chrome 실행이 허용된 환경에서 다음 순서로 진행한다.

1. 저장소 루트에서 `pnpm build-storybook`을 실행한다.
2. 별도 터미널에서 `python3 -m http.server 6099 --directory storybook-static`을 실행하고 유지한다.
3. 원래 터미널에서 `node docs/qa/guide-render-verify.mjs ./guide-shots`를 실행한다. 하네스가 포커스 에뮬레이션, 기본 CSS 경로, 강제 JS 폴백, 스크롤 닫기, reduce 모드를 검사한다. 스크린샷은 play 완료 플래그 확인 뒤에만 저장한다.
4. `guide-shots/results.json`의 모든 `pass`가 `true`인지 확인한다. 산출물은 로컬 검증용이다.
5. 개발 모드의 단계 초과 경고는 `pnpm storybook` 실행 후 `Components/Guide/투어 단계초과`를 연다. ‘긴 투어 준비’를 누르면 완주율 근거가 포함된 경고를 단언한다. 정적 프로덕션 빌드에서는 개발 경고가 제거되므로 이 단언만 조건부다.
6. 기존 스토리는 기존 `docs/qa/render-verify.mjs`, `charts-render-verify.mjs`, `loading-render-verify.mjs`로 추가 회귀 검증한다.
7. 전체 완료에는 위 타입 오류 해소 후 `pnpm verify`의 재통과가 필요하다.

## 의도적으로 하지 않은 것

자동 투어, 화살표, 배경 오버레이, 포커스 트랩, 영속 저장, 새 의존성, 기존 UI 컴포넌트 변경, 토큰·설계·규칙 변경, 커밋·푸시는 하지 않았다. 금지된 다른 AI 시스템 설정 디렉터리도 열지 않았다.
