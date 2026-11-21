# R28 · 소비자 지침 정리 결과

버전은 유지했다. `purpose`는 기능 한 문장으로, `dont`는 앱이 피할 실수로 정리했다.
긴 규칙은 생각별로 나눠 각 항목에 DESIGN.md 출처를 붙였다. 검색 결과에 맞춘 문구 조정은 하지 않았다.

## 바꾼 파일

- `docs/research/component-intent.mjs`: 소비자 지침 원본과 규칙 배열 작성 방식.
- `packages/mcp/manifest.json`: 원본에서 재생성한 산출물.
- `docs/research/consumer-guidance.mjs`: 금지어·120자·컴포넌트 사이 규칙 복제 검사와 항목별 허용 목록.
- `docs/research/mcp-build.mjs`: 생성 전 8번 게이트로 소비자 지침 검사 연결.
- `docs/qa/consumer-guidance.test.mjs`: 네 필드·부품·길이 경계·복제·정확한 허용 범위 검사.
- `packages/mcp/build.test.mjs`: 생성 게이트의 판별력 검사.
- `docs/qa/fixtures/get-component-baseline.json`: 상세 8개 지침과 기존 목록의 purpose 갱신.
- `packages/mcp/server.test.mjs`: R26 dontDelta 제거, 구조화 결과와 text 직렬화 비교 유지.
- `docs/qa/compare-guidance-baseline.mjs`: 허용 지침 값 이외 원문 바이트 비교 스크립트.
- `docs/qa/compare-guidance-baseline.test.mjs`: API·목록·공백 변조를 비교기가 거부하는지 검사.
- `DESIGN.md`: 인용 절에서 빠져 있던 지식 보존과 새 게이트 설명.
- `CHANGELOG.md`: `0.3.1 — 미게시`의 `바뀐 지침 (MCP)`에 기록.
- `docs/tasks/R28-consumer-guidance.md`: 이 결과 보고.

## 검사 판별력

작업 전 R27(`400f4e6`)의 `packages/mcp/manifest.json`에 새 검사 함수를 적용했다.
종료 코드 1로 실패했으며 총 **45건**, 영향 컴포넌트는 **22개**였다.

- 금지어 **28건**: 항목과 금지어의 조합으로 센다. 한 항목에 같은 단어가 여러 번 있어도 1건이다.
- 120자 초과 **15개 규칙**.
- 중복 **2종**: 화면 예시 문구가 Combobox·RadioGroup·Switch·FormFlow에,
  토큰 공유 문구가 CardSkeleton·ListSkeleton·FormSkeleton·ChartSkeleton에 각각 복제되어 있었다.

수정 후 102개 항목에서 위반 **0건**이다. 규칙은 55개에서 92개로 나뉘었고 최대 길이는 **85자**다.
부품은 저장 원본을 검사하므로 부모에게서 복원되는 공통 규칙은 복제로 세지 않는다.

## DESIGN.md로 옮기거나 인용 절에 보강한 지식

원래 인용 절에 구체적인 설명이 없던 것만 보강했다. 다른 절에만 있던 지식은 인용 절에도 연결했다.

- §2.3: DropdownMenu의 목록·Portal 부품을 포털에 배치한다는 설명.
- §2.5: Toaster의 명시적 테마·OS 변경 추적과 오류 유지.
- §6: Button asChild가 단일 링크 안에 양쪽 아이콘을 보존하는 동작.
- §6: 공개 export와 SELECTION_COLUMN_ID 사용 원칙.
- §7.5.6: EmptyState의 `role="status"`(기존 §14.2의 내용).
- §7.5.6: ChartFrame이 컨테이너 폭을 측정해 자식에 제공하는 책임.
- §11.1: DatePicker의 초안·확정값 분리와 blur·Enter 확정.
- §11.4: Select의 Field 연결 대상·내부 Enter 처리·38px 트리거·포털 목록(기존 §4·§16.5도 참조).
- §16.5: DialogContent·AlertDialogContent의 내용·오버레이 포털 렌더링.
- §17.1: Input 경계의 border-field 의미 토큰(기존 §2.4의 내용).
- §17.4: Checkbox의 네이티브 입력과 포커스·체크·혼합 상태 신호.

나머지 제거한 구현 지식은 기존 인용 절 안에 있었다. 대조 범위는 다음과 같다.

- Carousel·CarouselSlide: §23.1의 스크롤·현재값 판정·점·순번·Tab 경로,
  §23.2의 재생 중단·재개·낭독, §23.3의 동작 줄이기 처리.
- MediaViewer: §22.1의 popup·floating 구현, §22.2의 예약 상자·로딩·오류·영상 속성,
  §22.3의 PiP 기능 탐지·사용자 클릭·해제.
- Collapsible·ClampText: §21의 ARIA·높이 전환·자식 제거·forceMount,
  넘침 측정·관찰자·글꼴 완료·글 id·즉시 전환.
- Combobox: §18.2의 필터·정규화·조합 처리, §18.3의 활성 후보·선택값·포커스,
  §20.2의 태그 치수·키보드·내부 스크롤, §11.5의 선택 후 이동 헬퍼.
