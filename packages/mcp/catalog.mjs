// 저장 형태의 기본값은 매니페스트에서 읽는다. 도구 응답과 원래 타입 표기를 함께 보존한다.
export function restoreComponent(component, derived) {
  const { kind, source, props, extends: bases, slots, ...intent } = component;
  return {
    ...intent,
    kind: kind ?? derived.kindDefault,
    source: derived.sourceRoot + source,
    props: props.map(({ name, type, required = derived.requiredDefault, ...details }) => ({
      name,
      type: !required && !derived.optionalTypeSuffixExceptions.includes(type) ? type + derived.optionalTypeSuffix : type,
      required,
      ...details,
    })),
    extends: bases,
    slots,
    import: derived.importTemplate.replace('NAME', component.name),
  };
}
