# R11 · MCP 제공 레이어

`AGENTS.md` 와 `DESIGN.md` **0절(생성기가 SSOT)** 을 먼저 읽어라.

목표: **AI 가 이 디자인 시스템을 읽고 올바르게 쓸 수 있게 한다.**
DESIGN.md 를 통째로 떠먹이는 게 아니라, **물어보면 답하는 형태**여야 한다.

---

## 1. 의존성 — SDK 를 쓰지 않는다

`@modelcontextprotocol/sdk` 는 stdio 서버 하나를 위해 **express · hono · cors ·
jose · ajv · zod** 를 끌고 온다 (4.5MB, 웹 프레임워크 두 개). 우리가 필요한 건
stdin/stdout 에 JSON 한 줄씩 주고받는 것뿐이다.

**직접 구현한다. `packages/mcp` 의 의존성은 0개다.**
(playwright 대신 CDP 를 직접 쓴 것, 차트 라이브러리 대신 visx 프리미티브를 쓴 것과
같은 판단이다.)

**`package.json` 에 의존성을 추가하지 마라.** 루트 `scripts` 에
`"mcp": "node packages/mcp/server.mjs"` 한 줄 추가는 허용한다.

## 2. 프로토콜 — 내가 2025-06-18 명세에서 확인한 것

추측하지 마라. 아래가 공식 명세에서 그대로 가져온 것이다.

### 2.1 stdio 전송

- 메시지는 **줄바꿈으로 구분**한다. Content-Length 헤더는 **없다**(그건 LSP 다).
- 메시지 안에 줄바꿈이 **들어가면 안 된다** → `JSON.stringify` 결과를 그대로 한 줄로.
- **stdout 에는 MCP 메시지 외에 아무것도 쓰지 마라.** `console.log` 한 줄이 연결을 깬다.
- 로그는 **stderr** 로. `console.error` 는 안전하다.
- UTF-8.

### 2.2 핸드셰이크

클라이언트 → 서버:
```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{
  "protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"…","version":"…"}}}
```
서버 → 클라이언트:
```json
{"jsonrpc":"2.0","id":1,"result":{
  "protocolVersion":"2025-06-18",
  "capabilities":{"tools":{},"resources":{}},
  "serverInfo":{"name":"commerce-ds","version":"0.1.0"},
  "instructions":"…"}}
```
그 다음 클라이언트가 알림을 보낸다 (응답하지 마라 — id 가 없다):
```json
{"jsonrpc":"2.0","method":"notifications/initialized"}
```

**버전 협상**: 클라이언트가 보낸 버전을 지원하면 **같은 값을 돌려준다.**
지원하지 않으면 우리가 지원하는 최신 버전을 돌려준다(에러가 아니다).
우리가 지원할 목록: `["2025-06-18","2025-03-26","2024-11-05"]`.

`instructions` 에 **이 시스템을 쓰는 법 한 문단**을 넣어라 — 어떤 도구부터
부르면 되는지. 이게 AI 가 가장 먼저 읽는 문장이다.

### 2.3 도구

`tools/list` → `{"tools":[{"name","title","description","inputSchema"}]}`
`tools/call` params `{"name","arguments"}` → `{"content":[{"type":"text","text":"…"}],"structuredContent":{…}}`

- **구조화 결과를 낼 때는 `structuredContent` 와 `content[0].text`(그 JSON 의 문자열)
  를 둘 다 채워라.** 명세가 하위 호환을 위해 그렇게 하라고 한다.
