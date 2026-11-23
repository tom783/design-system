# R42 · 세그먼트 컨트롤

## 공개 API와 구조

`SegmentedControl` 하나와 `SegmentedControlProps`·`SegmentedControlOption` 타입을 공개한다.
`options`는 `readonly { value: string; label: string; icon?: ReactNode; disabled?: boolean }[]`다.
`value`·`onValueChange` 제어형, `defaultValue` 비제어형, `size: 'sm' | 'md'`(기본 md),
`fullWidth`·`iconOnly`·그룹 `disabled`를 지원한다. 그룹에는 `aria-label` 또는
보이는 제목을 가리키는 `aria-labelledby`가 필수이며 항목 label은 아이콘 전용에서도 필수다.

균일한 보기·기간 선택은 options 배열로 충분하다. 항목 부품을 별도 공개하는 방식보다
조립 코드·컨텍스트·카탈로그 항목 수가 적다. 아이콘 슬롯은 ReactNode여서 앱 아이콘을 그대로 쓴다.
항목 value의 고유성·비어 있지 않은 라벨은 소비자 계약이다. 아이콘 전용에는 icon을 함께 준다.

숨긴 폼 입력 없이 네이티브 `type=button`을 `radio`로 표현한다. 선택값은 해제하지 않는다.
값이 없거나 선택 항목이 제거되면 첫 활성 항목을 표시하고 외부 상태를 바꾸지는 않는다.
Tab 진입은 선택 항목 하나이며 선택값이 disabled면 첫 활성 항목이다. 전부 비활성이면 정지점이 없다.
화살표는 비활성을 건너뛰며 순환·즉시 선택하고 Home·End는 처음·끝이다. 좌우는 RTL을 따른다.
선택은 바탕·1px 경계·굵기 600/400으로 구별하고 평면 요소에 그림자를 쓰지 않는다.

Tabs는 패널, RadioGroup은 제출할 폼 값, SegmentedControl은 같은 화면의 보기·필터 단위 전환이다.
이 갈림길은 DESIGN 입력 절과 MCP dont·related에 양방향으로 반영했다.

## 좁은 폭: 측정과 결정

공통 `docs/qa/browser.mjs`로 폭 계측을 시도했으나 macOS headless-shell의
`FATAL:content/browser/sandbox_parameters_mac.mm:87 ... Input/output error (5)`와 CDP 연결 실패로
렌더 계측은 불가능했다. GUI Chrome·샌드박스 해제로 우회하지 않았다.
재현 코드는 `docs/qa/measure/r42-segmented-measure.mjs`다. 전체 상호작용 하네스는 실행하지 않았다.

대체 측정은 저장소 PretendardVariable.ttf를 CoreText에 등록한 14px/400·600 글꼴 폭이다.
`docs/qa/measure/r42-segmented-measure.swift`로 재현하며 `.qa-shots/r42-measurement/coretext.txt`에 기록했다.
브라우저 레이아웃 실측이나 키보드 통과를 뜻하지 않는다.

| 항목 | 400 | 600 |
|---|---:|---:|
| 일·주·월 각 라벨 | 12.100px | 12.100px |
| 일별/주별/월별 매출 현황 각 라벨 | 79.625px | 79.256px |

3항목의 바깥 2px 여백·2px 간격·항목 좌우 12px 여백·1px 경계를 뺀 산술이다.

| 컨테이너 폭 | 항목 폭 | 글 영역 |
|---|---:|---:|
| 320px | 104px | 78px |
| 240px | 77.333px | 51.333px |
| 180px | 57.333px | 31.333px |
| 120px | 37.333px | 11.333px |

긴 라벨을 축약 없이 3개 표시하려면 `ceil(3 × (79.625 + 26) + 8) = 325px`가 필요하다.
180px 폭의 스크롤 방식은 적어도 약 145px의 내부 이동을 요구하며 일부 선택지가 보이지 않는다.
짧고 서로 비교하는 옵션을 계속 보여주기 위해 **한 줄 말줄임**을 택했다.
flex 항목과 라벨에 min-width:0을 주고 전체값은 DOM·aria-label·title에 남긴다.
fullWidth는 같은 폭으로 채운다. 너무 많은 항목은 각 라벨이 사라지므로 적은 보기·단위에 사용한다.
높이는 그룹 바깥 기준 기존 control-h-sm 32px·control-h-md 38px다.
실제 문서·그룹 가로 넘침 0은 작성한 하네스의 120·180·240·320px 검사로 확인하도록 남겼다.

