# R15B · 복합 부품을 한 번만 저장한다 (매니페스트 구조)

R16(나머지 입력)·R17(Combobox)로 가기 전에 막아야 할 벽이 있다. **내가 재서 확인했다.**

## 0. 측정값 — 이게 근거다

```
components 전송 크기 : 75,334 / 80,000 바이트  (94%)
컴포넌트 수          : 88개
남은 여유            : 4,666 바이트 → 약 6개만 더 들어간다
```

R16 만 해도 Textarea·Label·Switch·RadioGroup·RadioGroupItem 로 5~6개를 쓴다.
R17 Combobox 는 부품이 6~8개다. **라운드 중간에 예산이 터진다.**

어디로 갔나:

| 가족 | 부품 수 | 바이트 |
|---|---|---|
| DropdownMenu | 14 | 9,390 |
| Dialog | 7 | 6,019 |
| AlertDialog | 8 | 5,910 |
| Select | 9 | 5,743 |
| Breadcrumb | 6 | 4,332 |
| Card | 5 | 2,951 |
| Tabs | 3 | 1,845 |
| **합계** | **53** | **36,776 = components 의 49%** |

**매니페스트의 절반이 복합 부품이고, 그 내용이 부모 복사다.** 실제 저장된 값:

```json
{
  "name": "BreadcrumbSeparator",
  "purpose": "보조기기가 읽지 않는 경로 구분자다.",
  "useWhen": ["Breadcrumb의 경로를 조립할 때"],
  "dont": ["마지막 항목을 링크로 만들거나 생략 수를 숨기지 마라"],
  "rules": [{ "text": "마지막은 aria-current page, separator는 …", "source": "DESIGN.md 16" }],
  "related": ["Breadcrumb"], "keywords": ["경로 구성"], "category": "navigation",
  …
}
```

`dont` 는 구분자와 아무 상관이 없다(구분자는 링크가 될 수 없다). `rules` 는 Breadcrumb
부품 6개가 **같은 문장**을 들고 있다. 이게 6번, 9번, 14번 반복된다.

## 1. 같은 원인이 라우팅도 망치고 있다 (실측)

```
상태 선택 필터 → Select(36) · SelectTrigger(34) · SelectContent(32) · SelectGroup(32) · SelectItem(32)
카드로 묶기    → Card(20) · CardBody(20) · CardFooter(20) · CardHeader(20) · CardSkeleton(20)
경로 구분자    → Breadcrumb(27) · BreadcrumbSeparator(9) · BreadcrumbEllipsis(7) · …
```

`카드로 묶기` 는 **다섯 개가 전부 동점 20점**이다. 정렬이 이름순으로 떨어지므로 AI 에게
`CardBody` 가 `Card` 와 똑같이 좋은 답으로 보인다. 후보 5칸이 잡음으로 다 찬다.

"어떤 컴포넌트를 쓰냐"의 답은 **가족**이다. 부품이 아니다.

## 2. 설계 — 한 번 저장하고 읽을 때 합친다

### 2.1 부품 항목에서 뺀다

부품이 **보관**하는 것: `name` · `kind` · `partOf`(새 필드) · `purpose` · `props` ·
`extends` · `slots` · `import` · `source`.

부품에서 **빼는** 것: `useWhen` · `dont` · `rules` · `related` · `keywords` · `category`.
전부 부모에 한 번만 있으면 된다. `purpose` 는 부품마다 진짜로 다른 유일한 문장이니 남긴다.

### 2.2 부모는 부품 목록을 갖는다

부모에 `parts: ['SelectTrigger', 'SelectValue', …]` 를 추가한다.
지금은 AI 가 `list_components` 를 받아 이름 앞글자로 추측해야 한다. 한 번에 알려줘라.

### 2.3 `get_component` 는 읽을 때 부모 것을 합친다

부품을 조회하면 서버가 `partOf` 를 따라가 부모의 `useWhen`·`dont`·`rules`·`category` 를
**응답에 합쳐서** 준다. 응답은 컴포넌트 하나라 크기 문제가 없다.
합친 값임이 보이게 `inheritedFrom: 'Select'` 를 붙여라.

