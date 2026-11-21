import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppShell } from '../index';
import { AppShellExample } from '../../docs/examples/app-shell';
import primarySource from '../../docs/examples/app-shell.tsx?raw';
const meta = { title: 'Components/AppShell', component: AppShell, tags: ['autodocs'], parameters: { manifest: ['AppShell'] } } satisfies Meta<typeof AppShell>;
export default meta;
type Story = StoryObj;
// 화면 높이는 iframe 안에서만 채워 문서 본문의 높이가 뷰포트에 종속되지 않게 한다.
export const 사용법: Story = { parameters: { fullBleed: true, docs: { story: { inline: false, iframeHeight: 640 }, source: { code: primarySource
  .replace("from '../../src'", "from '@s2life/ui'").replace("from '../../src/icons'", "from '@s2life/ui/icons'"), language: 'tsx', type: 'code' } } }, render: () => <AppShellExample /> };
