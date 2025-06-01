// src/types/form.ts

/**  
 * Raw metadata about each Airtable column.  
 * Used to map from your FieldConfig.name → real Airtable field name & type.  
 */
export interface AirtableFieldMeta {
    /** exactly the human‐readable column name in Airtable */
    fieldName: string;
    /** one of “singleSelect”, “multipleSelects”, “text”, “number”, “multilineText”, “multipleAttachments”, etc. */
    fieldType: string;
    /** select options, only populated for singleSelect / multipleSelects columns */
    options: Array<{
      id: string;
      name: string;
      icon: string | null;
    }>;
  }
  
  /** simple { label,value } shape for custom dropdowns */
  export interface Option {
    label: string;
    value: string;
  }
  
  /** the finite list of input types your form supports */
  export type FieldType =
    | "text"
    | "email"
    | "url"
    | "textarea"
    | "file"
    | "dropdown"
    | "phone"
    | "checkbox"
    | "address";
  
  /** one entry in your form schema */
  export interface FieldConfig {
    /** unique across the form */
    id: string;
    /** key you’ll use in formData, e.g. “bio” */
    name: string;
    /** how you render it */
    type: FieldType;
    /** label shown to users */
    label: string;
    /** must be filled in to pass validation */
    required: boolean;
    /** only for dropdown fields */
    options?: Option[];
    /** step index to group into pages */
    step: number;
  }
  
  /** the published form version + its fields */
  export interface FormConfig {
    version: number;
    updatedAt: string; // ISO timestamp
    fields: FieldConfig[];
    status: string;    // e.g. “published”
  }
  
  /** convenience maps produced by your Airtable‐meta hook */
  export type NameToFieldNameMap = Record<string,string>;
  export type NameToFieldTypeMap = Record<string,string>;
  export type NameToFieldOptionsMap = Record<string,Array<{id:string;name:string}>>;
  