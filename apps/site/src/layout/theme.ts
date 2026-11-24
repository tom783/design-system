import * as React from 'react';

/**
 * 테마 3상태(DESIGN.md 2.5) — 미지정은 운영체제 설정(prefers-color-scheme)을 따르고, light·dark 는 html[data-theme] 로 고정한다.
 * 토큰이 세 상태를 모두 정의하므로 사이트는 속성만 바꾼다(.storybook/preview.tsx 와 같은 방식).
 * 고른 값은 이 브라우저에만 기억한다 — 저장소를 못 쓰는 환경이면 기억하지 않고 기본(미지정)으로 뜬다.
 */
export type ThemeChoice = 'system' | 'light' | 'dark';
const KEY = 's2life-site-theme';

export function readTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(choice: ThemeChoice) {
  if (choice === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', choice);
}

export function useTheme() {
  const [choice, setChoice] = React.useState<ThemeChoice>(readTheme);
  const change = React.useCallback((next: ThemeChoice) => {
    setChoice(next);
    applyTheme(next);
    try {
      if (next === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, next);
    } catch { /* 기억만 못 한다 */ }
  }, []);
  return [choice, change] as const;
}
