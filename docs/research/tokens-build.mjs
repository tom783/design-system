// ============================================================================
//  디자인 토큰 생성기 — 단일 진실 원천 (Single Source of Truth)
// ----------------------------------------------------------------------------
//  이 스크립트가 tokens.css 를 생성한다. 색을 손으로 고치지 말고 이 파일의
//  수치를 고친 뒤 `node docs/research/tokens-build.mjs` 를 다시 실행한다.
//
//  R01 확정 사항 (2026-11-13)
//   · 스타일      : A 정밀 플랫 단독
//   · 브랜드      : 크림슨 OKLCH H14
//   · 에러 분리   : S1 색상각 분리 (danger 를 H34 로 이동 + 참조 단계 700)
//   · 테마        : 라이트 우선, 다크 동시 지원
//   · 대비 하한   : 본문 4.5:1 (WCAG 2.2 AA), 큰 텍스트·비텍스트 3:1
//   · 행간        : 글자 크기 반비례 함수 (본문 140~160% / 제목 117~140%)
// ============================================================================

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// ─────────────────────────────── 색공간 ───────────────────────────────
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const oklchToOklab = (L, C, H) => {
  const h = (H * Math.PI) / 180;
  return [L, C * Math.cos(h), C * Math.sin(h)];
};
function oklabToLinearSrgb(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
const gamma = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
const inGamut = ([r, g, b]) => { const e = 1e-4; return r >= -e && r <= 1 + e && g >= -e && g <= 1 + e && b >= -e && b <= 1 + e; };

// 색역을 벗어나면 채도만 이진 탐색으로 줄인다. 명도(L)와 색상(H)은 보존 →
// 공유 명도 래더가 깨지지 않으므로 대비 설계가 무너지지 않는다.
function toSrgb(L, C, H) {
  let c = C;
  if (!inGamut(oklabToLinearSrgb(...oklchToOklab(L, C, H)))) {
    let lo = 0, hi = C;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklabToLinearSrgb(...oklchToOklab(L, mid, H)))) lo = mid; else hi = mid;
    }
    c = lo;
  }
  const lin = oklabToLinearSrgb(...oklchToOklab(L, c, H));
  return { rgb: lin.map((v) => Math.round(clamp01(gamma(v)) * 255)), c };
}
const hex = (L, C, H) => {
  const { rgb, c } = toSrgb(L, C, H);
  return { hex: '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase(), rgb, c };
};

// ─────────────────────────── 대비 / 지각 거리 ───────────────────────────
const relLum = ([r, g, b]) => {
  const f = (v) => (v /= 255, v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// 반올림한 값으로 임계값을 판정하면 4.4992:1 이 4.50 으로 통과해 버린다.
// WCAG 는 임계값 비교 전 반올림을 금지한다. 원값을 돌려주고 표시할 때만 깎는다.
function contrast(a, b) {
  const x = relLum(typeof a === 'string' ? hexToRgb(a) : a);
  const y = relLum(typeof b === 'string' ? hexToRgb(b) : b);
  const [hi, lo] = x > y ? [x, y] : [y, x];
  return (hi + 0.05) / (lo + 0.05);
}
const r2 = (n) => Math.round(n * 100) / 100;
// OKLab 유클리드 거리 ×100.
// CSS Color 명세는 색역 매핑에서 JND(겨우 구별되는 차이) 기준으로 0.02(= ×100 환산 2)를
// 쓴다. 즉 2 를 넘으면 "나란히 놓고 비교하면 다름을 알 수 있다"는 뜻일 뿐이다.
// 아래 요구치 10 은 표준이 아니라 우리 내부 설계 기준이다 —
// "화면의 떨어진 위치에 있어도, 비교 대상 없이 봐도 다른 색으로 읽힌다"에 해당한다.
// 접근성 보증값이 아니며, 접근성은 대비 검사와 '색 단독 금지' 규칙이 담당한다.
const deltaE = (A, B) => Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) * 100;
const labOf = (L, C, H) => oklchToOklab(L, C, H);

// ════════════════════════════ 1. 명도 래더 ════════════════════════════
//  모든 색상이 이 래더를 공유한다. 색상(hue)이 달라도 같은 단계면 같은
//  시각적 무게를 갖는다 → 브랜드를 교체해도 대비 설계가 유지된다.
//  975 · 1000 은 다크 테마의 바탕을 위해 추가한 단계다. 950(L25.8%)이
//  다크 캔버스로는 너무 밝아 카드가 떠 보이지 않기 때문이다.
const L = { 50: 0.973, 100: 0.945, 200: 0.897, 300: 0.836, 400: 0.754, 500: 0.672, 600: 0.588, 700: 0.503, 800: 0.423, 900: 0.345, 950: 0.258, 975: 0.210, 1000: 0.145 };
//  채도 곡선: 중간에서 최대, 양 끝으로 수렴 (가우시안 형태)
const Cc = { 50: 0.14, 100: 0.26, 200: 0.46, 300: 0.66, 400: 0.86, 500: 1.0, 600: 1.0, 700: 0.92, 800: 0.80, 900: 0.66, 950: 0.50, 975: 0.38, 1000: 0.26 };
const STEPS = Object.keys(L).map(Number);

// ═══════════════════════════ 2. 원시 색상 ═══════════════════════════
const HUES = {
  // 브랜드 — 크림슨. 청색조 레드. 깊고 단단한 신뢰감.
  brand:   { hue: 14,  maxC: 0.185, drift: 10 },
  // 에러 — H34 로 이동(R01 S1 전략). 브랜드와 색상각 20° 분리.
  danger:  { hue: 34,  maxC: 0.210, drift: 0 },
  // 경고 — H85. danger 가 H34 로 이동하면서 가까워졌으므로 함께 밀어냈다.
  // H75 로 두면 다크 파스텔 단계에서 에러와 ΔE 7.4 로 수렴한다.
  warning: { hue: 85,  maxC: 0.170, drift: 0 },
  success: { hue: 150, maxC: 0.130, drift: 0 },
  info:    { hue: 250, maxC: 0.150, drift: 0 },
  // 중립 — 완전 무채색이 아니라 브랜드 온도를 미량(C=0.012) 섞은 웜 뉴트럴.
  // 붉은 브랜드와 같은 공간에 놓였을 때 회색이 푸르게 떠 보이는 것을 막는다.
  neutral: { hue: 30,  maxC: 0.012, drift: 0 },
};

const scale = (name) => {
  const { hue, maxC, drift } = HUES[name];
  const out = {};
  for (const s of STEPS) {
    const l = L[s], c = maxC * Cc[s], h = hue + drift * (0.672 - l);
    const r = hex(l, c, h);
    out[s] = { hex: r.hex, rgb: r.rgb, L: l, C: +r.c.toFixed(4), H: +h.toFixed(1), lab: labOf(l, r.c, h) };
  }
  return out;
};
const P = Object.fromEntries(Object.keys(HUES).map((k) => [k, scale(k)]));

// ══════════════════════ 3. 의미 토큰 (semantic) ══════════════════════
//  이름은 "무슨 색"이 아니라 "무슨 역할"로 짓는다. 브랜드가 바뀌어도
//  이 이름들은 그대로 남고, 참조하는 단계만 바뀐다.
//
//  danger 가 600 이 아니라 700 을 참조하는 것이 S1 전략의 핵심이다.
//  색상각(14° vs 34°)만으로는 ΔE 7 대에 머물지만, 참조 단계를 한 칸
//  내리면(600→700) 명도 차이가 더해져 ΔE 10 이상으로 분리된다.
const SEMANTIC = {
  light: {
    // R32: 본문색과 분리한 검정 막. 밝은 배경은 약 35%, 어두운 배경은 약 65%로 작업 맥락을 낮춘다.
    'overlay-scrim': ['#00000059', null, '검정 막 89/255(약 35%). 뒤 화면을 어둡게 한다'],
    // 바탕
    'bg-canvas':        ['neutral', 50,  '페이지 최하단 바탕. 카드가 떠 보이도록 surface 보다 어둡다'],
    'bg-surface':       ['#FFFFFF', null,'카드·패널·테이블의 기본 면'],
    'bg-sunken':        ['neutral', 100, '입력 그룹·코드 블록처럼 파여 보여야 하는 면'],
    'bg-hover':         ['neutral', 100, '행·메뉴 항목 호버'],
    'bg-selected':      ['brand',   100, '선택된 행·활성 내비게이션·달력 범위 (R32 실측: 표면 대비 1.18, 50 은 1.08)'],
    // 글자 — 전부 4.5:1 이상 (disabled 제외)
    'text-primary':     ['neutral', 950, '본문·제목·테이블 값. 정보의 1순위'],
    'text-secondary':   ['neutral', 800, '레이블·설명 문장. 1순위를 보조한다'],
    'text-tertiary':    ['neutral', 700, '메타·타임스탬프·플레이스홀더. 4.5:1 하한선'],
    'text-disabled':    ['neutral', 500, '비활성 전용. 대비 예외 대상이므로 정보를 담지 않는다(우리 규칙)'],
    'text-on-brand':    ['#FFFFFF', null,'브랜드 채움 위의 글자'],
    // 링크를 브랜드 레드로 두면 데이터 표 안에서 '음수·에러'로 읽힌다.
    // info 블루로 분리하면 에러 텍스트와의 지각 거리가 ΔE 30 이상으로 벌어진다.
    'text-link':        ['info',    700, '본문 중 링크. 밑줄과 함께 쓴다. 브랜드색을 쓰지 않는다'],
    // 경계 — 역할에 따라 요구 대비가 다르므로 3단으로 분리
    'border-subtle':    ['neutral', 200, '장식적 분리선. 대비 요구 없음'],
    'border-default':   ['neutral', 300, '카드·패널 윤곽'],
    'border-input':     ['neutral', 600, '입력 가능함을 알리는 경계. WCAG 1.4.11 로 3:1 필수'],
    // R01 일부 변경(오너, 2026-11-22): 포커스 링은 브랜드가 아니라 중립 고대비다.
    // 크림슨 링은 브랜드 채움·오류 빨강과 겹쳐 읽혔다(다크에서 brand-400 #FF8394 와
    // 오류 글자 #FF896E 가 ΔE76 22.6). 본문색과 같은 neutral-950 으로 두면 오류와
    // ΔE76 78.3 으로 벌어지고, 바탕 14.58:1·표면 15.74:1 로 어떤 면 위에서도 보인다.
    'border-focus':     ['neutral', 950, '키보드 포커스 링. 2px + offset 2px · 중립 고대비'],
    // 액션
    'action-primary-bg':      ['brand', 600, '주요 버튼 바탕'],
    'action-primary-bg-hover':['brand', 700, '주요 버튼 호버. 밝게가 아니라 어둡게 간다'],
    'action-danger-bg':       ['danger',700, '삭제·반품 확정 등 파괴적 버튼'],
    'action-danger-bg-hover': ['danger',800, '파괴적 버튼 호버'],
    // 라이트에서는 채움색과 동일 → 윤곽이 보이지 않는다. 다크에서만 밝아진다.
    'action-primary-border':  ['brand', 600, '버튼 윤곽. 라이트에서는 채움색과 동일'],
    'action-danger-border':   ['danger',700, '버튼 윤곽. 라이트에서는 채움색과 동일'],
    // 상태 — 틴트 배경 + 진한 글자 조합
    'status-danger-bg':   ['danger', 50,  '에러 메시지 배경'],
    'status-danger-fg':   ['danger', 700, '에러 메시지 글자·아이콘'],
    'status-warning-bg':  ['warning',50,  '경고 배경'],
    'status-warning-fg':  ['warning',700, '경고 글자·아이콘'],
    'status-success-bg':  ['success',50,  '성공·정상 배경'],
    'status-success-fg':  ['success',700, '성공·정상 글자·아이콘'],
    'status-info-bg':     ['info',   50,  '안내 배경'],
    'status-info-fg':     ['info',   700, '안내 글자·아이콘'],
    // StatusChip neutral의 기존 text-secondary/bg-sunken과 같은 값. 시각 변화 없이 계열에도 쓴다.
    'status-neutral-fg':  ['neutral',800, '중립 상태 글자·아이콘·차트 계열'],
    'status-neutral-bg':  ['neutral',100, '중립 상태 바탕'],
    // 차트 — 역할 토큰. 새 색상을 만들지 않고 기존 원시색을 참조한다.
    // 격자·축은 데이터보다 반드시 약해야 한다. 격자가 데이터선보다 진하면
    // 눈이 격자를 먼저 읽는다.
    'chart-grid':         ['neutral', 200, '격자선. 데이터보다 약하게'],
    'chart-axis':         ['neutral', 600, '축선·눈금 레이블. 비텍스트 3:1'],
    'chart-line':         ['brand',   600, '주 데이터 선·막대'],
    'chart-band':         ['brand',   200, '분포 밴드·영역 채움'],
    'chart-track':        ['neutral', 200, '불릿 차트의 배경 트랙'],
    'chart-range':        ['neutral', 300, '불릿 차트의 정상 범위 띠'],
    'chart-target':       ['neutral', 950, '목표 기준선. 데이터보다 진해야 읽힌다'],
    'chart-point':        ['brand',   600, '강조 포인트(마지막 값 등)'],
    // 로딩 — 스켈레톤은 "보이되 콘텐츠로 오인되면 안 되는" 좁은 띠 안에 있어야 한다.
    // 너무 옅으면 아무것도 안 오는 것처럼 보이고, 너무 진하면 실제 글자로 읽힌다.
    'skeleton-bg':        ['neutral', 200, '스켈레톤 블록'],
    'skeleton-highlight': ['neutral', 100, 'shimmer 하이라이트(옵트인)'],
    'progress-track':     ['neutral', 200, '진행 막대 트랙'],
    'progress-fill':      ['brand',   600, '진행 막대 채움'],
    // 안내 — 툴팁은 표면과 반전시킨다. 본문 카드와 같은 색이면 '화면의 일부'로
    // 읽혀서 임시로 떠 있는 설명이라는 것이 전달되지 않는다.
    'tooltip-bg':         ['neutral', 950, '툴팁 바탕. 표면과 반전'],
    'tooltip-fg':         ['neutral', 50,  '툴팁 글자'],
    'hint-ring':          ['brand',   600, '안내가 가리키는 대상 둘레'],
    'hint-bg':            ['#000000', null, '힌트 말풍선 바탕 — 툴팁과 달리 읽을 분량이 있어 반전하지 않는다 (bg-surface 별칭)'],
    // 방금 상세를 보고 돌아온 행. 배경이 아니라 가장자리 마커다 — 기본·호버·선택이
    // 이미 흰색 계열 셋을 쓰고 있어 네 번째 배경은 구별되지 않는다.
    // 색은 info 다. 2.3 에서 링크를 브랜드 레드로 두지 않은 이유와 같다 —
    // 표 안의 빨간색은 음수·오류로 읽힌다.
    'row-marker':         ['info',    600, '방금 다녀온 행의 가장자리 마커'],
    // 아바타는 색으로 사람을 구분하지 않는다. 이 시스템에서 채도 높은 색은 상태를
    // 뜻하고, 상태색과 45° 이상 떨어진 색상환 자리는 네 칸뿐이다(측정값).
    // 식별자는 이니셜이 맡고 색은 의미에 남겨둔다.
    'avatar-bg':          ['neutral', 200, '아바타 바탕. 사람마다 바뀌지 않는다'],
    'avatar-fg':          ['neutral', 900, '아바타 이니셜'],
  },
  // 다크는 "반전"이 아니라 재설계다. 중립은 단계 방향을 뒤집고,
  // 의미색은 틴트를 어둡게·글자를 밝게 다시 매핑한다.
  dark: {
    'overlay-scrim': ['#000000A6', null, '검정 막 166/255(약 65%). 이미 어두운 화면에서도 모달과 배경을 분리한다'],
    'bg-canvas':        ['neutral', 1000,'페이지 최하단 바탕'],
    'bg-surface':       ['neutral', 975, '카드·패널. canvas 보다 밝아 떠 보인다'],
    'bg-sunken':        ['#060505', null,'파여 보여야 하는 면'],
    'bg-hover':         ['neutral', 950, '행·메뉴 호버'],
    'bg-selected':      ['brand',   900, '선택된 행·활성 내비게이션·달력 범위 (R32 실측: 표면 대비 1.44, 975 는 1.02 로 보이지 않았다)'],
    'text-primary':     ['neutral', 50,  '본문·제목·테이블 값'],
    'text-secondary':   ['neutral', 200, '레이블·설명 문장'],
    'text-tertiary':    ['neutral', 400, '메타·플레이스홀더'],
    'text-disabled':    ['neutral', 600, '비활성 전용'],
    'text-on-brand':    ['#FFFFFF', null,'브랜드 채움 위의 글자'],
    'text-link':        ['info',    300, '본문 중 링크. 밑줄과 함께 쓴다'],
    'border-subtle':    ['neutral', 900, '장식적 분리선'],
    'border-default':   ['neutral', 800, '카드·패널 윤곽'],
    'border-input':     ['neutral', 600, '입력 경계. 3:1 필수'],
    // 다크 본문색과 같은 neutral-50. 바탕 18.33:1·표면 16.39:1, 오류 글자와 ΔE76 60.6.
    'border-focus':     ['neutral', 50,  '키보드 포커스 링 · 중립 고대비'],
    // 액션 채움색은 라이트와 동일하게 유지한다. 다크에서 밝은 단계로 올리면
    // 흰 라벨 대비가 4.5:1 아래로 떨어지고, 브랜드와 에러의 ΔE 도 함께 줄어든다.
    // 대신 아래 경계 토큰으로 버튼 윤곽의 3:1 을 따로 보장한다.
    // 다크에서 호버를 밝은 단계로 올리면 흰 라벨 대비가 3.26:1 로 무너진다.
    // 라이트와 같은 방향(어둡게)으로 간다. 호버 대비도 아래에서 검증한다.
    'action-primary-bg':      ['brand', 600, '주요 버튼 바탕'],
    'action-primary-bg-hover':['brand', 700, '주요 버튼 호버. 밝게가 아니라 어둡게 간다'],
    'action-danger-bg':       ['danger',700, '파괴적 버튼'],
    'action-danger-bg-hover': ['danger',800, '파괴적 버튼 호버'],
    'action-primary-border':  ['brand', 400, '어두운 바탕에서 버튼 윤곽을 세운다'],
    'action-danger-border':   ['danger',500, '어두운 바탕에서 버튼 윤곽을 세운다'],
    'status-danger-bg':   ['danger', 950, '에러 배경'],
    'status-danger-fg':   ['danger', 400, '에러 글자·아이콘'],
    'status-warning-bg':  ['warning',950, '경고 배경'],
    'status-warning-fg':  ['warning',400, '경고 글자·아이콘'],
    'status-success-bg':  ['success',950, '성공 배경'],
    'status-success-fg':  ['success',400, '성공 글자·아이콘'],
    'status-info-bg':     ['info',   950, '안내 배경'],
    'status-info-fg':     ['info',   400, '안내 글자·아이콘'],
    'status-neutral-fg':  ['neutral',200, '중립 상태 글자·아이콘·차트 계열'],
    'status-neutral-bg':  ['#060505',null, '중립 상태 바탕. 기존 bg-sunken과 같은 값'],
    // 차트 (다크) — 격자·축은 밝게 올리고, 목표선은 바탕과 반대로 밝은 쪽으로 간다.
    'chart-grid':         ['neutral', 900, '격자선'],
    'chart-axis':         ['neutral', 600, '축선·눈금 레이블'],
    'chart-line':         ['brand',   500, '주 데이터 선·막대. 어두운 바탕에서 한 단계 밝게'],
    'chart-band':         ['brand',   900, '분포 밴드·영역 채움'],
    'chart-track':        ['neutral', 900, '불릿 배경 트랙'],
    'chart-range':        ['neutral', 800, '불릿 정상 범위 띠'],
    'chart-target':       ['neutral', 50,  '목표 기준선'],
    'chart-point':        ['brand',   400, '강조 포인트'],
    'skeleton-bg':        ['neutral', 900, '스켈레톤 블록'],
    'skeleton-highlight': ['neutral', 800, 'shimmer 하이라이트(옵트인)'],
    'progress-track':     ['neutral', 900, '진행 막대 트랙'],
    'progress-fill':      ['brand',   500, '진행 막대 채움'],
    'tooltip-bg':         ['neutral', 200, '툴팁 바탕. 다크에서는 밝은 쪽으로 반전'],
    'tooltip-fg':         ['neutral', 1000,'툴팁 글자'],
    'hint-ring':          ['brand',   400, '안내가 가리키는 대상 둘레'],
    'hint-bg':            ['#000000', null, '힌트 말풍선 바탕 (bg-surface 별칭)'],
    'row-marker':         ['info',    400, '방금 다녀온 행의 가장자리 마커'],
    'avatar-bg':          ['neutral', 900, '아바타 바탕'],
    'avatar-fg':          ['neutral', 200, '아바타 이니셜'],
  },
};
// 별칭 토큰 — 값은 대상에서 복사해 두고(검증·tokens.json 이 정직해진다),
// CSS 출력만 var(--대상) 으로 가리킨다(대상이 바뀌면 함께 따라간다).
// 둘 중 하나만 하면 한쪽이 거짓말을 한다.
const ALIAS = { 'hint-bg': 'bg-surface' };
for (const theme of ['light', 'dark']) {
  for (const [name, target] of Object.entries(ALIAS)) {
    const [ref, step] = SEMANTIC[theme][target];
    SEMANTIC[theme][name] = [ref, step, SEMANTIC[theme][name][2]];
  }
}

const resolveTok = ([ref, step]) => (ref.startsWith('#') ? ref : P[ref][step].hex);

// ═════════════════════════ 4. 타이포그래피 ═════════════════════════
//  행간은 고정 비율이 아니라 "글자가 커질수록 줄어드는" 함수다.
//  큰 글자는 같은 비율이 물리적으로 더 큰 공백이 되고, 본문은 글줄이
//  길어 다음 줄을 찾는 눈의 이동이 커지므로 더 넉넉해야 한다.
//  모든 행간은 4px 베이스라인 그리드에 맞춰 반올림한다.
const TYPE = [
  ['caption',    13, 20, '0.01em',  500, '레이블 · 보조 정보. 이 시스템의 최소 크기'],
  ['body-sm',    14, 20, '0',       400, '테이블 셀 · 폼 입력 · 조밀한 목록'],
  ['body',       15, 24, '0',       400, '본문 기준값'],
  ['body-lg',    17, 24, '0',       400, '설명 문단 · 리드 문장'],
  ['title-sm',   20, 28, '-0.005em',600, '소제목 · 모달 제목'],
  ['title',      24, 32, '-0.01em', 600, '카드 제목 · KPI 숫자'],
  ['title-lg',   29, 36, '-0.015em',600, '섹션 제목 · 큰 KPI'],
  ['display',    34, 40, '-0.02em', 700, '페이지 제목'],
  ['display-lg', 41, 48, '-0.025em',700, '랜딩 · 빈 상태 대표 문구'],
];

// 4px 그리드. 이름은 용도가 아니라 치수로 — 용도별 별칭은 컴포넌트에서 만든다.
const SPACE = [0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96];

// A 정밀 플랫의 형태 토큰. 그림자가 0 인 것이 이 스타일의 정의다.
const SHAPE = {
  'radius-sm': '4px', 'radius-md': '6px', 'radius-lg': '8px', 'radius-full': '9999px',
  'border-width': '1px', 'focus-width': '2px', 'focus-offset': '2px',
  'shadow-none': 'none',
  // 떠 있는 레이어(팝오버·드롭다운·모달)만 예외적으로 그림자를 쓴다.
  // 평면 위 요소에는 쓰지 않는다 — 그것이 '정밀 플랫'의 규율이다.
  'shadow-overlay': '0 1px 2px rgba(38,34,34,.06), 0 8px 24px -8px rgba(38,34,34,.16)',
  'shadow-overlay-dark': '0 1px 2px rgba(0,0,0,.5), 0 8px 24px -8px rgba(0,0,0,.7)',
};

// 값 길이에 따라 UI 가 겹치지 않도록 하는 치수. 자연어 "넉넉하게"의 수치화.
const SIZING = {
  // R34: 240px는 아이콘·라벨·개수를 함께 읽는 메뉴, 64px는 24px 아이콘 + 양쪽 20px 브랜드 여백이다.
  'side-nav-w': '240px', 'side-nav-rail-w': '64px',
  'control-h-sm': '32px', 'control-h-md': '38px', 'control-h-lg': '44px',
  'row-h-compact': '36px', 'row-h-default': '40px', 'row-h-comfortable': '48px',
  'cell-px': '14px',
  // R30 브라우저 실측: ₩1,248,500,000 @ Pretendard Variable 14px tnum = 109.41px(400)·111.73px(500).
  // ceil(111.73) + 좌우 여백 28 = 140px. IBM Plex Mono 기준 128px로는 12px 모자랐다 (DESIGN.md §4).
  'cell-min-w-money': '140px', 'cell-min-w-text': '80px',
  'tap-min': '44px', 'field-min-w': '120px', 'card-min-w': '240px',
  // 차트 기본 높이. 스켈레톤이 실제 차트와 같은 높이를 쓰려면 양쪽이 같은 값을
  // 봐야 한다 — 한쪽에 숫자를 복사해두면 다음에 바꿀 때 어긋난다(DESIGN.md 9.2).
  'state-min-h':         '192px', // 비어있음·오류 상태의 인라인 최소 높이
  'tooltip-max-w':       '280px',  // 한 줄 설명이 목표. 넘치면 Hint 로 올려야 한다는 신호
  'hint-max-w':          '320px',  // 2~3줄 + 액션
  'anchor-gap':          '8px',    // 대상과 말풍선 사이 간격
  'anchor-edge-pad':     '8px',    // 뷰포트 가장자리와의 최소 여백
  'chart-h-default': '220px',
};

// 마이크로 인터랙션. 상호작용이 많은 서비스이므로 지속시간을 짧게 유지한다.
// 로딩 타이밍. 응답시간 연구(0.1s 즉시 / 1s 주의유지 / 10s 이탈)와
// 로더 깜빡임 방지 관행(200~400ms 지연)에서 나온 값이다. 자세한 근거는 DESIGN.md 9절.
const LOADING = {
  'loading-delay':       '200ms',  // 이 시간 안에 끝나면 로더를 아예 띄우지 않는다
  'loading-min-visible': '400ms',  // 한번 뜬 로더는 최소 이만큼 유지한다(깜빡임 방지)
  'loading-pulse-dur':   '1400ms', // 스켈레톤 맥박 주기
  // 안내 타이밍 — 즉시 띄우면 커서가 스쳐갈 때마다 깜빡인다.
  'tooltip-delay-in':    '400ms',  // 호버 후 표시까지. 포커스는 즉시 띄운다
  'tooltip-delay-out':   '120ms',  // 떠난 뒤 숨기기까지. 인접 트리거 이동 시 깜빡임 방지
  'loading-long-task':   '10000ms',// 이 이상이면 떠날 수 있는 경로를 준다
};

const MOTION = {
  'dur-instant': '80ms', 'dur-fast': '140ms', 'dur-normal': '200ms', 'dur-slow': '320ms',
  'ease-standard': 'cubic-bezier(.２,0,.13,1)'.replace('２','2'),
  'ease-decelerate': 'cubic-bezier(0,0,.2,1)',
  'ease-spring': 'cubic-bezier(.34,1.4,.64,1)',
};

// ═══════════════════════════ 5. 검증 ═══════════════════════════
const checks = [];
const check = (label, value, min, kind) => {
  // pass 는 원값으로 판정하고, value 는 표시·JSON 용 반올림값을 따로 둔다.
  checks.push({ label, value: r2(value), raw: value, min, kind, pass: value >= min });
};
const S = SEMANTIC;
// 라이트 — 글자 대비
const Lbg = resolveTok(S.light['bg-surface']), Lcanvas = resolveTok(S.light['bg-canvas']);
for (const t of ['text-primary', 'text-secondary', 'text-tertiary']) {
  check(`light ${t} on surface`, contrast(resolveTok(S.light[t]), Lbg), 4.5, 'text');
  check(`light ${t} on canvas`,  contrast(resolveTok(S.light[t]), Lcanvas), 4.5, 'text');
}
check('light text-link on surface', contrast(resolveTok(S.light['text-link']), Lbg), 4.5, 'text');
check('light border-input on surface', contrast(resolveTok(S.light['border-input']), Lbg), 3.0, 'nontext');
check('light border-focus on surface', contrast(resolveTok(S.light['border-focus']), Lbg), 3.0, 'nontext');
check('light white on action-primary', contrast('#FFFFFF', resolveTok(S.light['action-primary-bg'])), 4.5, 'text');
check('light white on action-danger',  contrast('#FFFFFF', resolveTok(S.light['action-danger-bg'])), 4.5, 'text');
for (const k of ['danger', 'warning', 'success', 'info', 'neutral']) {
  check(`light status-${k} fg on bg`, contrast(resolveTok(S.light[`status-${k}-fg`]), resolveTok(S.light[`status-${k}-bg`])), 4.5, 'text');
  check(`light status-${k} fg on surface`, contrast(resolveTok(S.light[`status-${k}-fg`]), Lbg), 4.5, 'text');
}
// 다크
const Dbg = resolveTok(S.dark['bg-surface']), Dcanvas = resolveTok(S.dark['bg-canvas']);
for (const t of ['text-primary', 'text-secondary', 'text-tertiary']) {
  check(`dark ${t} on surface`, contrast(resolveTok(S.dark[t]), Dbg), 4.5, 'text');
  check(`dark ${t} on canvas`,  contrast(resolveTok(S.dark[t]), Dcanvas), 4.5, 'text');
}
check('dark text-link on surface', contrast(resolveTok(S.dark['text-link']), Dbg), 4.5, 'text');
check('dark border-input on surface', contrast(resolveTok(S.dark['border-input']), Dbg), 3.0, 'nontext');
check('dark border-focus on surface', contrast(resolveTok(S.dark['border-focus']), Dbg), 3.0, 'nontext');
check('dark white on action-primary', contrast('#FFFFFF', resolveTok(S.dark['action-primary-bg'])), 4.5, 'text');
check('dark white on action-danger',  contrast('#FFFFFF', resolveTok(S.dark['action-danger-bg'])), 4.5, 'text');
for (const k of ['danger', 'warning', 'success', 'info', 'neutral']) {
  check(`dark status-${k} fg on bg`, contrast(resolveTok(S.dark[`status-${k}-fg`]), resolveTok(S.dark[`status-${k}-bg`])), 4.5, 'text');
  check(`dark status-${k} fg on surface`, contrast(resolveTok(S.dark[`status-${k}-fg`]), Dbg), 4.5, 'text');
}

// 채움 버튼의 윤곽 대비. 다크 바탕에서 어두운 채움색이 바탕에 묻히는 것을
// 막기 위해 윤곽 토큰을 따로 둔다. 라이트에서는 채움색과 같아 보이지 않는다.
for (const a of ['primary', 'danger']) {
  check(`dark action-${a} border on surface`, contrast(resolveTok(S.dark[`action-${a}-border`]), Dbg), 3.0, 'nontext');
}
// 호버 상태의 라벨 대비. 기본 배경만 검사하면 호버에서 조용히 깨진다 —
// 실제로 다크 primary 호버를 brand-500 으로 뒀을 때 3.26:1 로 떨어졌다.
for (const theme of ['light', 'dark']) {
  for (const a of ['primary', 'danger']) {
    const onBrand = resolveTok(SEMANTIC[theme]['text-on-brand']);
    for (const state of ['bg', 'bg-hover']) {
      check(
        `${theme} label on action-${a}-${state}`,
        contrast(onBrand, resolveTok(SEMANTIC[theme][`action-${a}-${state}`])),
        4.5, 'text',
      );
    }
  }
}

// 차트 요소 대비. 데이터를 전달하는 그래픽은 비텍스트 3:1 대상이다(WCAG 1.4.11).
// 격자는 '장식'이므로 제외하고, 데이터·축·목표선만 검사한다.
for (const [theme, bg] of [['light', Lbg], ['dark', Dbg]]) {
  // 면·선으로 쓰는 다섯 상태 계열은 표면과 캔버스 모두에서 비텍스트 3:1 이상이어야 한다.
  for (const tone of ['neutral', 'info', 'warning', 'success', 'danger']) {
    for (const surface of ['bg-surface', 'bg-canvas']) {
      check(`${theme} status-${tone} 계열 on ${surface}`,
        contrast(resolveTok(SEMANTIC[theme][`status-${tone}-fg`]), resolveTok(SEMANTIC[theme][surface])), 3.0, 'nontext');
    }
  }
  for (const t of ['chart-line', 'chart-target', 'chart-point']) {
    check(`${theme} ${t} on surface`, contrast(resolveTok(SEMANTIC[theme][t]), bg), 3.0, 'nontext');
  }
  // 축 레이블은 글자이므로 더 엄격하다. 작은 보조 텍스트이지만 읽혀야 한다.
  check(`${theme} chart-axis(레이블) on surface`,
    contrast(resolveTok(SEMANTIC[theme]['chart-axis']), bg), 3.0, 'nontext');
  // 격자가 데이터선보다 약한지 — 수치로 강제한다
  const gridC = contrast(resolveTok(SEMANTIC[theme]['chart-grid']), bg);
  const lineC = contrast(resolveTok(SEMANTIC[theme]['chart-line']), bg);
  check(`${theme} 격자가 데이터선보다 약하다`, lineC / gridC, 2.0, 'ratio');
}

// 툴팁은 반전색이라 일반 검사 범위 밖이다. 자체 조합으로 검사한다.
for (const [theme, bg] of [['light', Lbg], ['dark', Dbg]]) {
  const tb = resolveTok(SEMANTIC[theme]['tooltip-bg']);
  check(`${theme} 툴팁 글자 on 툴팁 바탕`, contrast(resolveTok(SEMANTIC[theme]['tooltip-fg']), tb), 4.5, 'text');
  check(`${theme} 툴팁 바탕이 표면과 구별된다`, contrast(tb, bg), 3.0, 'nontext');
  check(`${theme} hint-ring on surface`, contrast(resolveTok(SEMANTIC[theme]['hint-ring']), bg), 3.0, 'nontext');
  // 다녀온 행 마커는 기본 행·선택된 행 양쪽 바탕에서 보여야 한다. 선택된 행 위에도 얹히기 때문이다.
  const marker = resolveTok(SEMANTIC[theme]['row-marker']);
  check(`${theme} row-marker on surface`, contrast(marker, bg), 3.0, 'nontext');
  check(`${theme} row-marker on 선택된 행`, contrast(marker, resolveTok(SEMANTIC[theme]['bg-selected'])), 3.0, 'nontext');
  // 아바타 이니셜은 글자다. 작게 쓰이므로 본문 기준을 그대로 적용한다.
  check(`${theme} 아바타 이니셜 on 아바타 바탕`,
    contrast(resolveTok(SEMANTIC[theme]['avatar-fg']), resolveTok(SEMANTIC[theme]['avatar-bg'])), 4.5, 'text');
  check(`${theme} 아바타 바탕이 표면과 구별된다`,
    contrast(resolveTok(SEMANTIC[theme]['avatar-bg']), bg), 1.2, 'nontext');
}

// shadcn 브리지 대비 — 브리지는 이름만 바꾸는 게 아니라 **실제로 함께 렌더되는 쌍**을
// 만든다. 예: 드롭다운의 하이라이트 항목은 bg-accent + text-accent-foreground 다.
// 여기서 검사하지 않으면 받아온 컴포넌트가 우리 기준을 조용히 비껴간다.
const SHADCN_PAIRS = [
  ['foreground on background',             'text-primary',  'bg-canvas',         4.5, 'text'],
  ['card-foreground on card',              'text-primary',  'bg-surface',        4.5, 'text'],
  ['popover-foreground on popover',        'text-primary',  'bg-surface',        4.5, 'text'],
  ['primary-foreground on primary',        'text-on-brand', 'action-primary-bg', 4.5, 'text'],
  ['secondary-foreground on secondary',    'text-primary',  'bg-sunken',         4.5, 'text'],
  ['muted-foreground on muted',            'text-secondary','bg-sunken',         4.5, 'text'],
  ['accent-foreground on accent',          'text-primary',  'bg-hover',          4.5, 'text'],
  ['destructive-foreground on destructive','text-on-brand', 'action-danger-bg',  4.5, 'text'],
  // 컨트롤을 식별하는 경계선만 1.4.11 의 3:1 대상이다. shadcn 은 Button(outline)·
  // Input·SelectTrigger 에 `border-input` 을 쓰므로 그쪽에 3:1 을 건다.
  ['input on background',                  'border-input',  'bg-canvas',         3.0, 'nontext'],
  ['ring on background',                   'border-focus',  'bg-canvas',         3.0, 'nontext'],
  // 일반 `border` 는 DropdownMenuContent·PopoverContent·SelectContent 같은
  // **떠 있는 패널의 가장자리**와 구분선에 쓰인다. 그림자(--shadow-overlay)와 함께
  // 쓰이므로 경계선이 단독 식별 수단이 아니다 — 3:1 이 아니라 '보이는가'를 본다.
  ['border on surface (패널 가장자리)',     'border-default','bg-surface',        1.3, 'nontext'],
];
for (const theme of ['light', 'dark']) {
  for (const [label, fg, bg2, min, kind] of SHADCN_PAIRS) {
    check(`${theme} shadcn ${label}`,
      contrast(resolveTok(SEMANTIC[theme][fg]), resolveTok(SEMANTIC[theme][bg2])), min, kind);
  }
}

// 스켈레톤 대비. 양쪽 끝이 다 문제다 —
//  · 너무 옅으면(바탕과 구별 안 되면) 아무것도 오지 않는 것처럼 보인다
//  · 너무 진하면 실제 글자로 읽혀 사용자가 내용을 읽으려 한다
for (const [theme, bg] of [['light', Lbg], ['dark', Dbg]]) {
  const sk = contrast(resolveTok(SEMANTIC[theme]['skeleton-bg']), bg);
  const tx = contrast(resolveTok(SEMANTIC[theme]['text-primary']), bg);
  check(`${theme} 스켈레톤이 바탕과 구별된다`, sk, 1.15, 'ratio');
  check(`${theme} 스켈레톤이 본문 글자보다 훨씬 약하다`, tx / sk, 5.0, 'ratio');
  check(`${theme} progress-fill on surface`, contrast(resolveTok(SEMANTIC[theme]['progress-fill']), bg), 3.0, 'nontext');
}

// R32: 투명 막은 불투명 색 대비 검사 대신 sRGB 합성 뒤 휘도가 실제로 낮아지는지 검사한다.
for (const theme of ['light', 'dark']) {
  const scrim = resolveTok(S[theme]['overlay-scrim']);
  const rgb = hexToRgb(scrim), alpha = parseInt(scrim.slice(7, 9), 16) / 255;
  for (const surface of ['bg-canvas', 'bg-surface']) {
    const bg = hexToRgb(resolveTok(S[theme][surface]));
    const composite = bg.map((v, i) => rgb[i] * alpha + v * (1 - alpha));
    check(`${theme} 막 합성 후 ${surface} 휘도 감소`, relLum(bg) / relLum(composite), 1.01, 'ratio');
  }
}

// 테마 3상태 안전성: 다크에만 정의된 토큰이 있으면, 테마 미지정 상태에서
// 그 색이 해소되지 않아 한쪽 테마 글자가 다른 쪽 바탕에 얹히는 버그가 된다.
// 모든 다크 토큰 이름은 :root(라이트)에 기본값을 갖고 있어야 한다.
const darkOnly = Object.keys(S.dark).filter((k) => !(k in S.light));
const lightOnly = Object.keys(S.light).filter((k) => !(k in S.dark));
const themeIssues = [
  ...darkOnly.map((k) => `다크에만 정의됨 (:root 기본값 없음): --${k}`),
  ...lightOnly.map((k) => `라이트에만 정의됨 (다크에서 라이트 값 잔류): --${k}`),
];

// 의미 토큰 → 원시 단계(lab 포함). ΔE 는 원시 단계의 OKLab 좌표로 잰다.
const semPrim = (theme, tok) => {
  const [ref, step] = S[theme][tok];
  if (ref.startsWith('#')) throw new Error(`ΔE 검사는 원시 단계를 참조하는 토큰만 받는다: ${theme} ${tok} = ${ref}`);
  return P[ref][step];
};
// ΔE — 의미 분리 검증. 실제로 쓰이는 단계끼리 비교해야 의미가 있다.
// 라이트와 다크가 같은 채움색을 쓰므로 액션 분리는 한 번만 검증하면 된다.
const dePairs = [
  ['브랜드 액션 vs 에러 액션',        P.brand[600],  P.danger[700],  10],
  ['에러 글자 vs 경고 글자 (라이트)', P.danger[700], P.warning[700], 10],
  ['에러 글자 vs 경고 글자 (다크)',   P.danger[400], P.warning[400], 10],
  ['에러 vs 성공 (라이트)',           P.danger[700], P.success[700], 10],
  // 다녀온 행 마커는 표 안에 놓인다. 에러로 오독되면 "문제 있는 행"으로 보인다.
  ['다녀온 행 마커 vs 에러 (라이트)', P.info[600],   P.danger[700],  10],
  ['다녀온 행 마커 vs 에러 (다크)',   P.info[400],   P.danger[400],  10],
  // 링크를 info 블루로 분리한 효과 검증. 브랜드 레드였다면 ΔE 6 대였다.
  ['링크 글자 vs 에러 글자 (라이트)', P.info[700],   P.danger[700],  10],
  ['링크 글자 vs 에러 글자 (다크)',   P.info[300],   P.danger[400],  10],
  // 포커스 링이 오류 테두리(border-danger-ink)와 함께 그려져도 "오류 강조"로 읽히지 않아야 한다.
  // 원시 단계가 아니라 의미 토큰이 실제로 가리키는 색을 비교한다 — 토큰을 크림슨으로
  // 되돌리면 다크(brand-400 vs danger-400 ΔE 5.4)에서 이 검사가 깨진다(R01 일부 변경, 2026-11-22).
  ['포커스 링 vs 에러 글자 (라이트)', semPrim('light', 'border-focus'), semPrim('light', 'status-danger-fg'), 10],
  ['포커스 링 vs 에러 글자 (다크)',   semPrim('dark', 'border-focus'),  semPrim('dark', 'status-danger-fg'),  10],
];
const deResults = dePairs.map(([label, a, b, min]) => {
  const v = deltaE(a.lab, b.lab);
  return { label, a: a.hex, b: b.hex, value: Math.round(v * 10) / 10, raw: v, min, pass: v >= min };
});

// ═══════════════════════════ 6. CSS 출력 ═══════════════════════════
const pad = (s, n) => String(s).padEnd(n);
let css = `/* ===========================================================================
   디자인 토큰 — 자동 생성 파일. 직접 수정하지 말 것.
   생성: docs/research/tokens-build.mjs  ·  재생성: node docs/research/tokens-build.mjs
   ---------------------------------------------------------------------------
   R01 확정 (2026-11-13)
     스타일   A 정밀 플랫 단독 — 구조는 경계선과 밀도로 만든다. 평면 위 그림자 0.
     브랜드   크림슨 OKLCH H14 · 원시 11단계
     에러분리 S1 — danger 를 H34 로 옮기고 의미 토큰이 700 단계를 참조한다.
              색상각 20° 만으로는 ΔE 가 부족하여 명도 한 칸을 더 벌렸다.
     테마     라이트 우선 · 다크 동시 지원 (다크는 반전이 아니라 재매핑)
     대비     본문 4.5:1 / 큰 텍스트·비텍스트 3:1 — 전 토큰 조합 자동 검증됨
   =========================================================================== */

@layer theme {
  :root {
    /* ── 원시 색상 (primitive) ─────────────────────────────────────────────
       이 값들을 UI 에서 직접 쓰지 말고 아래 의미 토큰을 거쳐 쓴다.
       공유 명도 래더: L 97.3% → 25.8% · 어느 색상이든 같은 단계면 같은 무게 */
`;
for (const name of Object.keys(HUES)) {
  const { hue, maxC } = HUES[name];
  css += `\n    /* ${pad(name, 8)} OKLCH H${hue}° · maxC ${maxC} */\n`;
  for (const s of STEPS) {
    const v = P[name][s];
    css += `    --color-${pad(name + '-' + s, 16)}: ${v.hex};  /* oklch(${(v.L * 100).toFixed(1)}% ${v.C.toFixed(3)} ${v.H}) · 흰 배경 대비 ${pad(contrast(v.hex, '#FFFFFF').toFixed(2), 5)} */\n`;
  }
}
css += `
    /* ── 의미 색상 · 라이트 (semantic) ──────────────────────────────────────
       이름은 "무슨 색"이 아니라 "무슨 역할"이다. 브랜드를 교체해도
       이 이름들은 그대로 남고 참조하는 원시 단계만 바뀐다. */
`;
for (const [k, v] of Object.entries(S.light)) {
  const [ref, step, desc] = v;
  const val = ALIAS[k] ? `var(--${ALIAS[k]})` : ref.startsWith('#') ? ref : `var(--color-${ref}-${step})`;
  css += `    --${pad(k, 24)}: ${pad(val, 34)};  /* ${desc} */\n`;
}
css += `
    /* ── 타이포그래피 ──────────────────────────────────────────────────────
       행간은 고정 비율이 아니라 글자 크기에 반비례하는 함수다.
       큰 글자는 같은 비율이 물리적으로 더 큰 공백이 되고, 본문은 글줄이 길어
       다음 줄을 찾는 눈의 이동이 커지므로 더 넉넉해야 한다.
       모든 행간은 4px 베이스라인 그리드에 정렬된다. */
`;
for (const [n, size, lh, ls, w, desc] of TYPE) {
  const pct = Math.round((lh / size) * 100);
  css += `    --text-${pad(n, 12)}: ${pad(size + 'px', 6)};  --text-${pad(n + '-lh', 15)}: ${pad(lh + 'px', 6)};  /* ${pad(pct + '%', 5)} · ${desc} */\n`;
  css += `    --text-${pad(n + '-ls', 12)}: ${pad(ls, 6)};  --text-${pad(n + '-weight', 15)}: ${pad(w, 6)};\n`;
}
css += `
    /* 앱이 로드한 Pretendard를 우선한다. 없으면 OS UI 서체로 라틴 문맥을 유지하고,
       그 서체에 한글이 없을 때 macOS·Windows 기본 한글 서체 순으로 폴백한다. */
    --font-sans: 'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
    /* 코드 표시 전용. 숫자 정렬은 본문 서체의 tabular-nums를 사용한다. */
    --font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;

    /* ── 간격 · 4px 그리드 ────────────────────────────────────────────────── */
`;
for (const n of SPACE) css += `    --space-${pad(n, 6)}: ${n}px;\n`;
css += `
    /* ── 형태 (A 정밀 플랫) ───────────────────────────────────────────────── */
`;
for (const [k, v] of Object.entries(SHAPE)) css += `    --${pad(k, 22)}: ${v};\n`;
css += `
    /* ── 치수 · 값이 길어져도 겹치지 않게 하는 최소 보장치 ──────────────────── */
`;
for (const [k, v] of Object.entries(SIZING)) css += `    --${pad(k, 22)}: ${v};\n`;
css += `
    /* ── 모션 · 상호작용이 잦으므로 지속시간을 짧게 유지한다 ─────────────────── */
`;
for (const [k, v] of Object.entries(MOTION)) css += `    --${pad(k, 22)}: ${v};\n`;
css += `
    /* ── 로딩 타이밍 · 근거는 DESIGN.md 9절 ─────────────────────────────────── */
`;
for (const [k, v] of Object.entries(LOADING)) css += `    --${pad(k, 22)}: ${v};\n`;

css += `
    color-scheme: light;
  }

  /* ── 의미 색상 · 다크 ────────────────────────────────────────────────────
     다크 토큰은 한 번 정의하고 두 셀렉터에서 재사용한다.
       ① @media (prefers-color-scheme) — 사용자가 테마를 지정하지 않은 기본 상태.
          :root:not([data-theme="light"]) 로 감싸 명시적 라이트 선택이 OS 를 이긴다.
       ② [data-theme="dark"] — 명시적 선택. 토글이 양방향으로 모두 이긴다.
     색을 media 블록 안에서만 정의하면 테마 미지정 상태에서 적용되지 않아
     한쪽 테마의 글자가 다른 쪽 바탕에 얹히는 전형적 버그가 된다.
     아래 모든 이름은 :root 에 이미 기본값을 갖고 있다. */
`;
const darkDecls = Object.entries(S.dark).map(([k, v]) => {
  const [ref, step, desc] = v;
  const val = ALIAS[k] ? `var(--${ALIAS[k]})` : ref.startsWith('#') ? ref : `var(--color-${ref}-${step})`;
  return `    --${pad(k, 24)}: ${pad(val, 34)};  /* ${desc} */`;
}).join('\n');
const darkShadow = `    --${pad('shadow-overlay', 22)}: var(--shadow-overlay-dark);`;

css += `
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
${darkDecls}
${darkShadow}
      color-scheme: dark;
    }
  }

  :root[data-theme="dark"] {
${darkDecls}
${darkShadow}
    color-scheme: dark;
  }
}
`;

// ═════════════════════ 7. Tailwind v4 @theme 매핑 ═════════════════════
let tw = `/* ===========================================================================
   Tailwind v4 테마 브리지 — 자동 생성 파일. 직접 수정하지 말 것.
   tokens.css 의 의미 토큰을 Tailwind 유틸리티 이름에 연결한다.
   이 파일 덕분에 \`bg-surface\` \`text-primary\` \`border-input\` 처럼 쓸 수 있고,
   클래스에 색 이름(red-500)이 박히지 않으므로 브랜드 교체가 안전해진다.
   =========================================================================== */

@theme inline {
`;
// 의미 토큰 → Tailwind 색 이름 매핑. 기계적으로 파생시키지 않고 손으로 적는다.
// Tailwind 는 --color-X 를 bg-X / text-X / border-X 로 모두 노출하므로,
// 토큰 이름에 역할 접두사(text-, border-)를 그대로 남기면 `text-text-primary`
// 같은 중복 클래스가 생긴다. 아래 이름은 클래스로 썼을 때 읽히도록 고른 것이다.
const TW_NAME = {
  'overlay-scrim': 'overlay-scrim',
  'bg-canvas': 'canvas',          // bg-canvas
  'bg-surface': 'surface',        // bg-surface
  'bg-sunken': 'sunken',          // bg-sunken
  'bg-hover': 'hovered',          // bg-hovered
  'bg-selected': 'selected',      // bg-selected
  'text-primary': 'fg',           // text-fg
  'text-secondary': 'fg-muted',   // text-fg-muted
  'text-tertiary': 'fg-subtle',   // text-fg-subtle
  'text-disabled': 'fg-disabled', // text-fg-disabled
  'text-on-brand': 'fg-on-brand', // text-fg-on-brand
  'text-link': 'fg-link',         // text-fg-link
  'border-subtle': 'line',        // border-line
  'border-default': 'line-strong',// border-line-strong
  'border-input': 'field',        // border-field
  'border-focus': 'focus',        // outline-focus
  'action-primary-bg': 'action',             // bg-action
  'action-primary-bg-hover': 'action-hover', // hover:bg-action-hover
  'action-danger-bg': 'action-danger',       // bg-action-danger
  'action-danger-bg-hover': 'action-danger-hover', // hover:bg-action-danger-hover
  'action-primary-border': 'action-edge',    // border-action-edge
  'action-danger-border': 'action-danger-edge',
  'status-danger-bg': 'danger-tint',   'status-danger-fg': 'danger-ink',
  'status-warning-bg': 'warning-tint', 'status-warning-fg': 'warning-ink',
  'status-success-bg': 'success-tint', 'status-success-fg': 'success-ink',
  'status-info-bg': 'info-tint',       'status-info-fg': 'info-ink',
  'status-neutral-bg': 'neutral-tint', 'status-neutral-fg': 'neutral-ink',
  // 차트는 SVG 속성(fill/stroke)에 var() 로 직접 쓰는 일이 많아 Tailwind 이름도 둔다
  'chart-grid': 'chart-grid',     'chart-axis': 'chart-axis',
  'chart-line': 'chart-line',     'chart-band': 'chart-band',
  'chart-track': 'chart-track',   'chart-range': 'chart-range',
  'chart-target': 'chart-target', 'chart-point': 'chart-point',
  'skeleton-bg': 'skeleton',      'skeleton-highlight': 'skeleton-highlight',
  'tooltip-bg': 'tooltip',        'tooltip-fg': 'tooltip-fg',
  'hint-ring': 'hint-ring',       'hint-bg': 'hint-bg',         'row-marker': 'row-marker',   'avatar-bg': 'avatar-bg',     'avatar-fg': 'avatar-fg',
  'progress-track': 'progress-track', 'progress-fill': 'progress-fill',
};
const missing = Object.keys(S.light).filter((k) => !TW_NAME[k]);
if (missing.length) throw new Error('TW_NAME 매핑 누락: ' + missing.join(', '));

// ── shadcn/ui 브리지 ──────────────────────────────────────────────────────
// shadcn 컴포넌트는 `bg-popover` `text-muted-foreground` 처럼 자기 이름 규약을
// 쓴다. 그 이름을 우리 의미 토큰으로 연결해두면 받아온 컴포넌트가 **자동으로
// 우리 색을 입는다** — 소스를 손대지 않아도 된다.
//
// 이 맵이 없으면 shadcn 기본 팔레트가 따라 들어와 색 규율이 두 개가 된다.
// 이름은 shadcn 레지스트리 소스에서 실제로 쓰이는 것만 적었다(17개 + ring-offset).
const SHADCN = {
  background:             'bg-canvas',
  foreground:             'text-primary',
  card:                   'bg-surface',
  'card-foreground':      'text-primary',
  popover:                'bg-surface',
  'popover-foreground':   'text-primary',
  primary:                'action-primary-bg',
  'primary-foreground':   'text-on-brand',
  secondary:              'bg-sunken',
  'secondary-foreground': 'text-primary',
  muted:                  'bg-sunken',
  'muted-foreground':     'text-secondary',
  // Radix 메뉴·셀렉트의 '하이라이트된 항목' 이 accent 다. 호버와 같은 면이어야 한다.
  accent:                 'bg-hover',
  'accent-foreground':    'text-primary',
  destructive:            'action-danger-bg',
  'destructive-foreground':'text-on-brand',
  border:                 'border-default',
  input:                  'border-input',
  ring:                   'border-focus',
  'ring-offset-background':'bg-canvas',
};
for (const [name, token] of Object.entries(SHADCN)) {
  if (!S.light[token]) throw new Error(`SHADCN 브리지가 없는 토큰을 가리킨다: ${name} → ${token}`);
}
for (const [k, name] of Object.entries(TW_NAME)) {
  tw += `  ${pad(`--color-${name}`, 34)}: var(--${k});\n`;
}
tw += `\n  /* shadcn/ui 이름 → 우리 토큰. 받아온 컴포넌트가 그대로 우리 색을 입는다. */\n`;
for (const [name, token] of Object.entries(SHADCN)) {
  tw += `  ${pad(`--color-${name}`, 34)}: var(--${token});\n`;
}
tw += `\n`;
for (const name of Object.keys(HUES)) for (const s of STEPS) tw += `  ${pad(`--color-${name}-${s}`, 34)}: var(--color-${name}-${s});\n`;
tw += `\n`;
for (const [n, , lh] of TYPE) tw += `  ${pad(`--text-${n}`, 34)}: var(--text-${n});\n  ${pad(`--text-${n}--line-height`, 34)}: var(--text-${n}-lh);\n`;
tw += `\n`;
// 간격은 Tailwind 테마로 내보내지 않는다.
// Tailwind v4 의 --spacing 은 "배수"이고 p-4 는 calc(var(--spacing) * 4) 로 컴파일된다.
// 여기서 --spacing-4: 4px 를 정의하면 그 계산을 덮어써 p-4 가 16px 대신 4px 이 된다
// (size-4 아이콘이 4px 가 되고 min-w-16 이 64px 대신 16px 이 되는 실제 버그였다).
// Tailwind 기본값 0.25rem = 4px 가 이미 우리 그리드와 같으므로 건드리지 않는다.
// --space-* 토큰은 tokens.css 에 그대로 있으니 var() 로 직접 쓸 수 있다.
tw += `\n`;
for (const k of ['radius-sm', 'radius-md', 'radius-lg', 'radius-full']) tw += `  ${pad('--' + k, 34)}: var(--${k});\n`;
tw += `  ${pad('--shadow-overlay', 34)}: var(--shadow-overlay);\n`;
tw += `  ${pad('--font-sans', 34)}: var(--font-sans);\n  ${pad('--font-mono', 34)}: var(--font-mono);\n`;
tw += `}\n`;

// ═══════════════════════════ 8. 기록 ═══════════════════════════
const here = dirname(new URL(import.meta.url).pathname);
const root = resolve(here, '../..');
const write = (rel, body) => {
  const p = resolve(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, body);
  return rel;
};

const json = {
  generatedAt: '2026-11-13',
  decisions: { style: 'A 정밀 플랫 단독', brand: 'crimson OKLCH H14', dangerSeparation: 'S1 — danger H34 · 의미 토큰은 700 단계 참조', theme: '라이트 우선 · 다크 동시 지원', contrastFloor: { text: 4.5, largeText: 3.0, nonText: 3.0 }, lineHeight: '크기 반비례 함수' },
  ladder: L, chromaCurve: Cc, hues: HUES,
  primitives: Object.fromEntries(Object.entries(P).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([s, x]) => [s, { hex: x.hex, oklch: `oklch(${(x.L * 100).toFixed(1)}% ${x.C.toFixed(3)} ${x.H})`, onWhite: r2(contrast(x.hex, '#FFFFFF')) }]))])),
  semantic: Object.fromEntries(Object.entries(SEMANTIC).map(([theme, toks]) => [theme, Object.fromEntries(Object.entries(toks).map(([k, v]) => [k, { ref: v[0].startsWith('#') ? v[0] : `${v[0]}-${v[1]}`, hex: resolveTok(v), purpose: v[2] }]))])),
  typography: TYPE.map(([n, size, lh, ls, w, d]) => ({ token: n, size, lineHeight: lh, lineHeightPct: Math.round((lh / size) * 100), letterSpacing: ls, weight: w, purpose: d })),
  spacing: SPACE, shape: SHAPE, sizing: SIZING, motion: MOTION, loading: LOADING,
  verification: { contrast: checks, separation: deResults, themeIssues },
};

