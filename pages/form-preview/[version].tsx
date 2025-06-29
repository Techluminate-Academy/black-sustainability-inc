import { GetServerSideProps } from "next";
import React, { useState } from "react";
import { Formik, Form, Field } from 'formik';
import { connectToDatabase } from "@/lib/mongodb";
import type { Collection } from "mongodb";
import type { FormVersion } from "@/models/formVersion";
import type { FieldDef } from "@/types/schema-editor";

interface PreviewProps {
  version: number;
  fields: FieldDef[];
}

export const getServerSideProps: GetServerSideProps<PreviewProps> = async ({ params }) => {
  const raw = Array.isArray(params?.version) ? params.version[0] : params?.version;
  const version = parseInt(raw as string, 10);
  if (isNaN(version)) return { notFound: true };

  const { db } = await connectToDatabase();
  const coll = db.collection("formVersions") as Collection<FormVersion>;
  const doc = await coll.findOne({ version });
  if (!doc) return { notFound: true };

  const fields: FieldDef[] = (doc.fields || []).map((f) => ({
    name: f.name || '',
    label: f.label,
    type: f.type,
    required: Boolean(f.required),
    options: Array.isArray(f.options)
      ? f.options.map((o) => ({ label: o.label, value: o.value }))
      : [],
    step: typeof f.step === "number" ? f.step : 1,
    description: f.description || '',
    placeholder: f.placeholder || ''
  }));

  return { props: { version, fields } };
};

function renderField(field: FieldDef) {
  const commonProps = {
    name: field.name,
    id: field.name,
    placeholder: field.placeholder,
    required: field.required,
    className: "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
  };

  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          {...commonProps}
          rows={4}
        />
      );
    
    case 'dropdown':
      return (
        <select {...commonProps}>
          <option value="">Select an option</option>
          {field.options?.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    
    case 'checkbox':
      return (
        <div className="flex items-center">
          <input
            type="checkbox"
            {...commonProps}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-gray-700">{field.label}</span>
        </div>
      );
    
    case 'file':
      return (
        <input
          type="file"
          {...commonProps}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      );

    case 'phone':
      return (
        <div className="flex">
          <select
            className="mt-1 block w-24 rounded-l-md border-r-0 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="+1">+1</option>
            <option value="+44">+44</option>
            {/* Add more country codes as needed */}
          </select>
          <input
            type="tel"
            {...commonProps}
            className="mt-1 block w-full rounded-r-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="(555) 555-5555"
          />
        </div>
      );

    case 'address':
      return (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Street Address"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Apt, Suite, etc. (optional)"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="City"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="State"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <input
            type="text"
            placeholder="ZIP Code"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      );
    
    default:
      return (
        <input
          type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
          {...commonProps}
        />
      );
  }
}

export default function FormPreview({ version, fields }: PreviewProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const maxStep = Math.max(...fields.map(f => f.step || 1));
  
  const initialValues = fields.reduce((acc, field) => ({
    ...acc,
    [field.name]: field.type === 'checkbox' ? false : ''
  }), {});

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="bg-white shadow rounded-lg p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Form Preview v{version}</h1>
          <div className="text-sm text-gray-500">Step {currentStep} of {maxStep}</div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / maxStep) * 100}%` }}
          ></div>
        </div>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {fields
            .filter(field => field.step === currentStep)
            .map((field) => (
              <div key={field.name} className="space-y-1">
                {field.type !== 'checkbox' && (
                  <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                )}
                
                {renderField(field)}
                
                {field.description && (
                  <p className="mt-1 text-sm text-gray-500">{field.description}</p>
                )}
              </div>
            ))}

          <div className="flex justify-between pt-4">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                ← Previous
              </button>
            )}
            
            <button
              type="button"
              onClick={() => currentStep < maxStep ? setCurrentStep(currentStep + 1) : null}
              className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {currentStep === maxStep ? 'Submit' : 'Next →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 