export interface StoredProp {
  name: string;
  type: string;
  required?: boolean;
  doc?: string;
}
export interface StoredComponent {
  name: string;
  source?: string;
  partOf?: string;
  kind?: string;
  props?: StoredProp[];
  extends?: string[];
  slots?: string[];
  rules?: { text: string; source: string }[];
}
export interface CatalogDerived {
  importTemplate: string;
  sourceRoot: string;
  kindDefault: string;
  requiredDefault: boolean;
  optionalTypeSuffix: string;
  optionalTypeSuffixExceptions: string[];
  ruleSourcePrefix: string;
  ruleSourcePrefixExceptions: string[];
}
export function restoreComponent<C extends StoredComponent>(component: C, derived: CatalogDerived, components: readonly StoredComponent[]):
  Omit<C, 'kind' | 'source' | 'props' | 'extends' | 'slots'> & {
    kind: string;
    source: string;
    props: (Omit<StoredProp, 'required'> & { required: boolean })[];
    extends: string[];
    slots: string[];
    import: string;
  };
/** 조립 항목(kind: pattern) — import 하지 않는 여러 부품의 조합 지침. manifest.patterns 에 응답 그대로 보관한다. */
export interface StoredPattern {
  name: string;
  category: string;
  purpose: string;
  useWhen: string[];
  dont: string[];
  rules: { text: string; source: string }[];
  uses: string[];
  related?: string[];
  keywords: string[];
  example: string;
}
export function getPattern<P extends StoredPattern>(manifest: unknown, pattern: P): P & { kind: 'pattern' };
