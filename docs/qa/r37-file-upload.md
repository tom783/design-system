# R37 · 파일 업로드 결정과 검증

## 공개 계약

`FileUpload`는 `value: FileUploadItem[]`와 `onValueChange`의 제어형이다.
`FileUploadItem`은 `{ id: string; file: File; status?: 'ready' | 'uploading' | 'success' | 'error'; progress?: number; error?: string }`다.

- `id`는 동명 파일을 구분하고 앱이 비동기 전송 결과를 반영하는 키다. 새 선택에만 생성한다.
- `file` 객체와 `id`는 진행률 갱신 중 유지한다. `progress`는 기존 ProgressTrack과 같은 0~1이다.
- 상태 생략은 전송 대기다. `error` 문장이 있으면 `status`보다 먼저 실패로 표시한다.
- `required`는 필수 표시·ARIA다. 제출 시 빈 value 검증은 앱이 Field error로 전달한다. 네이티브 input은 같은 파일 재선택을 위해 비운다.
- `accept`·`maxSize`(바이트)·`multiple`·`maxFiles`는 파일 선택과 드롭의 공통 검증에 사용한다.
- `mode="image"` 단일 선택은 대표 이미지이며 기본 accept는 `image/*`다. 단일 선택은 교체, 다중은 추가다.
- 전송·재시도·취소·서버 검증은 앱이 맡는다. File을 FormData에 넣는 것도 앱 몫이다.

## 거절 문구의 위치

선택 거절은 Field의 예약 오류 자리로 모으고 전송 실패는 해당 항목 옆에 둔다.
거절한 파일은 value에 들어가지 않으므로 기존 항목 옆에 이유를 붙이면 다른 파일의 오류로 오해하기 쉽다.
거절만 표시하기 위해 가짜 업로드 항목을 만드는 것도 피한다. 파일명과 이유를 함께 나열하므로 일괄 선택의 일부 거절도 구분된다.
Field 외부에서는 아래에 같은 한 줄 자리를 예약한다. 앱의 Field error가 있으면 그것을 우선한다.

정적 계측 기준: `--text-caption-lh`와 Field의 min-height는 **20px**다. 한 번에 형식·크기·개수로
세 파일을 거절하면 최소 **3 × 20 = 60px**이며 긴 이름·문구의 줄바꿈만큼 더 늘어난다.
따라서 “모든 거절을 한 줄로 고정”하는 방식은 사용하지 않는다. 실패 항목 옆에는 그 항목의 앱 error만 둔다.
이 값은 CSS/토큰에 따른 산술이며 브라우저 레이아웃 실측값이 아니다.

2026-11-21 저장소의 `launchBrowser()`로 배치 측정용 headless-shell 기동을 시도했으나
`FATAL: content/browser/sandbox_parameters_mac.mm:87 … Input/output error (5)`로 CDP 연결이 실패했다.
GUI Chrome·`--no-sandbox` 우회는 하지 않았다. 실제 폰트 조판 폭과 280/480px 배치 측정은 미확인이다.
새 하네스는 Field의 예약 20px, 두 폭에서의 실제 오류 높이를 results.json에 남기도록 **작성만** 했다.

## object URL 수명

`FilePreview`는 렌더가 아닌 파일별 effect에서 URL을 만든다.

```tsx
React.useEffect(() => {
  if (!file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  setPreview({ file, url });
  return () => URL.revokeObjectURL(url);
}, [file]);
```

파일 교체·행 삭제·컴포넌트 언마운트 때 해당 effect의 URL을 해제한다.
같은 id로 File만 바뀌어도 정리되며 진행률만 바뀌면 만들지 않는다.
StrictMode의 effect 재실행도 각 effect가 만든 URL을 각각 해제한다.
하네스는 생성/해제 URL 배열을 비교해 개수뿐 아니라 URL별 누락·중복을 확인한다.

## MCP 예산

