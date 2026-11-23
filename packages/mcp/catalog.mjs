// 저장 형태의 기본값은 매니페스트에서 읽는다. 도구 응답과 원래 타입 표기를 함께 보존한다.
export function restoreComponent(component, derived, components) {
  const { kind, source, props, extends: bases, slots, ...intent } = component;
  const sourcePath = source ?? components.find(parent => parent.name === component.partOf)?.source;
  if (sourcePath === undefined) throw new Error(`MCP 소스 복원 실패: ${component.name}`);
  return {
    ...intent,
    ...(component.rules ? { rules: component.rules.map(rule => ({
      ...rule,
      source: rule.source.startsWith(derived.ruleSourcePrefix) || derived.ruleSourcePrefixExceptions.includes(rule.source)
        ? rule.source : derived.ruleSourcePrefix + rule.source,
    })) } : {}),
    kind: kind ?? derived.kindDefault,
    source: derived.sourceRoot + sourcePath,
    props: (props ?? []).map(({ name, type, required = derived.requiredDefault, ...details }) => ({
      name,
      type: !required && !derived.optionalTypeSuffixExceptions.includes(type) ? type + derived.optionalTypeSuffix : type,
      required,
      ...details,
    })),
    extends: bases ?? [],
    slots: slots ?? [],
    import: derived.importTemplate.replace('NAME', component.name),
  };
}

// 생성기와 서버가 같은 복원·상속 경로를 사용해야 실제 소비 응답에 예산을 걸 수 있다.
export function listComponents(manifest) {
  return { components: manifest.components.map(entry => {
    const { name, kind, purpose, import: statement, partOf } = restoreComponent(entry, manifest.derived, manifest.components);
    return { name, kind, purpose, import: statement, ...(partOf ? { partOf } : {}) };
  }) };
}
// design://components 는 사람·AI 가 복원 규칙 없이 읽는 선택 색인이다(R49).
// 저장 형태({ derived, components })를 그대로 보내면 읽는 쪽이 derived 규칙으로 복원해야 하고,
// 복원형 전체는 109,990B(2026-11-23 실측)로 항목마다 props·규칙이 붙어 개수에 비례해 커진다.
// 고르는 데 필요한 필드만 두고 props·slots·규칙은 get_component 지연 조회로 넘긴다.
export const INDEX_DESCRIPTION = "컴포넌트 선택 색인이다. 항목마다 이름·부모(partOf)·분류·용도·쓰는 때·금지·부품 목록을 그대로 적는다. 모든 항목은 import { 이름 } from '@s2life/ui'; 로 가져온다. props·slots·규칙과 부모에서 합친 의도는 get_component로 이름마다 조회한다.";
const INDEX_FIELDS = ['name', 'partOf', 'category', 'purpose', 'useWhen', 'dont', 'parts'];
export function componentIndex(manifest) {
  return { description: INDEX_DESCRIPTION, components: manifest.components.map(entry => {
    const component = restoreComponent(entry, manifest.derived, manifest.components);
    return Object.fromEntries(INDEX_FIELDS.filter(field => component[field] !== undefined
      && !(Array.isArray(component[field]) && component[field].length === 0)).map(field => [field, component[field]]));
  }) };
}
export function getComponent(manifest, entry) {
  const component = restoreComponent(entry, manifest.derived, manifest.components);
  if (!component.partOf) return component;
  const parent = manifest.components.find(c => c.name === component.partOf);
  const { useWhen, dont, rules, category, related } = restoreComponent(parent, manifest.derived, manifest.components);
  return { ...component, useWhen: [...new Set([...(component.useWhen ?? []), ...useWhen])],
    dont: [...new Set([...(component.dont ?? []), ...dont])], rules, category,
    ...(component.related ? { related: [...new Set([...(component.related ?? []), ...(related ?? [])])].filter(name => name !== component.name) } : {}),
    inheritedFrom: parent.name };
}
