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

`which_component`는 순수 문자열 매칭이다. NFKC·소문자·공백 제거 후 전체 이름 일치 +2000, 설명 안 이름 포함 +1000, 키워드 +20(한 글자는 +4), 설명 단어의 useWhen 일치 +5, purpose 일치 +2를 합산한다. 동점은 이름순이며 기본 5개(최대 10개)를 반환한다. 단어별 의미 추론·동의어 추론은 하지 않는다. 점수 근거·useWhen·dont를 같이 주므로 호출자가 후보를 비교한다. 무매칭은 `isError: true`와 `list_components` 안내로 반환한다.

검증 명령:

```sh
pnpm verify
node --test packages/mcp/*.test.mjs
node --test packages/ui/src/lib/*.test.mjs packages/ui/src/components/*/*.test.mjs
```

`build.test.mjs`는 6가지 검증에 잘못된 입력을 주입한다. `server.test.mjs`는 실제 자식 프로세스의 stdin/stdout으로 통신하며 모든 출력 줄을 JSON으로 파싱하고, 요청하지 않은 메시지·알림 응답·프로세스 종료 상태까지 확인한다.
