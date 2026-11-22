# R39 · CSS 이름 공간과 전역 CSS 계약

CSS의 고유 이름 37개(파일별 중복 포함 39건)를 `ds-<기존 이름>`으로 옮겼다. MediaViewer의 재사용 선택자도 함께 변경했다. 버전은 세 패키지 모두 0.3.0을 유지한다.

## 바꾼 파일

| 파일 | 변경 |
|---|---|
| `AGENTS.md` | 기존 정리 대상 37개를 완료된 이름 공간 규칙으로 갱신 |
| `CHANGELOG.md` | 0.3.1 미게시의 바뀐 동작에 R39 기록 |
| `DESIGN.md` | 전역 CSS 계약 명시 |
| `README.md` | 전역 CSS 계약 명시 |
| `docs/dogfood/02-marketing-nextjs.md` | 측정 당시 이름을 보존하고 R39 이후 이름 병기 |
| `docs/qa/charts-render-verify.mjs` | 하네스 선택자 이름만 변경 |
| `docs/qa/pack-verify.mjs` | 하네스 선택자 이름만 변경 |
| `docs/qa/render-verify.mjs` | 하네스 선택자 이름만 변경 |
| `docs/research/component-intent.mjs` | MCP 원칙 1개 추가 |
| `docs/tasks/R06-dedupe-skeleton.md` | 기존 문서의 클래스 참조를 현재 이름으로 갱신 |
| `docs/tasks/R08-chart-loading.md` | 기존 문서의 클래스 참조를 현재 이름으로 갱신 |
| `docs/tasks/R26-dogfood2-fixes.md` | 기존 문서의 클래스 참조를 현재 이름으로 갱신 |
| `docs/tasks/R30-pretendard.md` | 기존 문서의 클래스 참조를 현재 이름으로 갱신 |
| `packages/mcp/manifest.json` | 원본 원칙에서 재생성(원칙 1개 추가) |
| `packages/ui/README.md` | 전역 CSS 계약 명시 |
| `packages/ui/docs/01-getting-started.mdx` | 전역 CSS 계약 명시 |
| `packages/ui/src/components/avatar/avatar.css` | 클래스 선택자 이름만 변경 |
| `packages/ui/src/components/avatar/avatar.tsx` | 클래스 참조만 변경 |
| `packages/ui/src/components/data-table/data-table.css` | 클래스 선택자 이름만 변경 |
| `packages/ui/src/components/data-table/data-table.tsx` | 클래스 참조만 변경 |
| `packages/ui/src/components/file-upload/file-upload.test.mjs` | 전체 CSS 검사로 통합해 docs/qa/css-namespace.test.mjs로 이동 |
| `packages/ui/src/components/loading/loading.css` | 클래스 선택자 이름만 변경 |
| `packages/ui/src/components/loading/progress-track.tsx` | 클래스 참조만 변경 |
| `packages/ui/src/components/loading/skeleton-patterns.tsx` | 클래스 참조만 변경 |
| `packages/ui/src/components/loading/skeleton.tsx` | 클래스 참조만 변경 |
| `packages/ui/src/components/loading/task-progress.tsx` | 클래스 참조만 변경 |
| `packages/ui/src/components/media-viewer/media-viewer.css` | 클래스 선택자 이름만 변경 |
| `packages/ui/src/components/state/empty-state.tsx` | 클래스 참조만 변경 |
| `packages/ui/src/components/state/state.css` | 클래스 선택자 이름만 변경 |
| `packages/ui/src/components/thumbnail/thumbnail.css` | 클래스 선택자 이름만 변경 |
| `packages/ui/src/components/thumbnail/thumbnail.tsx` | 클래스 참조만 변경 |
| `packages/ui/src/stories/charts.stories.tsx` | 스토리의 클래스 단정·선택자 이름 변경 |
| `packages/ui/src/stories/data-table.stories.tsx` | 스토리의 클래스 단정·선택자 이름 변경 |
| `docs/qa/css-namespace.test.mjs` | 신규: 전체 UI CSS 이름 공간 검사·중첩/복합/가상 선택자 판별력 검사 |
| `docs/qa/r39-css-namespace.md` | 신규: 이 보고서 |

기존 파일 업로드 전용 테스트는 전체 CSS 검사에 통합했다. 테스트 실행 명령은 기존 `docs/qa/*.test.mjs` 패턴으로 새 파일을 실행하므로 변경하지 않았다.

## 이름 대응표 — CSS 고유 이름 37개