const files = [
  write('packages/tokens/tokens.css', css),
  write('packages/tokens/theme.css', tw),
  write('docs/research/tokens.json', JSON.stringify(json, null, 2)),
  write('packages/tokens/tokens.json', JSON.stringify(json, null, 2)),
];

// ═══════════════════════════ 9. 보고 ═══════════════════════════
const fail = checks.filter((c) => !c.pass);
const deFail = deResults.filter((d) => !d.pass);
console.log('── 대비 검증 ' + checks.length + '건 ──');
console.log(fail.length ? fail.map((c) => `  ✗ ${c.label}: ${c.value}:1 (요구 ${c.min})`).join('\n') : '  ✓ 전부 통과');
const worst = [...checks].sort((a, b) => a.raw / a.min - b.raw / b.min).slice(0, 4);
console.log('  여유가 가장 적은 4건:');
for (const c of worst) console.log(`    ${pad(c.label, 38)} ${pad(c.value + ':1', 8)} (요구 ${c.min})`);

console.log('\n── 테마 3상태 안전성 ──');
console.log(themeIssues.length
  ? themeIssues.map((m) => '  ✗ ' + m).join('\n')
  : `  ✓ 의미 토큰 ${Object.keys(S.light).length}개가 라이트·다크 양쪽에 모두 정의됨`);

