# R42b · 세그먼트 항목이 공간이 있어도 잘린다

R42 하네스 9/9(내가 고친 하네스 결함 2건 — Enter 의 keypress `text:'\r'`, Storybook 숨은 props 표 골격) 후 스크린샷에서 찾았다. 버전은 올리지 마라.

## 실측

- 900px 화면, `fullWidth` 없는 "표 보기 · 카드 보기" → **"카드 …" 로 말줄임**. 그룹 폭 약 188px — 내용 폭보다 좁다
- 원인: 항목 `flex: 1 1 0; min-width: 0` 를 `inline-flex` 그룹에 두면 기본 폭 0 이 그룹의 내용 폭 계산에 들어가 그룹이 최소로 줄어든다

## 고칠 것

- `fullWidth` 가 아니면 항목은 **내용 폭**(`flex: 0 1 auto`, `min-width: 0` 유지) — 공간이 있으면 잘리지 않고, 부모가 좁을 때만 줄어들며 말줄임
- `fullWidth` 는 지금처럼 같은 폭으로 채운다
- 좁은폭 스토리(180px 상자 + fullWidth)의 말줄임은 의도대로 유지

## 하네스 (`segmented-control-render-verify.mjs` — 실행은 내가 한다)

- 기본·아이콘라벨·보기전환·다크 스토리(넓은 화면): 모든 라벨 `scrollWidth <= clientWidth`(잘림 0), 그룹 폭 ≥ 항목 내용 폭 합
- 좁은폭: 지금 단정(가로 넘침 0·전체 이름 보존) 유지

## 검증

`npm_config_offline=true pnpm verify`, `node docs/qa/mcp-client-verify.mjs .qa-shots/mcp-client-verify`.

## 하지 마라

- 공개 API 변경, 버전 범프, 다른 단정 변경
