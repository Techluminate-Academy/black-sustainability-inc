// components/FormBuilder/index.tsx
"use client";

import React, { useState, useEffect } from "react";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import DragDropCanvas from "./DragDropCanvas";
import FieldPalette from "./FieldPalette";
import type { FieldDefinition } from "@/models/fieldDefinition";

export interface FormBuilderProps {
  initialJson: any;
  onSave: (schema: any) => void;
}

export default function FormBuilder({ initialJson, onSave }: FormBuilderProps) {
  const [fields, setFields] = useState<FieldDefinition[]>(initialJson.fields || []);
  const [isOverCanvas, setIsOverCanvas] = useState(false);

  // If parent ever sends a new initialJson, use it
  useEffect(() => {
    if (initialJson?.fields) {
      setFields(initialJson.fields);
    }
  }, [initialJson]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setIsOverCanvas(false);
    if (!over) return;

    const oldIndex = fields.findIndex(f => f.id === active.id);
    const newIndex = fields.findIndex(f => f.id === over.id);

    if (oldIndex !== newIndex) {
      setFields(arrayMove(fields, oldIndex, newIndex));
    }
  };

  const handleDragOver = (event: DragEndEvent) => {
    const { over } = event;
    setIsOverCanvas(over?.id === "canvas");
  };

  const handleSave = () => {
    onSave({ fields });
  };

  return (
    <div className="p-4">
      <DndContext onDragEnd={handleDragEnd} onDragOver={handleDragOver}>
        <div className="flex gap-4">
          <FieldPalette />
          <DragDropCanvas 
            fields={fields}
            setFields={setFields}
            isOverCanvas={isOverCanvas}
          />
        </div>
      </DndContext>

      <button
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={handleSave}
      >
        Save Form
      </button>
    </div>
  );
}
