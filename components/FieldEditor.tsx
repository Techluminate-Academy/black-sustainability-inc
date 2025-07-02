import React from 'react';
import { Field } from 'formik';
import type { FieldDef } from '@/types/schema-editor';
import IndustryHouseIcons from '@/components/common/IndustryHouseIcons';

interface FieldEditorProps {
  field: FieldDef;
  index: number;
  onChange: (updatedField: FieldDef) => void;
  isMultiStep?: boolean;
}

export default function FieldEditor({ field, index, onChange, isMultiStep = false }: FieldEditorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange({
      ...field,
      [name]: value
    });
  };

  const handleRequiredChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...field,
      required: e.target.checked
    });
  };

  const handleOptionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const optionsText = e.target.value;
    const options = optionsText
      .split('\n')
      .map(line => {
        const [value, label] = line.split('|').map(s => s.trim());
        return { value: value || '', label: label || value || '' };
      })
      .filter(opt => opt.value || opt.label);

    onChange({
      ...field,
      options
    });
  };

  const inputClassName = "mt-1 block w-full rounded-md border-2 border-gray-400 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm";
  const selectClassName = "mt-1 block w-full rounded-md border-2 border-gray-400 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm";
  const textareaClassName = "mt-1 block w-full rounded-md border-2 border-gray-400 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Field Name */}
        <div>
          <label htmlFor={`${field.id}-name`} className="block text-sm font-medium text-gray-700">
            Field Name
          </label>
          <input
            type="text"
            id={`${field.id}-name`}
            name="name"
            value={field.name}
            onChange={handleChange}
            className={inputClassName}
            placeholder="e.g., firstName"
          />
        </div>

        {/* Field Label */}
        <div>
          <label htmlFor={`${field.id}-label`} className="block text-sm font-medium text-gray-700">
            Field Label
          </label>
          <input
            type="text"
            id={`${field.id}-label`}
            name="label"
            value={field.label}
            onChange={handleChange}
            className={inputClassName}
            placeholder="e.g., First Name"
          />
        </div>
      </div>

      <div className={`grid ${isMultiStep ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
        {/* Field Type */}
        <div>
          <label htmlFor={`${field.id}-type`} className="block text-sm font-medium text-gray-700">
            Field Type
          </label>
          <select
            id={`${field.id}-type`}
            name="type"
            value={field.type}
            onChange={handleChange}
            className={selectClassName}
          >
            <option value="text">Text</option>
            <option value="email">Email</option>
            <option value="url">URL</option>
            <option value="textarea">Text Area</option>
            <option value="dropdown">Dropdown</option>
            <option value="multiselect">Multi-Select</option>
            <option value="checkbox">Checkbox</option>
            <option value="file">File Upload</option>
            <option value="phone">Phone Number</option>
            <option value="address">Address</option>
          </select>
        </div>

        {/* Step (for multi-step forms) */}
        {isMultiStep && (
          <div>
            <label htmlFor={`${field.id}-step`} className="block text-sm font-medium text-gray-700">
              Form Step
            </label>
            <select
              id={`${field.id}-step`}
              name="step"
              value={field.step}
              onChange={handleChange}
              className={selectClassName}
            >
              <option value={1}>Step 1</option>
              <option value={2}>Step 2</option>
              <option value={3}>Step 3</option>
            </select>
          </div>
        )}
      </div>

      {/* Required Field */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id={`${field.id}-required`}
          name="required"
          checked={field.required}
          onChange={handleRequiredChange}
          className="h-5 w-5 rounded border-2 border-gray-400 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor={`${field.id}-required`} className="ml-2 block text-sm text-gray-900">
          Required Field
        </label>
      </div>

      {/* Field Description */}
      <div>
        <label htmlFor={`${field.id}-description`} className="block text-sm font-medium text-gray-700">
          Help Text
        </label>
        <textarea
          id={`${field.id}-description`}
          name="description"
          value={field.description}
          onChange={handleChange}
          rows={2}
          className={textareaClassName}
          placeholder="Help text for users filling out this field"
        />
      </div>

      {/* Placeholder */}
      <div>
        <label htmlFor={`${field.id}-placeholder`} className="block text-sm font-medium text-gray-700">
          Placeholder
        </label>
        <input
          type="text"
          id={`${field.id}-placeholder`}
          name="placeholder"
          value={field.placeholder}
          onChange={handleChange}
          className={inputClassName}
          placeholder="e.g., Enter your first name"
        />
      </div>

      {/* Options for dropdown and multiselect fields */}
      {(field.type === 'dropdown' || field.type === 'multiselect') && (
        <div>
          <label htmlFor={`${field.id}-options`} className="block text-sm font-medium text-gray-700">
            Options (one per line, format: value|label)
          </label>
          <textarea
            id={`${field.id}-options`}
            value={field.options?.map(opt => `${opt.value}|${opt.label}`).join('\n')}
            onChange={handleOptionsChange}
            rows={Math.max(4, field.options?.length || 1)}
            className={textareaClassName}
            placeholder="option1|Option 1\noption2|Option 2"
          />
          <p className="mt-1 text-sm text-gray-500">
            Enter each option on a new line. Use | to separate value and label (optional).
            {field.type === 'multiselect' && ' Users can select multiple options.'}
          </p>
          {/* Option preview with icons */}
          {field.options && field.options.length > 0 && (
            <div className="mt-2">
              <div className="font-semibold text-xs text-gray-600 mb-1">Preview:</div>
              <ul className="space-y-1">
                {field.options.map((opt, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <IndustryHouseIcons iconTag={opt.label} />
                    <span>{opt.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}