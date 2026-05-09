export type FieldType = 'text' | 'email' | 'url' | 'textarea' | 'file' | 'dropdown' | 'phone' | 'checkbox' | 'address' | 'multiselect';

export interface Option {
  value: string;
  label: string;
}

export interface FieldDefinition {
  id: string;
  name: string;
  type: FieldType;
  label: string;
  required: boolean;
  step: number;
  placeholder?: string;
  description?: string;
  options?: Option[];
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  airtableColumn?: string;
  // Phone field specific properties
  countryCode?: string;
  phoneFormat?: string;
}

export interface FormDefinition {
  version: number; 
  updatedAt: string;   
  fields: FieldDefinition[];
}

export default FieldDefinition;
