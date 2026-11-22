# R41 · KPI 지표 타일 — 값 + 증감

근거: `docs/research/ui-coverage-review.md` P2. 네 제품 모두 대시보드 맨 위에 "오늘 주문 1,284건 ▲12% 전일 대비" 같은 단일 수치 타일을
둔다. 도그푸딩 5 에서 AI 는 "대시보드" 를 빈 안내 화면으로 남겼다. BulletRow(목표 대비)·TrendBand(추세)는 있지만 단일 수치 타일이 없다.
0.3.1 후보. **버전은 올리지 마라.**

---

## 1. 부품 (이름은 제안 — 바꾸면 이유를 보고)

`StatTile`: `label` · `value`(문자열 또는 숫자 + `format`) · 선택 `delta`(숫자, 비율 또는 절대) · `deltaLabel`("전일 대비") ·
`goodDirection: 'up' | 'down' | 'none'`(기본 up — 반품률·이탈률은 down) · `state`(loading·error, 기존 상태 부품 규칙과 같게) · 선택 `href`/`asChild`(상세로 이동)

- 값: 고정폭 숫자, 큰 글자(토큰에서 고른다 — 근거와 함께). 긴 값·좁은 타일에서 잘림 대신 줄이 아닌 **축약 규칙**이 필요한지 측정해서
  정해라(예: 1,284,000 → 128.4만). 한국어 단위
- 증감: **색만으로 말하지 않는다** — 방향 아이콘(▲▼ 또는 lucide) + 부호 있는 수치 + 색. 좋음/나쁨은 `goodDirection` 으로 정하고 색은
  success/danger 상태 토큰(브랜드 크림슨 #D33E58 을 쓰지 마라 — 에러 레드와 색상각만으로는 ΔE 5 미만이라 구분되지 않는다, R01). 0 이면 중립
- 접근성: 타일의 접근성 이름에 "라벨, 값, 증감 방향과 크기, 비교 기준" 이 한 문장으로("오늘 주문 1,284건, 전일 대비 12% 증가")
- 배치: 여러 타일을 놓는 그리드 규칙 — 별도 부품 없이 문서·MCP 규칙으로(예: `grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))`, gap 16)
- 스파크라인은 범위 밖(필요하면 TrendBand). 카드 테두리·바탕은 Card 와 같은 시각 언어

## 2. 문서·MCP·스토리

- DESIGN 차트·대시보드 절에 "지표 타일" — 언제 타일·언제 BulletRow·언제 TrendBand
- MCP intent + keywords("KPI", "지표", "대시보드 숫자", "요약 수치", "증감", "전일 대비"). BulletRow 의 KPI 키워드와 갈림길을 dont/related 로
- 스토리: 기본 4개 그리드 · 증가·감소·0 · goodDirection down(반품률) · 긴 값 · 로딩·오류 · 링크 타일 · 좁은 폭 · 다크. Primary 깨끗하게
- MCP 크기: 상한 회귀 단정을 실측 + 여유 300 이하로. 카탈로그 90KB·목록 24KB·상세 6KB 안

## 3. 검증

`npm_config_offline=true pnpm verify`, `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify`.
하네스(작성만): 증감 색·아이콘·부호가 goodDirection 에 맞다(라이트·다크, 대비 4.5:1 이상) · 0 은 중립 · 접근성 이름 문장 ·
고정폭 숫자 · 200px 폭에서 값 잘림 없음 · 그리드 규칙대로 4개가 줄바꿈 · 로딩·오류 · 링크 타일 포커스 링 · 콘솔 오류 0.

## 4. 하지 마라

- 스파크라인·차트 내장, 브랜드 색 증감, 새 색 토큰, 버전 범프

## 5. 보고할 것

1. 바꾼 파일 2. 공개 API 3. 값 글자 크기·축약 결정 근거 4. 색·대비 실측 5. verify·MCP 결과 6. CHANGELOG
