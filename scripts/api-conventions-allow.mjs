// 공개 API 규약(DESIGN.md §6.3)의 명시 목록. scripts/check-api-conventions.mjs 가 읽는다.
//
// 세 목록 모두 "이유"가 필수다. 이유를 못 쓰면 목록에 넣지 말고 고친다.
// 고쳐서 더 이상 위반이 아닌 allow 항목, index.ts 가 더는 내보내지 않는 helpers 항목은 검사가 실패시킨다.

/**
 * 공개 도우미 — 부품(대문자)이 아닌 공개 값 이름. 새 소문자 export 는 여기 용도를 적어야 통과한다.
 * deprecated 는 다음 마이너에서 공개 API 에서 뺄 내부 구현이다. source 의 선언에 @deprecated JSDoc 이 있어야 한다.
 */
export const helpers = {
  cn: { use: 'className 병합(clsx + tailwind-merge). 부품 className 을 앱이 덧붙일 때 Tailwind 충돌을 푼다' },
  buttonVariants: { use: '버튼이 아닌 요소(라우터 링크 등)에 Button 모양을 입힐 때. asChild 가 안 맞는 곳' },
  chipVariants: { use: 'StatusChip 모양을 다른 요소에 입힐 때. StatusChip 의 VariantProps 가 가리키는 공개 타입 원점' },
  toast: { use: '알림을 띄운다. Toaster 와 짝(DESIGN.md §16.5)' },
  comboboxFilter: { use: 'Combobox filter 를 앱 정책으로 바꿀 때 기본 한글 매칭(초성·자모)을 재사용한다(DESIGN.md §18.2)' },
  useReturnContext: { use: '목록 ↔ 상세 복귀 위치를 기억한다(DESIGN.md §12.3)' },
  useDataTable: { use: 'DataTable 과 같은 선택·정렬·고정 열 상태를 앱이 직접 그리는 표에 쓸 때' },
  dataTableFeatures: { use: 'useDataTable·열 정의가 쓰는 TanStack 기능 묶음. 열 타입을 맞출 때' },
  createDataTableColumnHelper: { use: 'DataTable 열 정의 h.columns([h.accessor(…)])' },
  createSelectionColumn: { use: '선택 열을 직접 배치할 때. 열 id 는 SELECTION_COLUMN_ID' },
  toCsv: { use: 'DataTable 과 같은 규칙(BOM·RFC 4180)으로 CSV 문자열을 만든다' },
  downloadCsv: { use: 'toCsv 결과를 파일로 내려받는다' },
  useDelayedLoading: { use: '로딩 표시 지연 — 짧은 대기에 스켈레톤이 깜박이지 않게 한다(DESIGN.md §7.5.6)' },
  useTour: { use: 'Tour 의 단계 상태. Tour 가 이 반환값을 props 로 받는다' },
  useFormFlow: { use: 'FormFlow 를 쓰지 않는 form 에 Enter 다음 칸 이동을 붙일 때(DESIGN.md §11.5)' },
  useComposition: { use: '한글 IME 조합 중인지 리렌더 없이 읽는다 — 직접 만든 입력의 Enter·검증 시점(DESIGN.md §11.1)' },
  // 0.4.0 에서 예고했다(CHANGELOG 0.4.0 바뀐 동작). 부품이 쓰는 내부 계산이다.
  placeFallback: { deprecated: '위치는 Tooltip·Hint·Tour 가 정한다', source: 'components/guide/place-fallback.ts' },
  resolveStep: { deprecated: '단계 고르기는 Tour 가 맡는다', source: 'components/guide/resolve-step.ts' },
  useAnchored: { deprecated: '앵커 배치는 Tooltip·Hint·Tour·Peek 이 맡는다', source: 'components/guide/use-anchored.ts' },
  supportsAnchor: { deprecated: '앵커 배치는 Tooltip·Hint·Tour·Peek 이 맡는다', source: 'components/guide/use-anchored.ts' },
  nextFocusable: { deprecated: 'Enter 이동은 FormFlow 가 맡는다', source: 'components/form/next-focusable.ts' },
  focusNextFormStop: { deprecated: 'Enter 이동은 FormFlow 가 맡는다', source: 'components/form/form-flow.tsx' },
  shouldValidate: { deprecated: '같은 판단식을 앱에 둔다(DESIGN.md §11.2)', source: 'components/form/should-validate.ts' },
  nextPhase: { deprecated: '로딩 표시 지연은 useDelayedLoading 을 쓴다', source: 'lib/loading-state.ts' },
  // 목표 49 조사(2026-11-23)에서 찾았다. 부품 폴더 index 가 내보내 export * 로 새어 나왔다.
  initials: { deprecated: '이름 글자는 Avatar 가 그린다', source: 'components/avatar/initials.ts' },
  encodeRecord: { deprecated: '저장·복원은 useReturnContext 가 맡는다', source: 'components/peek/return-record.ts' },
  decodeRecord: { deprecated: '저장·복원은 useReturnContext 가 맡는다', source: 'components/peek/return-record.ts' },
  useElementWidth: { deprecated: '차트 폭은 ChartFrame 이 잰다', source: 'lib/use-element-width.ts' },
};

