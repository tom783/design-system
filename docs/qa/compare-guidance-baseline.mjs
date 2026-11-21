import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const fixture = 'docs/qa/fixtures/get-component-baseline.json';
const fields = new Set(['purpose', 'useWhen', 'dont', 'rules']);
const allowed = path => path[0] === '__list'
  ? path.length === 3 && path[2] === 'purpose'
  : path.length === 2 && fields.has(path[1]);

// JSON을 다시 직렬화해 비교하면 공백·키 순서 변화를 놓친다.
// 허용된 값의 원문 범위만 가리고 나머지 UTF-8 바이트를 그대로 비교한다.
export function maskGuidance(raw) {
  let index = 0;
  const ranges = [];
  const space = () => { while (/\s/.test(raw[index] ?? '') && index < raw.length) index++; };
  function string() {
    const start = index++;
    while (index < raw.length) {
      if (raw[index] === '\\') index += 2;
      else if (raw[index++] === '"') return JSON.parse(raw.slice(start, index));
    }
    throw new Error('닫히지 않은 JSON 문자열');
  }
  function value(path) {
    space(); const start = index;
    if (raw[index] === '"') string();
    else if (raw[index] === '{') {
      index++; space();
      while (raw[index] !== '}') {
        const key = string(); space(); assert.equal(raw[index++], ':');
        value([...path, key]); space();
        if (raw[index] !== ',') break;
        index++; space();
      }
      assert.equal(raw[index++], '}');
    } else if (raw[index] === '[') {
      index++; space(); let item = 0;
      while (raw[index] !== ']') {
        value([...path, item++]); space();
        if (raw[index] !== ',') break;
        index++; space();
      }
      assert.equal(raw[index++], ']');
    } else {
      const token = /^(?:true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(raw.slice(index));
      assert.ok(token); index += token[0].length;
    }
    if (allowed(path)) ranges.push([start, index]);
  }
  JSON.parse(raw); value([]); space(); assert.equal(index, raw.length);
  for (const [start, end] of ranges.sort((a, b) => b[0] - a[0])) raw = raw.slice(0, start) + raw.slice(end);
  return Buffer.from(raw);
}

export function compareGuidanceBaseline(before, after) {
  const old = JSON.parse(before), next = JSON.parse(after);
  assert.equal(Object.keys(old).length, 9);
  assert.deepEqual(Object.keys(next), Object.keys(old));
  assert.equal(old.__list.length, 99);
  assert.equal(next.__list.length, old.__list.length);
  assert.deepEqual(maskGuidance(after), maskGuidance(before), '허용 지침 값 밖의 원문 바이트가 달라졌다');
  const details = Object.keys(old).filter(name => name !== '__list');
  const changed = details.filter(name => JSON.stringify(old[name]) !== JSON.stringify(next[name]));
  const listPurposes = next.__list.filter((item, i) => item.purpose !== old.__list[i].purpose).length;
  return { details: details.length, changedDetails: changed, listPurposes, preservedBytes: maskGuidance(before).length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // 비교할 이전 파일을 인자로 줄 수 있다. 기본은 이번 작업 전 HEAD의 고정 픽스처다.
  const before = process.argv[2] ? await readFile(resolve(process.argv[2]), 'utf8')
    : execFileSync('git', ['show', `HEAD:${fixture}`], { cwd: root, encoding: 'utf8' });
  const result = compareGuidanceBaseline(before, await readFile(resolve(root, fixture), 'utf8'));
  assert.ok(result.changedDetails.length > 0 || result.listPurposes > 0, '실제 지침 변경이 있어야 한다');
  console.log(`기준선 비교 통과: 상세 ${result.details}개 중 ${result.changedDetails.length}개(${result.changedDetails.join(' · ')}) 지침만 변경 · 목록 ${result.listPurposes}개 purpose 변경 · 나머지 ${result.preservedBytes}바이트 동일`);
}
