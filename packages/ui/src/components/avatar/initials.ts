// Unicode Script 판별로 한글·한자·가나가 섞인 이름도 이름 쪽 두 글자를 우선한다.
const cjk = /[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
/** @deprecated 다음 마이너에서 공개 API에서 뺀다. 이름 글자는 Avatar가 그린다. */
export function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  // 결합 문자·이모지 ZWJ 시퀀스까지 한 글자로 보존한다.
  const graphemes = (value: string) => Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value), (part) => part.segment);
  if (cjk.test(trimmed)) return graphemes(trimmed.replace(/\s+/gu, '')).slice(-2).join('');
  return trimmed.split(/\s+/u).slice(0, 2).map((word) => graphemes(word)[0]).join('').toLocaleUpperCase('en');
}
