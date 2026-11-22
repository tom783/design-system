// 공백 없는 한국어 조사 결합과 영문 대소문자를 함께 흡수한다. 외부 모델이나 상태를 쓰지 않는다.
const normalize = (text) => text.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/gu, '');
// 어느 컴포넌트도 가려내지 못하는 일반어. 목적·쓰임새 문장에 흔히 들어가 우연히 겹친다.
// R28 실측: "zzzz 아무 관련 없는 말" 이 Card 의 "관련 정보를 카드로 묶을 때" 와 '관련' 하나로 7점을 받았다.
// 키워드·이름 일치에는 쓰지 않는다 — 문장 토큰 비교에서만 뺀다.
const GENERIC_WORDS = new Set(['관련', '아무', '없는', '있는', '위한', '대한', '통해', '경우', '모든', '어떤']);
// 구체적인 여러 낱말은 일반 키워드보다 강하다. 떨어진 일치는 연속 구절보다 낮게 친다.
function keywordMatch(query, queryWords, keyword) {
  const phrase = normalize(keyword);
  const words = keyword.normalize('NFKC').trim().split(/\s+/u).map(normalize);
  if (query.includes(phrase)) return { weight: phrase.length === 1 ? 4 : query === phrase ? 80 : words.length > 1 ? 40 : 20, separated: false, words };
  // 모든 낱말이 있으면 후보로 남긴다. 조사 결합은 강하게, '실행' 안의 '행' 같은 내부 일치는 약하게 친다.
  const positions = words.map(word => queryWords.findIndex(candidate => candidate.startsWith(word)));
  if (words.length > 1 && words.every(word => query.includes(word))) {
    const ordered = positions.every(position => position >= 0) && positions.every((position, index) => index === 0 || position > positions[index - 1]);
    return { weight: ordered ? 24 : 8, separated: true, words };
  }
  return null;
}
export function matchComponents(description, components, limit = 5) {
  const query = normalize(description);
  if (!query) return [];
  const queryWords = description.normalize('NFKC').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const words = description.normalize('NFKC').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word.length >= 2 && !GENERIC_WORDS.has(word));
  // 기본 부품은 제외한다. 고유 검색어를 선언한 다른 배치(Sheet 등)는 직접 선택할 수 있다.
  return components.filter((c) => c.kind !== 'constant' && (!c.partOf || (c.keywords?.length
    && (c.keywords.some(keyword => keywordMatch(query, queryWords, keyword)) || query.includes(normalize(c.name)))))).map((component) => {
    let score = 0;
    const reasons = [];
    if (query.includes(normalize(component.name))) { const weight = query === normalize(component.name) ? 2000 : 1000;
      score += weight; reasons.push(`이름 일치: ${component.name} (+${weight})`); }
    const keywordMatches = (component.keywords ?? []).map(keyword => ({ keyword, match: keywordMatch(query, queryWords, keyword) })).filter(item => item.match);
    for (const { keyword, match } of keywordMatches) {
      // '상태'와 떨어진 '상태 표시'는 같은 근거이므로 겹친 점수를 다시 더하지 않는다.
      const overlap = match.separated ? keywordMatches.filter(item => !item.match.separated && match.words.includes(normalize(item.keyword)))
        .reduce((sum, item) => sum + item.match.weight, 0) : 0;
      const weight = Math.max(0, match.weight - overlap);
      if (weight) { score += weight; reasons.push(`키워드 ${match.separated ? '낱말' : '일치'}: ${keyword} (+${weight})`); }
    }
    for (const [field, weight] of [['purpose', 2], ['useWhen', 5]]) {
      const text = normalize(Array.isArray(component[field]) ? component[field].join(' ') : component[field]);
      const matches = [...new Set(words.filter((word) => text.includes(normalize(word))))];
      if (matches.length) { score += matches.length * weight; reasons.push(`${field}: ${matches.join(', ')} (+${matches.length * weight})`); }
    }
    return { name: component.name, score, reasons, purpose: component.purpose, useWhen: component.useWhen, dont: component.dont };
    // purpose 한 토큰(2점)만 맞은 것은 매칭 근거가 못 된다. 조사·일반어가 우연히 겹친다 —
    // "zzzz 아무 관련 없는 말" 이 AlertDialog 의 "되돌릴 수 없는" 과 '없는' 으로 붙었다.
  }).filter((c) => c.score > 2).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'en')).slice(0, limit);
}
