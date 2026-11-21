import {
  PageHeader, Button, StatusChip, Breadcrumb, BreadcrumbList,
  BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage,
} from '../../src';

export function PageHeaderExample() {
  return <PageHeader title="주문 목록" description="주문 기간과 처리 상태로 주문을 조회하고 관리합니다."
    breadcrumb={<Breadcrumb><BreadcrumbList>
      <BreadcrumbItem><BreadcrumbLink href="#sales">판매 관리</BreadcrumbLink></BreadcrumbItem>
      <BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>주문 목록</BreadcrumbPage></BreadcrumbItem>
    </BreadcrumbList></Breadcrumb>}
    status={<StatusChip tone="info">실시간</StatusChip>}
    actions={<><Button>내보내기</Button><Button variant="primary">주문 등록</Button></>} />;
}