- **알 수 없는 도구·잘못된 인자는 JSON-RPC 에러**(`-32602`).
- **조회 결과 없음은 에러가 아니다** — `isError: true` 결과로 돌려주고
  무엇을 대신 시도하면 되는지 문장으로 알려줘라 (예: "그런 토큰이 없다.
  `search_tokens` 로 찾아봐라").

### 2.4 리소스

`resources/list` → `{"resources":[{"uri","name","title","description","mimeType"}]}`
`resources/read` params `{"uri"}` → `{"contents":[{"uri","mimeType","text"}]}`
없는 uri → JSON-RPC 에러 `-32002`.

### 2.5 그 외

- `ping` → `{}` 로 답하라.
- 모르는 메서드 → `-32601`.
- 파싱 실패 → `-32700`. **절대 프로세스를 죽이지 마라.**
- 알림(`id` 없음)에는 **응답하지 마라.**

---

## 3. 생성기 — `docs/research/mcp-build.mjs`

**손으로 쓴 메타데이터는 반드시 소스와 대조 검증한다.** 안 그러면 drift 한다.
이 프로젝트의 방식이다 (`tokens-build.mjs` 와 같은 구조, 실패 시 `exit 1`).

입력:
- `docs/research/tokens.json` (이미 생성됨 — 다시 만들지 마라)
- `docs/research/component-intent.mjs` ← **새로 쓴다.** 의도·규칙·금지사항.
  파서가 알 수 없는 것만 손으로 적는다.
- `packages/ui/src/**` — 이름·props·slot 추출용
- `DESIGN.md` — 규칙 출처 확인용

출력: `packages/mcp/manifest.json`

### 3.1 `component-intent.mjs` 한 항목의 모양

```js
{
  name: 'Peek',
  category: 'overlay',
  purpose: '레코드 내용을 요약해 보여준다. UI 를 가르치지 않는다.',
  useWhen: ['표의 행을 열지 않고 내용을 확인할 때'],
  dont: [
    '호버로 열지 마라 — 행 위를 지날 때마다 떠서 방해가 된다',
    '수정·삭제 액션을 넣지 마라. 읽는 곳이다',
  ],
  rules: [{ text: '요약은 최대 6줄. 넘치면 상세 페이지다', source: 'DESIGN.md 12.1' }],
  props: ['open', 'onOpenChange', 'title', 'items', 'action', 'children'],
  slots: ['peek'],
  related: ['Tooltip', 'Hint', 'Tour'],
  keywords: ['요약', '미리보기', 'peek', '팝오버', '행 상세'],
}
```

### 3.2 검증 — 전부 통과해야 출력한다

1. `packages/ui/src/index.ts` 가 내보내는 **컴포넌트마다 항목이 있다**
   (대문자로 시작하는 export 를 컴포넌트로 본다. 타입 export 는 제외)
2. 항목마다 `props` 의 모든 이름이 **그 컴포넌트 소스에 실제로 있다**
3. 항목마다 `slots` 의 모든 이름이 소스에 `data-slot="<이름>"` 으로 있다
4. `rules[].source` 가 가리키는 절 번호가 **`DESIGN.md` 에 실제 제목으로 존재한다**
   (`## 12.` 또는 `### 12.1` 형태). 절 번호를 바꾸면 여기서 잡힌다
5. `related` 가 가리키는 이름이 전부 매니페스트 안에 있다
6. 토큰 이름이 `tokens.json` 과 일치한다

실패 시 **무엇이 어긋났는지 정확히 찍고 `exit 1`.**
`pnpm verify` 에 `pnpm mcp:build` 를 끼워 넣어라.

## 4. 서버 — `packages/mcp/server.mjs`

매니페스트를 읽어 제공한다. **파일을 읽는 것 외에 부수효과 금지.**

### 4.1 리소스

| uri | 내용 |
|---|---|
| `design://tokens` | 토큰 전체 (JSON) |
| `design://components` | 컴포넌트 카탈로그 (JSON) |
| `design://principles` | 하드 규칙 모음 (Markdown) |

### 4.2 도구

| 이름 | 하는 일 |
|---|---|
| `get_token` | 이름 → 값·참조·용도·Tailwind 클래스명·라이트/다크 양쪽 |
| `search_tokens` | 분류 또는 부분 문자열로 찾기 |
| `list_components` | 이름 + 한 줄 용도 + import 구문 |
| `get_component` | props · slots · 규칙 · 금지사항 · 관련 컴포넌트 |
| `which_component` | **작업 설명 → 후보와 그 판단 근거** |
| `get_rules` | 주제(색·타이포·간격·로딩·폼·안내·차트·표) → 하드 규칙 |

**`which_component` 가 가장 중요한 도구다.** "표에서 행 요약을 보여주고 싶다"
같은 문장에 Tooltip / Hint / Tour / Peek 중 무엇인지 답해야 한다.

- **똑똑한 척하지 마라.** `keywords` · `purpose` · `useWhen` 에 대한
  단순 점수 매칭이면 충분하다. **후보를 여러 개 돌려주고 각자의 `useWhen` 과
  `dont` 를 함께 줘서 AI 가 판단하게 하라.**
- 매칭 함수는 **순수 함수로 분리**한다 → `packages/mcp/match.mjs` + 테스트.
- 아무것도 안 걸리면 `isError: true` 로 "`list_components` 를 보라"고 답하라.

## 5. 테스트

### 5.1 순수 함수 — `match.test.mjs`
- 정확한 이름이 들어오면 그 컴포넌트가 1위
- 한국어 키워드로 찾힌다
- 아무것도 안 걸리면 빈 배열
- 대소문자·공백 차이를 흡수한다

### 5.2 통신 스모크 — `server.test.mjs` (`node --test`)

**서버를 실제로 띄워 stdin/stdout 으로 말을 건다.** 이게 핵심 검증이다.

- `initialize` → `protocolVersion` 이 요청한 값과 같다
- **모르는 버전을 요청하면** 우리가 지원하는 버전이 돌아온다 (에러가 아니다)
- `notifications/initialized` 를 보내도 **응답이 오지 않는다**
- `tools/list` → 6개 도구, 전부 `inputSchema` 가 있다
- `tools/call get_token` → `structuredContent` 와 `content[0].text` 가 **같은 내용**
- `tools/call` 에 없는 도구 → JSON-RPC 에러 `-32602`
- `tools/call get_token` 에 없는 토큰 → **에러가 아니라** `isError: true` 결과
- `resources/list` → 3개, `resources/read` 로 전부 읽힌다
- 없는 uri → `-32002`
- **깨진 JSON 을 한 줄 보내도 프로세스가 죽지 않고** `-32700` 을 돌려준 뒤
  다음 요청을 정상 처리한다
- **stdout 에 JSON 이 아닌 바이트가 한 줄도 없다**

마지막 항목을 꼭 넣어라. `console.log` 하나가 연결을 조용히 깨뜨린다.

## 6. 완료 조건

```bash
pnpm verify
node --test packages/mcp/*.test.mjs
node --test packages/ui/src/lib/*.test.mjs packages/ui/src/components/*/*.test.mjs
```

## 7. 하지 마라

- 새 의존성 (1절). `@modelcontextprotocol/sdk` 포함
- HTTP 전송 구현 — stdio 만 한다
- 쓰기 도구 (토큰 수정 등). **읽기 전용이다**
- `DESIGN.md` · `AGENTS.md` · `tokens-build.mjs` · `packages/tokens/*` 수정
- UI 컴포넌트 수정. 매니페스트가 소스와 안 맞으면 **매니페스트를 고치는 게 아니라
  보고하라** — 소스가 맞고 내 의도 파일이 틀렸을 수 있다
- 커밋 · 푸시

## 8. 보고할 것

- 지원 프로토콜 버전 목록과 협상 처리
- 3.2 검증 6가지가 각각 무엇을 잡았는지 (실제로 걸린 게 있으면 그것도)
- `which_component` 점수 매기기 방식
- stdout 오염을 어떻게 막았는지
- 매니페스트와 소스가 어긋난 곳이 있었는지
- 의도적으로 하지 않은 것
