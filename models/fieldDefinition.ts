import { FieldType, FieldOption } from "./field";

export interface FieldDefinition {
  id: string;
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: FieldOption[];
  step?: number;
  description?: string;
  airtableColumn?: string;
}

export interface FormDefinition {
version: number; 
updatedAt: string;   
fields: FieldDefinition[];
  
}
