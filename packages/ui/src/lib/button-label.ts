import * as React from 'react';

/**
 * Button children 의 맨 앞·맨 뒤 아이콘을 말줄임 라벨 밖으로 꺼낸다.
 *
 * 라벨은 말줄임을 위해 `<span class="truncate">` 안에 든다. `<Button><Check />저장</Button>` 처럼
 * 아이콘을 children 에 넣으면(shadcn 습관) svg 가 그 span 안에 들어가는데, preflight 가 svg 를
 * `display: block` 으로 두어 아이콘이 한 줄을 차지하고 라벨이 아래로 밀렸다. 0.3.0 게시본부터
 * 그랬다(배포 리허설 실측: 38px 버튼에서 아이콘 위 31px · 라벨 위 50px — 아이콘이 버튼 위로 1px 나간다).
 * 저장소 예시는 모두 leadingIcon 을 써서 드러나지 않았다. 꺼낸 아이콘은 버튼의 flex 항목이 되어
 * leadingIcon 과 같은 자리(gap 8px·세로 가운데)에 선다.
 *
 * 아이콘으로 보는 것: `<svg>` 요소와 컴포넌트 요소(lucide 아이콘 등). `<strong>`·`<span>` 같은 HTML 글
 * 요소는 라벨에 남긴다. 남는 것 중에 아이콘이 아닌 것이 있을 때만 꺼낸다 — 아이콘 하나뿐이면 그대로다.
 */
export function splitIconChildren(children: React.ReactNode): {
  lead?: React.ReactNode; label: React.ReactNode; trail?: React.ReactNode;
} {
  const parts = React.Children.toArray(children);
  const isIcon = (node: React.ReactNode) =>
    React.isValidElement(node) && (node.type === 'svg' || typeof node.type !== 'string');
  const lead = parts.length > 1 && isIcon(parts[0]) ? parts.shift() : undefined;
  const trail = parts.length > 1 && isIcon(parts[parts.length - 1]) ? parts.pop() : undefined;
  if ((!lead && !trail) || !parts.some((node) => !isIcon(node))) return { label: children };
  return { lead, label: parts, trail };
}