- MultiSelect: §20.1의 높이·요약·목록 역할·활성 후보·키보드·전체 해제.
- Tabs·Breadcrumb·Dialog·AlertDialog: §16.1~16.4의 선택 표시·포커스·패널 역할,
  경로 역할·복원·초기 포커스·닫기 보호·danger 토큰 재사용.
- Input·Textarea·RadioGroup·Switch·Label: §17.1~17.5의 휠 가드·내장 버튼·날짜 제약,
  높이 계산·IME·라디오 순환·선택 표시·스위치 역할·필수 표시 역할.
- StatusChip·Card·Avatar: §2.3의 상태 실루엣, §5의 평면 구조, §2.4의 의미 토큰.
- DataTable: §4의 최소 너비·넘침·전체 값 보존.
- TrendBand·BulletRow·CompositionArea·ErrorState: §7.5.3의 SVG·의미 토큰·직접 라벨·요약,
  §7.5.6의 오류 역할·틴트·아이콘.
- Thumbnail·SkeletonText·로딩 프리셋: §9.2의 동일 치수·토큰·0.65em·짧은 마지막 줄.
- ProgressTrack·TaskProgress: §9.1·§9.3의 대기 시간과 진행률·모션 예산.
- Tooltip·Field·FormFlow: §10.4의 접근성 연결, §11.4의 표시 순서, §11.5의 이동·제출 계약.
- 네 컴포넌트에서 제거한 화면 예시 복제 문장: §19.2·§19.3의 등록·오류·저장·복귀 조립.

소비자에게 필요한 내용이 purpose·dont·props와 겹칠 때는 rules에서 반복하지 않았다.
Toaster의 오류 자동 닫기 금지, 진행률·장기 작업 선택 기준 등은 해당 소비자 필드와 DESIGN.md에 남아 있다.

## 기준선 비교

실행: `node docs/qa/compare-guidance-baseline.mjs`

결과: **상세 8개 지침만 변경 · 목록 44개 purpose 변경 · 나머지 32,019바이트 동일**.
상세의 purpose·useWhen·dont·rules와 목록 항목의 purpose 값만 가린 뒤 원문 UTF-8 바이트를 비교했다.
상세·목록 개수와 순서도 보존했다. props·slots·import·source·kind 등은 공백까지 동일하다.
비교기 테스트는 props 타입·slots 순서·source·목록 순서·import·항목 추가·공백 변경을 거부한다.
서버 테스트의 구조화 결과와 text 직렬화 비교는 유지했고 dontDelta는 새 픽스처에 흡수했다.

## 허용 목록

**없음.** 모든 실제 지침에서 금지어를 제거할 수 있었다.
향후 예외는 컴포넌트명·필드·문구 전체·금지어·이유가 정확히 일치할 때만 허용된다.
사용되지 않는 예외도 실패시킨다.

## 검증과 예산

- `npm_config_offline=true pnpm verify`: **종료 코드 0**. 토큰 생성·MCP 8종 게이트·타입·단위 **277/277**·Storybook 빌드 통과.
- 기존 `match.test.mjs` **47/47** 통과. 테스트와 매칭 코드는 수정하지 않았다.
- 의도 원본과 생성 매니페스트를 작업 전과 비교해 지침 4필드 외 모든 데이터가 동일함을 확인했다.
  principles·keywords·props·slots·related·버전은 그대로다.
- 매니페스트 전송 예산: components **69,423 → 69,157 / 80,000바이트**,
  전체 **138,710 → 138,444 / 160,000바이트**.
- `git diff --check` 통과.
- Storybook 빌드의 500kB 초과 청크 안내는 비차단 경고로 남았다.

## 판단이 애매했던 문장

- **태그 2줄·내부 스크롤**은 남겼다. 앱이 선택 수에 따라 높이를 계속 늘리는 구현을 막는다.
  28px·24px·58px·38→68px와 포커스 구현은 §20.2로 돌렸다.
- **빈 입력 Backspace 두 번**은 남겼다. 앱의 즉시 삭제 처리와 충돌할 수 있다.
- **Carousel의 재개 조건**은 남겼다. 직접 조작 후 영구 종료와 호버·포커스의 일시 정지를 앱이 구분해야 한다.
  낭독 속성·관찰자·스크롤 함수는 §23에만 둔다.
- **ClampText의 전체 DOM·복사**는 남겼다. 앱이 복사 전용 글을 중복 생성할 이유가 없다.
  넘침 측정 방식과 펼친 중 임시 측정은 §21에만 둔다.
- **차트 summary의 접근성 이름**을 명시했다. 화면에 결론도 보이게 하려면 앱이 문장을 따로 배치해야 한다.
- **Textarea의 조합 중 높이 변경 금지 문구**는 autoGrow 사용 지침으로 바꿨다.
  앱이 높이를 재구현할 이유를 없애고, 한글 조합 중에도 자라는 근거는 §17.2에 보존했다.

컴포넌트 코드·principles·검색어·매칭 테스트·버전은 변경하지 않았다.
`pnpm qa` 실행과 커밋·푸시는 하지 않았다.
