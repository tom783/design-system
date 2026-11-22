import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkBoundaries } from '../../scripts/check-boundaries.mjs';

for (const [label, source] of [
  ['정적 import', "import * as Select from '@radix-ui/react-select';"],
  ['재export', "export * from '@radix-ui/react-select';"],
  ['동적 import', "const Select = import('@radix-ui/react-select');"],
  ['require', "const Select = require('@radix-ui/react-select');"],
  ['cmdk 정적 import', "import { Command } from 'cmdk';"],
  ['cmdk 재export', "export * from 'cmdk';"],
  ['cmdk 동적 import', "const command = import('cmdk');"],
  ['cmdk require', "const command = require('cmdk');"],
  ['cmdk 하위 경로', "import { Command } from 'cmdk/subpath';"],
  ['CSS import', "import './component.css';"],
]) test(`경계 밖 ${label}를 차단한다`, async () => {
  const dir = await mkdtemp(join(tmpdir(), 's2-boundary-'));
  try {
    await writeFile(join(dir, 'component.tsx'), source);
    await assert.rejects(checkBoundaries(dir), /의존 경계 검사 실패/);
  } finally { await rm(dir, { recursive: true }); }
});
test('internal 재export와 컴포넌트의 경계 사용을 허용한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 's2-boundary-'));
  try {
    await mkdir(join(dir, 'internal'));
    await writeFile(join(dir, 'internal/select.ts'), "export * from '@radix-ui/react-select';");
    await writeFile(join(dir, 'internal/command.ts'), "export { Command } from 'cmdk';");
    await writeFile(join(dir, 'component.tsx'), "import * as Select from './internal/select'; import { Command } from './internal/command';");
    await checkBoundaries(dir);
  } finally { await rm(dir, { recursive: true }); }
});

// 자기 참조는 exports 를 거쳐 dist 로 해석된다 — 깨끗한 체크아웃(CI)에서 TS2307.
for (const [label, source] of [
  ['하위 경로 import', "import { Ellipsis } from '@s2life/ui/icons';"],
  ['루트 import', "import { Button } from '@s2life/ui';"],
  ['여러 줄 import', "import {\n  Button,\n  Input,\n} from '@s2life/ui';"],
  ['type import', "import type { ButtonProps } from '@s2life/ui';"],
  ['재export', "export * from '@s2life/ui/icons';"],
  ['부수효과 import', "import '@s2life/ui/styles.css';"],
  ['동적 import', "const icons = await import('@s2life/ui/icons');"],
  ['require', "const ui = require('@s2life/ui');"],
]) test(`자기 참조 ${label}를 차단한다`, async () => {
  const dir = await mkdtemp(join(tmpdir(), 's2-boundary-'));
  try {
    await writeFile(join(dir, 'story.tsx'), source);
    await assert.rejects(checkBoundaries(dir), /자기 참조/);
  } finally { await rm(dir, { recursive: true }); }
});
test('예시 코드 문자열 속 @s2life/ui 와 상대 경로 import 는 허용한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 's2-boundary-'));
  try {
    await writeFile(join(dir, 'story.tsx'), [
      "import { Ellipsis } from '../icons';",
      "import { Button } from '../index';",
      "const code = raw.replace(\"from '../../src'\", \"from '@s2life/ui'\").replace(\"from '../../src/icons'\", \"from '@s2life/ui/icons'\");",
      "const snippet = \"import { Button } from '@s2life/ui';\";",
      "import { other } from '@s2life/uikit';",
    ].join('\n'));
    await checkBoundaries(dir);
  } finally { await rm(dir, { recursive: true }); }
});
