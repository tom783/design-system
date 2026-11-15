import { useState, type CSSProperties } from 'react';
import { ImageOff } from 'lucide-react';
import { Skeleton } from '../loading/skeleton';
import { cn } from '../../lib/cn';

export interface ThumbnailProps {
  src?: string;
  alt: string;
  ratio?: CSSProperties['aspectRatio'];
  className?: string;
}
export function Thumbnail({ src, alt, ratio = '1/1', className }: ThumbnailProps) {
  const [request, setRequest] = useState<{ src: string | undefined; status: 'loading' | 'loaded' | 'error' }>({ src, status: 'loading' });
  // 렌더 중 요청 식별자를 맞춰 src 교체 직후에도 이전 성공/실패 화면이 노출되지 않게 한다.
  if (request.src !== src) setRequest({ src, status: 'loading' });
  const status = request.src === src ? request.status : 'loading';
  const setStatus = (status: 'loaded' | 'error') => setRequest({ src, status });
  const present = Boolean(src?.trim());
  const fallback = !present || status === 'error';
  return <div data-slot="thumbnail" data-state={fallback ? 'error' : status} className={cn('thumbnail', className)} style={{ aspectRatio: ratio }} aria-busy={present && status === 'loading'}>
    {fallback ? <span data-slot="thumbnail-fallback" role="img" aria-label={alt}><ImageOff aria-hidden="true" size={20} /></span> : <>
      {status === 'loading' && <Skeleton height="100%" />}
      <img data-slot="thumbnail-image" src={src} alt={alt} loading="lazy" decoding="async" style={{ visibility: status === 'loaded' ? 'visible' : 'hidden' }}
        onLoad={() => setStatus('loaded')} onError={() => setStatus('error')} />
    </>}
  </div>;
}
