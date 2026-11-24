import { EmptyState } from '@s2life/ui';

/**
 * 아직 채우지 않은 자리. 문안·시각 방향은 정해진 사람이 채운다 — 사이트가 임시 카피나 장식을 지어내지 않는다.
 * `who` 는 그 자리를 채울 근거(예: 디자인 총괄 결과 11/27).
 */
export function Pending({ who }: { who: string }) {
  return <EmptyState title="준비 중" description={who} />;
}
