import type { Meta, StoryObj } from '@storybook/react-vite';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator,
  Tabs, TabsList, TabsTrigger, TabsContent } from '../index';

const meta = {
  title: 'Components/Navigation',
  tags: ['autodocs'],
  parameters: { manifest: ['Tabs', 'TabsList', 'TabsTrigger', 'TabsContent', 'Breadcrumb', 'BreadcrumbList',
    'BreadcrumbItem', 'BreadcrumbLink', 'BreadcrumbPage', 'BreadcrumbSeparator', 'BreadcrumbEllipsis'] },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const 경로와탭: Story = {
  render: () => <div className="space-y-4">
    <Breadcrumb><BreadcrumbList>
      <BreadcrumbItem><BreadcrumbLink href="#orders">주문 목록</BreadcrumbLink></BreadcrumbItem>
      <BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>주문 상세</BreadcrumbPage></BreadcrumbItem>
    </BreadcrumbList></Breadcrumb>
    <Tabs defaultValue="summary">
      <TabsList aria-label="주문 정보"><TabsTrigger value="summary">요약</TabsTrigger><TabsTrigger value="shipping">배송</TabsTrigger></TabsList>
      <TabsContent value="summary">주문 금액과 상품을 확인합니다.</TabsContent>
      <TabsContent value="shipping">운송장과 배송 일정을 확인합니다.</TabsContent>
    </Tabs>
  </div>,
};
