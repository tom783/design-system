import { useState } from 'react';
import { Pagination } from '../../src';

export function PaginationExample() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  return <Pagination page={page} pageSize={pageSize} totalCount={1234}
    onPageChange={setPage} pageSizeOptions={[20, 50, 100]} onPageSizeChange={setPageSize} />;
}
