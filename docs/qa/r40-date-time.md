# R40 · DatePicker 날짜+시각

DatePicker를 확장했다. 새 공개 컴포넌트와 날짜 라이브러리는 없으며 패키지 버전은 유지한다.
예약 발행·발송·캠페인 시작은 일시, 기간 필터는 기존 날짜 입력을 쓴다.

## API와 확정 규칙

```ts
// DatePickerProps의 판별 유니온에서 발췌
{ mode: 'single'; value?: Date; onChange: (value: Date | undefined) => void;
  time?: true | { step: 1 | 5 | 10 | 15 | 30 } }
| { mode?: 'range'; value?: DateRange;
    onChange: (value: DateRange | undefined) => void; time?: never }
```

`true`의 간격은 10분이다. range와 time 조합, mode를 생략한 time, step 20은
`date-picker.typecheck.ts`의 `@ts-expect-error`로 실제 타입 오류를 확인한다.
입력 초안·한글 IME·blur/Enter 확정·Field 오류 포털은 기존 구조를 쓴다.
`YYYY-MM-DD HH:mm`을 엄격하게 왕복 파싱해 24:00·60분·존재하지 않는 날짜나
DST 지역 시각을 거부한다. 분은 최근접 칸이며 동률은 올림이다. 동률에서 예약을
더 일찍 실행하는 것을 피하려는 정책이다. 13:14→13:10, 13:15→13:20(10분),
12월 31일 23:59→다음 해 1월 1일 00:00이다. 원본 Date는 변경하지 않는다.
맞춘 일시·간격을 아이콘+문장+polite 상태 영역으로 알리고 입력의 aria-describedby로 연결한다.
Enter 뒤 blur가 와도 같은 값을 다시 발행해 알림을 지우지 않는다.

날짜·빠른 선택은 기존 시각을 보존한다. 첫 선택은 09:00으로 통일했다.
오늘의 다음 칸을 쓰면 같은 미래 날짜도 작성 시점에 따라 다른 시각이 들어가므로
작성 시점과 독립적인 업무 시작 시각을 택했다. 날짜 선택 뒤에는 레이어를 유지하고
시·분과 완료를 조작한다. 모든 값은 브라우저 지역 시간이며 ISO·UTC 변환은 앱 책임이다.
DST로 선택한 날짜에 기존 시각이 존재하지 않으면 조용히 옮기지 않고 오류를 알린다.
외부 제어값은 자동 보정하지 않는다. 분 칸 밖의 외부 값도 표시하며 분 Select에
현재 분을 비활성 항목으로 남겨 빈 선택으로 보이지 않게 한다.

## 선택 방식과 치수 측정

2026-11-22 지정된 `docs/qa/browser.mjs`의 headless-shell로 사전 측정을 시도했다.
`FATAL:content/browser/sandbox_parameters_mac.mm:87 ... Input/output error (5)`와
CDP 연결 실패로 렌더 측정은 수행할 수 없었다. GUI Chrome이나 `--no-sandbox`로
우회하지 않았다. 아래는 **CoreText 글꼴 계측과 소스의 항목 수·치수 산술**이며,
브라우저 실측·키보드 동작 통과를 주장하지 않는다.

| 후보 | 비교 근거 | 결정 |
|---|---|---|
| 시·분 Select 2개 | 닫힌 시각 조작 Tab 지점 2개. 기본 후보는 시 24개+분 6개, step 30은 24+2개. 시·분을 분리하면 항상 두 자리 24시간 숫자로 표시한다 | 채택. 기존 Select의 키보드·포커스 복귀를 재사용 |
| 펼친 목록 | 기본 30개·step 1이면 84개. 기존 32px 최소 조작 높이를 세로로 합하면 960·2,688px. 작은 달력에 목록 스크롤과 roving 키보드 처리를 더해야 한다 | 제외 |
| 네이티브 type=time | 단일 입력의 이점이 있지만 공개 HTML 입력 속성에 24시간 표시 강제 옵션이 없다. 지역 설정의 표시 형식을 맡기면 명시적 00–23 계약을 제어할 수 없다 | 제외 |

시·분은 순서가 고정된 숫자이므로 일반적인 긴 텍스트 선택지의 검색보다
Home/End·화살표·숫자 탐색을 쓰는 기존 Select를 택했다. Select의 일반적인 20개 초과
개발 경고는 변경하지 않았다. 실제 날짜→시→분 Tab 경로는 작성한 하네스에서 검증한다.

macOS CoreText로 저장소의 PretendardVariable.ttf를 등록하고 wght=400(본문)·500(오류),
고정폭 숫자를 지정해 계측했다. 글꼴의 기본 PostScript 이름은 PretendardVariable-Thin이지만
가변 굵기 축을 명시하며, 시스템 글꼴·Arial도 함께 측정한다.

