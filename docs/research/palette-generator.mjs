// OKLCH -> sRGB 변환 + WCAG 명도대비 실측 + 브랜드 팔레트 생성
// 목적: 브랜드 컬러를 "감"이 아니라 지각 균일 색공간(OKLCH)의 수치 래더로 생성하고,
//       각 단계가 흰 배경/검은 배경에서 실제로 몇 :1 대비가 나오는지 검증한다.

// ---------- 색공간 변환 ----------
const clamp01 = (x) => Math.min(1, Math.max(0, x));

function oklchToOklab(L, C, H) {
  const h = (H * Math.PI) / 180;
  return [L, C * Math.cos(h), C * Math.sin(h)];
}

function oklabToLinearSrgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const gamma = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);

function inGamut([r, g, b]) {
  const e = 0.0001;
  return r >= -e && r <= 1 + e && g >= -e && g <= 1 + e && b >= -e && b <= 1 + e;
}

// 색역(gamut)을 벗어나면 채도(C)만 줄여서 색상(H)·명도(L)를 보존한다.
// -> 명도 래더가 깨지지 않으므로 대비 설계가 무너지지 않는다.
function oklchToHex(L, C, H) {
  let lo = 0, hi = C, lin = oklabToLinearSrgb(...oklchToOklab(L, C, H));
  if (!inGamut(lin)) {
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      lin = oklabToLinearSrgb(...oklchToOklab(L, mid, H));
      if (inGamut(lin)) lo = mid; else hi = mid;
    }
    lin = oklabToLinearSrgb(...oklchToOklab(L, lo, H));
  }
  const rgb = lin.map((v) => Math.round(clamp01(gamma(v)) * 255));
  return {
    hex: '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase(),
    rgb,
    actualC: inGamut(oklabToLinearSrgb(...oklchToOklab(L, C, H))) ? C : lo,
  };
}

// ---------- WCAG 2.x 상대휘도 / 명도대비 ----------
function relLum([r, g, b]) {
  const f = (v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(rgb1, rgb2) {
  const a = relLum(rgb1), b = relLum(rgb2);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// ---------- 명도 래더 (모든 색상 공유) ----------
// 지각 명도 L을 고정 래더로 공유시키면, 색상(hue)이 달라도 "같은 단계 = 같은 무게"가 보장된다.
// 토큰 교체 시 대비가 유지되는 핵심 장치.
const L_LADDER = {
  50: 0.973, 100: 0.945, 200: 0.897, 300: 0.836, 400: 0.754,
  500: 0.672, 600: 0.588, 700: 0.503, 800: 0.423, 900: 0.345, 950: 0.258,
};
// 채도 곡선: 중간 단계에서 최대, 양 끝으로 수렴 (가우시안 형태)
const C_CURVE = {
  50: 0.14, 100: 0.26, 200: 0.46, 300: 0.66, 400: 0.86,
  500: 1.0, 600: 1.0, 700: 0.92, 800: 0.80, 900: 0.66, 950: 0.50,
};

function buildScale(name, hue, maxC, { hueShift = 0 } = {}) {
  const out = {};
  for (const step of Object.keys(L_LADDER)) {
    const L = L_LADDER[step];
    const C = maxC * C_CURVE[step];
    // 어두운 단계로 갈수록 색상을 살짝 돌려 탁해 보이는 현상을 보정한다.
    const H = hue + hueShift * (0.672 - L);
    const { hex, rgb, actualC } = oklchToHex(L, C, H);
    out[step] = {
      hex,
      oklch: `oklch(${(L * 100).toFixed(1)}% ${actualC.toFixed(3)} ${H.toFixed(1)})`,
      onWhite: +contrast(rgb, [255, 255, 255]).toFixed(2),
      onInk: +contrast(rgb, hexToRgb('#15100F')).toFixed(2),
      whiteOn: +contrast([255, 255, 255], rgb).toFixed(2),
    };
  }
  return { name, hue, maxC, steps: out };
}

// ---------- 브랜드 레드 후보 3종 ----------
// 붉은색 계열 안에서도 색상각(hue)에 따라 성격이 완전히 달라진다.
const CANDIDATES = [
  { id: 'vermilion', ko: '버밀리온 (주색조 레드)', hue: 34, maxC: 0.175,
    tone: '따뜻하고 활동적. 이커머스·마케팅의 전환 유도에 강함', risk: '경고(amber)색과 거리가 가까움' },
  { id: 'signal',    ko: '시그널 레드 (정통 레드)', hue: 25.5, maxC: 0.195,
    tone: '가장 전형적인 "빨강". 브랜드 각인은 최상', risk: '에러 레드와 정면 충돌 — 의미 혼선 최대' },
  { id: 'crimson',   ko: '크림슨 (청색조 레드)', hue: 14, maxC: 0.185,
    tone: '깊고 단단함. 금융·관리 도구의 신뢰감', risk: '활력·속도감은 상대적으로 낮음' },
];

const scales = {};
for (const c of CANDIDATES) scales[c.id] = { ...buildScale(c.id, c.hue, c.maxC, { hueShift: 10 }), meta: c };

// 의미색(semantic): 브랜드 레드와 반드시 분리되어야 하는 danger 포함
scales.danger  = buildScale('danger',  27,  0.21);   // 순수 적색 — 경고/삭제
scales.warning = buildScale('warning', 75,  0.17);   // 앰버
scales.success = buildScale('success', 150, 0.13);   // 그린
scales.info    = buildScale('info',    250, 0.15);   // 블루

// 중립(neutral): 완전 무채색 대신 브랜드 색상을 미량 섞어 "흰색 계열"의 온도를 맞춘다.
scales.neutralWarm = buildScale('neutral-warm', 30, 0.012);
scales.neutralPure = buildScale('neutral-pure', 30, 0.0);

// ---------- 출력 ----------
const report = { ladder: L_LADDER, curve: C_CURVE, scales };
console.log(JSON.stringify(report, null, 1));
