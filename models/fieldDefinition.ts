import { FieldType, FieldOption } from "./field";
import { FormData } from "./formData";

export interface FieldDefinition {
  id: string;
  // Now TypeScript will flag any typos here immediately
  name: keyof FormData;
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: FieldOption[];
}

export interface FormDefinition {
  fields: FieldDefinition[];
}
