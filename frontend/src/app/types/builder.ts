export interface BuilderVariable {
  name: string;
  label: string;
  default: string;
  required: boolean;
  type: 'text' | 'email' | 'phone' | 'url' | 'multiline';
}

export interface SectionDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  latexTemplate: string;
  variables: Record<string, BuilderVariable>;
  category: 'header' | 'standard' | 'optional';
}

export interface SectionInstance {
  instanceId: string;
  sectionDefId: string;
  name: string;
  icon: string;
  variables: Record<string, string>;
  hasContent: boolean;
}
