// src/components/FormBuilder/DragDropCanvas.tsx
import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FieldDefinition } from "@/models/fieldDefinition";

interface DragDropCanvasProps {
  fields: FieldDefinition[];
  setFields: React.Dispatch<React.SetStateAction<FieldDefinition[]>>;
  isOverCanvas: boolean;
}

export default function DragDropCanvas({
  fields,
  setFields,
  isOverCanvas
}: DragDropCanvasProps) {
  const { setNodeRef } = useDroppable({ id: "canvas" });

  const handleRemove = (id: string) =>
    setFields(prev => prev.filter(f => f.id !== id));

  return (
    <div
      ref={setNodeRef}
      className={`
        flex-1 p-4 rounded min-h-[400px] transition-colors
        ${isOverCanvas
          ? "bg-blue-50 border-2 border-blue-400"
          : "bg-white border border-gray-200"}
      `}
    >
      {!fields || fields.length === 0 ? (
        <p className="text-gray-400 text-center">
          Drag fields here to build your form
        </p>
      ) : (
        fields.map(field => (
          <SortableField
            key={field.id}
            field={field}
            onRemove={handleRemove}
          />
        ))
      )}
    </div>
  );
}

interface SortableFieldProps {
  field: FieldDefinition;
  onRemove: (id: string) => void;
}

function SortableField({ field, onRemove }: SortableFieldProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const renderControl = () => {
    const base = "w-full border rounded p-2 bg-white";
    switch (field.type) {
      case "text":
      case "email":
      case "url":
      case "phone":
        return <input type="text" placeholder={field.label} disabled className={base} />;
      case "textarea":
        return <textarea placeholder={field.label} disabled className={base} />;
      case "dropdown":
        return (
          <select disabled className={base}>
            {(field.options || []).map(o => (
              <option key={o.value}>{o.label}</option>
            ))}
          </select>
        );
      case "checkbox":
        return (
          <label className="inline-flex items-center">
            <input type="checkbox" disabled className="mr-2" />
            <span>{field.label}</span>
          </label>
        );
      case "file":
        return <input type="file" disabled className={base} />;
      case "address":
        return <input type="text" placeholder="Address" disabled className={base} />;
      default:
        return <input type="text" disabled className={base} />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative mb-4 p-3 bg-gray-50 rounded border"
    >
      <button
        onClick={e => {
          e.stopPropagation();
          onRemove(field.id);
        }}
        className="absolute top-1 right-1 text-red-500 hover:text-red-700"
        aria-label={`Remove ${field.label}`}
      >
        ×
      </button>

      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}{field.required && <span className="text-red-500">*</span>}
      </label>

      {renderControl()}
    </div>
  );
}
