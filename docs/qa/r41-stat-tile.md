# R41 · KPI 지표 타일

StatTile을 추가했다. 버전은 유지하며 단일 지표는 StatTile, 목표 달성 비교는 BulletRow,
시간 추세는 TrendBand로 안내한다. Card의 수동 KPI 스토리도 StatTile 예시로 교체했다.

## 공개 API와 해석

공개 export는 `StatTile`, `StatTileProps`다. HTML 속성·className을 전달하며 data-slot을 유지한다.

| 속성 | 계약·기본값 |
|---|---|
| label | 필수 문자열 |
| value | 문자열 또는 숫자. 로딩·오류에서는 생략 가능. idle에서 누락·NaN·Infinity는 오류 |
| format | Intl.NumberFormatOptions. ko-KR 숫자 서식. 통화·비율·정밀도·notation을 지정할 수 있다 |
| unit | 숫자/문자열 뒤 단위, 기본 빈 문자열 |
| compactValue | 문자열 원문 대신 표시할 짧은 값. 원문은 접근성 이름·title에 보존 |
| delta | 부호 있는 숫자. 생략하면 증감 줄 없음 |
| deltaFormat | percent(기본) 또는 absolute. percent에서 12는 12% |
| deltaUnit | absolute의 뒤 단위. 건·원·%p 등 |
| deltaLabel | 전일 대비·전월 대비 등 비교 기준 |
| goodDirection | up(기본)·down·none. 실제 방향과 평가를 분리 |
| state | idle(기본)·loading·error |
| errorMessage / onRetry | 기존 ErrorState의 오류 문장과 재시도 |
| href / asChild | 상세 링크 또는 단일 자식 라우터 링크. 상태 화면에서는 이동을 제공하지 않음 |

이름은 제안된 StatTile을 유지했다. 명세에서 format의 타입은 지정하지 않았으므로
표준 Intl 옵션으로 해석했다. 문자열은 숫자·통화를 추측해 파싱하지 않고 compactValue를
앱이 제공한다. 모든 값을 축약할 수 있는 것은 아니므로 명시적으로 긴 표기나 극단적인 숫자를
선택한 경우에는 한 줄 가로 스크롤로 보존한다. 말줄임으로 잘라내지 않는다.

접근성 이름은 “오늘 주문 1,284건, 전일 대비 12% 증가”다. 값·증감의 시각적 중복 낭독을
막고 타일의 group/link 이름에 한 문장으로 보존한다. 실패·로딩 중에는 이전 값·증감을 읽지 않는다.
재시도 버튼을 링크에 중첩하지 않으며 정상 링크 라벨은 밑줄과 키보드 포커스 링을 갖는다.

## 글자 크기와 축약 계측

기존 KPI용 title 토큰 **24px/32px·600·tabular-nums**를 사용한다. 200px 타일의 내용 폭은
경계 2px·좌우 여백 32px를 뺀 **166px**다. title-lg 29px도 비교했다.

2026-11-22 macOS CoreText에 저장소 PretendardVariable.ttf를 등록하고 wght=600·tnum을
명시해 실제 글꼴 폭을 계측했다. 자간 적용 전 폭이므로 음수 자간을 쓰는 실제 스타일보다
보수적인 값이다. **브라우저 레이아웃 측정은 아니다.**

| 문자열 | 24px | 29px |
|---|---:|---:|
| 1,284건 / 9,999건 | 88.83px | 107.33px |
| 1,284,000,000원 | 194.23px | 234.69px |
| 128.4만건 | 109.57px | 132.40px |
| 12.8억원 | 94.18px | 113.81px |
| -9,999건 | 99.47px | 120.19px |

24px는 기존 토큰의 KPI 용도와 맞고 좁은 타일의 단위·수치 공간을 확보한다. 그래도 긴
원문은 넘치므로 숫자는 **절댓값 1만 이상부터 만·억·조, 소수 첫째 자리**로 축약한다.
`1,284,000 → 128.4만`, `1,284,000,000원 → 12.8억원`이다. 실제 폭에 따라 표기를
교체하지 않아 서버 HTML·좁은 타일·넓은 타일에서 동일하게 읽힌다. 전체값은 따로 보존한다.

재현: 저장소 루트에서 추가 설치 없이 실행한다.

```sh
swift -module-cache-path .qa-shots/r41-measurement/module-cache docs/qa/r41-stat-tile-measure.swift
```

## 색·대비 계산

생성된 tokens.json의 sRGB 값으로 WCAG 상대휘도 공식을 적용해 계산했다. 판정에는 반올림한
값을 사용하지 않았다. CSS는 이 의미 토큰을 직접 쓰며 새 색·브랜드 증감색은 없다.

| 테마·바탕 | 좋음 success | 나쁨 danger | 0·판단 없음 neutral |
|---|---|---|---|
| 라이트 #FFFFFF | #23763D · **5.62969:1** | #B42800 · **6.47314:1** | #534C4B · **8.38934:1** |
| 다크 #1A1817 | #79C389 · **8.40834:1** | #FF896E · **7.62916:1** | #E1DCDB · **13.02642:1** |

