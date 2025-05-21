import { FieldType, FieldOption } from "./field";
import { FormData } from "./formData";

export interface FieldDefinition {
id: string;
name: keyof FormData;
type: FieldType;
label: string;
placeholder?: string;
required?: boolean;
options?: FieldOption[];
}

export interface FormDefinition {
version: number; 
updatedAt: string;   
fields: FieldDefinition[];
  
}
