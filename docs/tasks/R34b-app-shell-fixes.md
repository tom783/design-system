# R34b · 앱 셸 보정 — 실물을 보고 찾은 5건

R34 하네스 20/20 통과 후 라이트·다크·900px 스크린샷과 계산 스타일로 확인했다. 버전은 올리지 마라.

| # | 실측 | 고칠 것 |
|---|---|---|
| 1 | 링크·비활성 항목·배지·라벨·h1 에 `title` 이 있다. 접힌 레일에서 아이콘에 호버하면 우리 Tooltip 과 **브라우저 기본 툴팁이 이중으로** 뜬다(하네스는 Tooltip 만 봐서 못 잡는다). h1 은 줄바꿈되므로 `title` 이 필요 없다 | 셸 세 컴포넌트에서 `title` 속성 전부 제거. 긴 라벨은 말줄임 + 접근성 이름(글자 내용)으로 충분하다 |
| 2 | "준비 중" 항목 글자색 `--text-secondary`(라이트 #534c4b) — 일반 항목 #262222 와 거의 같아 **비활성으로 안 읽힌다** | 아이콘·라벨·"준비 중" 모두 `--text-disabled`. DS 관례와 같다(Collapsible·Carousel·Input 액션 버튼 비활성) |
| 3 | 1024px 미만에서 접기 버튼이 **비활성 상태로 보인다** — 눌러도 아무 일도 없는 버튼 | 1024px 미만에서는 접기 버튼을 숨긴다(CSS 미디어 쿼리 — 서버 첫 페인트부터). 서랍 연결은 R36 |
| 4 | 사용법(Primary) 예시가 `style={{ height }}`·`height = 640` 을 노출 — 소비자가 복사하면 셸이 640px 로 고정된다(R26b 위반) | 예시에서 높이 prop·style 제거. AppShell 기본 `100dvh` 그대로 쓴다 |
| 5 | Storybook 데코레이터의 24px 여백 안에 셸이 떠 있다(셸 x=24, y=24). 스토리가 `calc(100dvh - 48px)` 로 상쇄 중 — 실제 앱의 전체 화면 모습이 아니다 | `.storybook/preview.tsx` 데코레이터가 스토리 `parameters.fullBleed === true` 면 여백 0. Screens/AppShell 라이트·다크·긴메뉴와본문, Components/AppShell 사용법이 쓴다. 다른 스토리는 그대로 |

## 하네스 (`docs/qa/app-shell-render-verify.mjs` 갱신 — 실행은 내가 한다)

- 1: 셸 안 `[title]` 0개(펼침·접힘·비활성·PageHeader)
- 2: 비활성 항목 아이콘·라벨·"준비 중" 계산 색 = `--text-disabled` 값, 라이트·다크
- 3: 1023px 에서 접기 버튼 `display: none`, Tab 순서에 없음. 1024px 에서는 보이고 동작(기존 단정 유지)
- 5: 셸 스토리에서 셸 사각형 = 뷰포트(0,0,폭,높이). 좌표를 쓰는 기존 단정은 오프셋만 고치고 기준은 바꾸지 마라

## 검증

`npm_config_offline=true pnpm verify`, `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify`.
Primary 예시 변경은 문서 하네스(`docs-render-verify.mjs`)의 코드 일치 검사에 걸릴 수 있다 — 예시 파일이 진실이다.

## 하지 마라

- 현재 위치 색(`--bg-selected`) 변경 — 사용자 피드백 대상으로 남긴다
- 1024 경계·폭 토큰 변경, 서랍 구현, 버전 범프
