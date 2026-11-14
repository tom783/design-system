# R11-B · 매니페스트가 AI 에게 쓸모 있어야 한다

R11 서버는 **프로토콜상 완전하다.** 내가 독립 클라이언트로 33건 검증했다 —
핸드셰이크·버전협상·6개 도구·3개 리소스·깨진 입력 복구·stdout 청결 전부 통과.

**고칠 것은 내용물이다.** 두 가지 다 실측으로 확인했다.

---

## 1. 컴포넌트 카탈로그가 361KB 다

```
전체 427KB  ·  tokens 62KB  ·  components 361KB  ·  principles 4KB

Input 33.1KB (props 312개) · Checkbox 32.9KB (310) · Button 31.9KB (295)
CardTitle 30.5KB (278) · StatusChip 30.3KB (281)
```

props 가 **상속된 DOM 속성까지 전부**다. `Button` 295개 중 실제로 우리가
정의한 것은 넷뿐이다 — `leadingIcon` · `trailingIcon` · `variant` · `size`.
나머지는 `onAnimationIterationCapture` 같은 React HTML 속성이다.

**이건 그냥 큰 게 아니라 해롭다.** `design://components` 를 읽은 AI 가
컨텍스트를 DOM 속성 이름으로 태우고, 정작 중요한 `dont` 와 `rules` 가 밀려난다.
비교하자면 `Peek` 은 0.5KB 다 — 인터페이스가 좁기 때문이다.

### 고치는 법

props 를 **우리 것**과 **상속된 것**으로 나눈다.

```jsonc
{
  "name": "Button",
  "props": [ /* 우리가 정의한 것만 */
    { "name": "leadingIcon", "type": "React.ReactNode", "optional": true,
      "doc": "라벨 왼쪽 아이콘. 동작을 설명하는 것만 쓴다." },
    { "name": "trailingIcon", … }, { "name": "variant", … }, { "name": "size", … }
  ],
  "extends": ["React.ButtonHTMLAttributes<HTMLButtonElement>", "VariantProps<typeof buttonVariants>"]
}
```

`extends` 한 줄이 295개 나열보다 **더 많은 것을 정확히 전달한다.**

**합격 기준 — `Button` 의 `props` 가 정확히 이것이어야 한다:**
`leadingIcon` · `trailingIcon` · `variant` · `size` (순서 무관).
`onClick` · `aria-label` · `className` 같은 표준 속성이 들어 있으면 실패다.

TypeScript 컴파일러 API 를 이미 쓰고 있으니 선언 위치로 가를 수 있다.
**어떤 기준으로 갈랐는지 보고하라** (선언 파일 경로? 선언의 부모 인터페이스?).
`variant`·`size` 는 `VariantProps` 에서 오는데 **이건 우리 것이다 — 버리지 마라.**

### 1.1 크기를 게이트로 만들어라

`mcp-build.mjs` 에 예산 검사를 추가한다. 다시 커지면 바로 잡히게:

```
components 카탈로그 ≤ 80KB, 매니페스트 전체 ≤ 160KB — 넘으면 exit 1
```

지금 수치와 한도를 생성기 출력에 찍어라 (`tokens-build.mjs` 가 대비 건수를
찍는 것과 같은 방식).

---

## 2. `which_component` 가 현실적인 질문에 답하지 못한다

**가장 중요한 도구인데 4개 중 2개를 틀렸다.** 실측:

| 질문 | 결과 | 문제 |
|---|---|---|
| "버튼에 한 줄 설명을 붙이고 싶다" | Button 20 · Tooltip 20 | 동점 — 괜찮다 |
| "처음 온 사용자에게 기능 흐름을 안내하고 싶다" | Hint 7 · FormFlow 2 · **Tour 2** | Tour 가 폼 컴포넌트와 동점 3위 |
| "데이터를 불러오는 동안 뭘 보여줄까" | **후보 없음** | Skeleton 류가 정답인데 아무것도 안 나온다 |
| "표에서 행 내용을 빠르게 요약" | Peek 27 | 좋다 |

**알고리즘을 똑똑하게 만들지 마라. 데이터가 얇은 것이다.**
`component-intent.mjs` 의 `keywords` 를 실제 사람이 쓰는 말로 채워라 —
"불러오는 중", "로딩", "온보딩", "둘러보기", "단계별 안내", "진행률" 처럼.

어간이 달라서 못 맞추는 경우(`불러오는` vs `불러오기`)가 있으면
**양방향 부분 문자열 매칭** 정도까지는 해도 된다. 그 이상은 하지 마라.

### 2.1 라우팅을 테스트로 못 박아라 — 이게 핵심이다

`match.test.mjs` 에 **질문 → 기대 컴포넌트** 표를 넣어라.
각 질문에서 기대 컴포넌트가 **상위 3위 안에** 들어야 한다.

| 질문 | 기대 |
|---|---|
| 버튼에 한 줄 설명을 붙이고 싶다 | `Tooltip` |
| 처음 온 사용자에게 기능 흐름을 단계별로 안내하고 싶다 | `Tour` |
| 새 기능을 한 번만 알리고 싶다 | `Hint` |
| 표에서 행 내용을 빠르게 요약해서 보고 싶다 | `Peek` |
| 데이터를 불러오는 동안 뭘 보여줄까 | `Skeleton` |
| 차트가 로딩 중일 때 보여줄 것 | `ChartSkeleton` |
| 오래 걸리는 작업의 진행 상황 | `TaskProgress` |
| 주문 목록을 정렬하고 여러 건 선택하게 하고 싶다 | `DataTable` |
| 입력값이 틀렸을 때 오류 문구를 보여주고 싶다 | `Field` |
| Enter 로 다음 입력칸으로 넘어가게 하고 싶다 | `FormFlow` |
| 매출 추이와 변동 범위를 보여주고 싶다 | `TrendBand` |
| 목표 대비 실적을 보여주고 싶다 | `BulletRow` |
| 구성 비율이 시간에 따라 변하는 걸 보여주고 싶다 | `CompositionArea` |
| 주문 상태를 색과 함께 표시하고 싶다 | `StatusChip` |
| 금액을 입력받고 싶다 | `Input` |

**점수를 테스트에 맞춰 억지로 끼우지 마라.** 키워드를 제대로 채워서
자연스럽게 통과하게 하라. 통과시키려고 가중치를 특정 단어에 박아넣는 것은 금지다.

하나라도 못 맞추면 **그 질문과 실제 순위를 보고하라.** 억지로 통과시키는 것보다
"이건 키워드로는 안 된다"고 말하는 쪽이 낫다.

---

## 3. 하지 마라

- 임베딩·형태소 분석기 등 도입. **새 의존성 금지.**
- 점수 가중치를 테스트 통과용으로 조작
- `server.mjs` 의 프로토콜 처리 변경 — 33건 검증을 통과했다
- 도구·리소스 추가·제거
- `DESIGN.md` · `AGENTS.md` · `tokens-build.mjs` · UI 소스 수정
- 커밋 · 푸시

## 4. 완료 조건

```bash
node docs/research/mcp-build.mjs
node --test packages/mcp/*.test.mjs
pnpm verify
```

## 5. 보고할 것

- 우리 prop 과 상속 prop 을 **어떤 기준으로** 갈랐는지
- `Button` 의 최종 `props` 목록 (합격 기준 확인)
- 크기: before / after (components, 전체)
- 라우팅 표 15개 중 통과 수. 못 맞춘 게 있으면 질문과 실제 순위
- 양방향 부분 문자열 매칭을 썼는지
