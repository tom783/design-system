// 개수 표식(CountBadge)의 순수 규칙 — 상단 바 규격 3절 · Figma 223:912 · 223:955. React 없이 단위 시험한다(count.test.mjs).

/** 보이는 숫자의 상한. 100 이상은 "99+" 로 줄인다 — 세 자리부터는 표식이 벨 아이콘을 덮는다(규격 3절). */
export const COUNT_MAX = 99;

export interface CountDisplay {
  /** 화면 글자: "7" · "37" · "99+". */
  text: string;
  /** 낭독 글자: "7개" · "99개 이상". 단위는 세는 대상에 따라 앱이 바꾼다(DESIGN.md §25 — 레코드는 건, 항목은 개). */
  spoken: string;
}

/**
 * 개수를 표식 글자로 바꾼다. 그리지 않을 때는 null 이다.
 * - 0·음수 = 숨김(셀 것이 없다).
 * - null·undefined·NaN·무한 = 불러오기 실패 = 숨김. 실패를 0 으로 보이지 않는다(§7.5.6 과 같은 원칙).
 * - 소수는 내림한다(서버가 평균 같은 값을 넘겨도 "2.5" 를 그리지 않는다).
 */
export function countDisplay(count: number | null | undefined, unit = '개'): CountDisplay | null {
  if (count == null || !Number.isFinite(count)) return null;
  const value = Math.floor(count);
  if (value <= 0) return null;
  if (value > COUNT_MAX) return { text: `${COUNT_MAX}+`, spoken: `${COUNT_MAX}${unit} 이상` };
  return { text: String(value), spoken: `${value}${unit}` };
}

/** 급함을 덧붙인 낭독 글자. 색만으로 급함을 알리지 않는다(P5) — 화면은 점, 낭독은 말로 더한다. */
export function countSpoken(count: number | null | undefined, urgent = false, unit = '개'): string | null {
  const display = countDisplay(count, unit);
  if (!display) return null;
  return urgent ? `${display.spoken}, 급함` : display.spoken;
}