/** 이름을 바꾸며 남긴 옛 이름. 새 이름이 함께 있어야 하고 소스 prop 에 @deprecated JSDoc 이 있어야 한다. */
export const deprecatedProps = [
  { component: 'DatePicker', prop: 'onChange', replacement: 'onValueChange', since: '0.4.0',
    reason: '값 알림이 Input 의 DOM 이벤트 onChange 와 이름만 같고 인자가 달랐다' },
];

/**
 * 기존 위반 — 고칠 때까지 둔다. 고친 항목은 지운다(남아 있으면 검사가 실패한다).
 * rule: check-api-conventions.mjs 의 규칙 id · target: 부품 · 부품.prop · 이름
 */
export const allow = [
  // 제어 전용(defaultX 없음). value 생략이 "빈 값"으로 쓰이고 있어, Radix 식 비제어(value === undefined)를 넣으면
  // 앱이 값을 비울 때 동작이 바뀐다. 비제어를 더하려면 값 없음 표현부터 정한다.
  { rule: 'pair/no-default', target: 'Combobox.value', reason: '단일 모드는 value 생략 = 선택 없음(제어). 다중 모드만 내부 상태가 있어 두 모드가 다르다' },
  { rule: 'pair/no-default', target: 'DatePicker.value', reason: 'value 생략 = 빈 기간. 앱이 필터를 비울 때 undefined 를 보낸다' },
  // 제어 전용이 설계다 — 앱이 값을 반드시 소유한다.
  { rule: 'pair/no-default', target: 'FileUpload.value', reason: '업로드 상태·진행률·오류를 앱이 항목마다 갱신한다(DESIGN.md §11.7)' },
  { rule: 'pair/no-default', target: 'Pagination.page', reason: 'URL·조회 요청과 동기화는 앱이 맡는다(DESIGN.md §4.1)' },
  { rule: 'pair/no-default', target: 'Pagination.pageSize', reason: 'URL·조회 요청과 동기화는 앱이 맡는다(DESIGN.md §4.1)' },
  // 내부 상태가 이미 있어 defaultX 는 초기값 한 줄이면 된다. 다만 세 부품 모두 MCP get_component 응답 기준선
  // (docs/qa/fixtures/get-component-baseline.json · packages/mcp/server.test.mjs R28)에 고정돼 있어 응답 재승인과 함께 한다.
  { rule: 'pair/no-default', target: 'ClampText.expanded', reason: '비제어 상태는 있으나 defaultExpanded 없음. MCP 응답 기준선 재승인과 함께 더한다' },
  { rule: 'pair/no-default', target: 'MultiSelect.value', reason: '비제어 상태는 있으나 defaultValue 없음. MCP 응답 기준선 재승인과 함께 더한다' },
  { rule: 'pair/no-default', target: 'DataTable.selectedIds', reason: '비제어 상태는 있으나 defaultSelectedIds 없음. MCP 응답 기준선 재승인과 함께 더한다' },
  // open 이 필수 prop 이다. 비제어를 더하면 open 을 선택으로 풀어야 해 별도 작업으로 둔다.
  { rule: 'pair/no-default', target: 'Peek.open', reason: 'open·onOpenChange 가 필수인 제어 전용. 비제어 추가는 후속' },
  { rule: 'pair/no-default', target: 'MediaViewer.open', reason: 'open·onOpenChange 가 필수인 제어 전용. 비제어 추가는 후속' },
  { rule: 'pair/value-without-handler', target: 'Hint.open', reason: '앱이 조건으로 여는 일회성 안내라 닫힘만 onDismiss 로 알린다. onOpenChange 로 바꿀지 후속 결정' },
];
