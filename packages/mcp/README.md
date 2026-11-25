# 디자인 시스템 MCP

읽기 전용 stdio 서버다. 런타임은 Node 내장 모듈과 `manifest.json`만 사용하며 의존성·HTTP·쓰기 도구가 없다.

npm 패키지로 연결하려면 다음 명령을 실행한다.

```sh
claude mcp add s2life -- npx -y @s2life/mcp
```

`npx @s2life/mcp`로 직접 실행할 수도 있다. 아래는 저장소에서 개발할 때의 연결 방법이다.

1. 저장소 루트에서 `pnpm mcp:build`로 매니페스트를 생성한다. 토큰은 기존 `docs/research/tokens.json`을 읽으며 재생성하지 않는다.
2. MCP 클라이언트의 서버 설정에 아래 command와 args를 등록한다. 경로는 해당 저장소의 절대 경로로 바꾼다.
3. 클라이언트에서 연결한 뒤 `which_component`에 작업을 설명하고, `get_component`로 후보의 API·규칙을 확인한다. `search_tokens` → `get_token`, `get_rules`로 필요한 정보만 조회한다.

```json
{
  "mcpServers": {
    "commerce-ds": {
      "command": "node",
      "args": ["/저장소/절대경로/packages/mcp/server.mjs"]
    }
  }
}
```

서버는 자신의 파일 위치를 기준으로 매니페스트를 읽으므로 클라이언트의 작업 디렉터리에 의존하지 않는다. 루트의 `pnpm mcp`는 수동 실행용이다. MCP 연결에는 실행 배너가 stdout에 섞이지 않도록 위처럼 `node`를 직접 지정한다.

프로토콜은 `2025-06-18`, `2025-03-26`, `2024-11-05`를 지원한다. 지원 버전은 요청값을 유지하고 그 외에는 `2025-06-18`을 반환한다. 알림에는 응답하지 않는다. stdout은 JSON-RPC 한 줄 전용이며 진단은 stderr에만 쓴다. 구조화 도구 결과는 `structuredContent`와 동일한 JSON 문자열을 `content[0].text`에도 담는다. 이전 클라이언트는 text를 읽으면 된다.

생성기는 저장소에 설치된 TypeScript 7 API로 공개 값 export(대문자 시작, 타입 export 제외), 상속 props, 컴포넌트 본문의 슬롯을 읽는다. `SELECTION_COLUMN_ID`도 대문자 export이므로 포함하되 `kind: constant`로 표시하고 컴포넌트 추천에서는 제외한다. 표준 DOM props는 `inherited: true`다.

`component-intent.mjs`는 의도·사용 조건·금지사항·키워드와 소스 대조용 props·slots 목록을 소유한다. 생성기는 export 완전성, 실제 props, 실제 슬롯, DESIGN 절 제목, related 참조, 토큰 이름·참조를 검증한 뒤에만 출력한다. 토큰 값은 `tokens.json`에서, Tailwind 색 별칭은 이미 생성된 `packages/tokens/theme.css`에서 읽어 수동 매핑 중복을 피한다. 역할에 따라 쓰는 클래스가 다른 토큰은 Tailwind 목록이 비어 있을 수 있으며 `cssVariable`로 소비한다. 서체처럼 `tokens.json`에 없는 값은 추측해 추가하지 않는다.

`which_component`는 외부 모델 없는 문자열 매칭이다. 원문(NFKC·소문자·공백 제거)과, 같은 순서로 낱말을 메타데이터 어휘로 바꾼 번역 (영어 낱말·구절 대응표 약 320개, 한국어 활용형 `걸러`→필터·`한꺼번에`→일괄, 구두점 자리는 끊는다)을 함께 보고 더 센 일치를 쓴다. 전체 이름 일치 +2000, 이름을 식별자로 쓴 것(적힌 그대로 `Button`, 또는 두 낱말 이상 이름을 낱말 경계에서 `filter bar`) +1000 — 소문자 영어 낱말 `button`·`select`는 이름 일치가 아니다. 키워드 완전 일치 +80, 연속 포함 +20(한 글자는 +4, 여러 낱말의 연속 구절은 +40, 한 낱말은 그 낱말이 키워드에 든 부품이 4개를 넘으면 그만큼 덜 친다), 떨어진 낱말이 모두 있으면 순서대로 +24 · 아니면 +8(한국어는 활용형 줄기도 인정). 한 부품 안에서 긴 키워드에 든 짧은 키워드와 떨어진 일치에 겹친 단일 키워드는 다시 더하지 않는다. 설명 낱말(조사·어미 뗀 줄기 포함)의 useWhen 일치는 +5, purpose 일치는 +2다. 라틴 키워드는 낱말 경계와 영어 줄기(복수형·진행형)로 맞춘다. 동점은 이름순이며 기본 5개(최대 10개)를 반환한다. 점수 근거·useWhen·dont를 함께 주며, 무매칭은 `isError: true`와 `list_components` 안내로 반환한다. 규칙과 근거 전체는 `docs/qa/r38-match-ranking.md`.

