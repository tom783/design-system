import type { Meta, StoryObj } from '@storybook/react-vite';
import { PageHeader, Button, StatusChip, Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '../index';
import { PageHeaderExample } from '../../docs/examples/page-header';
import primarySource from '../../docs/examples/page-header.tsx?raw';

const meta = { title: 'Components/PageHeader', component: PageHeader, tags: ['autodocs'], parameters: { manifest: ['PageHeader'] } } satisfies Meta<typeof PageHeader>;
export default meta;
type Story = StoryObj;
export const 사용법: Story = { parameters: { docs: { source: { code: primarySource.replace("from '../../src'", "from '@s2life/ui'"), language: 'tsx', type: 'code' } } }, render: () => <PageHeaderExample /> };
export const 기본: Story = { render: () => <PageHeader title="주문 목록" description="주문을 조회하고 관리합니다." /> };
export const 경로: Story = { render: () => <PageHeader title="주문 목록" breadcrumb={<Breadcrumb><BreadcrumbList>
  <BreadcrumbItem><BreadcrumbLink href="#sales">판매 관리</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator />
  <BreadcrumbItem><BreadcrumbPage>주문 목록</BreadcrumbPage></BreadcrumbItem>
</BreadcrumbList></Breadcrumb>} /> };
export const 상태: Story = { render: () => <PageHeader title="프로모션" status={<StatusChip tone="success">진행 중</StatusChip>} /> };
export const 여러액션: Story = { render: () => <PageHeaderExample /> };
export const 좁은폭: Story = { render: () => <div style={{ width: 280, maxWidth: '100%' }}><PageHeaderExample /></div> };
