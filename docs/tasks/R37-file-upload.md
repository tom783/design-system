# R37 · 파일 업로드

근거: `docs/research/ui-coverage-review.md` P1 4번. 도그푸딩 4 에서 AI 가 "대표 이미지" 점선 상자를 직접 그렸다.
CMS 대표 이미지 · 이커머스 상품 이미지 · 엑셀 일괄 등록이 모두 필요로 한다. 0.3.1 후보. **버전은 올리지 마라.**

---

## 0. 전제

- 전송(업로드 요청·재시도·취소)은 **앱 몫**이다. 컴포넌트는 고르기 · 검증 · 목록 · 미리보기 · 진행/오류 표시를 맡는다
- 이미 있는 것을 쓴다: Thumbnail(미리보기 — 비율 예약), ProgressTrack(진행률), Field(레이블·설명·오류 자리),
  Button, StatusChip/아이콘+문장+색(오류 — 색만으로 말하지 않는다)

## 1. FileUpload

- 놓는 곳(드롭존): 클릭·Enter·Space 로 파일 선택 창, 끌어 놓기. 끌어 올리는 동안 상태가 보인다(경계·바탕 — 토큰으로)
- 제어형: `value`(항목 목록) · `onValueChange`. 항목 = 파일 + 앱이 채우는 `progress?`·`error?`·`status?`
  (구조는 근거와 함께 정해라 — 소비자가 업로드 진행을 쉽게 연결할 수 있어야 한다)
- 검증: `accept`(형식) · `maxSize` · `multiple` · `maxFiles`. 거절된 파일은 이유를 **한국어로**("JPG·PNG만 올릴 수 있습니다",
  "5MB 이하만 올릴 수 있습니다", "최대 3개까지") — 어디에 보일지(Field 오류 자리 vs 항목 옆)는 측정해서 정해라
- 목록: 파일명(긴 이름 말줄임 + 전체 이름 보존) · 크기(1.2MB) · 상태 · 삭제 버튼(aria-label "{파일명} 삭제").
  이미지면 Thumbnail 미리보기(object URL 은 사용이 끝나면 해제 — 메모리 누수 금지)
- 단일 이미지 모드(대표 이미지): 고르면 드롭존 자리에 미리보기 + "바꾸기"·"삭제"
- 접근성: 숨긴 `input type=file` 은 레이블과 연결, 드롭존은 키보드로 열린다, 추가·삭제를 polite 로 알린다,
  Field 안에서 `aria-describedby`·`aria-invalid` 가 이어진다
- 붙여넣기·폴더 업로드·이미지 편집은 범위 밖

## 2. 문서·MCP·스토리

- DESIGN 폼 절에 파일 업로드: 전송은 앱 몫, 검증 문구, 진행 표시
- MCP intent, keywords("파일 업로드", "이미지 업로드", "첨부", "드래그 앤 드롭", "대표 이미지", "엑셀 업로드")
- 스토리: 여러 파일(진행률 흉내) · 대표 이미지 단일 · 거절(형식·크기·개수) · 업로드 실패 항목 · 비활성 · Field 안.
  Primary 는 깨끗한 예시(R26b) — 가짜 업로드 함수를 쓰되 테스트 장치는 넣지 않는다

## 3. 검증

`npm_config_offline=true pnpm verify`, `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify`.

하네스 (작성만): CDP 로 파일 주입(`DOM.setFileInputFiles`) · 드래그 이벤트로 끌어 놓기 · 키보드로 선택 창 트리거(입력에
click 이 가는지) · 거절 문구 · 목록 표시(이름 말줄임·크기) · 삭제 후 포커스 · object URL 해제(만든 수 = 해제 수) ·
Field 연결 · polite 알림 · 다크 · 콘솔 오류 0.

## 4. 하지 마라

- 전송 구현, 외부 업로드 라이브러리 추가, 버전 범프

## 5. 보고할 것

1. 바꾼 파일 2. 공개 API·항목 구조 3. 거절 문구 위치 결정 근거 4. object URL 수명 관리(코드 인용) 5. verify·MCP 결과 6. CHANGELOG
