# R43 · 단계 표시

## 공개 API와 책임

`Steps`·`StepsProps`·`StepItem`·`StepStatus`를 공개한다.

```tsx
<Steps current={1} steps={[
  { label: '기본 정보', description: '상품명과 분류' },
  { label: '가격 입력', status: 'error' },
  { label: '배송 설정' },
]} onStepClick={setCurrent} />
```

- `steps`: `readonly StepItem[]`. `label: string`, 선택 `description: string`, 선택 `status: 'error'`.
- `current: number`: **0 기준**. 배열 인덱스·콜백 인덱스를 일치시켜 단계 이동 때마다 ±1 변환하지 않는다. 표시 번호만 1부터다.
- `onStepClick?: (index: number) => void`: 현재보다 앞이고 오류 없는 완료 단계에만 버튼이 생긴다.
- 루트 div의 일반 속성·ref·className을 전달한다. children은 steps에서 생성한다.
- `StepStatus`: `complete | current | upcoming | error`. 앞/현재/뒤를 자동 계산하고 오류만 덮어쓴다.

현재 인덱스는 범위 안 정수로 보정하고 비유한 값은 0으로 표시한다. 외부 상태는 바꾸지 않는다.
빈 배열은 빈 목록이며 현재 항목이 없다. 마지막 단계는 진행 중이다. 전체 완료 후의 화면은 앱이 정한다.
상태·검증·저장·이전/다음 버튼은 앱 몫이다. 다음 단계·오류 단계로 바로 이동하지 않는다.

`ol`·`aria-current="step"` 하나와 “2단계 가격 입력, 진행 중” 같은 전체 접근명을 제공한다.
목록 이름에는 총 단계 수도 포함한다. 완료 체크와 오류 삼각 경고는 다른 실루엣이며 상태 글자를 함께 쓴다.
긴 라벨·설명은 DOM·title에 원문을 남긴다. 오류 상태라도 현재 위치 속성은 사라지지 않는다.

## 좁은 폭 경계 측정

`docs/qa/browser.mjs`의 headless-shell로 폭별 렌더 계측을 시도했다. macOS 샌드박스 초기화에서
`FATAL:content/browser/sandbox_parameters_mac.mm:87 ... Input/output error (5)`가 나고 CDP 연결에 실패했다.
GUI Chrome이나 샌드박스 해제로 우회하지 않았다. 재현 코드는 `docs/qa/measure/r43-steps-measure.mjs`다.

대체 사전 측정은 저장소의 PretendardVariable.ttf를 CoreText에 등록한 실제 글꼴 폭이다.
`docs/qa/measure/r43-steps-measure.swift`로 재현하며 결과는 `.qa-shots/r43-measurement/coretext.txt`에 있다.
이 수치는 브라우저 렌더·실제 넘침·키보드 검증 통과를 뜻하지 않는다.

| 측정 대상 | 크기·굵기 | 폭 |
|---|---|---:|
| 기본 정보·가격 입력·배송 설정·최종 확인 각각 | 14px/400 | 51.912px |
| 현재 단계 라벨 각각 | 14px/600 | 51.728px |
| 상품명과 분류·판매가와 재고 각각 | 13px/400 | 70.675px |
| 진행 중 | 13px/400 | 36.969px |
| `2 / 4 · ` | 14px/600 | 39.635px |

4단계의 동일 폭 셀과 간격 3×16px에서 첫 세 셀의 글 영역은
`(컨테이너 폭 − 48) / 4 − (마커 24 + 간격 8 + 패딩 8) − (연결선 16 + 간격 8)`이다.
마지막 셀은 연결선이 없어 24px 더 넓다. 모든 치수는 기존 토큰을 사용한다.

| 가로 후보 폭 | 첫 세 단계 글 영역 | 설명 70.675px 대비 여유 |
|---|---:|---:|
| 640px | 84px | 13.325px |
| 600px | 74px | 3.325px |
| 560px | 64px | −6.675px |

600px에서는 기본 설명의 폭 여유가 3.325px뿐이다. 앱 글꼴 대체·굵기·내용 차이를 고려해
**640px 미만**에서 현재 단계 요약으로 전환한다. 기본 설명에 약 19% 여유가 생기는 기준이다.
640px는 가로 목록, 639px는 “2 / 4 · 가격 입력”과 상태 글자 요약이다.
컨테이너 쿼리이므로 뷰포트가 넓어도 좁은 패널·문서에서 적용되며 SSR에도 동일하다.

요약에서는 현재 단계만 보이고 다른 항목은 접근성 트리·Tab 경로에서도 제외한다.
완료 단계 버튼을 숨기는 좁은 폭에서는 앱의 이전 버튼으로 돌아간다는 해석을 적용했다.
상품 등록 예시에는 이전/다음 버튼이 있으며 모든 단계의 초안을 앱에 보존한다.
기본 라벨 기준 120px 요약 글 영역은 112px이고 접두부 39.635px 뒤에 약 72.365px가 남는다.
오류 아이콘이 있는 요약은 글 영역이 더 줄지만 말줄임으로 전체값을 보존한다.
실제 가로 넘침 0과 639↔640 전환은 작성한 하네스에서 검증하도록 남겼다.

