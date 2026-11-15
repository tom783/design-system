import assert from 'node:assert/strict';
import { launchBrowser, storybook } from './browser.mjs';
const browser = await launchBrowser({ port: 9463, outDir: '.qa-shots/r13' });
let failed = 0;
try {
  const { open } = storybook(browser);
  const index = await (await fetch('http://localhost:6099/index.json')).json();
  const stories = Object.values(index.entries).filter(e => e.type === 'story' && /^(Components\/(Select|DropdownMenu|Toast|DatePicker)|Screens\/ListScreen)$/.test(e.title));
  if (stories.length !== 15) throw new Error(`R13 스토리가 누락됐습니다: 예상 15개, 실제 ${stories.length}개`);
  // 예외가 없어도 play는 실패할 수 있다. 완료 표식을 각 스토리마다 별도로 단언한다.
  async function verifyPlay(id, label = id) {
    let complete = false;
    try {
      const result = await open(id);
      complete = await browser.ev("document.querySelector('#storybook-root')?.dataset.playComplete === 'true'");
      assert.equal(complete, true, `${id}: playComplete가 true여야 합니다`);
      assert.equal(result.sbError, null, `${id}: Storybook 오류`);
      assert.deepEqual(result.errors, [], `${id}: 브라우저 오류`);
      console.log(`✓ ${label} playComplete: true`);
    } catch (error) {
      failed++;
      console.error(`✗ ${label} playComplete: ${complete} — ${error.message}`);
      await browser.shot(id);
    }
  }
  for (const story of stories) await verifyPlay(story.id);
  // 명시적 테마가 OS보다 우선하고 미지정 테마는 OS를 따르는지 양쪽 OS에서 반복한다.
  for (const scheme of ['light', 'dark']) {
    await browser.cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] });
    await verifyPlay('components-toast--다크', `시스템 ${scheme} 테마 3상태`);
  }
  console.log(`${stories.length + 2}개 검사, ${stories.length + 2 - failed}개 통과`);
} finally { browser.close(); }
process.exitCode = failed ? 1 : 0;
