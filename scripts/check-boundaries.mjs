import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, sep } from 'node:path';

const root = fileURLToPath(new URL('../packages/ui/src/', import.meta.url));

// 패키지 자기 참조(`@s2life/ui`, `@s2life/ui/icons` …)는 package.json exports 를 거쳐
// packages/ui/dist/ 로 해석된다. dist 는 빌드 뒤에만 생기고 .gitignore 대상이라,
// 오래된 dist 가 남은 로컬에서는 typecheck 가 통과하고 깨끗한 CI 에서는 TS2307 로 깨진다
// (실측: R31 63573f3 ~ R43b cbf86e0, 원격 CI 11회 연속 실패). 소스 안에서는 상대 경로를 쓴다.
//
// 문자열 안의 예시 코드(`.replace("from '../../src'", "from '@s2life/ui'")`)는 잡지 않도록
// import·export 키워드가 문장 첫머리(줄 시작·공백·`;`·`}` 뒤)에 있을 때만 본다.
const SELF = String.raw`@s2life\/ui(?:\/[^'"]*)?`;
const SELF_REFERENCE = new RegExp([
  String.raw`(?:^|[\s;}])(?:import|export)\b[^'"\x60;]*?\bfrom\s*(['"])${SELF}\1`, // import … from · export … from
  String.raw`(?:^|[\s;}])import\s*(['"])${SELF}\2`,                                  // import '…' (부수효과)
  String.raw`\b(?:import|require)\s*\(\s*(['"])${SELF}\3`,                          // import('…') · require('…')
].join('|'), 'm');

export function findSelfReference(source) {
  return SELF_REFERENCE.exec(source)?.[0].trim() ?? null;
}

// 부품이 공개 진입점(src/icons.ts · src/index.ts)을 가져오면 안 된다. icons 는 `export * from 'lucide-react'` 라
// 단일 번들에서 lucide 전체(2,102개)가 이름공간 객체로 복사됐다 — Button 하나만 가져온 앱이 1,097kB 였다(목표 57).
// index 는 모든 부품을 끌고 온다. 부품은 'lucide-react' 와 부품 파일을 직접 가져온다. 스토리는 앱 예시라 예외다.
const RELATIVE_IMPORT = /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"](\.{1,2}\/[^'"]*)['"]/g;
const PUBLIC_ENTRIES = { icons: "'lucide-react'", index: '부품 파일' };

export function findPublicEntryImport(source, file, sourceRoot = root) {
  for (const [, spec] of source.matchAll(RELATIVE_IMPORT)) {
    const target = resolve(dirname(file), spec).replace(/\.[cm]?[jt]sx?$/, '');
    for (const entry of Object.keys(PUBLIC_ENTRIES)) if (target === resolve(sourceRoot, entry)) return { spec, entry };
  }
  return null;
}

export async function checkBoundaries(sourceRoot = root) {
  const errors = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) { await walk(path); continue; }
      if (!/\.[cm]?[jt]sx?$/.test(entry.name)) continue;
      const source = await readFile(path, 'utf8');
      const local = relative(sourceRoot, path);
      // 정적 import·재export뿐 아니라 동적 import와 require도 같은 경계를 따른다.
      if (!local.startsWith(`internal${sep}`) && /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"](?:@radix-ui\/|cmdk(?:\/|['"]))/.test(source))
        errors.push(`${local}: Radix·cmdk는 src/internal/을 통해서만 사용하세요.`);
      if (/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"][^'"]*\.css['"]/.test(source))
        errors.push(`${local}: JS의 CSS import 대신 공통 CSS 진입점을 사용하세요.`);
      const publicEntry = local.startsWith(`stories${sep}`) ? null : findPublicEntryImport(source, path, sourceRoot);
      if (publicEntry)
        errors.push(`${local}: 공개 진입점 \`${publicEntry.spec}\` 를 가져오면 앱 번들이 그 진입점 전체를 받습니다 — ${PUBLIC_ENTRIES[publicEntry.entry]}에서 직접 import 하세요.`);
      // 생성 JSON 전체(대비 검증 결과까지 약 62kB)가 앱 번들에 들어간다. 부품은 lib/runtime-tokens.ts(생성 상수)를 쓴다.
      if (!local.startsWith(`stories${sep}`) && /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"][^'"]*tokens\.json['"]/.test(source))
        errors.push(`${local}: tokens.json 을 import 하면 앱 번들에 JSON 전체가 들어갑니다 — lib/runtime-tokens.ts(docs/research/ui-runtime-tokens.mjs 목록)를 쓰세요.`);
      const self = findSelfReference(source);
      if (self)
        errors.push(`${local}: 자기 참조 \`${self}\` 는 빌드 산출물(dist)로 해석됩니다 — 상대 경로로 import 하세요(스토리는 ../icons·../index, 부품은 lucide-react·부품 파일).`);
    }
  }
  await walk(sourceRoot);
  if (errors.length) throw new Error(`의존 경계 검사 실패:\n${errors.join('\n')}`);
}
