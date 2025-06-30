"use client";

import React, { useState } from "react";
import { GetServerSideProps } from "next";
import Image from "next/image";
import useSWR from 'swr';
import { Formik, Form } from 'formik';
import { connectToDatabase } from "@/lib/mongodb";
import type { Collection } from "mongodb";
import type { FormVersion } from "@/models/formVersion";
import type { FieldDef } from "@/types/schema-editor";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import logo from "@/public/png/bsn-logo.png";

interface PreviewProps {
  version: number;
  fields: FieldDef[];
  formName: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export const getServerSideProps: GetServerSideProps<PreviewProps> = async ({ params }) => {
  const raw = Array.isArray(params?.version) ? params.version[0] : params?.version;
  const version = parseInt(raw as string, 10);
  if (isNaN(version)) return { notFound: true };

  const { db } = await connectToDatabase();
  const coll = db.collection("formVersions") as Collection<FormVersion>;
  const doc = await coll.findOne({ version });
  if (!doc) return { notFound: true };

  const fields: FieldDef[] = (doc.fields || []).map((f) => ({
    id: f.id || '',
    name: f.name || '',
    label: f.label || '',
    type: f.type,
    required: Boolean(f.required),
    options: Array.isArray(f.options)
      ? f.options.map((o) => ({ label: o.label, value: o.value }))
      : [],
    step: typeof f.step === "number" ? f.step : 1,
    description: f.description || '',
    placeholder: f.placeholder || ''
  }));

  return { 
    props: { 
      version, 
      fields,
      formName: doc.name || `Form ${version}`
    } 
  };
};

function renderField(field: FieldDef, formData: any, errors: any, touched: Record<string, boolean>, onFieldChange: (name: string, value: any) => void) {
  const commonProps = {
    id: field.name,
    value: formData[field.name] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => 
      onFieldChange(field.name, e.target.value),
    placeholder: field.placeholder,
    className: `
      w-full
      px-4
      py-3
      text-base
      border
      rounded-lg
      focus:ring-2
      focus:ring-blue-500
      focus:ring-offset-1
      ${errors[field.name] && touched[field.name]
        ? 'border-red-500 focus:ring-red-200' 
        : 'border-gray-300 focus:ring-blue-200'
      }
      transition-colors
      duration-200
    `
  };

  const errorMessage = errors[field.name] && touched[field.name] && (
    <p 
      id={`${field.name}-error`}
      role="alert"
      className="mt-1.5 text-sm text-red-600 font-medium"
      aria-live="polite"
    >
      {errors[field.name]}
    </p>
  );

  const label = (
    <label 
      htmlFor={field.name}
      className="block text-sm font-medium text-gray-700 mb-1"
    >
      {field.label} {field.required && <span className="text-red-600">*</span>}
    </label>
  );

  switch (field.type) {
    case 'textarea':
      return (
        <div className="form-field">
          {label}
          <textarea
            {...commonProps}
            rows={4}
          />
          {errorMessage}
        </div>
      );
    
    case 'dropdown':
      return (
        <div className="form-field">
          {label}
          <select {...commonProps}>
            <option value="">Select {field.label}</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errorMessage}
        </div>
      );
    
    case 'address':
      return (
        <div className="form-field">
          {label}
          <GooglePlacesAutocomplete
            apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
            selectProps={{
              value: formData[field.name],
              onChange: (val: any) => onFieldChange(field.name, val),
              placeholder: field.placeholder,
              className: "google-places-autocomplete",
              classNamePrefix: "google-places",
              isClearable: true,
            }}
          />
          {errorMessage}
        </div>
      );
    
    case 'file':
      return (
        <div className="form-field">
          {label}
          <input
            type="file"
            {...commonProps}
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              onFieldChange(field.name, file);
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {errorMessage}
        </div>
      );
    
    default:
      return (
        <div className="form-field">
          {label}
          <input
            type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
            {...commonProps}
          />
          {errorMessage}
        </div>
      );
  }
}

export default function FormPreview({ version, fields, formName }: PreviewProps) {
  // Use SWR for real-time updates
  const { data: formVersion, mutate } = useSWR<FormVersion>(
    `/api/form-versions/version?version=${version}`,
    fetcher,
    {
      refreshInterval: 5000 // Poll every 5 seconds for updates
    }
  );

  // Update fields if form version changes
  const currentFields = formVersion?.fields?.map(f => ({
    id: f.id || '',
    name: f.name || '',
    label: f.label || '',
    type: f.type,
    required: Boolean(f.required),
    options: Array.isArray(f.options)
      ? f.options.map((o) => ({ label: o.label, value: o.value }))
      : [],
    step: typeof f.step === "number" ? f.step : 1,
    description: f.description || '',
    placeholder: f.placeholder || ''
  })) || fields;
  
  const [currentStep, setCurrentStep] = useState(1);
  const maxStep = Math.max(...currentFields.map(f => f.step || 1));
  
  const initialValues = currentFields.reduce((acc, field) => ({
    ...acc,
    [field.name]: ''
  }), {});

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 bg-gray-100 min-h-screen">
      <div className="w-full sm:w-1/2 mx-auto bg-white p-4 sm:p-6 rounded-lg shadow-lg max-w-xl">
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <Image
            src={logo}
            alt="BSN Logo"
            width={120}
            height={120}
            className="mb-3 sm:mb-4 w-auto h-auto"
            priority
          />
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2 text-center">
            {formName}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 text-center px-2 sm:px-4">
            Preview Mode - Version {version}
          </p>
        </div>

        <Formik
          initialValues={initialValues}
          onSubmit={() => {}}
          enableReinitialize
        >
          {({ values, errors, touched, setFieldValue }) => (
            <Form className="space-y-4 sm:space-y-5">
              {/* Progress bar for multi-step forms */}
              {maxStep > 1 && (
                <>
                  <div className="flex justify-between text-sm text-gray-500 mb-2">
                    <span>Step {currentStep} of {maxStep}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(currentStep / maxStep) * 100}%` }}
                    />
                  </div>
                </>
              )}

              {/* Form Fields */}
              {currentFields
                .filter(field => field.step === currentStep)
                .map((field) => renderField(
                  field,
                  values,
                  errors,
                  touched,
                  (name, value) => setFieldValue(name, value)
                ))
              }

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(step => step - 1)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Previous
                  </button>
                )}
                
                {currentStep < maxStep ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(step => step + 1)}
                    className="ml-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="ml-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Submit
                  </button>
                )}
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
} 