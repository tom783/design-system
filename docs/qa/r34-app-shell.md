# R34 앱 셸 구현·검증 기록

AppShell·SideNav·PageHeader를 추가했다. 패키지는 0.3.0을 유지하며
CHANGELOG의 기존 `0.3.1 — 미게시` 추가 항목에 기록했다.

## 공개 API

| 컴포넌트 | 자체 props | 상속 |
|---|---|---|
| AppShell | `sidebar: ReactNode`·`children: ReactNode` 필수, `header?: ReactNode`, `contentMaxWidth?: CSSProperties['maxWidth']` | `HTMLAttributes<HTMLDivElement>` |
| SideNav | `brand: ReactNode`·`brandIcon: ReactNode` 필수, `collapsed?: boolean`, `defaultCollapsed?: boolean`(기본 false), `onCollapsedChange?: (collapsed: boolean) => void` | `HTMLAttributes<HTMLElement>` — children·aria-label·className·style 등 |
| PageHeader | `title: string` 필수, `description?`·`breadcrumb?`·`status?`·`actions?: ReactNode` | `HTMLAttributes<HTMLElement>`에서 title·children 제외 |

그룹과 링크를 선언적으로 구성하고 라우터 링크를 조합하기 위해 부품 두 개도 공개했다.
요청한 세 루트 컴포넌트 이름은 유지했다.

- `SideNavGroup`: `label: string` 필수, div 속성·children 상속.
- `SideNavItem`: `icon: ReactNode`·`label: string` 필수, `badge?: ReactNode`,
  `current?`·`disabled?`·`asChild?: boolean`(기본 false), a 속성 상속,
  `ref: HTMLAnchorElement`. asChild는 단일 링크에 스타일·이벤트·ref를 합친다.
  비활성일 때는 자식 링크와 이벤트를 렌더하지 않는다.

AppShell은 건너뛰기 링크·main·선택 상단 header·반응형 상태를 소유한다.
SideNav의 접힘 저장·복원과 실제 이동은 앱이 맡는다. PageHeader가 h1을 제공한다.

## 1024px 미만 전환과 치수 근거

CSS와 상태 판정 모두 `(width < 1024px)`를 사용한다. CSS가 서버 HTML의 첫 페인트부터
64px 레일과 라벨 숨김을 적용하고, 상태 판정은 Tooltip과 접기 버튼에 같은 상태를 전달한다.
자동 전환은 사용자 collapsed 값이나 변경 콜백을 건드리지 않는다.
1024px 이상으로 돌아오면 제어·비제어 모두 기존 선택을 다시 보여준다.

240px·64px는 경계를 포함한 폭이며 생성기의 sizing 토큰으로 관리한다.
본문 여백은 기존 24px·16px 토큰이다. 1023px에서 펼침·24px 여백을 유지한다면
본문 735px, 레일·16px 여백이면 927px로 계산된다. **산술 근거이며 브라우저 실측은 아니다.**
PageHeader는 실제 콘텐츠 폭 640px 미만에서 액션을 아래로 옮기는 컨테이너 조건을 쓴다.

## 변경 파일

새 파일:

- `packages/ui/src/components/app-shell/app-shell.tsx`
- `packages/ui/src/components/app-shell/side-nav.tsx`
- `packages/ui/src/components/app-shell/page-header.tsx`
- `packages/ui/src/components/app-shell/app-shell.css`
- `packages/ui/src/components/app-shell/index.ts`
- `packages/ui/docs/examples/app-shell.tsx`
- `packages/ui/docs/examples/side-nav.tsx`
- `packages/ui/docs/examples/page-header.tsx`
- `packages/ui/src/stories/app-shell.stories.tsx`
- `packages/ui/src/stories/side-nav.stories.tsx`
- `packages/ui/src/stories/page-header.stories.tsx`
- `packages/ui/src/stories/app-shell-screen.stories.tsx`
- `docs/qa/app-shell-render-verify.mjs`
- `docs/qa/r34-app-shell.md`

