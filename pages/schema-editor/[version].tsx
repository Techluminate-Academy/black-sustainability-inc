// pages/schema-editor/[version].tsx
import { GetServerSideProps } from "next";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { Formik, Form, FieldArray, FormikErrors } from 'formik';
import { Toaster, toast } from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { connectToDatabase } from "@/lib/mongodb";
import type { Collection } from "mongodb";
import type { FormVersion } from "@/models/formVersion";
import FieldEditor from '@/components/FieldEditor';
import { FieldDef, formValidationSchema } from '@/types/schema-editor';
import { FieldType } from '@/models/field';
import ConfirmationModal from "@/components/common/ConfirmationModal";
import { EyeIcon, PlusIcon, ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

interface SchemaEditorProps {
  version: number;
  formName: string;
  isMultiStep: boolean;
  initialFields: FieldDef[];
  status: string;
  isMaster: boolean;
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
      initialFields,
      status: doc.status || 'draft',
      isMaster: doc.master || false
    } 
  };
};

export default function SchemaEditorPage({ version, formName, isMultiStep, initialFields, status, isMaster }: SchemaEditorProps) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<number | null>(isMultiStep ? 1 : null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState<{ fields: FieldDef[] } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<FormikErrors<FieldDef>[] | null>(null);
  const lastFieldRef = useRef<HTMLDivElement>(null);
  const errorRefs = useRef<Array<HTMLDivElement | null>>([]);

  const handleCreateNewVersion = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/form-versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterVersion: version,
          name: formName,
          fields: initialFields,
          isMultiStep,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create new version');
      }

      const newVersion = await res.json();
      toast.success(`New draft (v${newVersion.version}) created successfully!`);
      router.push(`/schema-editor/${newVersion.version}`);

    } catch (error) {
      console.error(error);
      toast.error('Could not create new version.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!pendingFormValues) return;

    const { fields } = pendingFormValues;
    const isPublishing = showPublishConfirm;

    setIsSaving(true);
    
    const url = `/api/form-versions/${version}`;
    const payload = {
      version,
      fields,
      status: isPublishing ? 'published' : 'draft',
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save form');
      }

      const result = await res.json();
      
      toast.success(`Version ${isPublishing ? 'published' : 'saved'} successfully.`);

      if (result.newDraft) {
        router.push(`/schema-editor/${result.newDraft}`);
      } else {
        router.reload();
      }
    } catch (error: any) {
      console.error('Error saving form:', error);
      toast.error(error.message || `Failed to ${isPublishing ? 'publish' : 'save'}.`);
    } finally {
      setIsSaving(false);
      setShowSaveConfirm(false);
      setShowPublishConfirm(false);
      setPendingFormValues(null);
    }
  };

  const toggleStep = (step: number) => {
    setActiveStep(prev => (prev === step ? null : step));
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (status === 'published') {
      toast.error('Published versions cannot be deleted');
      return;
    }

    try {
      setIsSaving(true);
      await fetch(`/api/form-versions/${version}`, {
        method: 'DELETE',
      });
      toast.success('Version deleted successfully');
      router.push('/form-versions');
    } catch (error) {
      console.error('Error deleting version:', error);
      toast.error('Failed to delete version');
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const defaultNewField: FieldDef = {
    id: `field_${Date.now()}`,
    name: '',
    label: '',
    type: 'text',
    required: false,
    step: 1,
    options: [],
    description: '',
    placeholder: ''
  };

  const getFieldsByStep = (fields: FieldDef[]) => {
    return fields.reduce((acc, field, index) => {
      const step = field.step || 1;
      if (!acc[step]) acc[step] = [];
      acc[step].push({ ...field, originalIndex: index });
      return acc;
    }, {} as Record<number, (FieldDef & { originalIndex: number })[]>);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />
      
      <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{formName}</h1>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-sm font-medium rounded-full bg-green-100 text-green-800">
                  Version {version}
                </span>
                <span className={`px-2.5 py-0.5 text-sm font-medium rounded-full ${
                  status === 'published' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {status === 'published' ? 'Published' : 'Draft'}
                </span>
                {isMaster && (
                  <span className="px-2.5 py-0.5 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                    Master Version
                  </span>
                )}
              </div>
            </div>
            <a 
              href={`/form-preview/${version}`}
              target="_blank"
              rel="noopener noreferrer" 
              className="mt-2 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <EyeIcon className="w-4 h-4 mr-1" />
              Preview Form
            </a>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={status === 'published'}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                status === 'published'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
              title={status === 'published' ? "Published versions cannot be deleted" : "Delete this version"}
            >
              Delete Version
            </button>
            {isMaster && (
               <button
                type="button"
                onClick={handleCreateNewVersion}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                {isSaving ? 'Creating...' : 'Create New Version'}
              </button>
            )}
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Version</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete this version? This action cannot be undone.
              {status === 'published' && (
                <span className="block mt-2 text-red-600 font-medium">
                  Published versions cannot be deleted.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving || status === 'published'}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  status === 'published'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'text-white bg-red-600 hover:bg-red-700'
                }`}
              >
                {isSaving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Formik
        initialValues={{ fields: initialFields }}
        validationSchema={formValidationSchema}
        onSubmit={(values, { setSubmitting }) => {
          // We trigger submission manually, so this can be a no-op
        }}
        enableReinitialize
      >
        {({ values, isSubmitting, submitForm, validateForm, setTouched, setFieldValue }) => {
          const handleTriggerSubmit = async (publish: boolean) => {
            await Promise.all(values.fields.map(async (field, index) => {
              if (field.type !== 'dropdown' && Array.isArray(field.options) && field.options.length > 0) {
                await setFieldValue(`fields.${index}.options`, []);
              }
            }));
            const touchObj: any = {
              fields: values.fields.map(() => ({ name: true, label: true, type: true, step: true }))
            };
            setTouched(touchObj, true);
            const errors = await validateForm();
            if (Object.keys(errors).length > 0) {
              const fieldErrors = errors.fields as FormikErrors<FieldDef>[];
              setValidationErrors(fieldErrors || []);
              // Scroll to first error
              const firstErrorIdx = fieldErrors?.findIndex((f) => f && Object.keys(f).length > 0) ?? -1;
              if (firstErrorIdx >= 0 && errorRefs.current[firstErrorIdx]) {
                errorRefs.current[firstErrorIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
              toast.error('Please fix the validation errors before saving.');
              return;
            } else {
              setValidationErrors(null);
            }
            const cleanedFields = values.fields.map(field => ({
              ...field,
              options: field.type === 'dropdown' ? field.options : [],
              step: isMultiStep ? field.step : 1
            }));
            setPendingFormValues({ fields: cleanedFields });
            if (publish) {
              setShowPublishConfirm(true);
            } else {
              setShowSaveConfirm(true);
            }
          };

          const fieldsByStep = isMultiStep ? getFieldsByStep(values.fields) : {};

          return (
            <>
              <Form className="space-y-6">
                <div className="bg-white shadow rounded-lg p-6 sticky top-4 z-10 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Form Controls</h2>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleTriggerSubmit(false)}
                        disabled={isSubmitting || isSaving || isMaster}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                      >
                        {isSaving && !showPublishConfirm ? 'Saving...' : 'Save Draft'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTriggerSubmit(true)}
                        disabled={isSubmitting || isSaving || isMaster}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
                      >
                        {isSaving && showPublishConfirm ? 'Publishing...' : 'Publish'}
                      </button>
                    </div>
                  </div>
                </div>

                {validationErrors && Array.isArray(validationErrors) && validationErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-4 mb-4">
                    <strong>Validation Errors:</strong>
                    <ul className="list-disc ml-6 mt-2">
                      {validationErrors.map((err: any, idx: number) => (
                        err && Object.values(err).map((msg, i) => (
                          <li key={idx + '-' + i}>{typeof msg === 'string' ? msg : JSON.stringify(msg)}</li>
                        ))
                      ))}
                    </ul>
                  </div>
                )}

                {isMultiStep && (
                  <div className="mb-6 space-y-2">
                    {[1, 2, 3].map(step => {
                      const stepFields = fieldsByStep[step] || [];
                      const isActive = activeStep === step;
                      return (
                        <button
                          key={step}
                          type="button"
                          onClick={() => toggleStep(step)}
                          className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-colors ${
                            isActive ? 'bg-white shadow-sm' : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Step {step}</span>
                            <span className="text-sm text-gray-500">
                              ({stepFields.length} fields)
                            </span>
                          </div>
                          <ChevronDownIcon 
                            className={`w-5 h-5 text-gray-400 transform transition-transform ${
                              isActive ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}

                <FieldArray
                  name="fields"
                  render={arrayHelpers => (
                    <>
                      <div className="space-y-4">
                        {isMultiStep ? (
                          [1, 2, 3].map(step => {
                            if (activeStep !== step) return null;

                            const stepFields = fieldsByStep[step] || [];
                            
                            return (
                              <div key={step} className="space-y-4">
                                {stepFields.map(({ originalIndex, ...field }, idx) => (
                                  <div 
                                    key={field.id} 
                                    className="bg-white shadow rounded-lg p-6 relative"
                                    ref={(el) => { errorRefs.current[originalIndex] = el; }}
                                  >
                                    <div className="absolute right-4 top-4 flex items-center space-x-2">
                                      <button
                                        type="button"
                                        onClick={() => originalIndex > 0 && arrayHelpers.move(originalIndex, originalIndex - 1)}
                                        disabled={originalIndex === 0}
                                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                        title="Move Up"
                                      >
                                        <ChevronUpIcon className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => originalIndex < values.fields.length - 1 && arrayHelpers.move(originalIndex, originalIndex + 1)}
                                        disabled={originalIndex === values.fields.length - 1}
                                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                        title="Move Down"
                                      >
                                        <ChevronDownIcon className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => arrayHelpers.remove(originalIndex)}
                                        className="p-1 text-red-400 hover:text-red-600"
                                        title="Delete Field"
                                      >
                                        &times;
                                      </button>
                                    </div>

                                    <FieldEditor
                                      field={field}
                                      index={originalIndex}
                                      isMultiStep={isMultiStep}
                                      onChange={(updatedField: FieldDef) => {
                                        setFieldValue(`fields.${originalIndex}`, updatedField);
                                      }}
                                    />
                                  </div>
                                ))}
                                {stepFields.length === 0 && (
                                  <p className="text-gray-500 text-center py-4 bg-white rounded-lg shadow-sm">
                                    No fields in this step. Add a field or move existing fields here.
                                  </p>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          values.fields.map((field, index) => (
                            <div 
                              key={field.id} 
                              className="bg-white shadow rounded-lg p-6 relative"
                              ref={(el) => { errorRefs.current[index] = el; }}
                            >
                              <div className="absolute right-4 top-4 flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => index > 0 && arrayHelpers.move(index, index - 1)}
                                  disabled={index === 0}
                                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                  title="Move Up"
                                >
                                  <ChevronUpIcon className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => index < values.fields.length - 1 && arrayHelpers.move(index, index + 1)}
                                  disabled={index === values.fields.length - 1}
                                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                  title="Move Down"
                                >
                                  <ChevronDownIcon className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => arrayHelpers.remove(index)}
                                  className="p-1 text-red-400 hover:text-red-600"
                                  title="Delete Field"
                                >
                                  &times;
                                </button>
                              </div>

                              <FieldEditor
                                field={field}
                                index={index}
                                isMultiStep={false}
                                onChange={(updatedField: FieldDef) => {
                                  setFieldValue(`fields.${index}`, updatedField);
                                }}
                              />
                            </div>
                          ))
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const newFieldStep = isMultiStep ? (activeStep || 1) : 1;
                            const newField = { ...defaultNewField, step: newFieldStep, id: `field_${Date.now()}` };
                            arrayHelpers.push(newField);
                            setTimeout(() => {
                              lastFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 100);
                          }}
                          className="fixed bottom-8 right-8 flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <PlusIcon className="w-6 h-6" />
                          <span className="sr-only">Add Field</span>
                        </button>
                      </div>
                    </>
                  )}
                />
              </Form>

              <ConfirmationModal
                isOpen={showPublishConfirm}
                onClose={() => {
                  setShowPublishConfirm(false);
                  setPendingFormValues(null);
                }}
                onConfirm={handleConfirmSave}
                title="Publish Form Version"
                message={
                  status === 'published' 
                    ? `This will create a new version based on version ${version} and publish it. The current version will remain published until the new version is ready.`
                    : `Are you sure you want to publish version ${version} of "${formName}"? This will make it live and accessible to users.`
                }
                confirmText="Publish"
                cancelText="Cancel"
              />

              <ConfirmationModal
                isOpen={showSaveConfirm}
                onClose={() => {
                  setShowSaveConfirm(false);
                  setPendingFormValues(null);
                }}
                onConfirm={handleConfirmSave}
                title="Save Form Changes"
                message={
                  status === 'published'
                    ? `This will create a new draft version based on version ${version}. The current version will remain published.`
                    : `This will update version ${version} of "${formName}" as a draft.`
                }
                confirmText="Save"
                cancelText="Cancel"
              />
            </>
          );
        }}
      </Formik>
    </div>
  );
}
