import { useState } from 'react';
import { cn } from '../../lib/cn';
import { initials } from './initials';
import './avatar.css';

export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  decorative?: boolean;
  className?: string;
}
export function Avatar({ name, src, size = 'md', decorative = false, className }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string>();
  // 요청이 바뀌면 이전 요청의 실패를 즉시 버린다.
  const [previousSrc, setPreviousSrc] = useState(src);
  if (previousSrc !== src) { setPreviousSrc(src); setFailedSrc(undefined); }
  const failed = previousSrc === src && failedSrc === src;
  return <span data-slot="avatar" data-size={size} className={cn('avatar', className)} aria-hidden={decorative || undefined}>
    {src?.trim() && !failed ? <img data-slot="avatar-image" src={src} alt={decorative ? '' : name} onError={() => setFailedSrc(src)} />
      : <span data-slot="avatar-fallback" role="img" aria-label={decorative ? undefined : name}>{initials(name)}</span>}
  </span>;
}
