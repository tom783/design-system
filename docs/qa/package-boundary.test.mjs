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
