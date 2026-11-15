// 공백 없는 한국어 조사 결합과 영문 대소문자를 함께 흡수한다. 외부 모델이나 상태를 쓰지 않는다.
const normalize = (text) => text.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/gu, '');
export function matchComponents(description, components, limit = 5) {
  const query = normalize(description);
  if (!query) return [];
  const words = description.normalize('NFKC').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word.length >= 2);
  return components.filter((c) => c.kind !== 'constant').map((component) => {
    let score = 0;
    const reasons = [];
    if (query.includes(normalize(component.name))) { const weight = query === normalize(component.name) ? 2000 : 1000;
      score += weight; reasons.push(`이름 일치: ${component.name} (+${weight})`); }
    for (const keyword of component.keywords) if (query.includes(normalize(keyword))) {
      // 한 글자 문맥(표·행)이 작업 목적(요약)을 압도하지 않게 가중치를 낮춘다.
      const weight = normalize(keyword).length === 1 ? 4 : 20;
      score += weight; reasons.push(`키워드 일치: ${keyword} (+${weight})`);
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
