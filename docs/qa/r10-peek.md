# R10 검증 기록

Peek은 `useGuideChild`로 트리거 참조와 기존 ref를 병합하고,
`useAnchored({ dialog: true })`로 배치·popover 최상위 레이어·Escape·포커스 이동·폴백을 재사용한다.
공유 코어와 안내 스타일은 수정하지 않았다. 닫을 때의 트리거 포커스 복귀는 Peek이 담당한다.

`decodeRecord`는 null/빈 문자열, 깨진 JSON, 객체가 아닌 값, 필드 누락·타입 불일치,
유한수가 아닌 시각/스크롤, 음수 스크롤, TTL 초과, 미래 시각을 거부한다.
시계/TTL이 유한하지 않거나 TTL이 음수여도 null이다. TTL 경계는 유효하다.

저장소 해소와 모든 연산은 try/catch 안에서 실행한다. SSR은 window를 읽지 않는다.
읽은 기록을 삭제한 다음에만 반환하므로 삭제 실패 때도 null을 반환한다.
기본 TTL은 10분이고 storage와 now를 주입할 수 있다.
스크롤 위치 또는 가상 행 인덱스의 복원 정책은 앱이 결정한다.

확인한 항목:

- `pnpm verify` 통과: 토큰 검증, 타입 검사, Storybook 빌드.
- Peek 테스트 30건 통과: decodeRecord 23건과 복귀 훅 7건.
- 전체 순수 함수·복귀 훅 테스트 118건 통과.
- `git diff --check`와 렌더 검증 스크립트 구문 검사 통과.

브라우저 검증은 **미완료**다. 실행 환경의 로컬 서버 소켓 바인딩이
`PermissionError: [Errno 1] Operation not permitted`로 차단됐다.
셀 좌표 실측값, 기존 안내·테이블 스토리 통과 여부는 아직 보고할 수 없다.
`다녀온행` 및 `다녀온행-선택됨` play는 모든 셀의 x/y/width와 내용 x/y를
숫자로 복사해 마커 전후 동일성을 단언하며, 하네스가 결과 JSON에 저장한다.

브라우저 실행이 가능한 로컬 환경에서 확인하는 순서:

1. 저장소 루트에서 `pnpm verify`를 실행한다.
2. 별도 터미널에서 `python3 -m http.server 6099 --bind 127.0.0.1 --directory storybook-static`을 실행한다.
3. `node docs/qa/peek-render-verify.mjs .context/r10/peek`를 실행한다.
4. `node docs/qa/render-verify.mjs .context/r10/table`을 실행한다.
5. `node docs/qa/guide-render-verify.mjs .context/r10/guide`를 실행한다.
6. 개발 경고도 검증하려면 별도 터미널에서 `pnpm storybook`을 실행한 뒤
   `STORYBOOK_BASE_URL=http://localhost:6006 node docs/qa/peek-render-verify.mjs .context/r10/peek-dev`를 실행한다.
7. `peek-results.json`의 pass와 coordinates를 확인한다. 실패한 스토리는 대응 스크린샷으로 확인한다.
8. 완료 후 두 서버 터미널에서 Ctrl+C로 종료한다.

의도적으로 하지 않은 작업: 라우팅/history 조작, 훅 내부 스크롤 복원,
수정·삭제 액션, 호버 열기, 새 의존성 설치, 공유 배치 코어·토큰·설계 문서 변경,
커밋·푸시.