`manifest.json`은 파생 필드를 항목마다 반복하지 않고 최상위 `derived`에 복원 규칙을 보관한다.
`importTemplate`의 `NAME`은 항목 이름이고, 전체 소스 경로는 `sourceRoot + source`다.
생략한 `kind`는 `kindDefault`, 생략한 prop의 `required`는 `requiredDefault`다.
선택 prop의 타입에는 `optionalTypeSuffix`를 붙인다. `optionalTypeSuffixExceptions`는
이미 undefined를 포함해 검사기가 접미사를 생략한 타입 별칭 목록이며 실제 추출 결과에서 생성한다.
`derived.description`에도 이 규칙이 있어 매니페스트만 읽어도 복원할 수 있다.
이 저장 형태는 **어떤 응답으로도 그대로 나가지 않는다.** 서버가 `catalog.mjs`로 복원해서 보낸다.

## `design://components` — 선택 색인 (R49)

리소스는 `{ description, components, patterns }`다(`patterns`는 아래 조립 항목, 목표 75 3단계). `components` 항목마다 `name`·`partOf`·`category`·`purpose`·`useWhen`·`dont`·`parts`를
**값 그대로** 적고(없는 필드·빈 배열은 생략), 순서는 `list_components`와 같다. 복원 규칙이 필요 없다.
props·slots·규칙과 부모에서 합친 의도는 `get_component`로 이름마다 조회한다(지연 조회).

목록형을 고른 이유: 이전 리소스는 저장 형태(`{ derived, components }`, 88,863B / 90,000B)라 읽는 쪽이 `derived` 규칙으로
복원해야 했다. 복원형 전체는 **109,990B**로 상한을 이미 넘고, 항목마다 props·규칙이 붙어 부품이 늘 때마다 함께 커진다.
그 상세는 `get_component`가 이미 이름별로 준다. 색인은 고르는 데 필요한 필드만 두어 **23,191B**(항목 평균 202B)다.
도구 응답(`list_components`·`get_component` 등)은 바뀌지 않았다.

## 조립 항목 — `patterns` (목표 75 3단계)

여러 부품을 한 자리에 엮는 지침이다. 첫 항목은 상단 바 `app-header`(AppShell `header`·`headerEnd` + ContextSwitcherGroup·ContextSwitcher +
NotificationCenter + 사용자 메뉴 DropdownMenu·Avatar·Button)다. 부품마다 항목을 두면 "상단 바"를 찾는 AI가 전환기·벨·사용자 메뉴를 따로
맞춰 봐야 하므로, 조립 항목 하나가 `purpose`·`useWhen`·`dont`·`rules`와 쓰는 이름(`uses`)·조합 예시(`example`)를 묶는다.

- **import할 수 없는 이름**이라 `list_components`에는 없다. 이름은 부품과 겹치지 않는 소문자 하이픈 꼴이다.
- `which_component` 후보에 `kind: "pattern"`으로 섞여 나온다(부품 후보의 응답 모양은 그대로 — `kind` 없음).
  `get_component("app-header")`가 상세(`kind: "pattern"` · `uses` · `rules` · `example`)를 준다. 색인 `patterns`에는 고르는 필드
  (`name`·`category`·`purpose`·`useWhen`·`dont`·`uses`)만 싣는다.
- **예시는 문자열로 손에 들고 있지 않다.** `packages/ui/docs/examples/app-header-mcp.tsx`의 `mcp-example` 시작·끝 주석 사이를
  생성기가 들여쓰기만 걷어 그대로 싣는다. 그 파일은 `pnpm typecheck`가 검사하므로 예시의 부품 이름·props가 실제 API와 어긋나면
  (지침 초안의 `NotificationBell`·`UserMenu`·`Spacer`·`mode`) 타입 오류로 막힌다. 생성기는 예시의 JSX 태그가 모두 공개 부품이고
  `uses`(또는 그 부품)에 있는지, `uses`·`related`가 실제 공개 부품인지 더 본다(검증 9 — `build.test.mjs`).