**보관은 한 번, 응답은 완전하게.** 이게 이 라운드의 전부다.

### 2.4 `which_component` 는 부품을 후보에서 제외한다

`partOf` 가 있는 항목은 `matchComponents` 가 건너뛴다. 크기가 아니라 **답의 품질** 문제다.
부모가 `parts` 를 들고 있으니 정보는 안 사라진다.

### 2.5 `design://components` 와 `list_components`

리소스는 **보관 형태 그대로** 내보낸다(합치지 않는다). `list_components` 는 지금처럼
`name`·`kind`·`purpose`·`import` 만 돌려준다 — 여기에 `partOf` 를 **추가**해라.
그래야 목록만 보고도 무엇이 부품인지 안다.

## 3. 부품 판정은 **반드시 명시**로 한다

이름 앞글자로 추측하지 마라. **`CardSkeleton` 은 Card 의 부품이 아니다.** 로딩
스켈레톤이고 `Card` 와 아무 관계가 없다. 위 측정에서 그게 `카드로 묶기` 후보에
동점으로 올라왔다. 앞글자 규칙을 쓰면 이걸 Card 부품으로 접어버린다.

`docs/research/component-intent.mjs` 에서 **각 부품에 부모를 명시**해라.
지금 `...[ ['SelectTrigger', …], … ].map(…)` 형태로 묶여 있는 자리에
부모 이름을 넘기는 인자를 하나 추가하는 게 자연스럽다.

부모가 없는 이름을 `partOf` 로 적었거나, `parts` 에 없는 컴포넌트가 자기를 부품이라고
주장하면 **생성기가 종료 코드 1 로 떨어뜨려라.** 양방향으로 검사해라.

## 4. 크기 예산

`assertSizeBudget` 의 80,000 은 **그대로 둔다.** 올리는 건 해결이 아니다.
이 작업 후 `components` 가 55,000 바이트 아래로 내려가야 한다. 안 내려가면 보고해라.
전체 160,000 예산도 그대로다.

## 5. 검증

- `packages/mcp/match.test.mjs`: 부품이 후보에 **안 나오는** 것을 검사하는 케이스를 추가해라.
  최소 `카드로 묶기` → 후보에 `CardBody`·`CardHeader`·`CardFooter` 가 없다,
  `상태 선택 필터` → `SelectTrigger` 가 없다.
  그리고 `CardSkeleton` 이 **부품으로 접히지 않았는지** 검사해라 (이게 3번의 함정이다).
- `docs/qa/mcp-client-verify.mjs`: `get_component('SelectTrigger')` 가 부모의
  `useWhen`·`dont`·`rules` 를 **합쳐서** 주고 `inheritedFrom` 이 `Select` 인 것을 검사해라.
  `list_components` 응답에 `partOf` 가 있는 것도 검사해라.
- 기존 검사는 하나도 깨지면 안 된다. 깨지면 그 검사가 무엇을 지키고 있었는지 보고해라.

## 6. 문서

`DESIGN.md §13`(MCP)에 2.3 의 "보관은 한 번, 응답은 완전하게"와 3번의 `CardSkeleton`
함정을 적어라. 측정값(75,334 → 결과값, 49% 가 부품)도 같이 적어라.

## 7. 하지 마라

- 크기 예산 상향
- 이름 앞글자로 부품 판정
- `purpose` 를 부품에서 제거 (부품마다 다른 유일한 문장이다)
- `list_components` 응답을 무겁게 만들기
- 공개 API(`packages/ui`) 변경 — 이 라운드는 매니페스트·서버·매처만 건드린다

## 8. 보고할 것

1. `components` 전송 크기: 이전 75,334 → 이후 몇 바이트
2. 컴포넌트 수와 그중 부품 수
3. `pnpm verify` 결과
4. 0·1 번 측정과 다르게 나온 것 (있으면 값과 재현 방법)
5. 명세와 다르게 구현한 부분 (있으면 반드시)

브라우저는 네 샌드박스에서 못 띄운다. `pnpm qa` 는 내가 돌린다.
