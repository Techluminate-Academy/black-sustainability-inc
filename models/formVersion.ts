// src/models/formVersion.ts
import { FieldDefinition } from "./fieldDefinition";
import { Document } from "mongodb";

export interface FormVersion extends Document {
  version: number;
  name?: string;             // form name
  master?: boolean;          // Indicates if this is a master configuration
  isMultiStep?: boolean;     // Indicates if this is a multi-step form
  updatedAt: string;          // ISO timestamp
  fields: FieldDefinition[];
  status: string;
}
