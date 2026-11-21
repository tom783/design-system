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
