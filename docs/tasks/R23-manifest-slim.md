# R23 · 매니페스트 예산 — 파생 가능한 것을 저장하지 않는다

`components` 가 **77,804 / 80,000** 이다. 여유 2,196 바이트.
MediaViewer 와 Carousel 을 넣으면 **라운드 중간에 터진다.**

R15B 때와 같은 상황이고 같은 원칙으로 푼다 — **보관은 한 번, 응답은 완전하게.**
예산을 올리는 건 답이 아니다. `design://components` 를 통째로 읽는 AI 의 컨텍스트를
지키려고 둔 한계다.

---

## 0. 전제 — 내가 잰 무게

```
props    19,501 (25%)   rules  10,431 (13%)   slots  6,040 (8%)
source    5,979 (8%)    extends 5,707 (7%)    purpose 5,660 (7%)
import    5,397 (7%)    keywords 3,912 (5%)   ...
```

`props`·`rules`·`purpose` 는 **진짜 내용이다. 건드리지 마라.**
줄일 것은 **같은 사실을 반복해 적은 것들**이다.

| 대상 | 지금 | 절약 |
|---|---|---|
| `import` | 99개가 이름만 다른 같은 문장 | **5,397** |
| `source` | `packages/ui/src/` 가 99번 반복 | **1,584** |
| `kind` | 대부분 `"component"` | **1,862** |
| `props[].required: false` | 218개 prop 중 대부분 | **2,958** |
| `props[].type` 의 `" \| undefined"` | `required:false` 와 같은 말 | **1,992** |
| **합계** | | **13,793** |

결과 예상: **64,011 / 80,000**, 여유 15,989 바이트.

`required:false` 와 `type` 의 `| undefined` 와 소스의 `?` 는 **같은 사실을 세 번**
적은 것이다. 한 번만 저장한다.

---

## 1. 규칙

저장(매니페스트)에서 **빼고**, 응답에서 **채운다.**

- `import` — 매니페스트 최상위에 `importTemplate: "import { NAME } from '@s2life/ui';"`
  같은 템플릿을 한 번 둔다. 컴포넌트마다 저장하지 않는다.
- `source` — 최상위에 `sourceRoot: "packages/ui/src/"` 를 두고 컴포넌트는 나머지만 갖는다.
- `kind` — `"component"` 가 기본이다. 그 외(`constant` 등)만 저장한다.
- `props[].required` — `false` 가 기본이다. `true` 만 저장한다.
- `props[].type` — 끝의 `" | undefined"` 를 저장하지 않는다. 선택 prop 이면 붙는다는 뜻이다.

**최상위 키는 자명해야 한다.** 리소스를 통째로 읽는 소비자가 템플릿과 접두사를 보고
스스로 복원할 수 있어야 한다. 이름과 쓰임을 매니페스트 안에 주석처럼 남겨라
(예: 최상위에 `derived: { import: "...", sourceRoot: "...", kindDefault: "component", requiredDefault: false }`).

## 2. 응답은 **한 글자도 달라지면 안 된다**

이게 이 라운드의 전부다. 저장을 줄이는 것이 소비자가 받는 것을 바꾸면 실패다.

`docs/qa/fixtures/get-component-baseline.json` 에 **지금의 응답을 박제해 뒀다.**
`get_component` 8개(ClampText·DataTable·Combobox·SelectTrigger·RadioGroupItem·
MultiSelect·Button·FormFlow)와 `list_components` 99항목 전체다.

**단위 테스트로 이 기준선과 깊은 비교를 해라.** 하나라도 다르면 실패다.
- 부품(`SelectTrigger`·`RadioGroupItem`)이 들어 있는 이유는 R15B 의 합쳐 읽기가
  같이 지켜지는지 보기 위해서다.
- `list_components` 응답에도 `import` 가 들어 있다. 거기서도 복원해야 한다.
- 기준선 파일을 **고치지 마라.** 고쳐야 할 만큼 응답이 달라진다면 그건 이 라운드가
  해서는 안 되는 변경이다. 그럴 땐 멈추고 보고해라.

## 3. 하지 마라

- 예산 상향 (80,000 / 160,000 그대로)
- `props`·`rules`·`purpose`·`useWhen`·`dont`·`keywords` 내용 축약 — 진짜 내용이다
- `slots` 제거 — 하네스가 쓴다
- 기준선 파일 수정
- 공개 UI API 변경 — 이 라운드는 생성기·서버·매니페스트뿐이다
- R15B 의 `partOf`/`parts`/합쳐 읽기 동작 변경

## 4. 검증

- **기준선 깊은 비교** (2번). `docs/qa/intent.test.mjs` 든 새 파일이든 좋지만
  `pnpm test` 가 돌아야 한다
- `components` 크기가 **70,000 미만**이어야 한다. 아니면 보고해라
- 기존 `pnpm qa` 전부 통과. 특히 **MCP 서버 43건**과 **사용 문서 16건**
  (문서가 매니페스트를 렌더한다 — `<Intent>` 가 깨지면 바로 드러난다)
- `pnpm verify`(단위 포함) 통과

## 5. 보고할 것

1. 항목별 실제 절약 바이트와 최종 크기
2. 기준선 비교 결과 (다른 곳이 있었다면 무엇을 왜)
3. 최상위 `derived` 키를 어떻게 자명하게 만들었는지
4. `pnpm verify` 결과
5. 명세와 다르게 한 부분

브라우저는 네 샌드박스에서 못 띄운다. `pnpm qa` 는 내가 돌린다.
