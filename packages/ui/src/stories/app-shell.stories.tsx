import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppShell } from '../index';
import { AppShellExample } from '../../docs/examples/app-shell';
import primarySource from '../../docs/examples/app-shell.tsx?raw';
import { AppHeaderExample } from '../../docs/examples/app-header';
import headerSource from '../../docs/examples/app-header.tsx?raw';
import { PageHeader } from '../index';
const meta = { title: 'Components/AppShell', component: AppShell, tags: ['autodocs'], parameters: { manifest: ['AppShell'] } } satisfies Meta<typeof AppShell>;
export default meta;
type Story = StoryObj;
// 화면 높이는 iframe 안에서만 채워 문서 본문의 높이가 뷰포트에 종속되지 않게 한다.
export const 사용법: Story = { parameters: { fullBleed: true, docs: { story: { inline: false, iframeHeight: 640 }, source: { code: primarySource
  .replace("from '../../src'", "from '@s2life/ui'").replace("from '../../src/icons'", "from '@s2life/ui/icons'"), language: 'tsx', type: 'code' } } }, render: () => <AppShellExample /> };

export const 좁은화면서랍: Story = { parameters: { fullBleed: true, docs: { story: { inline: false, iframeHeight: 640 } } },
  render: () => <AppShellExample narrowNavigation="drawer" /> };

// 상단 바 — header(왼쪽 묶음)·headerEnd(오른쪽 묶음), 높이 64 고정. 네 폭·두 테마·토스트·권한 없음은 Screens/AppHeader.
export const 상단바: Story = { parameters: { fullBleed: true, docs: { story: { inline: false, iframeHeight: 420 }, source: { code: headerSource
  .replace("from '../../src'", "from '@s2life/ui'").replace("from '../../src/icons'", "from '@s2life/ui/icons'"), language: 'tsx', type: 'code' } } },
  render: () => <AppHeaderExample><PageHeader title="캠페인 편집" /></AppHeaderExample> };
