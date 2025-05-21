export type FieldType =
  | "text" | "email" | "url" | "textarea"
  | "dropdown" | "checkbox" | "file"
  | "phone" | "address";

export interface FieldOption {
  label: string;
  value: string;
}
