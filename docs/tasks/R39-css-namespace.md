# R39 · CSS 이름 공간 — 우리 고유 클래스 37개에 `ds-`, 전역 CSS 계약 명시

근거: R37 에서 FileUpload 가 접두어 없는 클래스(`file-upload-*`)로 들어와 R37b 에서 `ds-` 로 고쳤다. 전수 조사하니 기존 컴포넌트에도
**고유 이름 37개**(파일별로 세면 39건 — media-viewer 가 `.loading-skeleton`·`.state` 를 다시 쓴다)가 남아 있다. 0.3.1 후보. **버전은 올리지 마라.**

---

## 0. 내가 측정한 것

`packages/ui/src/**/*.css` 의 클래스 선택자 중 `ds-` 로 시작하지 않는 것(공개 `.sr-only`·`.tabular` 제외):

| 컴포넌트 CSS | 개수 | 예 |
|---|---|---|
| loading | 28 | `.loading-skeleton` `.loading-chart` `.loading-progress-fill` `.loading-task-step` … |
| data-table | 5 | `.data-table-cell` `.data-table-numeric` `.data-table-pinned` `.data-table-selection` `.data-table-value` |
| state | 2 | `.state` `.state-error` |
| media-viewer | (2건) | 새 이름 없음 — `.loading-skeleton`·`.state` 를 선택자로 다시 쓴다. 함께 바꿔라 |
| thumbnail · avatar | 1 · 1 | `.thumbnail` `.avatar` |

위험: 우리 CSS 는 `@layer components` 안에 있고 앱 CSS 는 보통 레이어 밖이다 → **같은 이름이면 앱이 이긴다.** 바이브코딩 AI 는
`.thumbnail`·`.avatar`·`.state` 같은 이름을 자연스럽게 쓴다(도그푸딩 5 의 앱 CSS: `.page` `.toolbar` `.form-row` …). 그러면 우리
Thumbnail·Avatar·EmptyState 가 앱 규칙을 받아 깨진다.

배포 `dist/styles.css`(94KB) 실측: Tailwind 전역 초기화(`@layer base` — `*{margin:0;padding:0}`, h1–h6·목록·img 초기화)와
접두어 없는 유틸리티(`.flex` `.hidden` `.p-4` `.w-full` …, 약 230개)가 들어 있다. 이 DS 는 **앱 전체를 DS 로 만드는** 전제라
이것 자체는 바꾸지 않는다(유틸리티 접두어화는 이번 범위 밖) — 대신 계약으로 명시한다.

## 1. 37개 → `ds-`

- 37개 전부 `ds-<원래 이름>` 으로(예: `.thumbnail` → `.ds-thumbnail`, `.loading-chart-axis` → `.ds-loading-chart-axis`).
  CSS·TSX·스토리·하네스·문서의 참조를 함께. `data-slot` 이름은 **바꾸지 마라**(MCP·하네스·소비자 선택자가 쓴다)
- 회귀 방지: 단위 테스트 — `packages/ui/src/**/*.css` 의 모든 클래스 선택자는 `ds-` 로 시작(공개 `.sr-only`·`.tabular` 만 예외).
  R37b 의 file-upload 전용 테스트는 이 전체 테스트로 합쳐도 된다
- 화면은 그대로여야 한다 — 계산 스타일 동일

## 2. 전역 CSS 계약을 문서·MCP 에

- README·시작하기: "`styles.css` 는 앱 전체에 적용되는 기본 초기화(Tailwind preflight)와 유틸리티를 포함한다 — 앱 전체를 이 디자인
  시스템으로 만드는 것을 전제로 한다. 우리 클래스는 `ds-` 로 시작한다" 한 단락
- MCP 원칙(get_rules, 소비자 말, R28 규칙): 앱 CSS 클래스는 `ds-` 로 시작하지 않는다 · `.flex`·`.hidden` 같은 유틸리티 이름을 다시
  정의하지 않는다 — 한 줄로 합쳐도 된다. 예산 안(카탈로그 79,679 / 90,000 — 원칙은 카탈로그 밖이지만 전체 160KB 안)
- CHANGELOG `0.3.1 — 미게시` 의 바뀐 동작: 내부 클래스 이름 변경 — 앱 CSS 가 옛 이름을 덮어쓰고 있었다면 `ds-` 이름으로

## 3. 검증

`npm_config_offline=true pnpm verify`, `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify`.
하네스는 이름을 따라 고치기만 하라(위치·동작 단정은 그대로). 실행은 내가 한다(`pnpm qa --build` 전체).

## 4. 하지 마라

- `data-slot` 이름 변경, Tailwind 유틸리티 접두어화·preflight 제거, 공개 API 변경, 버전 범프

## 5. 보고할 것

1. 바꾼 파일 2. 이름 대응표(37개) 3. 하네스에서 고친 선택자 목록 4. 문서·원칙 문장(인용) 5. verify·MCP 결과 6. CHANGELOG
