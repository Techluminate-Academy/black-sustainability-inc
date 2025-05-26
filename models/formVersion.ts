// src/models/formVersion.ts
import { FieldDefinition } from "./fieldDefinition";

export interface FormVersion {
  version: number;
  updatedAt: string;          // ISO timestamp
  fields: FieldDefinition[];
  status: string;
}