console.log('\n── 의미 분리 검증 (ΔE) ──');
for (const d of deResults) console.log(`  ${d.pass ? '✓' : '✗'} ${pad(d.label, 34)} ${d.a} / ${d.b}  ΔE ${pad(d.value, 5)} (요구 ${d.min})`);

console.log('\n── 핵심 확정값 ──');
console.log('  브랜드 주요 액션   ' + P.brand[600].hex + '  (흰글자 ' + r2(contrast('#FFFFFF', P.brand[600].hex)) + ':1)');
console.log('  에러 액션          ' + P.danger[700].hex + '  (흰글자 ' + r2(contrast('#FFFFFF', P.danger[700].hex)) + ':1)');
console.log('  본문 글자          ' + resolveTok(S.light['text-primary']) + '  on ' + Lbg + ' = ' + r2(contrast(resolveTok(S.light['text-primary']), Lbg)) + ':1');
console.log('  입력 경계선        ' + resolveTok(S.light['border-input']) + '  on ' + Lbg + ' = ' + r2(contrast(resolveTok(S.light['border-input']), Lbg)) + ':1');

console.log('\n── 생성 ──');
for (const f of files) console.log('  ' + f);
const failures = fail.length + deFail.length + themeIssues.length;
if (failures) console.log(`\n✗ 검증 실패 ${failures}건 — 토큰을 고치거나 기준을 재검토할 것.`);
process.exitCode = failures ? 1 : 0;
