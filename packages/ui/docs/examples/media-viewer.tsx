import { useState } from 'react';
import { Button, MediaViewer } from '../../src';

const banner = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#f5f5f5"/><text x="80" y="180" font-size="40" fill="#222222">사업장 출고 안내</text><text x="80" y="250" font-size="24" fill="#222222">오후 3시 결제 마감 · 당일 출고</text></svg>')}`;

export function MediaViewerExample() {
  const [open, setOpen] = useState(false);
  return <>
    <Button onClick={() => setOpen(true)}>출고 안내 배너 크게 보기</Button>
    <MediaViewer open={open} onOpenChange={setOpen} mode="popup" title="출고 안내 배너"
      media={{ type: 'image', src: banner, alt: '오후 3시 결제 마감, 당일 출고 안내', width: 800, height: 400 }} />
  </>;
}
