import * as Yup from 'yup';
import { FieldType } from '@/models/field';
import type { FieldDefinition } from '@/models/fieldDefinition';

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldDef extends Omit<FieldDefinition, 'name'> {
  name: string;  // We'll use string instead of keyof FormData for flexibility
  step: number;  // Additional field for form organization
  description?: string;  // Additional field for help text
}

// Get array of valid field types from FieldType
const validFieldTypes: FieldType[] = [
  'text', 'email', 'url', 'textarea', 'dropdown', 
  'checkbox', 'file', 'phone', 'address'
];

// Validation schema for a single field
export const fieldDefValidation = Yup.object().shape({
  id: Yup.string().required('Field ID is required'),
  name: Yup.string()
    .required('Field name is required')
    .matches(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Name must start with a letter and contain only letters, numbers, and underscores'),
  label: Yup.string().required('Label is required'),
  type: Yup.string()
    .oneOf(validFieldTypes)
    .required(),
  required: Yup.boolean().default(false),
  step: Yup.number().min(1).max(3).required('Step is required'),
  options: Yup.array().when('type', {
    is: (val: string) => val === 'dropdown',
    then: () => Yup.array().of(
      Yup.object().shape({
        label: Yup.string().required('Option label is required'),
        value: Yup.string().required('Option value is required')
      })
    ).min(1, 'Dropdown fields must have at least one option'),
    otherwise: () => Yup.array().max(0)
  }),
  description: Yup.string().nullable(),
  placeholder: Yup.string().nullable()
});

// Main validation schema
export const formValidationSchema = Yup.object().shape({
  fields: Yup.array().of(fieldDefValidation)
});

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  step: number;
  required: boolean;
  description?: string;
  placeholder?: string;
  options?: Array<{
    label: string;
    value: string;
  }>;
}

export interface FormSchema {
  fields: Field[];
  version: string;
  published: boolean;
  lastModified: Date;
} 