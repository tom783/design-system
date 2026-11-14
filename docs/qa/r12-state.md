# R12 상태 컴포넌트와 기능 대체물

## 구현

- `packages/ui/src/components/state/{empty-state.tsx,state.css,index.ts}`: 독립된 EmptyState(status)·ErrorState(alert), graphic 슬롯, 선택적 설명·액션·재시도.
- `packages/ui/src/components/avatar/{avatar.tsx,avatar.css,initials.ts,initials.test.mjs,index.ts}`: 중립색 원형 아바타, 이미지 실패 폴백, 전체 이름 접근성, 장식 모드.
- `packages/ui/src/components/thumbnail/{thumbnail.tsx,thumbnail.css,index.ts}`: 비율 예약, 기존 Skeleton 재사용, 이미지 성공·실패 및 빈 src 처리.
- `packages/ui/src/components/chart/{chart-frame,trend-band,composition-area,bullet-row}.tsx`: 상태 공유, onRetry 전달, 높이 계산 통합.
- `packages/ui/src/components/data-table/data-table.tsx`: 상태 공유·emptyAction 추가·h-48 제거. 가상화·고정 컬럼·선택·내보내기 로직은 변경하지 않음.
- `packages/ui/src/index.ts`: 공개 export 추가.
- `packages/ui/src/stories/{state,avatar,thumbnail}.stories.tsx`: 역할·버튼·치수·이니셜·이미지 폴백 검증.
- `docs/qa/state-render-verify.mjs`, `docs/qa/run-all.mjs`: 새 스토리와 치수 검증을 공통 브라우저 하네스에 연결.
- `docs/research/component-intent.mjs`, `packages/mcp/manifest.json`: 공개 컴포넌트의 메타데이터 추가 및 재생성. 기존 필수 MCP export 검증을 유지하기 위한 변경.

## 높이와 이니셜 규칙

네 상태의 플롯 높이는 `chart-frame.tsx`의 `plotHeight`에서 계산한다. 플롯 차트는 유효한 height(기존 최소 100px 규칙 유지), 미지정·비정상 값은 `--chart-h-default`를 쓴다. 불릿은 정규화한 행 수 × 44px이다. 실제 데이터가 있는 정상 불릿은 실제 지표 수, 그 외에는 skeletonRows로 예약한다. 따라서 앱은 기존 규칙대로 skeletonRows를 실제 지표 수에 맞춰야 한다.

플롯의 block-size, 스켈레톤의 높이 변수, 정상 SVG의 높이가 같은 값을 사용한다. 빈 상태·오류는 해당 플롯 안을 채운다. 한 줄짜리 불릿처럼 상태 문구보다 작은 컨테이너는 내부 스크롤로 내용을 보존한다.

initials는 Unicode Script(Hangul·Han·Hiragana·Katakana) 중 하나라도 포함되면 공백을 제외한 뒤 두 글자를 쓴다. 그 외에는 앞 두 단어의 첫 글자를 대문자로 쓴다. Intl.Segmenter의 grapheme 단위로 잘라 서로게이트 페어뿐 아니라 결합 문자·ZWJ 이모지도 보존한다.

표의 빈 상태에는 h-48 대신 --state-min-h가 적용된다. 목표 높이는 192px이며 스토리와 하네스가 이를 단언한다. **이번 환경에서는 브라우저가 실행되지 않아 실제 높이는 측정하지 못했다.**

## 외형 변화

요청된 차트 상태 높이 고정·표의 빈 상태 액션 외에 다음 변화가 있다.

- 공통 EmptyState의 기본 Inbox 아이콘이 기존 표·차트의 빈 상태에도 나타난다.
- 상태 제목이 공통 본문 크기와 행간으로 통일되고, 그래픽·제목·선택적 액션이 세로 중앙 정렬된다. 기존 표 오류의 아이콘·문구 가로 배치도 공통 배치로 바뀐다.
- onRetry를 전달한 차트 오류에는 재시도 버튼이 생긴다.
- 192px보다 작은 차트 플롯에서는 상태 최소 높이를 컨테이너 높이에 맞춰 내부 스크롤한다.

## 검증 결과

- `pnpm verify`: 통과. 토큰 대비·의미 분리·테마, MCP 생성 검증, TypeScript, Storybook 빌드.
- `node --test packages/ui/src/components/avatar/*.test.mjs`: 17건 통과.
- `node --test packages/ui/src/lib/*.test.mjs packages/ui/src/components/*/*.test.mjs`: 135건 통과.
- `node docs/qa/mcp-client-verify.mjs`: 36건 통과.
- `git diff --check`: 통과.
- `pnpm qa`: 실행을 시도했으나 로컬 서버 포트 바인딩이 `Operation not permitted`로 차단됨.
- `docs/qa/browser.mjs`를 통한 별도 실행 확인: headless-shell이 `sandbox_parameters_mac.mm`의 `Input/output error (5)`로 종료되어 CDP 연결 실패.

따라서 새 스토리 play, 차트 네 상태의 실측 높이, 기존 R08 로딩-치수일치 13쌍, 기존 표·차트·로딩 브라우저 검증은 **미검증**이다. 빌드 성공을 브라우저 검증 성공으로 간주하지 않는다.

브라우저 실행이 가능한 환경에서는 저장소 루트에서 다음 순서로 실행한다.

```bash
pnpm verify
node --test packages/ui/src/components/avatar/*.test.mjs
node --test packages/ui/src/lib/*.test.mjs packages/ui/src/components/*/*.test.mjs
pnpm qa
```

pnpm qa는 빌드 결과를 제공할 서버와 공통 browser.mjs를 통해 전체 하네스를 실행하며 새 R12 하네스도 포함한다. GUI Chrome을 직접 실행하지 않는다.

## 의도적으로 하지 않은 것

일러스트·SVG 자산·아바타 색상 팔레트·새 의존성을 추가하지 않았다. 토큰 생성기·토큰 파일·DESIGN.md·AGENTS.md를 수정하지 않았다(pnpm verify의 토큰 재생성 결과도 원본과 동일). 가상화·고정 컬럼·선택·내보내기 로직, 다른 AI 설정은 건드리지 않았다. 커밋·푸시하지 않았다.
