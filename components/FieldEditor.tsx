import React from 'react';
import { Field, useFormikContext } from 'formik';
import { FieldType } from '@/models/field';

interface FieldEditorProps {
  index: number;
  remove: () => void;
  moveUp: () => void;
  moveDown: () => void;
}

const fieldTypes: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'textarea', label: 'Multi-line Text' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Yes/No (Checkbox)' },
  { value: 'file', label: 'File Upload' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'address', label: 'Address' }
];

export function FieldEditor({ index, remove, moveUp, moveDown }: FieldEditorProps) {
  const { values, setFieldValue } = useFormikContext<{ fields: any[] }>();
  const currentStep = values.fields[index]?.step || 1;

  // Function to move field to a specific step
  const handleStepChange = async (newStep: number) => {
    // First update the step
    await setFieldValue(`fields.${index}.step`, newStep);
    
    // Get all fields in the target step
    const fieldsInTargetStep = values.fields.filter((f, i) => i !== index && f.step === newStep);
    
    // If there are fields in the target step, move this field to the end of that step
    if (fieldsInTargetStep.length > 0) {
      const lastIndexInStep = values.fields.findLastIndex(f => f.step === newStep);
      if (lastIndexInStep !== -1 && lastIndexInStep !== index) {
        // Remove field from current position
        const field = values.fields[index];
        const newFields = [...values.fields];
        newFields.splice(index, 1);
        // Insert at new position
        newFields.splice(lastIndexInStep, 0, field);
        // Update all fields
        await setFieldValue('fields', newFields);
      }
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Field Header */}
      <div className="flex items-center justify-between mb-4">
        <Field name={`fields.${index}.label`}>
          {({ field, meta }: any) => (
            <div className="flex-1">
              <input
                {...field}
                className={`text-lg font-medium w-full border-0 focus:ring-2 ${
                  meta.touched && meta.error ? 'ring-2 ring-red-500' : 'ring-blue-500'
                }`}
                placeholder="Field Label"
              />
              {meta.touched && meta.error && (
                <div className="text-red-500 text-sm mt-1">{meta.error}</div>
              )}
            </div>
          )}
        </Field>
        
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={moveUp}
            className="p-2 hover:bg-gray-100 rounded"
            title="Move Up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={moveDown}
            className="p-2 hover:bg-gray-100 rounded"
            title="Move Down"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={remove}
            className="p-2 hover:bg-red-100 rounded text-red-600"
            title="Remove Field"
          >
            ×
          </button>
        </div>
      </div>

      {/* Field Properties */}
      <div className="grid grid-cols-2 gap-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Field Name</label>
          <Field name={`fields.${index}.name`}>
            {({ field, meta }: any) => (
              <div>
                <input
                  {...field}
                  className={`mt-1 block w-full rounded-md shadow-sm ${
                    meta.touched && meta.error
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
                {meta.touched && meta.error && (
                  <div className="text-red-500 text-sm mt-1">{meta.error}</div>
                )}
              </div>
            )}
          </Field>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Field Type</label>
          <Field name={`fields.${index}.type`}>
            {({ field, meta }: any) => (
              <div>
                <select
                  {...field}
                  className={`mt-1 block w-full rounded-md shadow-sm ${
                    meta.touched && meta.error
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  onChange={async (e) => {
                    const newType = e.target.value;
                    // First update the type
                    await setFieldValue(`fields.${index}.type`, newType);
                    
                    // Handle options based on type
                    if (newType === 'dropdown') {
                      // Initialize with empty array if undefined
                      const currentOptions = values.fields[index]?.options || [];
                      if (currentOptions.length === 0) {
                        // Add a default option if empty
                        await setFieldValue(`fields.${index}.options`, [{
                          label: 'Option 1',
                          value: 'option_1'
                        }]);
                      }
                    } else {
                      // Clear options for non-dropdown fields
                      await setFieldValue(`fields.${index}.options`, []);
                    }
                  }}
                >
                  {fieldTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {meta.touched && meta.error && (
                  <div className="text-red-500 text-sm mt-1">{meta.error}</div>
                )}
              </div>
            )}
          </Field>
        </div>

        {/* Step */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Step</label>
          <Field name={`fields.${index}.step`}>
            {({ field, meta }: any) => (
              <div>
                <select
                  {...field}
                  onChange={(e) => {
                    const newStep = parseInt(e.target.value);
                    handleStepChange(newStep);
                  }}
                  className={`mt-1 block w-full rounded-md shadow-sm ${
                    meta.touched && meta.error
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                >
                  <option value={1}>Step 1</option>
                  <option value={2}>Step 2</option>
                  <option value={3}>Step 3</option>
                </select>
                {meta.touched && meta.error && (
                  <div className="text-red-500 text-sm mt-1">{meta.error}</div>
                )}
              </div>
            )}
          </Field>
        </div>

        {/* Required */}
        <div className="flex items-center h-full">
          <label className="flex items-center space-x-2">
            <Field
              type="checkbox"
              name={`fields.${index}.required`}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="text-sm font-medium text-gray-700">Required Field</span>
          </label>
        </div>
      </div>

      {/* Description */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">Help Text</label>
        <Field name={`fields.${index}.description`}>
          {({ field, meta }: any) => (
            <div>
              <input
                {...field}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Help text for users filling out this field"
              />
              {meta.touched && meta.error && (
                <div className="text-red-500 text-sm mt-1">{meta.error}</div>
              )}
            </div>
          )}
        </Field>
      </div>

      {/* Placeholder */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">Placeholder</label>
        <Field name={`fields.${index}.placeholder`}>
          {({ field, meta }: any) => (
            <div>
              <input
                {...field}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Example: Enter your answer here..."
              />
              {meta.touched && meta.error && (
                <div className="text-red-500 text-sm mt-1">{meta.error}</div>
              )}
            </div>
          )}
        </Field>
      </div>

      {/* Options (for dropdown type) */}
      <Field name={`fields.${index}.type`}>
        {({ field: typeField }: any) => 
          typeField.value === 'dropdown' && (
            <div className="mt-4 space-y-2">
              <label className="block text-sm font-medium text-gray-700">Options</label>
              <Field name={`fields.${index}.options`}>
                {({ field, meta }: any) => (
                  <div>
                    <div className="space-y-2">
                      {field.value.map((option: any, optionIndex: number) => (
                        <div key={optionIndex} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={option.label}
                            onChange={(e) => {
                              const newOptions = [...field.value];
                              newOptions[optionIndex] = {
                                ...newOptions[optionIndex],
                                label: e.target.value,
                                value: e.target.value.toLowerCase().replace(/\s+/g, '_')
                              };
                              setFieldValue(`fields.${index}.options`, newOptions);
                            }}
                            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder={`Option ${optionIndex + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newOptions = field.value.filter((_: any, i: number) => i !== optionIndex);
                              setFieldValue(`fields.${index}.options`, newOptions);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                            disabled={field.value.length <= 1}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        const newOption = {
                          label: `Option ${field.value.length + 1}`,
                          value: `option_${field.value.length + 1}`
                        };
                        setFieldValue(`fields.${index}.options`, [...field.value, newOption]);
                      }}
                      className="mt-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      + Add Option
                    </button>

                    {meta.touched && meta.error && (
                      <div className="text-red-500 text-sm mt-1">
                        {typeof meta.error === 'string' 
                          ? meta.error 
                          : 'Please add at least one valid option'}
                      </div>
                    )}
                    
                    {field.value.length === 0 && (
                      <div className="text-amber-600 text-sm mt-1">
                        ⚠️ At least one option is required for dropdown fields
                      </div>
                    )}
                  </div>
                )}
              </Field>
            </div>
          )
        }
      </Field>

      {/* Error Summary */}
      <Field name={`fields.${index}`}>
        {({ meta }: any) => 
          meta.touched && meta.error && typeof meta.error === 'object' && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <h4 className="text-red-700 font-medium">Please fix the following errors:</h4>
              <ul className="mt-2 text-sm text-red-600">
                {Object.entries(meta.error).map(([key, error]: [string, any]) => (
                  <li key={key}>• {error}</li>
                ))}
              </ul>
            </div>
          )
        }
      </Field>
    </div>
  );
}