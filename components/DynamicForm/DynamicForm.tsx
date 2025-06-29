"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent, useMemo } from "react";
import axios from "axios";
import jerryData from "@/data/jerry.json";
import AirtableUtils from "@/pages/api/submitForm";
import CountryCodeDropdown from "../CountryCodeDropdown/CountryCodeDropdown";
import { allCountries } from "country-telephone-data";
import { Field } from 'formik';
import type { FieldDefinition } from '@/models/fieldDefinition';

interface AirtableFieldMeta {
  fieldName: string;
  fieldType: string;
  options: Array<{ id: string; name: string; icon: string | null }>;
}

export interface Option { label: string; value: string; }

export interface FieldConfig {
  id: string;
  name: string;
  type:
    | "text"
    | "email"
    | "url"
    | "textarea"
    | "file"
    | "dropdown"
    | "phone"
    | "checkbox"
    | "address";
  label: string;
  required: boolean;
  options?: Option[];
  step: number;
}

export interface FormConfig {
  version: number;
  updatedAt: string;
  fields: FieldConfig[];
  status: string;
}

interface CountryData {
  dialCode: string;
  name: string;
  iso2: string;
}

interface DynamicFormProps {
  fields: FieldDefinition[];
  values: Record<string, any>;
}

const DynamicForm: React.FC<DynamicFormProps> = ({ fields, values }) => {
  const renderField = (field: FieldDefinition) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
        return (
          <Field
            type={field.type}
            name={field.name}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );
      
      case 'textarea':
        return (
          <Field
            as="textarea"
            name={field.name}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
          />
        );
      
      case 'dropdown':
        return (
          <Field
            as="select"
            name={field.name}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an option</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Field>
        );
      
      case 'checkbox':
        return (
          <Field
            type="checkbox"
            name={field.name}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        );
      
      case 'phone':
        return (
          <Field
            type="tel"
            name={field.name}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );
      
      case 'address':
        return (
          <div className="space-y-2">
            <Field
              type="text"
              name={`${field.name}.street`}
              placeholder="Street Address"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <Field
                type="text"
                name={`${field.name}.city`}
                placeholder="City"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Field
                type="text"
                name={`${field.name}.state`}
                placeholder="State"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field
                type="text"
                name={`${field.name}.zip`}
                placeholder="ZIP Code"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Field
                type="text"
                name={`${field.name}.country`}
                placeholder="Country"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {fields.map((field) => (
        <div key={field.id} className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.description && (
            <p className="text-sm text-gray-500">{field.description}</p>
          )}
          {renderField(field)}
        </div>
      ))}
    </div>
  );
};

export default DynamicForm;

