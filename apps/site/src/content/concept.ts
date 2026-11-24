// 디자인 컨셉 — 디자인 총괄 문안 r0(2026-11-24)을 문장 그대로 옮겼다. 고칠 때는 문안 쪽과 함께 고친다.
// - 문안 속 수치(색·선 두께·대비·시간·색 차이)는 손으로 쓰지 않고 tokens.json 에서 넣는다. docs/qa/site.test.mjs 가
//   이 파일에 hex·ms·대비비·px 글자가 없는지 본다. 토큰에 없는 수치(문안이 든 예: 1,000행, 버린 후보의 측정값)는 문안 그대로다.
// - 문안의 출처 괄호는 Source 로 바꿔 DESIGN.md 해당 절 링크로 그린다(blocks/Text.tsx). 덧붙인 말은 note 로 문안 그대로.
// - 원칙 이름은 첫 화면 요약에서도 같은 문구로 쓴다 — 이 모듈의 principles 를 가져다 쓴다(다시 적지 않는다).
import type { Source } from '../blocks/Text';
import { tokens } from '../data/tokens';

function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`tokens.json 에 ${what} 이(가) 없다 — 디자인 컨셉 문안의 수치를 넣지 못했다`);
  return value;
}

const brand = must(tokens.semantic.light['action-primary-bg'], "semantic.light['action-primary-bg']");
const dangerAction = must(tokens.semantic.light['action-danger-bg'], "semantic.light['action-danger-bg']");
const separation = must(
  (tokens.verification.separation as { a: string; b: string; value: number; min: number }[] | undefined)
    ?.find((check) => check.a === brand.hex && check.b === dangerAction.hex),
  'verification.separation 의 브랜드 액션 vs 에러 액션',
);
const border = must(tokens.shape['border-width'], "shape['border-width']");
const contrastText = must((tokens.decisions.contrastFloor as { text?: number } | undefined)?.text, 'decisions.contrastFloor.text');
const durations = Object.entries(tokens.motion).filter(([name]) => name.startsWith('dur-')).map(([, value]) => Number.parseFloat(value));
if (durations.length === 0) throw new Error('tokens.json 에 motion dur-* 가 없다');
const durationRange = `${Math.min(...durations)}~${Math.max(...durations)}ms`;

export const conceptHead = {
  title: '디자인 컨셉',
  summary: '하루 종일 데이터를 보고 입력하는 사람을 위한, 조용하고 정확한 도구.',
  description: '판매·물류·마케팅·CMS 화면의 대부분은 표와 폼입니다. 그래서 이 시스템은 눈에 띄는 것보다 오래 봐도 지치지 않고, 값이 길어지고 행이 1,000개가 되어도 무너지지 않는 것을 먼저 정했습니다.',
};

export const character = {
  title: '성격 — 정밀 플랫',
  body: `그림자와 그라디언트 대신 **경계선 ${border}, 바탕 명도 차이, 4px 격자의 여백**으로 구조를 만듭니다. 요약 화면과 상세 화면도 다른 스타일이 아니라 같은 스타일 안에서 **밀도와 글자 크기**로 나눕니다. 규칙이 하나라서 어느 제품 화면이든 같은 회사의 도구로 읽힙니다.`,
  sources: [{ design: '1', note: '결정 1' }] satisfies Source[],
};

export interface Principle {
  /** 'lines' — 목차·링크 앵커(principle-lines) */
  id: string;
  /** 원칙 이름. 첫 화면 요약도 이 문구를 그대로 쓴다. */
  name: string;
  do: string;
  dont: string;
  why: string;
  sources: Source[];
}

