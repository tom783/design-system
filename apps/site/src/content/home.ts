// 첫 화면 — 웹디자이너 시안 r4(디자인 총괄 검수 통과, 오너 11/25 "이대로 넣기")의 문구를 그대로 옮겼다. 고칠 때는 시안 쪽과 함께 고친다.
// - 데이터로 정해지는 것(부품 수·버전·npm 게시판)은 여기 두지 않는다 — 페이지가 manifest·package.json(virtual:site-meta)에서 읽는다.
// - 원칙 이름은 디자인 컨셉 모듈(concept.ts principles)의 것을 그대로 쓴다. 여기에는 첫 화면용 한 줄 요약만 원칙 id 로 붙인다.
// - 문구 속 수치(선 두께)는 손으로 쓰지 않고 tokens.json 에서 넣는다(docs/qa/site.test.mjs 가 이 파일도 본다).
// - 표본 주문 6행은 시안의 예시 데이터다(실제 업무 데이터가 아니다).
import { principles, type Principle } from './concept';
import { tokens } from '../data/tokens';

const border = tokens.shape['border-width'];
if (!border) throw new Error("tokens.json 에 shape['border-width'] 가 없다 — 첫 화면 원칙 요약의 수치를 넣지 못했다");

export const homeHero = {
  title: '하루 종일 보는 화면을 위한 디자인 시스템',
  lead: '판매·물류·마케팅·CMS의 표와 폼을, 사람도 AI도 같은 부품으로 만듭니다.',
  install: '설치하기',
  connect: 'AI로 연결하기(MCP)',
};

/** 첫 화면 원칙 요약 — 원칙 id → 한 줄. 이름은 concept.ts 에서 온다. */
const PRINCIPLE_SUMMARY: Record<Principle['id'], string> = {
  lines: `${border} 경계와 바탕 차이로 영역을 나눕니다.`,
  red: '주요 동작과 오류는 서로 다른 빨강으로 구별합니다.',
  color: '상태는 아이콘과 문장을 함께 씁니다.',
  values: '긴 값은 보존하고 금액은 자릿수를 맞춥니다.',
  hands: '입력 오류는 고치는 즉시 풀어 줍니다.',
};

export const homePrinciples = {
  title: '디자인 원칙',
  items: principles.map((principle) => {
    const summary = PRINCIPLE_SUMMARY[principle.id];
    if (!summary) throw new Error(`첫 화면 원칙 요약에 '${principle.id}' 가 없다 — concept.ts 에 원칙이 늘면 여기에도 한 줄을 붙인다`);
    return { id: principle.id, name: principle.name, summary };
  }),
};

/**
 * AI 흐름 세 줄. 표본이 이 순서로 조립된다(필터 → 행 → 상태 칩).
 * parts 는 매니페스트에 있는 부품 이름이어야 한다 — 페이지가 확인하고 부품 페이지로 잇는다.
 */
export const homeAiSteps = {
  title: 'AI로 주문 목록 조립하기',
  request: { label: '사용자 요청', value: '“주문 목록 화면 만들어 줘”' },
  parts: { label: 'MCP 추천 부품', value: ['FilterBar', 'DataTable', 'StatusChip'] as const },
  result: { label: '렌더 결과', value: '검색·금액·상태가 있는 주문 목록' },
};

export type OrderStatus = 'paid' | 'ready' | 'shipping' | 'done';
export interface SampleOrder { id: string; recipient: string; amount: number; status: OrderStatus }

export const homeSample = {
  app: '주문 관리',
  /** 표본 머리의 부품 링크 순서(시안 그대로) — 뒤에 "로 조립" */
  partLinks: ['DataTable', 'FilterBar', 'StatusChip'] as const,
  partLinksSuffix: '로 조립',
  title: '주문 목록',
  menuGroup: '판매',
  otherMenu: '상품 관리',
  searchLabel: '주문 검색',
  searchPlaceholder: '주문번호·수취인 검색',
  readyFilter: { id: 'ready', label: '출고 대기' },
  readyOnly: '출고 대기만',
  columns: { id: '주문번호', recipient: '수취인', amount: '결제 금액', status: '상태' },
  status: {
    paid: { label: '결제 완료', tone: 'info' },
    ready: { label: '출고 대기', tone: 'warning' },
    shipping: { label: '배송 중', tone: 'neutral' },
    done: { label: '배송 완료', tone: 'success' },
  } satisfies Record<OrderStatus, { label: string; tone: 'info' | 'warning' | 'neutral' | 'success' }>,
  rows: [
    { id: 'ORD-20481', recipient: '김민수', amount: 38900, status: 'ready' },
    { id: 'ORD-20480', recipient: '박서연', amount: 12900, status: 'paid' },
    { id: 'ORD-20479', recipient: '이도윤', amount: 64500, status: 'ready' },
    { id: 'ORD-20478', recipient: '최지우', amount: 21800, status: 'shipping' },
    { id: 'ORD-20477', recipient: '정하은', amount: 129000, status: 'done' },
    { id: 'ORD-20476', recipient: '강서준', amount: 45600, status: 'ready' },
  ] satisfies SampleOrder[],
};
