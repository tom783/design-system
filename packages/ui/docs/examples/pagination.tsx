import { useState } from 'react';
import { Pagination } from '../../src';

// 표와 함께 쓴다(진행 표시는 표 스켈레톤이 맡는다, DESIGN §4.1). 조회 중에는 disabled로 이동만 막는다.
export function PaginationExample() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  return <Pagination page={page} pageSize={pageSize} totalCount={1234}
    onPageChange={setPage} pageSizeOptions={[20, 50, 100]} onPageSizeChange={setPageSize} />;
}
