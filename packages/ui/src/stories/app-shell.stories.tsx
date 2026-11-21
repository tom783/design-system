import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppShell } from '../index';
import { AppShellExample } from '../../docs/examples/app-shell';
import primarySource from '../../docs/examples/app-shell.tsx?raw';
const meta = { title: 'Components/AppShell', component: AppShell, tags: ['autodocs'], parameters: { manifest: ['AppShell'] } } satisfies Meta<typeof AppShell>;
export default meta;
type Story = StoryObj;
export const 사용법: Story = { parameters: { docs: { source: { code: primarySource
  .replace("from '../../src'", "from '@s2life/ui'").replace("from '../../src/icons'", "from '@s2life/ui/icons'"), language: 'tsx', type: 'code' } } }, render: () => <AppShellExample /> };
