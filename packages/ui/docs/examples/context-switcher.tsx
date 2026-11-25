import * as React from 'react';
import { ContextSwitcher, ContextSwitcherGroup, type ContextSwitcherItem, type ContextSwitcherProps } from '../../src';
import { Layers2, Megaphone, ShoppingCart, Store, Truck } from '../../src/icons';

/** 제품 전환 — 링크 항목(href). 고르면 그 제품 화면으로 이동하고, ⌘/Ctrl·가운데 클릭은 새 탭이다. 앱은 주소에서 value 를 정한다. */
export const productItems: ContextSwitcherItem[] = [
  { value: 'marketing', label: '마케팅관리', href: '#marketing', icon: <Megaphone /> },
  { value: 'sales', label: '판매관리', href: '#sales', icon: <ShoppingCart /> },
  { value: 'logistics', label: '물류관리', href: '#logistics', icon: <Truck /> },
];
/** 스토어 전환 — 선택 항목. 고르면 패널을 닫고 트리거에 진행 표시, 실패하면 이전 스토어로 돌아오며 오류 토스트. */
export const storeItems: ContextSwitcherItem[] = ['A', 'B', 'C'].map(name => ({ value: name.toLowerCase(), label: `스토어 ${name}`, icon: <Store /> }));
export const allStores: ContextSwitcherItem = { value: 'all', label: '전체 스토어', icon: <Store /> };

/** 서버에 맥락을 바꾸라고 요청하는 자리. Promise 를 돌려주면 끝날 때까지 트리거가 진행 중이다. */
const switchStore = () => new Promise<void>(resolve => setTimeout(resolve, 600));

export function ProductSwitcher(props: Partial<ContextSwitcherProps>) {
  return <ContextSwitcher kind="제품" icon={<Layers2 />} items={productItems} defaultValue="marketing" {...props} />;
}
export function StoreSwitcher(props: Partial<ContextSwitcherProps>) {
  return <ContextSwitcher kind="스토어" items={storeItems} allItem={allStores} defaultValue="a" onValueChange={switchStore}
    guide={{ text: '다른 스토어가 필요하면 관리자에게' }} {...props} />;
}

/**
 * header 왼쪽 — 전환기 두 개를 묶는다(사이 구분선). 1024 미만은 둘째가 아이콘 + 툴팁, 그래도 넘치면 "맥락" 한 트리거로 접힌다.
 * 저장하지 않은 입력이 있으면 onBeforeSwitch 에서 event.preventDefault() 로 막고 확인을 받는다.
 */
export function ContextSwitcherExample() {
  return <ContextSwitcherGroup>
    <ProductSwitcher />
    <StoreSwitcher />
  </ContextSwitcherGroup>;
}