## MCP 응답 예산

전체 매니페스트는 어떤 응답으로도 한 번에 전송되지 않아 160KB 저장 상한을 제거했다.
사용자 제공 R41 기준은 전체 154,853B·토큰 67,002B·규칙 4,141B다.
이번 생성기와 stdio 클라이언트가 재는 단위는 실제 compact UTF-8 JSON 응답 본문이다.
`get_rules`는 `{ rules: ... }` 래퍼까지 포함해 현재 4,151B다.

| 응답 | R42 실측 | 운영 예산 | 회귀 상한(여유) |
|---|---:|---:|---:|
| design://components | 86,203B | 90,000B | 86,500B (+297) |
| list_components | 19,506B | 24,000B | 19,750B (+244) |
| get_component 최대(DataTable) | 4,576B | 6,000B | 4,800B (+224) |
| design://tokens | 67,002B | 80,000B | 운영 예산 |
| get_rules 전체 | 4,151B | 8,000B | 운영 예산 |

다섯 예산의 정확한 경계·+1B, 한글 UTF-8 초과, 전체 저장 크기와 응답 예산의 독립성을 단위 검사한다.
검색어 여섯 개와 Tabs·RadioGroup 양방향 갈림길도 stdio MCP 클라이언트에서 확인한다.

## 파일과 검증 책임

신규 파일:

- `packages/ui/src/components/segmented-control/segmented-control.tsx`
- `packages/ui/src/components/segmented-control/segmented-control.css`
- `packages/ui/src/components/segmented-control/segmented-control.typecheck.ts`
- `packages/ui/src/components/segmented-control/index.ts`
- `packages/ui/src/stories/segmented-control.stories.tsx`
- `packages/ui/docs/examples/segmented-control.tsx`
- `docs/qa/segmented-control-render-verify.mjs`
- `docs/qa/measure/r42-segmented-measure.mjs`
- `docs/qa/measure/r42-segmented-measure.swift`
- `docs/qa/r42-segmented-control.md`

수정 파일:

- `packages/ui/src/index.ts`·`packages/ui/src/components.css` — 공개 export·CSS 단일 목록
- `docs/research/component-intent.mjs`·`docs/research/mcp-build.mjs` — 의도·응답 예산
- `packages/mcp/manifest.json` — 생성기로 재생성
- `packages/mcp/build.test.mjs`·`packages/mcp/match.test.mjs`·`packages/mcp/server.test.mjs` — 예산·검색·직렬화 회귀
- `docs/qa/mcp-client-verify.mjs`·`docs/qa/run-all.mjs` — 실제 응답 검사·작성 전용 하네스 등록
- `DESIGN.md`·`packages/mcp/README.md`·`CHANGELOG.md` — 입력 갈림길·설계·예산 근거·미게시 변경 기록

검증 결과는 아래에 기록한다. 신규 브라우저 하네스는 작성·문법 검사만 하며 실행하지 않는다.
색 토큰·다중 선택·버전 변경·커밋·푸시는 하지 않는다.


실행 결과:

- `npm_config_offline=true pnpm verify` 통과: 토큰 재생성·검증, MCP 생성·예산, 타입 검사, 단위 333/333, Storybook 빌드.
- `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify` 통과: 103/103, 콘솔 프로토콜 오염 0·서버 stderr 0.
- 신규 하네스 `node --check` 통과. `git diff --check` 통과.
- CoreText 사전 폭 측정 완료. headless-shell 렌더 측정은 환경 오류로 실패했고 실제 키보드·대비·넘침 검증은 실행하지 않았다.
- Storybook 빌드는 Vite의 500KB 초과 청크 안내를 출력했으나 성공했다.
