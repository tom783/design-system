# R09 폼 검증 기록

Field, FormFlow/useFormFlow, useComposition, 검증 시점·다음 정지점 순수 함수와 스토리 11개를 추가했다.

- 조합 추적은 compositionstart/compositionend 이벤트와 ref만 사용한다. nativeEvent.isComposing과 혼용하지 않는다.
- Field는 자식 id를 우선하고, 오류 → 설명 → 기존 aria-describedby 순서로 중복 없이 연결한다. 기존 required와 aria-invalid도 보존하고 새 필수·오류 조건을 합친다.
- FormFlow의 onSubmit은 Promise를 반환할 수 있다. false 반환, 동기 preventDefault, 예외는 실패로 처리한다. 예외 UI는 onSubmitError로 앱이 담당한다. 제출 후 첫 오류에 포커스를 보내며, 오류 없는 성공에서만 restartOnSubmit을 적용한다.
- 한 줄 오류 높이를 예약한다. 여러 줄 오류는 내용을 자르지 않으므로 높이가 늘어날 수 있다.
- IME 스토리는 CompositionEvent로 시작·종료를 알리고 input 이벤트를 자모별로 발생시킨다. Enter에는 isComposing: true인 KeyboardEvent를 사용한다. 실제 IME 입력을 재현했다는 주장은 하지 않는다.

실행 확인: pnpm verify, 폼 단위 테스트 20건, 전체 단위 테스트 88건.

브라우저 실행은 환경의 소켓 bind 제한(PermissionError: Operation not permitted)으로 수행하지 못했다. 따라서 play 통과 및 높이 실측값은 미확인이다. CSS상 예약 자체는 필드당 20px이고, 새 오류 행의 간격 4px를 포함하면 오류 행이 아예 없는 구조 대비 필드당 24px 증가가 예상된다. 두 필드 예제에서는 48px 예상이며 **실측값이 아니다**.

## 브라우저 재검증 절차

1. 저장소 루트에서 `pnpm verify`를 실행한다.
2. 첫 터미널에서 `python3 -m http.server 6099 --bind 127.0.0.1 --directory storybook-static`을 실행하고 유지한다.
3. 두 번째 터미널에서 `node docs/qa/form-render-verify.mjs`를 실행한다. 로컬 Chrome과 Node 24를 사용하며 추가 패키지는 필요 없다.
4. 모든 스토리의 complete가 true이고 errors가 빈 배열인지 확인한다. 포커스 에뮬레이션은 스크립트에서 활성화한다.
5. `.context/form-qa/results.json`의 오류-레이아웃 metrics에서 reservedHeight(예약된 행 높이 합계), formHeight(예제 전체 높이), reservationIncrease(오류 행을 숨겼을 때와의 실제 높이 차)를 확인한다. 각 스토리 스크린샷도 같은 디렉터리에 저장한다.
6. 검증 후 첫 터미널에서 Ctrl+C로 서버를 종료한다.

새 의존성, 검증 규칙의 패키지 내장, 전역 키 리스너, 기존 Input·Checkbox API 변경, 안내·차트·테이블 변경, 커밋·푸시는 수행하지 않았다.
