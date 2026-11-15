const INITIALS = [...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'];
const VOWELS = [...'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'];
const FINALS = [...'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'];
const normalize = (value: string) => value.normalize('NFC').toLocaleLowerCase('ko-KR').replace(/\s+/gu, '');

function initialSequence(value: string): string {
  return [...value].map(char => {
    const syllable = char.codePointAt(0)! - 0xac00;
    return syllable >= 0 && syllable < 11172 ? INITIALS[Math.floor(syllable / 588)] : char;
  }).join('');
}

function decompose(value: string): string {
  return [...value.normalize('NFD')].map(char => {
    const code = char.codePointAt(0)!;
    // NFD의 위치별 자모를 호환 자모로 통일해야 완성 음절과 "물ㄹ"을 함께 비교할 수 있다.
    if (code >= 0x1100 && code <= 0x1112) return INITIALS[code - 0x1100];
    if (code >= 0x1161 && code <= 0x1175) return VOWELS[code - 0x1161];
    if (code >= 0x11a8 && code <= 0x11c2) return FINALS[code - 0x11a8];
    return char;
  }).join('');
}

/** 언어 처리만 담당한다(§11.6). 도메인별 검색 정책은 Combobox.filter로 교체한다. */
export function comboboxFilter(query: string, value: string): boolean {
  const needle = normalize(query), candidate = normalize(value);
  if (candidate.includes(needle)) return true;
  if ([...needle].every(char => INITIALS.includes(char)) && initialSequence(candidate).includes(needle)) return true;
  return decompose(candidate).includes(decompose(needle));
}
