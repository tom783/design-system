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

`which_component`는 순수 문자열 매칭이다. NFKC·소문자·공백 제거 후 전체 이름 일치 +2000, 설명 안 이름 포함 +1000, 키워드 완전 일치 +80, 포함 일치 +20(한 글자는 +4, 여러 낱말의 연속 구절은 +40)를 합산한다. 여러 낱말이 떨어져 있어도 모두 질의에 포함되면 일치한다. 각 질의 낱말의 앞부분에서 원래 순서대로 맞으면 +24, 순서가 다르거나 낱말 내부에서 맞으면 +8이며 겹치는 단일 키워드 점수는 중복 가산하지 않는다. 고유 검색어가 있는 부품의 후보 판정도 같은 비교를 쓴다. 설명 단어의 useWhen 일치는 +5, purpose 일치는 +2다. 동점은 이름순이며 기본 5개(최대 10개)를 반환한다. 의미·동의어 추론은 하지 않는다. 점수 근거·useWhen·dont를 함께 주며, 무매칭은 `isError: true`와 `list_components` 안내로 반환한다.

`manifest.json`은 파생 필드를 항목마다 반복하지 않고 최상위 `derived`에 복원 규칙을 보관한다.
`importTemplate`의 `NAME`은 항목 이름이고, 전체 소스 경로는 `sourceRoot + source`다.
생략한 `kind`는 `kindDefault`, 생략한 prop의 `required`는 `requiredDefault`다.
선택 prop의 타입에는 `optionalTypeSuffix`를 붙인다. `optionalTypeSuffixExceptions`는
이미 undefined를 포함해 검사기가 접미사를 생략한 타입 별칭 목록이며 실제 추출 결과에서 생성한다.
`derived.description`에도 이 규칙이 있어 매니페스트만 읽어도 복원할 수 있다.

`design://components`는 `{ derived, components }` 형태로 이 규칙과 압축된 항목을 함께 보낸다.
카탈로그 예산 **90,000바이트**는 이 객체 전체의 compact UTF-8 JSON을 잰다. `design://tokens`는 **80,000바이트**, `get_rules` 전체는 **8,000바이트**,
복원한 `list_components` 응답은 **24,000바이트**, 부모 의도를 합친 `get_component` 한 건은 **6,000바이트**다.
생성 시 다섯 응답 예산을 검사하며 하나라도 넘으면 exit 1로 차단하고, 가장 큰 상세 항목의 이름과 바이트를 출력한다.

R42 재설정 근거: 사용자 제공 R41 후 전체 매니페스트는 154,853/160,000바이트다.
전체 매니페스트는 어떤 MCP 응답으로도 한 번에 전송되지 않는다. 이미 예산이 있는
카탈로그·목록·상세 외에 토큰 응답 67,002바이트와 규칙 전체 응답 4,141바이트가 남는다.
저장 크기 상한을 제거하고 이 두 실제 응답에 각각 80,000·8,000바이트 예산을 둔다.
카탈로그 90KB는 유지한다. 수치는 사용자가 제공한 기준 실측이며 현재 출력은 생성기로 재현한다.

R37 재설정은 실제 소비 경로에 따른다. 도그푸딩 4(46턴)는 카탈로그를 읽지 않았고 목록 1회·추천 2회·상세 10회·규칙 1회를 호출했다.
사용자 제공 R36b 실측은 카탈로그 76,925바이트, 목록 18,490바이트, 상세 최대 4,576바이트(DataTable)·중앙값 469바이트다.
지침을 줄이는 대신 카탈로그 상한을 80,000→90,000으로 늘리고 자주 소비하는 두 응답에 별도 예산을 건다.
`get_component`·`list_components`는 `catalog.mjs`로 기본값·경로·import·타입 표기를 복원해
이전 응답을 유지한다. 부품의 부모 의도 합치기는 기존과 동일하며 저장 항목은 변경하지 않는다.
생성기는 모든 항목을 복원해 원본과 깊은 비교하고, 단위 테스트는 고정 기준선의 상세 8개·목록 99개를
실제 stdio 응답과 비교한다. 기준선은 `docs/qa/fixtures/get-component-baseline.json`이다.

검증 명령:

```sh
pnpm verify
node --test packages/mcp/*.test.mjs
node --test packages/ui/src/lib/*.test.mjs packages/ui/src/components/*/*.test.mjs
```

`build.test.mjs`는 6가지 검증에 잘못된 입력을 주입한다. `server.test.mjs`는 실제 자식 프로세스의 stdin/stdout으로 통신하며 모든 출력 줄을 JSON으로 파싱하고, 요청하지 않은 메시지·알림 응답·프로세스 종료 상태까지 확인한다.
