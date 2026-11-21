# R35 · 페이지네이션

근거: `docs/research/ui-coverage-review.md` P1 3번. DataTable 은 가상화·무한 스크롤만 있다. B2B 목록(주문·출고·게시글)은
서버 페이징 — 페이지 이동 · 페이지 크기 · 전체 건수가 표준이다. 0.3.1 후보. **버전은 올리지 마라.**

---

## 0. 전제

- DataTable 은 이미 `totalCount` 를 받고, 전체 선택 시 "로드된 N건이 선택됨 · 전체 M건" 을 알린다(`aria-rowcount=totalCount`).
  페이지 단위 데이터와 그대로 맞물린다
- **R29 결정(사용자): data 에서 빠진 행은 선택이 자동 해제된다.** 페이지를 넘기면 data 가 바뀌므로 선택은 해제된다.
  이것은 의도다 — "보이는 것만 처리한다". 여러 페이지 일괄 처리는 서버 쪽 "조건 전체 선택"으로 설계하라고 안내한다

## 1. Pagination 컴포넌트

- 제어형: `page`(1부터) · `pageSize` · `totalCount` · `onPageChange` · (선택) `pageSizeOptions` + `onPageSizeChange` · `disabled`(로딩 중)
- 보이는 것: 범위 문구 "1–50 / 1,234건"(고정폭 숫자) · 페이지 크기 Select("50개씩", 옵션 있을 때만) · 이전·다음 ·
  페이지 번호(처음 · … · 현재±1 · … · 끝). 현재는 `aria-current="page"`, 처음/끝에서 이전/다음 비활성
- `nav` 랜드마크(aria-label "페이지 이동"). 페이지가 바뀌면 범위 문구를 polite 로 알린다. 포커스는 누른 버튼에 남는다
  (버튼이 사라지는 경우엔 가까운 버튼으로 — 측정해서 정해라)
- 좁은 폭(예: 640px 미만)에서는 번호 대신 "4 / 25" 와 이전·다음만. 가로 넘침 없음
- 전체 0건이면 렌더하지 않는다(EmptyState 가 대신 말한다). 1페이지뿐이면 범위 문구만
- 버튼은 기존 Button(ghost·sm 등)·Select 를 재사용한다. 새 시각 언어를 만들지 마라

## 2. DataTable 과의 조립

- 별도 컴포넌트로 표 아래에 둔다(DataTable 에 페이지 상태를 넣지 마라). 사용법 예시는 서버 페이징 흉내(가짜 지연·loading 상태)
- 페이지 크기를 바꾸면 1페이지로 — 규칙에 적어라
- 페이지 전환 중 DataTable `state="loading"` 이면 선택이 유지된다(R29) — 새 data 가 오면 해제된다. 이 흐름을 스토리로

## 3. 문서·MCP·스토리

- DESIGN 표 절에 "페이지네이션" 단락: 서버 페이징 기본, 무한 스크롤·가상화와 언제 무엇을, 선택 해제와의 관계
- MCP: Pagination intent(소비자 말), DataTable 규칙에 "페이지를 넘기면 선택이 해제된다" 한 줄, keywords("페이지", "페이징",
  "페이지 이동", "페이지 크기", "몇 개씩")
- 스토리: 기본·많은 페이지(…)·페이지 크기·1페이지·로딩 중·좁은 폭, DataTable 조립. Primary 는 깨끗한 예시 파일(R26b)
- MCP 크기: `build.test.mjs`·`server.test.mjs` 의 카탈로그 상한(R33b 후 `< 66_800`)은 새 실측 + 여유 300 이하로 올리고
  주석에 전후 바이트를 적는다. 공식 예산 80KB 를 넘게 되면 지침을 줄이지 말고 멈춰서 보고하라

## 4. 검증

`npm_config_offline=true pnpm verify`, `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify`.

하네스 (작성만): 번호 목록이 경계에서 맞다(1·2·3…25 / 1…11 12 13…25 / 1…23 24 25), 현재 `aria-current`, 이전·다음 비활성 조건,
범위 문구, 페이지 크기 변경 시 1페이지, 범위 문구 polite 알림, 포커스 위치, 좁은 폭 표시·가로 넘침 없음,
DataTable 조립에서 페이지 이동 시 선택 해제·loading 중 유지, 콘솔 오류 0.

## 5. 하지 마라

- DataTable 내부에 페이지 상태 추가, URL 동기화(앱 몫 — 규칙에 적어라), 버전 범프

## 6. 보고할 것

1. 바꾼 파일 2. 공개 API 3. 번호 접기 알고리즘(코드 인용) 4. 포커스 처리 결정과 근거 5. verify·MCP 결과 6. CHANGELOG