export const principles: readonly Principle[] = [
  {
    id: 'lines',
    name: '구조는 선과 여백이 만든다',
    do: `평면 위 모든 요소는 그림자 없이 ${border} 경계와 바탕 차이로 나눈다. 그림자는 팝오버·모달처럼 **실제로 떠 있는 층**에만 쓴다.`,
    dont: '카드 그림자, 그라디언트, 2px 경계, 장식용 입체감.',
    why: '요소마다 붙는 장식은 행 수만큼 쌓여 1,000행 표에서 서로 간섭한다. 선과 여백은 밀도를 올려도 남고, 다크 테마도 색 토큰 교체만으로 끝난다.',
    sources: [{ design: '5' }],
  },
  {
    id: 'red',
    name: '빨강은 한 가지 뜻만 갖는다',
    do: `브랜드는 크림슨 \`${brand.hex}\`, 오류는 색상각과 단계를 내린 다른 빨강을 쓴다. 키보드 포커스는 브랜드도 오류도 아닌 **본문색과 같은 중립 고대비 링**이다.`,
    dont: '브랜드색으로 경고하기, 오류색과 비슷한 색으로 선택·포커스 표시하기.',
    why: `브랜드가 빨강이고 화면이 데이터면 빨강이 "우리"와 "문제"를 동시에 뜻한다. 후보 빨강을 측정해 오류와 가장 먼 크림슨을 골랐고(ΔE ${separation.value}, 내부 기준 ${separation.min}), 크림슨 포커스 링이 다크에서 오류처럼 보여 오너가 중립 링으로 바꿨다.`,
    sources: [{ design: '2.3' }, { design: '1', note: '포커스 링, 오너 11/22' }],
  },
  {
    id: 'color',
    name: '색은 혼자 말하지 않는다',
    do: '상태와 오류는 **아이콘 + 문장 + 색** 세 가지로 보인다. 선택·현재 표시는 가리키는 것에 따라 네 방식(현재 위치·선택된 데이터·모드·진행 단계)만 쓴다.',
    dont: '색만 바꿔 상태 알리기, 부품마다 새 선택 표시 만들기.',
    why: '색을 구별하기 어려운 사람과 흑백 인쇄·캡처에서도 같은 뜻이 읽혀야 한다. 선택 표시가 부품마다 다르면 사용자가 매번 다시 배운다.',
    sources: [{ design: '6', note: '규칙 1' }, { design: '6.1' }],
  },
  {
    id: 'values',
    name: '값이 길어져도 무너지지 않는다',
    do: `간격은 4px 격자, 값이 들어가는 자리는 **최소 너비 + 말줄임 + 전체 값 보존**, 금액은 고정폭 숫자로 자릿수를 맞춘다. 대비는 ${contrastText}:1 이상, 행간은 글자 크기에 따라 계산한다.`,
    dont: '값 자리에 고정 너비, "넉넉하게" 같은 말로만 정한 여백.',
    why: '실제 데이터는 상품명이 길고 금액 자릿수가 다르다. "여백을 넉넉하게"를 다시 잴 수 있는 숫자로 바꿔야 AI와 사람이 같은 화면을 만든다.',
    sources: [{ design: '3' }, { design: '4' }],
  },
  {
    id: 'hands',
    name: '반복하는 손을 아낀다',
    do: `상태 전환은 ${durationRange}로 짧게, 검증은 **늦게 혼내고 일찍 풀어준다**(입력 중엔 혼내지 않고, 고치면 바로 풀린다), 안내는 필요한 자리에서 거든다.`,
    dont: '하루 수백 번 누르는 버튼에 긴 애니메이션, 글자마다 빨개지는 폼, 기본으로 뜨는 제품 투어.',
    why: '물류 접수·주문 등록은 같은 일을 수백 번 한다. 키 입력 수와 기다림이 그대로 피로가 된다. 움직임 줄이기 설정을 켠 사람에게는 모션을 끈다.',
    sources: [{ design: '5', note: '모션' }, { design: '9' }, { design: '10' }, { design: '11' }],
  },
];

export interface BoundaryRow { decides: string; leaves: string }

/** 디자인 시스템이 정하는 것 / 정하지 않는 것 — 컨셉 페이지와 시작하기가 같은 데이터를 쓴다. */
export const boundary = {
  title: '디자인 시스템이 정하는 것 / 정하지 않는 것',
  headers: { decides: '정한다 (이 시스템)', leaves: '정하지 않는다 (각 서비스)' },
  rows: [
    { decides: '디자인 정의를 담은 UI 요소(부품)와 토큰 — 색·글자·간격·형태·모션', leaves: '그 요소로 만드는 화면의 UX·레이아웃' },
    { decides: '부품의 상태·오류·선택 표시·문구 규칙', leaves: '제품 규칙·정책·업무 흐름' },
    { decides: '앱 셸(사이드 메뉴·페이지 머리)의 자리', leaves: '메뉴에 무엇을 넣을지, 페이지 안 배치' },
  ] satisfies BoundaryRow[],
  note: '앱 **전체**를 이 시스템으로 만드는 것을 전제로 합니다(기존 앱 일부 화면에만 넣는 방식은 제공하지 않음). 패턴 페이지의 조립 화면은 부품 조합 예시일 뿐, 특정 제품의 규칙이 아닙니다.',
  sources: [{ text: '오너 11/24' }, { readme: '기본 설치: Tailwind 없이 사용' }, { text: '오너 11/23' }] satisfies Source[],
};

export interface DecisionRow { topic: string; chosen: string; rejected: string }

export const decisions = {
  title: '결정 기록 (오너·소유자가 고른 것만)',
  headers: { topic: '결정', chosen: '고른 것', rejected: '버린 것과 이유' },
  rows: [
    { topic: '시각 스타일', chosen: '정밀 플랫 단독', rejected: '요약·상세에 다른 스타일 → 규칙 둘, 유지비' },
    { topic: '브랜드색', chosen: `크림슨 \`${brand.hex}\``, rejected: '시그널 레드(오류와 ΔE 1.5 구별 불가)·버밀리온(4.4)' },
    { topic: '오류색 분리', chosen: '색상각 + 참조 단계 한 칸 내림', rejected: '색상각만 벌리기(ΔE 7대에 머묾)' },
    { topic: '테마', chosen: '라이트 우선, 다크 동시 지원', rejected: '밝은 사무 환경 + 인쇄·캡처 수요' },
    { topic: '포커스 링', chosen: '중립 고대비(본문색)', rejected: '크림슨 링 — 오류와 혼동(오너 11/22)' },
    { topic: '적용 범위', chosen: '앱 전체', rejected: '부품만 따로 넣는 CSS — 충돌·유지비(오너 11/23)' },
  ] satisfies DecisionRow[],
};