방향은 ArrowUp/ArrowDown/Minus, 숫자는 +/−/0으로 함께 전달한다. 반품률 -0.4%p는
down·success지만 아래 화살표·음수 부호·“감소” 문장을 유지한다. goodDirection=none은
방향을 유지하면서 중립색을 쓴다. 0·-0은 항상 Minus·중립·“변동 없음”이다.

## 문서·MCP·스토리

규칙은 component-intent → 생성 manifest → Storybook 문서로 이어진다. 별도 MDX에
복제하지 않았다. 4개 그리드는 `repeat(auto-fit, minmax(min(100%, 200px), 1fr))`, gap 16px다.
200px보다 작은 컨테이너까지 그리드 자체가 넘치지 않도록 min(100%, 200px)를 쓴다.

스토리: 깨끗한 독립 파일을 보여주는 사용법(Primary), 기본 4개, 증감 9조합, 반품률,
긴 값·문자열·통화, 200px 폭, 로딩·오류·재시도·NaN, href/asChild 링크, 다크.
기존 Card의 수동 KPI 예시도 동일한 공개 부품으로 조립한다.

KPI·지표·대시보드 숫자·요약 수치·증감·전일 대비의 첫 후보는 StatTile이다. BulletRow는
`KPI 목표` 키워드와 dont/related 갈림길을 제공한다. 과거 고정 질의 439개 중 이 작업이
추가로 허용한 변화는 `KPI: BulletRow → StatTile` 하나이며 나머지 기대 순위는 보존했다.
기준선 파일을 통째로 재생성하지 않고 해당 의도 변경과 신규 목록 항목만 명시했다.

| MCP 전송 항목 | 실측 바이트 | 회귀 단정 | 여유 | 전체 예산 |
|---|---:|---:|---:|---:|
| 카탈로그 | 83,668 | 83,900 | 232 | 90,000 |
| 목록 | 19,309 | 19,500 | 191 | 24,000 |
| 최대 상세(DataTable) | 4,576 | 4,800 | 224 | 6,000 |

StatTile 상세는 3,794바이트, 전체 매니페스트 전송은 154,853/160,000바이트다.
회귀 단정의 여유는 모두 300바이트 이하로 맞췄다.

## 실행한 검증과 남긴 검증

- `npm_config_offline=true pnpm verify`: **통과**. 토큰 대비 128건·의미 분리 8건·테마 3상태,
  MCP 생성·경계·타입·단위 **326건**·Storybook 정적 빌드 완료.
- `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify`: **92건 통과**, 실패 0·stderr 0자.
- `node --check docs/qa/stat-tile-render-verify.mjs`, `git diff --check`: 통과.
- CoreText 글꼴 계측, 한국어 축약·원문/서식·NaN/Infinity·반품률 감소·0/-0의 단위 검증을 수행했다.

로그: `.qa-shots/r41-verify.log`, `.qa-shots/r41-mcp-client.log`.
Storybook 빌드에는 기존 대형 청크 안내가 있으며 종료 코드는 0이다.

브라우저 하네스는 요청대로 **작성만** 했다. run-all에 등록했으며 양 테마 9조합의
방향·아이콘·부호·토큰 색·실제 계산 스타일 대비, 접근성 트리의 문장, 200px 값 잘림·실제
고정폭 글리프, 900/500/190px 그리드 줄바꿈, 로딩·오류·재시도, 실제 Tab 포커스 링,
다크·Primary·전체 콘솔 오류 0을 검사한다. 실행 통과나 브라우저 실측을 주장하지 않는다.
이후 브라우저 검증은 저장소 루트에서 `pnpm qa`를 실행하면 된다.

## 만든/고친 파일

| 구분 | 파일 |
|---|---|
| 추가: 구현·서식·단위 | packages/ui/src/components/stat-tile/stat-tile.tsx · stat-tile.css · format.ts · format.test.mjs |
| 추가: 스토리·독립 예시 | packages/ui/src/stories/stat-tile.stories.tsx · packages/ui/docs/examples/stat-tile.tsx |
| 추가: 하네스·계측·보고 | docs/qa/stat-tile-render-verify.mjs · docs/qa/r41-stat-tile-measure.swift · docs/qa/r41-stat-tile.md |
| 수정: 공개 진입점·CSS·기존 조립 | packages/ui/src/index.ts · packages/ui/src/components.css · packages/ui/src/stories/card.stories.tsx |
| 수정: 규칙·변경 기록 | DESIGN.md · CHANGELOG.md · docs/research/component-intent.mjs |
| 수정: MCP 생성물·회귀 | packages/mcp/manifest.json · packages/mcp/build.test.mjs · packages/mcp/match.test.mjs · packages/mcp/server.test.mjs |
| 수정: QA 연결·실제 MCP·검색 기대값 | docs/qa/run-all.mjs · docs/qa/mcp-client-verify.mjs · docs/qa/r38-match-compare.mjs |

CHANGELOG의 0.3.1 미게시 추가 항목에 R41을 기록했다. 버전 범프·새 색 토큰·스파크라인·
내장 차트·독립 그리드 부품·전역 설치·커밋·푸시는 하지 않았다. 토큰 산출물은 verify에서
정상 재생성됐고 차이는 없으며, 작업 트리는 더티 상태로 남겼다.
