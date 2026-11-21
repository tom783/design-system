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