| 기존 이름 | 새 이름 |
|---|---|
| `.avatar` | `.ds-avatar` |
| `.data-table-cell` | `.ds-data-table-cell` |
| `.data-table-numeric` | `.ds-data-table-numeric` |
| `.data-table-pinned` | `.ds-data-table-pinned` |
| `.data-table-selection` | `.ds-data-table-selection` |
| `.data-table-value` | `.ds-data-table-value` |
| `.loading-card-footer` | `.ds-loading-card-footer` |
| `.loading-card-title` | `.ds-loading-card-title` |
| `.loading-chart` | `.ds-loading-chart` |
| `.loading-chart-axis` | `.ds-loading-chart-axis` |
| `.loading-chart-bullet-row` | `.ds-loading-chart-bullet-row` |
| `.loading-chart-legend` | `.ds-loading-chart-legend` |
| `.loading-chart-plot` | `.ds-loading-chart-plot` |
| `.loading-form` | `.ds-loading-form` |
| `.loading-form-field` | `.ds-loading-form-field` |
| `.loading-form-input` | `.ds-loading-form-input` |
| `.loading-list` | `.ds-loading-list` |
| `.loading-list-row` | `.ds-loading-list-row` |
| `.loading-progress` | `.ds-loading-progress` |
| `.loading-progress-bar` | `.ds-loading-progress-bar` |
| `.loading-progress-eta` | `.ds-loading-progress-eta` |
| `.loading-progress-fill` | `.ds-loading-progress-fill` |
| `.loading-progress-label` | `.ds-loading-progress-label` |
| `.loading-progress-labels` | `.ds-loading-progress-labels` |
| `.loading-progress-percent` | `.ds-loading-progress-percent` |
| `.loading-skeleton` | `.ds-loading-skeleton` |
| `.loading-task` | `.ds-loading-task` |
| `.loading-task-document` | `.ds-loading-task-document` |
| `.loading-task-motion` | `.ds-loading-task-motion` |
| `.loading-task-step` | `.ds-loading-task-step` |
| `.loading-task-step-state` | `.ds-loading-task-step-state` |
| `.loading-task-steps` | `.ds-loading-task-steps` |
| `.loading-task-title` | `.ds-loading-task-title` |
| `.loading-text-line` | `.ds-loading-text-line` |
| `.state` | `.ds-state` |
| `.state-error` | `.ds-state-error` |
| `.thumbnail` | `.ds-thumbnail` |

loading 28개·data-table 5개·state 2개·avatar 1개·thumbnail 1개다. MediaViewer는 `.ds-loading-skeleton`·`.ds-state`를 재사용한다.

추가로 CSS 규칙 없이 SkeletonText TSX에만 있던 `loading-text`도 `ds-loading-text`로 맞췄다. CSS 고유 이름 37개에는 포함하지 않으며 새 CSS 규칙은 만들지 않았다.

## 하네스에서 고친 선택자

| 하네스 | 변경 |
|---|---|
| `docs/qa/charts-render-verify.mjs` | `.loading-chart-axis` → `.ds-loading-chart-axis`, `.loading-chart-legend` → `.ds-loading-chart-legend` |
| `docs/qa/pack-verify.mjs` | `.avatar` → `.ds-avatar`, `.loading-skeleton` → `.ds-loading-skeleton`, `.state` → `.ds-state`, `.thumbnail` → `.ds-thumbnail` |
| `docs/qa/render-verify.mjs` | `className.includes('data-table-pinned')` → `className.includes('ds-data-table-pinned')` |

세 하네스는 이름 변경을 역변환하면 기존 파일과 바이트 단위로 일치한다. 위치·동작 단정과 실행 순서는 유지했다. 다른 하네스의 `data-slot` 선택자는 그대로다.

## 문서·원칙 원문

루트 README와 패키지 README:

> `styles.css`는 앱 전체에 적용되는 기본 초기화(Tailwind preflight)와 유틸리티를 포함한다. 앱 전체를 이 디자인 시스템으로 만드는 것을 전제로 한다. 우리 고유 클래스는 `ds-`로 시작한다. 앱 CSS 클래스는 `ds-`로 시작하지 않으며, `.flex`·`.hidden` 같은 유틸리티 이름을 다시 정의하지 않는다.

시작하기:

