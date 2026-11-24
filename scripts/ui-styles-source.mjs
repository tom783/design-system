// 배포 styles.css 의 Tailwind 입력 — packages/ui/src/styles.css 를 자동 탐지 없이 src 만 훑게 바꾼다.
//
// 두 곳이 같은 변환을 쓴다.
// - scripts/build-ui.mjs: dist/styles.css 를 만든다(소비 앱이 받는 파일).
// - apps/site/vite.config.ts: 소개 사이트가 `@s2life/ui/styles.css` 를 가져올 때 같은 입력을 컴파일한다.
//   사이트가 소비 앱과 다른 유틸리티 집합으로 그려지면 "부품이 사이트에서는 되는데 앱에서는 깨진다" 를 못 본다.
// 변환할 줄이 없으면 조용히 자동 탐지 CSS 를 만들지 않고 멈춘다.
const ENTRY = '@import "tailwindcss";';

export function publishedStylesInput(styles) {
  if (!styles.includes(ENTRY)) throw new Error(`packages/ui/src/styles.css 에 ${ENTRY} 가 없다 — 배포 CSS 입력을 만들 수 없다`);
  return styles.replace(ENTRY, '@import "tailwindcss" source(none);\n@source "./";');
}
