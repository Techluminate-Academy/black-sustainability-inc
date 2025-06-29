// pages/schema-editor/[version].tsx
import { GetServerSideProps } from "next";
import React, { useState, useMemo } from "react";
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
  formName: string;
  isMultiStep: boolean;
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

  return { 
    props: { 
      version, 
      formName: doc.name || `Form ${version}`,
      isMultiStep: doc.isMultiStep || false,
      initialFields 
    } 
  };
};

export default function SchemaEditorPage({ version, formName, isMultiStep, initialFields }: SchemaEditorProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [collapsedSteps, setCollapsedSteps] = useState<number[]>([]);

  const toggleStep = (step: number) => {
    setCollapsedSteps(prev => 
      prev.includes(step) 
        ? prev.filter(s => s !== step)
        : [...prev, step]
    );
  };

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
            const cleanedFields = values.fields.map(field => ({
              ...field,
              options: field.type === 'dropdown' ? field.options : [],
              step: isMultiStep ? field.step : 1 // Force step 1 for non-multi-step forms
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
            await Promise.all(values.fields.map(async (field, index) => {
              if (field.type !== 'dropdown' && Array.isArray(field.options) && field.options.length > 0) {
                await setFieldValue(`fields.${index}.options`, []);
              }
            }));

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

          // Group fields by step
          const fieldsByStep = useMemo(() => {
            const steps: { [key: number]: FieldDef[] } = {};
            values.fields.forEach((field, index) => {
              const step = isMultiStep ? (field.step || 1) : 1;
              if (!steps[step]) steps[step] = [];
              steps[step].push({ ...field, originalIndex: index });
            });
            return steps;
          }, [values.fields, isMultiStep]);

          // Get the number of fields in each step
          const stepCounts = useMemo(() => {
            return Object.entries(fieldsByStep).reduce((acc, [step, fields]) => {
              acc[parseInt(step)] = fields.length;
              return acc;
            }, {} as { [key: number]: number });
          }, [fieldsByStep]);

          return (
            <Form className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6 sticky top-4 z-10">
                <div className="flex flex-col space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h1 className="text-2xl font-bold">{formName}</h1>
                        <p className="text-sm text-gray-500">Form Schema v{version}</p>
                      </div>
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
                              onClick={async () => {
                                try {
                                  // Create new version based on current fields
                                  const res = await fetch('/api/form-versions/version', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      fields: values.fields,
                                      status: 'draft',
                                      masterVersion: version
                                    }),
                                  });

                                  if (!res.ok) {
                                    const error = await res.json();
                                    throw new Error(error.error || 'Failed to create new version');
                                  }

                                  const result = await res.json();
                                  toast.success('New version created! Redirecting...');
                                  
                                  // Redirect to the new version
                                  setTimeout(() => {
                                    window.location.href = `/schema-editor/${result.version}`;
                                  }, 1500);
                                } catch (error) {
                                  console.error('Error creating new version:', error);
                                  toast.error(error instanceof Error ? error.message : 'Failed to create new version');
                                }
                              }}
                              className="px-4 py-2 bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 transition-colors flex items-center space-x-2"
                            >
                              <span>🔄</span>
                              <span>Create New Version</span>
                            </button>
                          </div>
                        )}
                      </FieldArray>

                      <FieldArray name="fields">
                        {({ push }) => (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                const lastStep = values.fields.length > 0 
                                  ? (isMultiStep ? values.fields[values.fields.length - 1].step : 1)
                                  : (isMultiStep ? activeStep : 1);
                                
                                let fieldNumber = values.fields.length + 1;
                                let fieldName = `field_${fieldNumber}`;
                                
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
                                  step: lastStep,
                                  description: '',
                                  placeholder: 'Enter your answer here'
                                });

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

                  {/* Step Navigation - Only show for multi-step forms */}
                  {isMultiStep && (
                    <div className="flex space-x-4 pt-4 border-t">
                      {[1, 2, 3].map(step => (
                        <button
                          key={step}
                          type="button"
                          onClick={() => {
                            setActiveStep(step);
                            // Expand the clicked step and collapse others
                            setCollapsedSteps([1, 2, 3].filter(s => s !== step));
                          }}
                          className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
                            activeStep === step
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <span>Step {step}</span>
                          <span className="text-sm">
                            ({stepCounts[step] || 0} fields)
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <FieldArray name="fields">
                {({ remove, move }) => (
                  <div className="space-y-6">
                    {/* For multi-step forms, show all steps */}
                    {isMultiStep ? (
                      [1, 2, 3].map(step => {
                        const stepFields = fieldsByStep[step] || [];
                        const isCollapsed = collapsedSteps.includes(step);
                        const isActive = activeStep === step;

                        return (
                          <div 
                            key={step}
                            className={`border rounded-lg bg-white overflow-hidden transition-all duration-300 ${
                              isActive ? 'ring-2 ring-blue-500' : ''
                            }`}
                          >
                            <div 
                              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
                              onClick={() => toggleStep(step)}
                            >
                              <h2 className="text-lg font-semibold flex items-center space-x-2">
                                <span>Step {step}</span>
                                <span className="text-sm text-gray-500">
                                  ({stepFields.length} fields)
                                </span>
                              </h2>
                              <button 
                                type="button"
                                className="text-gray-500 hover:text-gray-700"
                              >
                                {isCollapsed ? '▼' : '▲'}
                              </button>
                            </div>
                            
                            <div className={`transition-all duration-300 ${
                              isCollapsed ? 'h-0' : 'h-auto'
                            }`}>
                              <div className={`p-4 space-y-4 ${
                                isCollapsed ? 'hidden' : 'block'
                              }`}>
                                {stepFields.map((field: any) => (
                                  <FieldEditor
                                    key={field.id || field.originalIndex}
                                    index={field.originalIndex}
                                    remove={() => remove(field.originalIndex)}
                                    moveUp={() => field.originalIndex > 0 && move(field.originalIndex, field.originalIndex - 1)}
                                    moveDown={() => field.originalIndex < values.fields.length - 1 && move(field.originalIndex, field.originalIndex + 1)}
                                  />
                                ))}
                                {stepFields.length === 0 && (
                                  <p className="text-gray-500 text-center py-4">
                                    No fields in this step. Add a field or move existing fields here.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      // For single-step forms, show all fields in one section
                      <div className="border rounded-lg bg-white p-4 space-y-4">
                        {values.fields.map((field, index) => (
                          <FieldEditor
                            key={field.id || index}
                            index={index}
                            remove={() => remove(index)}
                            moveUp={() => index > 0 && move(index, index - 1)}
                            moveDown={() => index < values.fields.length - 1 && move(index, index + 1)}
                          />
                        ))}
                        {values.fields.length === 0 && (
                          <p className="text-gray-500 text-center py-4">
                            No fields yet. Click "Add Field" to start building your form.
                          </p>
                        )}
                      </div>
                    )}
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
