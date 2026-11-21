# R35 · 페이지네이션

Pagination은 서버 페이징 상태를 앱이 소유하는 별도 내비게이션이다. DataTable 구현과 패키지 버전은 변경하지 않았다.
표 아래에 현재 페이지·크기·전체 건수를 연결하며, 크기 변경은 새 크기와 1페이지를 한 조회에 반영한다.
URL 동기화는 앱이 맡는다. Primary는 `packages/ui/docs/examples/pagination.tsx`의 독립 예시다.
서버 페이징 조립은 같은 디렉터리의 `pagination-table.tsx`에 있으며 800ms 지연과 기존 선택 정책을 보여준다.

## 번호 접기

`page-items.ts`는 처음·끝과 현재±1을 남긴다. 시작·끝에서는 세 번호를 유지하고, 한 번호만 빠지는 틈은
그 번호로 채우며 긴 틈만 생략표로 바꾼다. 전체 페이지 수에 비례하는 배열을 만들지 않는다.

```ts
const start = Math.max(1, Math.min(page - 1, count - 2));
const end = Math.min(count, Math.max(page + 1, 3));
const visible = new Set([1, count]);
for (let n = start; n <= end; n++) visible.add(n);
```

25페이지 기준 결과는 `1 2 3 … 25`, `1 … 11 12 13 … 25`, `1 … 23 24 25`다.
이 경계·중간·적은 페이지·100만 페이지에 대한 순수 함수 단위 검사를 추가했다.

## 포커스 결정과 측정 한계

- 번호를 key로 삼아 누른 번호의 DOM을 유지한다. 이전·다음 DOM도 고정한다.
- 경계·로딩 비활성은 `aria-disabled`·이벤트 차단·`tabIndex=-1`로 처리한다. 네이티브 disabled로 바뀔 때의
  포커스 유실을 피하려는 선택이며 Button의 기존 비활성 표현을 재사용한다. Select는 기존 disabled를 쓴다.
- 서버의 건수·페이지 변경으로 번호가 사라지면 수치상 가장 가까운 활성 번호로 옮긴다. 동률은 작은 번호다.
  근접한 이동 지점을 남기려는 설계 판단이며 브라우저 좌표 실측 결과는 아니다.
- 실제 폭 640px 미만으로 바뀌어 번호가 숨으면 다음·이전 순으로 활성 버튼을 찾는다.
  한 페이지로 줄면 범위 문구에 포커스를 둔다. 다른 입력으로 이동한 포커스는 빼앗지 않는다.
  복구는 `preventScroll`을 사용한다. 0건으로 nav 자체가 사라지는 결과 포커스는 앱이 맡는다.

2026-11-21 별도 사전 측정을 시도했다. `docs/qa/browser.mjs`의 `launchBrowser()`로만
chrome-headless-shell을 실행했고 포커스 에뮬레이션 경로를 사용했다. 브라우저가 아래 오류로 종료되어
CDP에 연결하지 못했다. 네이티브 disabled·aria-disabled·DOM 제거의 활성 요소 비교는 **측정하지 못했다**.
GUI Chrome이나 `--no-sandbox`로 우회하지 않았다.

```text
CDP 연결 실패 (port 9477)
FATAL:content/browser/sandbox_parameters_mac.mm:87
Check failed: . : Input/output error (5)
```

따라서 포커스 정책은 코드·DOM 수명에 근거한 결정이며 실측 확정은 남아 있다.
작성한 `pagination-render-verify.mjs`는 번호 유지·양 끝 도달·번호 제거·한 페이지로 감소·외부 포커스 유지·
좁은 폭 전환·로딩 전후의 실제 활성 요소와 문서 스크롤을 검사하고 `results.json`의 measurements에 남긴다.

## MCP 예산

기존 R34 카탈로그는 72,073바이트, R35는 **74,697바이트**다. 증가분은 2,624바이트다.
테스트 상한은 `< 74_900`으로 실측보다 203바이트의 여유를 두었다. 공식 상한 80,000바이트를 유지한다.
전체 매니페스트 전송량은 145,703 / 160,000바이트다. 지침 축약이나 예산 우회는 하지 않았다.

## 검증과 후속 실행

새 브라우저 하네스는 요청대로 작성만 하고 `run-all.mjs`에 등록했다. 기존 브라우저 하네스도 실행하지 않았다.
아래 명령으로 전체 브라우저 검증과 포커스 실측을 완료할 수 있다. 전용 headless-shell이 정상 실행되는 환경이 필요하다.

```bash
pnpm qa
```

실행 결과:

- `npm_config_offline=true pnpm verify`: 종료 코드 0. 토큰 생성·대비 검증, MCP 생성·8종 검증,
  타입 검사, 단위 **294/294건**, Storybook 정적 빌드 통과.
- `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify`: **61/61건 통과**, stderr 0자,
  stdout 오염 0건. 페이지네이션 선택 질문 5개·공개 API·DataTable 선택 해제 규칙도 확인했다.
- `node --check docs/qa/pagination-render-verify.mjs`: 문법 통과. 새 하네스는 **18개 검사 묶음**이며 실행하지 않았다.
- `git diff --check`: 통과. 토큰 생성물·패키지 버전·lockfile 변경 없음.

verify 로그는 `.qa-r35-verify.log`, 독립 MCP 로그는 `.qa-shots/mcp-client-verify/r35.log`에 남겼다.
CHANGELOG의 0.3.1 미게시 항목에 공개 API·접근성·서버 페이징 조립을 추가했다. 버전 범프·커밋·푸시는 하지 않았다.

## 공개 API

`@s2life/ui`에서 `Pagination`과 타입 `PaginationProps`를 가져온다.

| 속성 | 타입 | 필수 |
| --- | --- | --- |
| page | number, 1부터 시작 | 예 |
| pageSize | number | 예 |
| totalCount | number | 예 |
| onPageChange | (page: number) => void | 예 |
| pageSizeOptions | readonly number[] | 아니오 |
| onPageSizeChange | (pageSize: number) => void | 아니오 |
| disabled | boolean, 기본 false | 아니오 |

children·onChange를 제외한 nav 속성(className·style·aria-label 등)을 받는다.
페이지 크기 UI는 옵션과 변경 콜백이 함께 있을 때 표시한다. 크기 변경 시 두 콜백이 새 크기, 1페이지 순서로 호출된다.

## 생성·수정 파일 전체

새 파일 10개:

- `packages/ui/src/components/pagination/index.ts`
- `packages/ui/src/components/pagination/pagination.tsx`
- `packages/ui/src/components/pagination/pagination.css`
- `packages/ui/src/components/pagination/page-items.ts`
- `packages/ui/src/components/pagination/page-items.test.mjs`
- `packages/ui/src/stories/pagination.stories.tsx`
- `packages/ui/docs/examples/pagination.tsx`
- `packages/ui/docs/examples/pagination-table.tsx`
- `docs/qa/pagination-render-verify.mjs`
- `docs/qa/r35-pagination.md`

수정 파일 13개:

- `packages/ui/src/index.ts`
- `packages/ui/src/components.css`
- `packages/ui/docs/03-tables.mdx`
- `docs/research/component-intent.mjs`
- `packages/mcp/manifest.json` — 생성기로 재생성
- `packages/mcp/build.test.mjs`
- `packages/mcp/server.test.mjs`
- `packages/mcp/match.test.mjs`
- `docs/qa/mcp-client-verify.mjs`
- `docs/qa/pack-consumer/public-api.tsx`
- `docs/qa/run-all.mjs`
- `DESIGN.md`
- `CHANGELOG.md`