- 예산은 부품 항목과 같다: 색인 항목 하나 800B(app-header 781B) · 상세 7,000B. 색인 전체에는 그대로 더해진다(+978B).
  추천 정답 세트·R38 1순위 대조·응답 대조 도구는 서버와 같은 후보(`selectionEntries` = 부품 + 조립 항목)로 잰다.

## 응답 크기 예산 (R49)

예산은 AI에게 실제로 가는 compact UTF-8 JSON을 잰다. 수치는 `budget.mjs` 한 곳에 있고
생성기(`pnpm mcp:build`)·단위 테스트·`docs/qa/mcp-client-verify.mjs`가 같은 값을 읽는다.

| 층 | 응답 | 지금(2026-11-23) | 상한 |
|---|---|---:|---:|
| 요약 — 항목 수에 비례 | `design://components` 색인 | 23,191B · 항목 최대 553B | 전체 **40,000** · 항목 **800** |
| | `list_components` | 19,873B · 항목 최대 239B | 전체 **36,000** · 항목 **320** |
| 상세 — 지연 조회, 개수와 무관 | `get_component` 한 건(부모 의도 포함) | 최대 4,576B(DataTable) — 0.6.0 6,118B | **7,000** |
| 고정 — 컴포넌트 수와 무관 | `design://tokens` | 67,555B | **80,000** |
| | `get_rules` 전체 | 4,327B | **8,000** |
| 저장 — 응답 아님 | `manifest.json` 전체·저장 카탈로그 | 88,863B(compact) | 없음 |

**큰 묶음 예약.** 요약 응답은 언제나 지금 가장 큰 가족(루트 + 부품, 현재 DropdownMenu 15항목: 색인 2,047B · 목록 2,783B)
**4개**를 더 받을 여유를 남긴다. 여유가 그 아래로 떨어지면 상한에 닿기 전에 `mcp:build`가 실패한다 —
그때 예산을 다시 정한다. 지금 예상치는 색인 31,379B / 40,000B(남은 자유 ≈ 평균 가족 20개),
목록 31,005B / 36,000B(≈ 13개)이므로 P3(리치 텍스트 편집기·카테고리 트리·칸반·알림 센터)가 가장 큰 가족만 해도 들어간다.
`build.test.mjs`가 가장 큰 가족 4개를 실제로 복제해 넣은 응답 크기와 예약 계산이 바이트까지 같은지 검사한다.

항목당 상한은 지금 최대의 약 1.4배라 문장 하나가 비정상적으로 길어지면 그 항목 이름과 함께 걸린다.
상한과 별개로 단위 테스트·하네스는 실측 + 약 300B의 **회귀 상한**을 둬 의도하지 않은 증가를 라운드마다 잡는다.

이전 재설정: R37은 실제 소비 경로(도그푸딩 4: 목록 1회·추천 2회·상세 10회·규칙 1회, 카탈로그 0회)에 따라
카탈로그 80,000→90,000과 목록 24,000·상세 6,000을 뒀고, R42는 저장 크기 상한을 없애고 토큰 80,000·규칙 8,000을 더했다.
R49는 카탈로그 응답을 색인으로 바꿔 90,000 상한을 없애고, 목록 24,000→36,000과 항목당·예약 검사를 더했다.
목표 64(0.6.0)는 DataTable 상세가 6,118B(합계·고정 열 지침 + 비제어 초기값)로 넘어 상세 6,000→7,000으로 올렸다(같은 원칙, 개발 총괄 결정).

`get_component`·`list_components`는 `catalog.mjs`로 기본값·경로·import·타입 표기를 복원해
이전 응답을 유지한다. 생성기는 모든 항목을 복원해 원본과 깊은 비교하고, 단위 테스트는 고정 기준선의 상세 8개·목록 99개를
실제 stdio 응답과 비교한다. 기준선은 `docs/qa/fixtures/get-component-baseline.json`이다.

## 응답 불변 증명 (R49)

저장 형태나 서버를 바꾸는 라운드는 기준 커밋의 서버와 새 서버를 나란히 띄워 응답 줄을 바이트로 대조한다.

