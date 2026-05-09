// src/components/FormBuilder/FieldPalette.tsx
import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { FieldType } from "@/models/field";

const PALETTE: { type: FieldType; label: string }[] = [
  { type: "text", label: "Text Input" },
  { type: "textarea", label: "Textarea" },
  { type: "dropdown", label: "Dropdown" },
  { type: "file", label: "File Upload" },
  { type: "phone", label: "Phone Input" },
  { type: "address", label: "Address" },
  // add more as needed
];

export default function FieldPalette() {
  return (
    <div className="w-full p-4 bg-gray-50 rounded shadow ">
      <h3 className="font-semibold mb-2">Field Types</h3>
      {PALETTE.map(({ type, label }) => (
        <PaletteItem key={type} type={type} label={label} />
      ))}
    </div>
  );
}

function PaletteItem({
  type,
  label
}: {
  type: FieldType;
  label: string;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: type
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}

      className="p-2 mb-2 bg-white rounded border cursor-grab hover:bg-gray-100 w-full"
    >
      {label}
    </div>
  );
}
