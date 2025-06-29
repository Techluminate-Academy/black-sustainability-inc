// pages/schema-editor/[version].tsx
import { GetServerSideProps } from "next";
import React, { useState } from "react";
import { Formik, Form, FieldArray } from 'formik';
import { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { connectToDatabase } from "@/lib/mongodb";
import type { Collection } from "mongodb";
import type { FormVersion } from "@/models/formVersion";
import { FieldEditor } from '@/components/FieldEditor';
import { FieldDef, formValidationSchema } from '@/types/schema-editor';
import { FieldType } from '@/models/field';
import toast from 'react-hot-toast';

interface SchemaEditorProps {
  version: number;
  initialFields: FieldDef[];
}

export const getServerSideProps: GetServerSideProps<SchemaEditorProps> = async ({ params }) => {
  const raw = Array.isArray(params?.version) ? params.version[0] : params?.version;
  const version = parseInt(raw as string, 10);
  if (isNaN(version)) return { notFound: true };

  const { db } = await connectToDatabase();
  const coll = db.collection("formVersions") as Collection<FormVersion>;
  const doc = await coll.findOne({ version });
  if (!doc) return { notFound: true };

  const initialFields: FieldDef[] = (doc.fields || []).map((f, idx) => ({
    id: f.id || `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: f.name || `field_${idx + 1}`,
    label: f.label || '',
    type: (() => {
      const t = typeof f.type === 'string' ? f.type.toLowerCase() : 'text';
      const valid: FieldType[] = ['text','email','url','textarea','dropdown','checkbox','file','phone','address'];
      return (valid.includes(t as FieldType) ? t : 'text') as FieldType;
    })(),
    required: Boolean(f.required),
    options: Array.isArray(f.options)
      ? f.options.map((o) => ({ label: o.label, value: o.value }))
      : [],
    step: typeof f.step === "number" ? f.step : 1,
    description: f.description || '',
    placeholder: f.placeholder || ''
  }));

  return { props: { version, initialFields } };
};

export default function SchemaEditorPage({ version, initialFields }: SchemaEditorProps) {
  const [isPublishing, setIsPublishing] = useState(false);

  const saveForm = async (values: { fields: FieldDef[] }, status: 'draft' | 'published') => {
    try {
      // Ensure all fields have IDs and names before saving
      const fieldsWithIds = values.fields.map((field, index) => ({
        ...field,
        id: field.id || `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: field.name || `field_${index + 1}`,
        type: (() => {
          const t = typeof field.type === 'string' ? field.type.toLowerCase() : 'text';
          const valid: FieldType[] = ['text','email','url','textarea','dropdown','checkbox','file','phone','address'];
          return (valid.includes(t as FieldType) ? t : 'text') as FieldType;
        })()
      }));

      const res = await fetch('/api/form-versions/version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: fieldsWithIds,
          version,
          status
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save schema');
      }

      const result = await res.json();
      toast.success(`Form schema ${status === 'published' ? 'published' : 'saved'} successfully`);
      return result;
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error instanceof Error ? error.message : `Failed to ${status === 'published' ? 'publish' : 'save'} schema`);
      throw error;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />
      
      <Formik
        initialValues={{ fields: initialFields }}
        validationSchema={formValidationSchema}
        onSubmit={async (values, { setSubmitting }) => {
          try {
            // Clean up options for non-dropdown fields
            const cleanedFields = values.fields.map(field => ({
              ...field,
              options: field.type === 'dropdown' ? field.options : []
            }));
            await saveForm({ fields: cleanedFields }, isPublishing ? 'published' : 'draft');
          } catch (error) {
            // Error is already handled in saveForm
          } finally {
            setSubmitting(false);
            setIsPublishing(false);
          }
        }}
      >
        {({ values, isSubmitting, submitForm, validateForm, setTouched, setFieldValue }) => {
          const handleSave = async (publish: boolean) => {
            // Clean up options for non-dropdown fields before validation
            await Promise.all(values.fields.map(async (field, index) => {
              if (field.type !== 'dropdown' && Array.isArray(field.options) && field.options.length > 0) {
                await setFieldValue(`fields.${index}.options`, []);
              }
            }));

            // Mark every field as touched so validation messages show
            const touchObj: any = {
              fields: values.fields.map(() => ({
                id: true,
                name: true,
                label: true,
                type: true,
                step: true,
              }))
            };
            setTouched(touchObj, true);

            const errors = await validateForm();
            if (Object.keys(errors).length) {
              toast.error('Please resolve the highlighted validation errors before saving');
              return;
            }

            setIsPublishing(publish);
            submitForm();
          };

          return (
            <Form className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6 sticky top-4 z-10">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <h1 className="text-2xl font-bold">Edit Form Schema v{version}</h1>
                    <Link 
                      href={`/form-preview/${version}`}
                      target="_blank"
                      className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                    >
                      👁️ Preview Form
                    </Link>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <FieldArray name="fields">
                      {({ push }) => (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              // Get the current step of the last field, or default to 1
                              const lastStep = values.fields.length > 0 
                                ? values.fields[values.fields.length - 1].step 
                                : 1;
                              
                              // Generate a unique field name
                              let fieldNumber = values.fields.length + 1;
                              let fieldName = `field_${fieldNumber}`;
                              
                              // Ensure the field name is unique
                              while (values.fields.some(f => f.name === fieldName)) {
                                fieldNumber++;
                                fieldName = `field_${fieldNumber}`;
                              }

                              push({
                                id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                name: fieldName,
                                label: `New Field ${fieldNumber}`,
                                type: 'text' as FieldType,
                                required: false,
                                options: [],
                                step: lastStep, // Use the same step as the last field
                                description: '',
                                placeholder: 'Enter your answer here'
                              });

                              // Scroll to the new field after a short delay
                              setTimeout(() => {
                                window.scrollTo({
                                  top: document.body.scrollHeight,
                                  behavior: 'smooth'
                                });
                              }, 100);

                              toast.success('New field added! 🎉');
                            }}
                            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors flex items-center space-x-2"
                          >
                            <span>➕</span>
                            <span>Add Field</span>
                          </button>
                        </div>
                      )}
                    </FieldArray>

                    <button
                      type="button"
                      onClick={() => handleSave(false)}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting && !isPublishing ? 'Saving...' : 'Save Draft'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSave(true)}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting && isPublishing ? 'Publishing...' : 'Publish'}
                    </button>
                  </div>
                </div>
              </div>

              <FieldArray name="fields">
                {({ remove, move }) => (
                  <div className="space-y-4">
                    {values.fields.map((field, index) => (
                      <FieldEditor
                        key={field.id || index}
                        index={index}
                        remove={() => remove(index)}
                        moveUp={() => index > 0 && move(index, index - 1)}
                        moveDown={() => index < values.fields.length - 1 && move(index, index + 1)}
                      />
                    ))}
                  </div>
                )}
              </FieldArray>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
}
