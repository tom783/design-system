// ui 부품이 JS 로 직접 읽는 토큰 목록과 그 생성 상수(packages/ui/src/lib/runtime-tokens.ts)의 모양.
// 부품이 docs/research/tokens.json 을 import 하면 생성 JSON 전체(약 62kB — 대비 검증 결과까지)가 앱 번들에
// 그대로 들어갔다(목표 57: layer.ts · use-delayed-loading.ts). 부품은 이 목록의 값만 담은 생성 상수를 쓴다.
// 부품이 새 토큰 값을 JS 에서 읽어야 하면 여기 이름을 더하고 `pnpm tokens` 로 다시 만든다.
// tokens-build.mjs 가 파일을 쓰고, runtime-tokens.test.mjs 가 커밋된 파일이 tokens.json 과 같은지 본다
// (CI checks 는 tokens.json 의 동기를 git diff 로 보므로 이 시험이 생성 상수까지 잇는다).
export const UI_RUNTIME_TOKENS = {
  sizing: ['anchor-edge-pad'],
  loading: ['loading-delay', 'loading-min-visible'],
};
export const UI_RUNTIME_TOKENS_PATH = 'packages/ui/src/lib/runtime-tokens.ts';

export function renderUiRuntimeTokens(json) {
  const picked = Object.fromEntries(Object.entries(UI_RUNTIME_TOKENS).map(([group, names]) => [group, Object.fromEntries(names.map((name) => {
    const value = json[group]?.[name];
    if (typeof value !== 'string') throw new Error(`ui 런타임 토큰 ${group}.${name} 이 tokens.json 에 없다`);
    return [name, value];
  }))]));
  return [
    '// 생성 파일 — docs/research/tokens-build.mjs(`pnpm tokens`)가 만든다. 손으로 고치지 마라.',
    '// 목록은 docs/research/ui-runtime-tokens.mjs. tokens.json 전체를 부품이 import 하면 앱 번들에 그대로 들어간다.',
    `export const runtimeTokens = ${JSON.stringify(picked, null, 2)} as const;`,
    '',
  ].join('\n');
}
