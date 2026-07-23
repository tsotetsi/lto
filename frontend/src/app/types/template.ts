export interface TemplateVariable {
  name: string;
  label: string;
  default: string;
  required: boolean;
  type: 'text' | 'email' | 'phone' | 'date' | 'multiline';
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  tex_content: string;
  variables: Record<string, TemplateVariable>;
  font: string;
  created_at: string;
  updated_at: string;
  is_free: boolean;
}

export interface TemplateFillData {
  template_id: string;
  variables: Record<string, string>;
}