수정 파일:

- `packages/ui/src/index.ts`·`packages/ui/src/components.css` — 공개 export·CSS 단일 진입점.
- `docs/research/component-intent.mjs` — 세 루트 의도·검색어·소비자 규칙과 부품 관계.
- `docs/research/tokens-build.mjs` — 사이드 메뉴 폭 2개.
- `docs/research/tokens.json`·`packages/tokens/tokens.json`·`packages/tokens/tokens.css` — 생성 산출물.
- `packages/mcp/manifest.json` — 소스·의도에서 재생성.
- `packages/mcp/build.test.mjs`·`packages/mcp/server.test.mjs` — 실측 크기 상한·신규 목록.
- `packages/mcp/match.test.mjs`·`docs/qa/mcp-client-verify.mjs` — 한국어 검색·공개 API 계약.
- `docs/qa/docs-render-verify.mjs` — 세 Primary 코드 검사 등록.
- `docs/qa/run-all.mjs` — 새 브라우저 하네스 등록.
- `DESIGN.md` — §24 레이아웃·앱 셸 결정과 이유.
- `CHANGELOG.md` — 미게시 추가 항목.

## 실행한 검증

- `npm_config_offline=true pnpm verify`: 종료 코드 0.
  대비 128건·의미 분리 8건·테마 3상태·MCP 검증 8종·타입·단위 287건·Storybook 빌드 통과.
- `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify`: 54건 통과, 실패 0, stderr 0자.
- `node --check docs/qa/app-shell-render-verify.mjs`: 문법 통과.
- 정적 Storybook 인덱스에서 새 문서·스토리 ID 확인.
- `git diff --check`: 통과.

MCP 카탈로그는 **66,507 → 72,073바이트**, 전체 매니페스트는 143,079바이트다.
공식 80,000/160,000바이트 예산 안이다. 두 크기 회귀 검사의 상한을 `< 72_300`으로
갱신해 실측 대비 227바이트만 남겼다. 소비자 규칙의 금지어·120자 검사를 통과했다.

## 실측 대기·기존 단정의 영향

브라우저 하네스는 요청대로 **작성만** 했다. 픽셀·포커스·Tooltip·콘솔 오류 0건을
브라우저에서 통과했다고 주장하지 않는다. 새 하네스는 240/64px·1024/1023px 경계,
접힘 복원·제어형, 호버·포커스 Tooltip, 라이트·다크 현재 위치, 첫 Tab·Enter,
비활성 클릭·포커스·Tab 제외, h1·좁은 액션 배치·가로 넘침, 독립 스크롤을 검사한다.

기존 Screens 스토리는 바꾸지 않았다. 기존 위치 단정은 유지된다. 새 셸을 적용하는
소비자 화면에서는 본문 원점이 메뉴 폭+본문 여백만큼 이동하고 스크롤 주체가 main으로
바뀐다. 기존 document/window 기준 좌표·scrollTop 단정을 새 화면에 복사하면 맞지 않는다.
PageHeader가 h1을 제공하므로 기존 페이지의 main·제목을 중복해서 넣으면 안 된다.
카탈로그 개수·전체 목록·바이트 단정은 신규 공개 export 5개에 맞춰 갱신했다.

사용자 브라우저 확인 순서:

1. 저장소 루트에서 `pnpm qa`를 실행한다. 정적 서버와 브라우저는 공통 하네스가 관리한다.
2. 새 하네스 결과는 `.qa-shots/app-shell-render-verify/`에서 확인한다.
3. 화면 피드백은 `pnpm storybook` 실행 후 Storybook의 `Screens/AppShell` 라이트·다크와
   `Components/SideNav`·`Components/PageHeader`에서 확인한다.

화면 밖 서랍·전역 검색 동작·사용자 메뉴 동작·라우팅 의존성·버전 변경·커밋·푸시는 수행하지 않았다.
