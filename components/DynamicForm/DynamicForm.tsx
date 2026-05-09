"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent, useMemo } from "react";
import axios from "axios";
import jerryData from "@/data/jerry.json";
import AirtableUtils from "@/pages/api/submitForm";
import CountryCodeDropdown from "../CountryCodeDropdown/CountryCodeDropdown";
import { allCountries } from "country-telephone-data";
import { Field, useFormikContext } from 'formik';
import type { FieldDefinition } from '@/models/fieldDefinition';
import Select from 'react-select';
import GooglePlacesAutocomplete, { geocodeByPlaceId, getLatLng } from 'react-google-places-autocomplete';

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
    | "address"
    | "multiselect";
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

// Transform the raw country data into the format expected by CountryCodeDropdown
const internationalOptions = (allCountries as CountryData[]).map(country => ({
  value: `+${country.dialCode}-${country.iso2}`,
  label: `${country.name} (+${country.dialCode})`,
  iso2: country.iso2.toLowerCase()
}));

interface DynamicFormProps {
  fields: FieldDefinition[];
  values: Record<string, any>;
  renderImagePreview?: (fieldName: string, values: any) => React.ReactNode;
  errors?: Record<string, string>;
}

export default function DynamicForm({ fields, values, renderImagePreview, errors = {} }: DynamicFormProps): React.ReactElement {
  const { setFieldValue } = useFormikContext();
  const [googleApiKey, setGoogleApiKey] = useState("");

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      setGoogleApiKey(apiKey);
    } else {
      console.error("Google Maps API key not found.");
    }
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (e.target.files && e.target.files[0]) {
      setFieldValue(fieldName, e.target.files[0]);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');
    
    // Format the number as (XXX) XXX-XXXX
    if (numbers.length >= 10) {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
    } else if (numbers.length >= 6) {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`;
    } else if (numbers.length >= 3) {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    } else if (numbers.length > 0) {
      return `(${numbers}`;
    }
    return numbers;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, field: FieldDefinition) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
    setFieldValue(field.name, formattedNumber);
  };

  const renderField = (field: FieldDefinition) => {
    const fieldError = errors[field.name];
    const fieldWrapper = (children: React.ReactNode) => (
      <div key={field.id} className="mb-4">
        <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
          {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {field.description && (
          <p className="text-sm text-gray-500 mb-2">{field.description}</p>
        )}
        {children}
        {fieldError && (
          <p className="mt-1 text-sm text-red-600">{fieldError}</p>
        )}
      </div>
    );

    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
        return fieldWrapper(
          <Field
            type={field.type}
            name={field.name}
            placeholder={field.placeholder}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldError ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        );
      
      case 'textarea':
        return fieldWrapper(
          <Field
            as="textarea"
            name={field.name}
            placeholder={field.placeholder}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 ${
              fieldError ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        );
      
      case 'file':
        return fieldWrapper(
          <div>
            <input
              type="file"
              id={field.name}
              name={field.name}
              onChange={(e) => handleFileChange(e, field.name)}
              className={`block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100 ${
                fieldError ? 'border-red-500' : ''
              }`}
            />
            {renderImagePreview && renderImagePreview(field.name, values)}
          </div>
        );
      
      case 'dropdown':
        return fieldWrapper(
          <Field
            as="select"
            name={field.name}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldError ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">{field.placeholder || 'Select an option'}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Field>
        );
      
      case 'multiselect':
        const selectedOptions = field.options?.filter(option => 
          Array.isArray(values[field.name]) && values[field.name].includes(option.value)
        );
        return fieldWrapper(
          <Select
            isMulti
            name={field.name}
            options={field.options}
            value={selectedOptions}
            placeholder={field.placeholder || 'Select options...'}
            onChange={(selected) => {
              setFieldValue(
                field.name,
                selected ? selected.map(option => option.value) : []
              );
            }}
            className="react-select-container"
            classNamePrefix="react-select"
            styles={{
              control: (base) => ({
                ...base,
                minHeight: '42px',
                backgroundColor: 'white',
                borderColor: fieldError ? '#EF4444' : '#E5E7EB',
                '&:hover': {
                  borderColor: fieldError ? '#DC2626' : '#3B82F6'
                }
              }),
              multiValue: (base) => ({
                ...base,
                backgroundColor: '#EFF6FF',
                borderRadius: '6px',
                padding: '2px 4px',
                margin: '2px'
              }),
              multiValueLabel: (base) => ({
                ...base,
                color: '#2563EB',
                fontSize: '0.875rem'
              }),
              multiValueRemove: (base) => ({
                ...base,
                color: '#2563EB',
                ':hover': {
                  backgroundColor: '#DBEAFE',
                  color: '#1D4ED8'
                }
              }),
              placeholder: (base) => ({
                ...base,
                color: '#6B7280'
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: 'white',
                zIndex: 50
              }),
              option: (base, { isFocused, isSelected }) => ({
                ...base,
                backgroundColor: isSelected 
                  ? '#2563EB' 
                  : isFocused 
                    ? '#DBEAFE' 
                    : 'white',
                color: isSelected ? 'white' : '#1F2937',
                ':active': {
                  backgroundColor: '#2563EB',
                  color: 'white'
                }
              })
            }}
          />
        );
      
      case 'checkbox':
        return fieldWrapper(
          <Field
            type="checkbox"
            name={field.name}
            className={`h-4 w-4 text-blue-600 focus:ring-blue-500 rounded ${
              fieldError ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        );
      
      case 'phone':
        return fieldWrapper(
          <div className="flex">
            <CountryCodeDropdown
              value={values.phoneCountryCode || '+1-us'}
              options={internationalOptions}
              onChange={(value) => setFieldValue('phoneCountryCode', value)}
            />
            <Field
              type="tel"
              name={field.name}
              placeholder="(XXX) XXX-XXXX"
              value={values[field.name] || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePhoneChange(e, field)}
              className={`flex-1 px-3 py-2 border rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                fieldError ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={14} // (XXX) XXX-XXXX = 14 characters
            />
          </div>
        );
      
      case 'address':
        return fieldWrapper(
          <div>
            {googleApiKey ? (
              <GooglePlacesAutocomplete
                apiKey={googleApiKey}
                selectProps={{
                  value: values[field.name] ? {
                    label: values[field.name],
                    value: {
                      place_id: values[`${field.name}PlaceId`] || "",
                      structured_formatting: {
                        main_text: values[field.name],
                        secondary_text: ""
                      }
                    }
                  } : null,
                  onChange: async (val: any) => {
                    if (!val) {
                      setFieldValue(field.name, "");
                      setFieldValue(`${field.name}PlaceId`, "");
                      setFieldValue("latitude", null);
                      setFieldValue("longitude", null);
                      return;
                    }
                    setFieldValue(field.name, val.label);
                    setFieldValue(`${field.name}PlaceId`, val.value.place_id);
                    try {
                      const results = await geocodeByPlaceId(val.value.place_id);
                      const { lat, lng } = await getLatLng(results[0]);
                      setFieldValue("latitude", lat);
                      setFieldValue("longitude", lng);
                    } catch (error) {
                      console.error("Error getting lat/lng from place", error);
                    }
                  },
                  placeholder: field.placeholder || "Start typing your address...",
                  styles: {
                    control: (base) => ({
                      ...base,
                      minHeight: '42px',
                      backgroundColor: 'white',
                      borderColor: '#E5E7EB',
                      borderRadius: '0.375rem',
                      '&:hover': {
                        borderColor: '#3B82F6'
                      }
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: 'white',
                      zIndex: 50
                    }),
                    option: (base, { isFocused, isSelected }) => ({
                      ...base,
                      backgroundColor: isSelected 
                        ? '#2563EB' 
                        : isFocused 
                          ? '#DBEAFE' 
                          : 'white',
                      color: isSelected ? 'white' : '#1F2937',
                      ':active': {
                        backgroundColor: '#2563EB',
                        color: 'white'
                      }
                    })
                  }
                }}
                autocompletionRequest={{ types: ["address"] }}
              />
            ) : (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-500">
                Loading address search...
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {fields.map((field) => renderField(field))}
    </div>
  );
}

