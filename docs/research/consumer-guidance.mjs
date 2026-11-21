// 소비자 문구만 검사한다. props·검색어·principles와 부모에서 복원된 규칙은 대상이 아니다.
export const forbiddenTerms = [
  'Observer', 'threshold', 'scrollBy', 'scrollTo', 'Radix', 'cmdk', '구독', 'roving',
  'tabindex', 'data-state', 'popover', 'useLayoutEffect', 'useEffect', 'preventDefault',
  'activedescendant', 'scrollHeight', 'fonts.ready', '재측정', 'Screens/',
];

// 예외가 필요하면 { name, field, text, term, reason }으로 정확한 항목과 이유를 고정한다.
// 배열 위치 대신 원문을 묶어야 문구가 바뀐 뒤에도 예외가 다른 항목으로 새지 않는다.
export const guidanceAllowlist = [];

export function checkConsumerGuidance(components, allowlist = guidanceAllowlist) {
  const errors = [], used = new Set(), owners = new Map();
  for (const component of components) {
    const fields = [
      ['purpose', component.purpose],
      ...(component.useWhen ?? []).map(text => ['useWhen', text]),
      ...(component.dont ?? []).map(text => ['dont', text]),
      ...(component.rules ?? []).map(rule => ['rules', rule.text]),
    ];
    for (const [field, text] of fields) {
      for (const term of forbiddenTerms) {
        if (!text.toLowerCase().includes(term.toLowerCase())) continue;
        const exception = allowlist.find(item => item.name === component.name && item.field === field
          && item.text === text && item.term === term && item.reason?.trim());
        if (exception) used.add(exception);
        else errors.push({ kind: 'forbidden', name: component.name, field, term, text });
      }
      if (field !== 'rules') continue;
      if ([...text].length > 120) errors.push({ kind: 'length', name: component.name, field, length: [...text].length, text });
      const names = owners.get(text) ?? new Set();
      names.add(component.name); owners.set(text, names);
    }
  }
  for (const [text, names] of owners) {
    if (names.size > 1) errors.push({ kind: 'duplicate', names: [...names], text });
  }
  for (const exception of allowlist) {
    if (!used.has(exception)) errors.push({ kind: 'unused-allowance', ...exception });
  }
  return errors;
}