| 문자열 | 크기 | Pretendard | 시스템 글꼴 | Arial |
|---|---:|---:|---:|---:|
| YYYY-MM-DD HH:mm | 14px | 139.80px | 144.46px | 140.26px |
| 2026-11-15 23:50 | 14px | 122.38px | 124.71px | 109.50px |
| YYYY-MM-DD HH:mm 형식으로 입력하세요. | 13px | 243.04px | 249.88px | 242.28px |
| 시·분 두 자리 숫자 | 14px | 17.20px | 17.34px | 15.57px |

시각 입력의 placeholder 최대 144.46+입력 여백·경계 26+버튼 38+간격 4=212.46px.
오류는 최대 249.88+아이콘 16+간격 4+자간 여유 5 미만=275px 미만이다.
두 요구를 함께 담도록 **최소 폭 280px**을 택했다. 날짜만 single 240px·range 306px는 유지한다.
Select는 두 자리 최대 17.34+여백 24+아이콘 16+간격 8+경계 2=67.34px여서
최소 80px로 둔다. 가용 폭이 커지면 입력과 Select도 늘어난다. 고정 폭으로 잠그지 않는다.

재현 명령(추가 설치 없음, 저장소 루트·macOS):

```sh
mkdir -p .qa-shots/r40-measurement
swift -module-cache-path .qa-shots/r40-measurement/module-cache docs/qa/r40-date-time-measure.swift
```

## MCP 예산

카탈로그는 compact UTF-8 전송값으로 **79,679→80,286바이트**다.
회귀 단정은 80,500바이트(여유 214), 목록은 19,122→19,130·단정 19,400(270),
최대 상세는 DataTable 4,576→4,576·단정 4,800(224)이다.
생성기의 전체 예산 90,000·24,000·6,000바이트도 그대로 검사한다.
DatePicker 키워드에 날짜 시간·시각·예약 발행·일시, 규칙 한 줄과 time 속성을 추가했고
공개 컴포넌트 수 111개를 유지한다. 문서는 매니페스트를 렌더하며 규칙을 별도 MDX로 복제하지 않는다.

## 검증과 실행 범위

- `npm_config_offline=true pnpm verify`: **통과**. 토큰·생성/경계·타입(금지 조합 포함)·단위 **321건**·Storybook 정적 빌드.
- `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify`: 독립 클라이언트 **82건 통과**. 새 검색 4건과 time 상세 규칙 1건 포함.
- `node --check docs/qa/date-time-render-verify.mjs`와 `git diff --check`: 구문·공백 확인.
- 단위 검사: 엄격 파싱, 다섯 step, 동률·시/일/월/년 경계, 원본 불변, 날짜·빠른 선택의 시각 보존, 첫 09:00, 서울 지역 입력·뉴욕 DST.

브라우저 하네스는 요구대로 **작성만** 했다. `run-all.mjs`에 등록했으며,
입력·오류·보정 알림·자정·처음 선택·날짜/빠른 선택 시각 보존·실제 Tab 경로·Field ARIA·
280px 값/placeholder/오류 줄 잘림·다크·기존 날짜 입력·전체 콘솔 오류 0을 검사한다.
레이어를 실제 포인터로 연다. 하네스의 항목이 작성돼 있다는 사실과 실행 통과는 구분한다.
사용자는 브라우저 실행이 가능한 환경에서 `pnpm qa`로 전체 검증을 수행할 수 있다.

## 변경 파일

- `packages/ui/src/components/date-picker/date-picker.tsx`: 판별 유니온·시각 입력·Select·알림·치수·Field 배선.
- `packages/ui/src/components/date-picker/date-value.ts`: 지역 일시 파싱·최근접 분 칸·날짜에 시각 합치기.
- `packages/ui/src/components/date-picker/date-value.test.mjs`: 파싱·분 칸·지역 시간 단위 검사.
- `packages/ui/src/components/date-picker/date-picker.typecheck.ts`: 허용 API·금지 조합 타입 검사(신규).
- `packages/ui/docs/examples/date-picker.tsx`: 테스트 장치 없는 독립 Primary 예시(신규).
- `packages/ui/src/stories/date-picker.stories.tsx`: 사용법·시각·30분·첫 선택·오류·Field·다크.
- `docs/research/component-intent.mjs`·`packages/mcp/manifest.json`: 지침·키워드·생성된 API/슬롯.
- `packages/mcp/build.test.mjs`·`packages/mcp/server.test.mjs`·`packages/mcp/match.test.mjs`: 크기·직렬화 기준선·검색 회귀 검사.
- `docs/qa/mcp-client-verify.mjs`: 새 검색·시각 API의 독립 MCP 검사.
- `docs/qa/date-time-render-verify.mjs`(신규)·`run-all.mjs`·`docs-render-verify.mjs`: 하네스·실행 등록·Primary 코드 검사.
- `docs/qa/r40-date-time-measure.swift`·이 문서(신규): 재현 가능한 치수 계측과 결정 근거.
- `DESIGN.md`·`CHANGELOG.md`: 날짜 절과 0.3.1 미게시 항목.

range+시각·시간대 변환·새 의존성·버전 범프·커밋·푸시는 수행하지 않았다.
