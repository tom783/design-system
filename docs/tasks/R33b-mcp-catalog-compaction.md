# R33b · MCP 카탈로그 무손실 압축 — P1 부품을 넣을 자리

근거: R33 후 `design://components` 전송량 **70,643 / 80,000바이트**. P1(R34–R37)이 부품 6개(하위 부품 포함 약 20개 export)를
더하면 Dialog 계열 실측(본체 1.1K · 하위 부품 210–240바이트)으로 추산해 약 11KB가 늘어 R36 즈음 예산을 넘는다.
예산을 올리지 않고 **이미 있는 압축 구조(`derived` + `restoreComponent`)에 규칙 셋을 더한다.** 버전은 올리지 마라.

---

## 0. 내가 측정한 것 (현재 매니페스트 기준, 예외 없음)

| 후보 | 절감 | 예외 |
|---|---|---|
| 하위 부품(`partOf` 있음)의 `source` 가 부모와 같다 → 생략 | 2,478 | 55개 모두 같음 — 다르면 남긴다 |
| 빈 배열 `props`·`extends`·`slots` → 생략 | 약 1,000 | `rules` 빈 배열 2건은 건드리지 마라(키 순서·이득 없음) |
| 규칙 `source` 의 `"DESIGN.md "` 접두어 → `derived` 로 | 1,000 | 100건 모두 이 접두어 |

## 1. 할 일

- `docs/research/mcp-build.mjs` `compactCatalog` 에 위 세 규칙을 더하고, `packages/mcp/catalog.mjs` `restoreComponent` 가 복원한다.
  하위 부품 source 복원에는 부모가 필요하다 — 시그니처를 바꾸면 호출처(`server.mjs` 2곳, 테스트)를 함께 고쳐라
- `derived.description` 에 새 규칙을 **소비자가 스스로 복원할 수 있게** 한 문장씩 더한다(리소스만 읽는 클라이언트가 있다)
- 지금의 자기 검증(복원 결과 === 원본, 아니면 빌드 실패)을 그대로 통과해야 한다. 예외(부모와 source 가 다른 하위 부품,
  접두어 없는 규칙 출처)가 생기면 생략하지 않고 남긴다 — 그 경우를 단위 테스트로
- 크기 단정: `build.test.mjs`·`server.test.mjs` 의 `< 71_000` 을 새 실측 + 여유 300 이하로 내리고 주석에 전후 바이트

## 2. 바뀌면 안 되는 것

- `get_component`·`list_components`·`which_component` 응답(복원된 값). 기준선:
  `node docs/qa/compare-guidance-baseline.mjs` 가 **차이 0** 이어야 한다. 기준선 파일을 다시 쓰지 마라
- 공식 예산 80KB·160KB, 리소스 3개, 도구 목록

## 3. 검증

`npm_config_offline=true pnpm verify`, `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify`,
`node docs/qa/compare-guidance-baseline.mjs`.

## 4. 보고할 것

1. 바꾼 파일 2. 전후 바이트 3. 복원 코드(인용) 4. 기준선 비교 결과 5. CHANGELOG(내부 변경 한 줄)