사용자 제공 R36b 76,925 → R37 카탈로그 **79,416바이트**.
두 회귀 상한은 `< 79_700`으로 284바이트 여유를 둔다. 지침은 줄이지 않았다.
공식 예산은 카탈로그 90,000 / 전체 160,000 / 목록 24,000 / 상세 한 건 6,000바이트다.
실측은 전체 150,422 / 목록 19,122 / 최대 상세 DataTable 4,576바이트다.
서버와 생성기는 같은 listComponents/getComponent로 복원·부모 의도를 합쳐 검사한다.

## 실행 범위

- `npm_config_offline=true pnpm verify`: 토큰·매니페스트·타입·단위·Storybook 빌드.
- `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify`: 실제 stdio 클라이언트.
- `node --check docs/qa/file-upload-render-verify.mjs`: 새 하네스 구문 확인.
- 새 브라우저 하네스는 실행하지 않았다. 전체 QA·배포 리허설·게시·버전 변경은 이번 범위가 아니다.

새 하네스는 CDP 파일 주입, 드래그 활성 상태와 드롭, Enter/Space의 input click,
형식·크기·개수 거절, 긴 이름·크기·목록, 삭제 포커스·polite, 단일 교체,
동일 id의 외부 File 교체·언마운트 URL 해제, 진행·실패·비활성, Field ARIA·오류 공유,
다크·좁은 폭과 콘솔 오류를 다룬다. 실행은 `pnpm qa`로 수행한다.

## 최종 검증 결과

- `npm_config_offline=true pnpm verify` 통과: 대비 128건·의미 분리 8건·테마 3상태·타입·단위 **306건**·Storybook 정적 빌드.
- `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify` **77건 통과**, 실패 0, stderr 0자, stdout 비 JSON 0건.
- 새 하네스 `node --check`·`git diff --check` 통과. Storybook 인덱스에서 문서와 스토리 9개를 확인했다.
- 세 패키지는 모두 **0.3.0 유지**. 0.3.1 미게시 CHANGELOG에만 기록했다.

## 만든 파일

- `packages/ui/src/components/file-upload/index.ts`
- `packages/ui/src/components/file-upload/file-upload.tsx`
- `packages/ui/src/components/file-upload/file-upload.css`
- `packages/ui/src/components/file-upload/file-validation.ts`
- `packages/ui/src/components/file-upload/file-validation.test.mjs`
- `packages/ui/src/stories/file-upload.stories.tsx`
- `packages/ui/docs/examples/file-upload.tsx`
- `docs/qa/file-upload-render-verify.mjs`
- `docs/qa/r37-file-upload.md`

## 고친 파일

- `packages/ui/src/index.ts`·`packages/ui/src/components.css`: 공개 export·CSS 단일 진입점.
- `packages/ui/docs/04-forms.mdx`: 매니페스트 Intent와 실제 사용 예시 연결.
- `docs/research/component-intent.mjs`: 공개 API 의도·여섯 키워드·규칙.
- `docs/research/mcp-build.mjs`: 네 응답 예산 검사와 최대 상세 출력.
- `packages/mcp/catalog.mjs`·`packages/mcp/server.mjs`: 복원 응답의 공통 구성 함수.
- `packages/mcp/build.test.mjs`·`packages/mcp/server.test.mjs`: 네 경계·실제 응답·검색·회귀 상한.
- `packages/mcp/manifest.json`: 생성기로 재생성한 산출물.
- `docs/qa/mcp-client-verify.mjs`: 90,000바이트·목록/상세 예산·업로드 검색/API 검증.
- `docs/qa/run-all.mjs`·`docs/qa/docs-render-verify.mjs`: 새 하네스와 Primary 문서 검사 등록.
- `DESIGN.md`·`packages/mcp/README.md`: 파일 업로드 계약·책임과 MCP 재설정 근거.
- `CHANGELOG.md`: 0.3.1 미게시의 추가·내부 항목.

생성 토큰은 verify에서 재생성됐으나 원본과 같아 변경 파일이 없다.
커밋·푸시·전역 설치·외부 라이브러리 추가·전송 구현·버전 변경은 하지 않았다.
