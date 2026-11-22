/**
 * className 을 "바깥 배치" 클래스와 나머지로 나눈다.
 *
 * Input 은 검색·비밀번호·앞 아이콘이 있으면 `<span class="ds-input-control">` 래퍼 안에
 * `<input>` 을 넣는다. className 을 전부 안쪽 input 에 붙이면 `w-80` 같은 폭 지정이
 * 래퍼(width:100%)를 줄이지 못해 툴바 한 줄을 통째로 차지한다(2026-11-22 화면 시안:
 * 검색 Input 이 필터 Select 를 다음 줄로 밀었다). 래퍼가 없는 Input 은 input 자체가 바깥
 * 요소라 폭이 그대로 먹으므로, 래퍼가 있을 때도 폭·배치는 바깥 요소가 받게 맞춘다.
 *
 * 바깥으로 보내는 것: 폭(w·min-w·max-w)·flex/grid 항목 배치(flex-1·basis·grow·shrink·
 * order·self·col-·row-)·바깥 여백(m*). 글자·테두리·안쪽 여백처럼 입력칸 자체의 모양은
 * 안쪽에 남긴다. 변형 접두어(`sm:`·`hover:`)와 important(`!`)는 판별에서 벗겨 보고
 * 원래 문자열 그대로 보낸다.
 */
const LAYOUT = new RegExp([
  '^-?(?:min-|max-)?w-',
  '^basis-',
  '^flex-(?:\\d|auto|initial|none|\\[)',
  '^(?:grow|shrink)(?:-|$)',
  '^order-',
  '^(?:justify-|place-)?self-',
  '^(?:col|row)-(?:span|start|end|auto)',
  '^-?m[xytrblse]?-',
].join('|'));

/** 변형 접두어를 벗긴 유틸리티 이름. 대괄호 안의 `:`(예: `has-[:focus]:`)는 경계로 보지 않는다. */
function utilityOf(token: string) {
  let depth = 0, start = 0;
  for (let i = 0; i < token.length; i++) {
    const c = token[i];
    if (c === '[' || c === '(') depth++;
    else if (c === ']' || c === ')') depth--;
    else if (c === ':' && depth === 0) start = i + 1;
  }
  return token.slice(start).replace(/^!/, '').replace(/!$/, '');
}

export function splitLayoutClassName(className?: string): { outer?: string; inner?: string } {
  if (!className) return {};
  const outer: string[] = [], inner: string[] = [];
  for (const token of className.split(/\s+/)) {
    if (token) (LAYOUT.test(utilityOf(token)) ? outer : inner).push(token);
  }
  return { outer: outer.join(' ') || undefined, inner: inner.join(' ') || undefined };
}
