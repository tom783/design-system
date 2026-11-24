// Unicode Script 판별로 한글·한자·가나가 섞인 이름도 이름 쪽 두 글자를 우선한다.
const cjk = /[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
/** 내부 — Avatar 가 쓴다. 0.6.0 에서 공개 API 에서 뺐다(0.5.0 예고). */
export function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  // 결합 문자·이모지 ZWJ 시퀀스까지 한 글자로 보존한다.
  const graphemes = (value: string) => Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value), (part) => part.segment);
  if (cjk.test(trimmed)) return graphemes(trimmed.replace(/\s+/gu, '')).slice(-2).join('');
  return trimmed.split(/\s+/u).slice(0, 2).map((word) => graphemes(word)[0]).join('').toLocaleUpperCase('en');
}