```sh
node docs/qa/mcp-response-diff.mjs --base main \
  --expect resources/list --expect "resources/read design://components" --report /tmp/diff.md
```

요청은 핸드셰이크·`tools/list`·`resources/list`·**양쪽 목록의 모든 `resources/read`**·모든 도구다.
`get_component`·`get_token`은 양쪽 매니페스트의 모든 이름, `which_component`는 정답 세트·R38 전체 질의·모든 이름,
`search_tokens`는 모든 분류·토큰 이름, `get_rules`는 모든 주제와 전체, 오류 경로까지 보낸다(약 1,360건).
`--expect`에 적지 않은 키가 한 바이트라도 다르거나, 적었는데 같으면 exit 1이다.
`docs/qa/compare-guidance-baseline.mjs`는 커밋된 기준선 파일끼리 비교하는 재승인 도구라 이 증명을 대신하지 못한다.

## `which_component` 정답 세트 (R49 · 0.6.0 목표 64)

`docs/qa/fixtures/which-component-golden.json`은 실제 요청 문장 214문항(한국어 155 · 영어 59)과 정답 부품이다 —
R49 기준 128문항, 도그푸딩 6 사전 점검 표 32문항(`set: logistics06`), 0.5.0 부품 질의 26문항(`set: r050`),
0.6.0 반복 입력 줄·섹션 제목 줄 12문항(`set: r060`), 목표 75 상단 바 16문항(`set: r075` — 전환기·알림 센터·개수 표식·알림 토스트·
권한 없음/찾을 수 없음·조립 항목 `app-header`).
정답은 하나, 애매하면 허용 정답 여러 개(배열), 맞는 부품이 아직 없으면 `null`+`gap`(정확도 분모에서 빼고 후보 0개만 센다)이다.
질의가 이름 일치 점수를 받으면 안 된다(이름 일치 +1000점은 정확도가 아니라 이름 검색을 잰다).
`which-component-holdout.json` 48문항은 튜닝을 마친 뒤 따로 쓴 확인용이다 — 그 세트를 보고 고치지 않고 게이트도 걸지 않는다.

```sh
node docs/qa/which-component-golden.mjs           # 정확도(언어별·세트별)와 1위가 아닌 문항 표
node docs/qa/which-component-golden.mjs --check   # 하한 아래거나 후보 0개가 있으면 exit 1
node docs/qa/compare-match-baseline.mjs           # R38 1순위 대조 + docs/qa/r38-match-ranking.md 재생성(보류 세트 수치 포함)
```

0.6.0 실측(2026-11-24, 목표 64 끝): **top-1 180/198 · top-3 196/198 · 후보 0개 0/198**(한국어 129/144 · 142/144, 영어 51/54 · 54/54).
2a 때 186문항은 top-1 166/184 · top-3 182/184 · 후보 0개 0/186 이었고, 같은 세트의 0.5.0 수치는 top-1 96 · top-3 129 · 후보 0개 28(영어 27/50)이었다.
목표 75 3단계(2026-11-25): **top-1 195/214 · top-3 212/214 · 후보 0개 0/214** — 기존 198문항은 정답 순위가 바뀐 문항 0개(180 · 196 그대로),
새 r075 16문항 top-1 15 · top-3 16("unread number pill next to a tab label" 은 3위 — Tabs 허용 정답).
하한은 **top-1 191 · top-3 210 · 후보 0개 0**이다. 0.5.0 대비 1위·3위 안에서 밀려난 문항은 0개다.
`which-component-golden.test.mjs`가 `pnpm test`(= `pnpm verify`·pre-commit·CI)에서 같은 판정을 한다.
키워드·매칭을 고쳐 수치가 바뀌면 `measured`를 고치고, 오른 만큼 `floor`도 올린다.

검증 명령:

```sh
pnpm verify
node --test packages/mcp/*.test.mjs
node --test packages/ui/src/lib/*.test.mjs packages/ui/src/components/*/*.test.mjs
node docs/qa/mcp-client-verify.mjs
```

`build.test.mjs`는 6가지 검증에 잘못된 입력을 주입한다. `server.test.mjs`는 실제 자식 프로세스의 stdin/stdout으로 통신하며 모든 출력 줄을 JSON으로 파싱하고, 요청하지 않은 메시지·알림 응답·프로세스 종료 상태까지 확인한다.