> `styles.css`는 앱 전체에 적용되는 기본 초기화(Tailwind preflight)와 유틸리티를 포함합니다. 앱 전체를 이 디자인 시스템으로 만드는 것을 전제로 합니다. 우리 고유 클래스는 `ds-`로 시작합니다. 앱 CSS 클래스는 `ds-`로 시작하지 않으며, `.flex`·`.hidden` 같은 유틸리티 이름을 다시 정의하지 않습니다.

MCP `get_rules` 원칙(주제 `간격`, 출처 `DESIGN.md 6`):

> 앱 CSS 클래스는 ds-로 시작하지 않으며, .flex·.hidden 같은 유틸리티 이름을 다시 정의하지 않는다.

64자로 R28의 120자 기준 안이며 앱 개발자가 할 일을 직접 안내한다. 새 주제나 공개 API를 추가하지 않았다. DESIGN §6에도 전역 초기화·이름 공간·공개 유틸리티 예외와 레이어 충돌의 근거를 기록했다.

## 검증 결과

- `npm_config_offline=true pnpm verify`: **통과(exit 0)**. 토큰 대비 128건·테마 3상태·의미 분리, MCP 생성·의존 경계, 타입 검사, 단위 검사 **313/313**, Storybook 정적 빌드.
- `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify`: **77/77 통과(exit 0)**, stdout 오염·stderr 출력 없음.
- 새 이름 공간 단위 검사: **2/2 통과**. `packages/ui/src/**/*.css`의 **31개 파일 전체**를 재귀 검사하고 `.sr-only`·`.tabular`만 예외로 허용한다. 중첩·복합·가상 선택자의 누락을 검출하고 import 경로·주석·속성값·content 문자열의 점은 제외한다.
- 별도 실제 stdio 대조: 새 원칙이 `get_rules` 전체·간격 조회와 `design://principles`에 포함되고 구조화 응답·text 직렬화가 일치한다.
- 카탈로그 **79,679 / 90,000바이트**(변경 없음), 전체 매니페스트 전송 **150,864 / 160,000바이트**, 규칙 21개. 상한은 유지했다.
- CSS 6개는 클래스 이름을 역변환하면 원본과 바이트 단위로 일치한다. 선택자 구조·선언값·키프레임·조건·순서를 보존했다.
- 변경 TSX 10개도 클래스 이름만 역변환하면 원본과 바이트 단위로 일치한다. DOM·props·`data-slot`·동작을 보존했다.
- `git diff --check`: 통과.

최초 verify에서는 CSS import 예제가 들어 있는 테스트를 UI 소스 안에 두어 의존 경계 검사가 차단했다. 전체 CSS 검사를 다른 저장소 전체 검사와 같은 `docs/qa`로 옮긴 뒤 재실행해 통과했다. 경계 검사 규칙은 변경하지 않았다. 빌드의 큰 청크 안내 경고는 남지만 빌드는 성공했다.

로그: `.qa-shots/r39/verify.log`, `.qa-shots/r39/mcp-client-verify.log`.

실제 브라우저의 계산 스타일은 이번 작업에서 새로 측정하지 않았다. 화면 보존은 선언·참조의 동시 이름 변경을 정적으로 대조했으며, 브라우저 하네스 실행은 요청대로 사용자의 `pnpm qa --build`에 맡긴다.

## CHANGELOG

`CHANGELOG.md`의 `0.3.1 — 미게시` → `바뀐 동작`에 추가했다:

> CSS 이름 공간(R39): loading·data-table·state·thumbnail·avatar의 내부 클래스 이름 37개를 `ds-<기존 이름>`으로 바꾸고 MediaViewer의 재사용 선택자도 맞췄다. 앱 CSS가 옛 이름을 덮어쓰고 있었다면 해당 선택자를 `ds-` 이름으로 바꿔야 한다. `data-slot`·공개 API·계산 스타일은 유지한다. `styles.css`의 앱 전체 preflight·유틸리티 계약과 앱 클래스 이름 규칙을 README·시작하기·MCP 원칙에 명시했다.

## 의도적으로 하지 않은 것

- `data-slot` 변경, 공개 API 변경, Tailwind 유틸리티 접두어화, preflight 제거, 버전 범프.
- `pnpm qa --build`와 개별 브라우저·배포 리허설 실행. 요청대로 하네스는 이름만 고쳤다.
- 커밋·푸시·리셋·체크아웃, 전역 패키지 설치.
- R39 작업 지시서의 과거 이름 예시 변경. 기존 측정 보고서의 당시 이름은 새 이름을 병기해 보존했다.
- 별도로 나타난 R40–R43 작업 지시서 변경.
