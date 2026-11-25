import * as React from 'react';
import {
  NotificationCenter, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsList, TabsTrigger,
  type NotificationCenterProps, type NotificationItem,
} from '../../src';

const minute = 60_000;
/** 예시 알림. 권한·폴링·등급 판단은 앱이 하고 결과(읽음·급함·기한 등급)만 넘긴다. */
export function sampleNotifications(now: number = Date.now()): NotificationItem[] {
  return [
    { id: 'cancel-a', source: '판매관리 · 스토어 A', title: '취소 요청 2건', time: now, href: '#orders?status=cancel', urgent: true,
      count: 2, deadline: { text: '2시간 초과', level: 'overdue' } },
    { id: 'order-a', source: '판매관리 · 스토어 A', title: '신규 주문 37건', time: now - 12 * minute, href: '#orders?status=new',
      count: 37, deadline: { text: '4시간 남음' } },
    { id: 'return-b', source: '물류관리 · 스토어 B', title: '반품 입고 확인 5건', time: now - 3 * 60 * minute, href: '#returns', read: true,
      count: 5, deadline: { text: '1영업일 이내', level: 'soon' } },
  ];
}

/**
 * 알림 센터 — header 오른쪽 묶음(headerEnd)의 사용자 메뉴 바로 앞에 둔다. 벨이 패널을 연다(1024 이상 팝오버, 미만 Sheet).
 * 탭·필터는 기존 Tabs·Select 를 넣고, 앱이 탭·필터를 적용한 목록을 items 로 넘긴다.
 */
export function NotificationCenterExample(props: Partial<NotificationCenterProps>) {
  const [tab, setTab] = React.useState('todo');
  const [items, setItems] = React.useState(() => sampleNotifications(typeof props.now === 'number' ? props.now : props.now?.getTime()));
  const unread = items.filter(item => !item.read);
  return <NotificationCenter
    count={unread.length}
    urgent={unread.some(item => item.urgent)}
    items={tab === 'todo' ? items.filter(item => item.deadline) : items}
    emptyTitle="처리할 알림이 없습니다"
    emptyDescription="새로 처리할 일이 생기면 여기에 표시됩니다."
    onMarkAllRead={() => setItems(list => list.map(item => ({ ...item, read: true })))}
    settingsHref="#notification-settings"
    tabs={<Tabs value={tab} onValueChange={setTab}>
      <TabsList aria-label="알림 분류">
        <TabsTrigger value="todo">처리 필요</TabsTrigger>
        <TabsTrigger value="all">전체</TabsTrigger>
      </TabsList>
    </Tabs>}
    toolbar={<Select defaultValue="all">
      <SelectTrigger aria-label="출처" className="w-56 max-lg:h-[var(--tap-min)] max-lg:w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">모든 제품 · 모든 스토어</SelectItem>
        <SelectItem value="sales">판매관리</SelectItem>
        <SelectItem value="logistics">물류관리</SelectItem>
      </SelectContent>
    </Select>}
    {...props} />;
}