## FormFlow 연결

입력칸 5개 이상·서로 다른 주제를 단계로 나누는 기준을 DESIGN §11.8에 추가했다.
상품 등록 예시는 기본 정보 2칸·가격 2칸·배송 1칸이다. 활성 단계마다 key가 다른 FormFlow
하나를 렌더한다. form을 중첩하지 않고 초안·검증·등록 완료 상태를 앱에 둔다.
조합 중 검증을 멈추고 최초 blur·오류 후 change·submit 시점의 기존 정책을 따른다.
검증 실패는 현재 단계의 첫 오류 입력, 단계 이동 성공은 렌더 후 새 h2(tabIndex=-1)에 포커스한다.
처음 마운트될 때는 포커스를 옮기지 않는다. 완료 단계 클릭·이전·다음 모두 같은 이동 경로를 쓴다.

문서의 규칙은 Intent로 매니페스트에서 렌더한다. Steps·FormFlow·TaskProgress의 dont/related를
양방향으로 연결했다. 일반 “단계” 검색은 Tour에서 Steps로 의도적으로 바꾸며 안내 투어 검색은 유지한다.

## MCP 응답 크기

응답 본문의 compact UTF-8 JSON 바이트다. 운영 예산은 변경하지 않았다.

| 응답 | 실측 | 운영 예산 | 회귀 상한·여유 |
|---|---:|---:|---:|
| design://components | 88,161B | 90,000B | 88,450B · +289B |
| list_components | 19,679B | 24,000B | 19,950B · +271B |
| get_component 최대(DataTable) | 4,576B | 6,000B | 4,800B · +224B |
| design://tokens | 67,002B | 80,000B | 67,300B · +298B |
| get_rules 전체 | 4,151B | 8,000B | 4,400B · +249B |

매니페스트는 생성기로 재생성했다. 단위·실제 stdio 클라이언트 양쪽에서 회귀 상한을 검사한다.
클라이언트가 Buffer 청크마다 문자열로 바꾸던 경로는 UTF-8 스트림 디코딩으로 고쳤다.
한글이 청크 경계에서 나뉘면 대체 문자로 바뀌어 토큰 응답이 3B 크게 측정되던 원인을 해결했다.

## 변경 파일

신규:

- `packages/ui/src/components/steps/steps.tsx`·`steps.css`·`index.ts`
- `packages/ui/src/stories/steps.stories.tsx`
- `packages/ui/docs/examples/steps.tsx`·`product-steps.tsx`
- `docs/qa/steps-render-verify.mjs`
- `docs/qa/measure/r43-steps-measure.mjs`·`docs/qa/measure/r43-steps-measure.swift`·`docs/qa/r43-steps.md`

수정:

- `packages/ui/src/index.ts`·`components.css` — 공개 API·CSS 진입점
- `packages/ui/docs/04-forms.mdx`·`DESIGN.md` — 여러 단계 폼·FormFlow 연결
- `docs/research/component-intent.mjs`·`packages/mcp/manifest.json` — 의도·규칙·검색·생성 산출물
- `packages/mcp/build.test.mjs`·`match.test.mjs`·`server.test.mjs` — 응답 크기·검색·직렬화 회귀
- `docs/qa/mcp-client-verify.mjs`·`compare-match-baseline.mjs`·`run-all.mjs` — 실제 응답 검사·의도한 검색 변경·하네스 등록
- `CHANGELOG.md` — 0.3.1 미게시의 R43 항목. 패키지 버전은 유지

## 검증 결과와 범위

- `npm_config_offline=true pnpm verify` 통과: 토큰·MCP 생성, 타입 검사, 단위 339/339, Storybook 빌드.
- `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify` 통과: 116/116, stdout 프로토콜 오염 0·stderr 0.
- 신규 하네스·계측 스크립트의 `node --check`, `git diff --check` 통과.
- 사전 CoreText 폭 측정 완료. 브라우저 폭 계측은 환경 오류로 실패.
- `steps-render-verify.mjs`는 작성만 했다. 목록·접근명·단계 상태·완료/오류 아이콘·키보드·예정 클릭 차단·639/640 경계·넘침·원문 보존·제목 포커스·다크·콘솔 오류를 검사하도록 전체 QA에 등록했다.
- 브라우저 상호작용 하네스·전체 pnpm qa는 실행하지 않았다. 세로 배치·내장 폼 상태·새 토큰·버전 변경·커밋·푸시는 하지 않았다.
- Storybook 빌드는 500KB 초과 청크 안내를 출력했으며 성공했다.
