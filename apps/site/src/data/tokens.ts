// 파운데이션 값은 생성된 tokens.json(`pnpm tokens`, docs/research/tokens-build.mjs)에서만 읽는다.
// 앱이 `@s2life/ui/tokens.json` 으로 받는 파일과 같은 내용이다(packages/tokens/tokens.json 을 그대로 복사해 배포).
import tokensJson from '@s2life/tokens/tokens.json';

export interface Primitive { hex: string; oklch: string; onWhite: number }
export interface SemanticToken { ref: string; hex: string; purpose: string }
export interface TypographyToken {
  token: string;
  size: number;
  lineHeight: number;
  lineHeightPct: number;
  letterSpacing: string;
  weight: number;
  purpose: string;
}
export interface ContrastCheck { label: string; value: number; min: number; kind: string; pass: boolean }

interface Tokens {
  generatedAt: string;
  decisions: Record<string, unknown>;
  hues: Record<string, { hue: number; maxC: number; drift: number }>;
  primitives: Record<string, Record<string, Primitive>>;
  semantic: Record<'light' | 'dark', Record<string, SemanticToken>>;
  typography: TypographyToken[];
  spacing: number[];
  shape: Record<string, string>;
  sizing: Record<string, string>;
  motion: Record<string, string>;
  loading: Record<string, string>;
  verification: { contrast: ContrastCheck[] } & Record<string, unknown>;
}

export const tokens = tokensJson as unknown as Tokens;

/** 원시 색 단계의 CSS 변수 이름 — tokens-build.mjs 가 `--color-{hue}-{step}` 로 낸다. */
export const primitiveVariable = (hue: string, step: string) => `--color-${hue}-${step}`;
