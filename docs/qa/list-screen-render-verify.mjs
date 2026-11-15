import { launchBrowser, storybook } from './browser.mjs';
const browser = await launchBrowser({ port: 9463, outDir: '.qa-shots/r13' });
let failed = 0;
try {
  const { open } = storybook(browser);
  const index = await (await fetch('http://localhost:6099/index.json')).json();
  const stories = Object.values(index.entries).filter(e => e.type === 'story' && /^(Components\/(Select|DropdownMenu|Toast|DatePicker)|Screens\/ListScreen)$/.test(e.title));
  if (stories.length !== 15) throw new Error(`R13 스토리가 누락됐습니다: 예상 15개, 실제 ${stories.length}개`);
  for (const story of stories) {
    const result = await open(story.id);
    const complete = await browser.ev('!!document.querySelector(\'[data-play-complete="true"]\')');
    const ok = !result.sbError && result.errors.length === 0 && complete;
    if (!ok) failed++;
    const detail = await browser.ev(`JSON.stringify(document.querySelector('#storybook-root')?.dataset)`);
    console.log(`${ok ? '✓' : '✗'} ${story.name} ${detail} ${[result.sbError, ...result.errors].filter(Boolean).join(' | ')}`);
    if (!ok) await browser.shot(story.id);
  }
  // 명시적 테마가 OS보다 우선하고 미지정 테마는 OS를 따르는지 양쪽 OS에서 반복한다.
  for (const scheme of ['light', 'dark']) {
    await browser.cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] });
    const result = await open('components-toast--다크');
    const complete = await browser.ev('!!document.querySelector(\'[data-play-complete="true"]\')');
    const ok = !result.sbError && result.errors.length === 0 && complete;
    if (!ok) failed++;
    console.log(`${ok ? '✓' : '✗'} 시스템 ${scheme} 테마 3상태`);
  }
  console.log(`${stories.length + 2}개 검사, ${stories.length + 2 - failed}개 통과`);
} finally { browser.close(); }
process.exitCode = failed ? 1 : 0;
