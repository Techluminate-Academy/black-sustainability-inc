// src/components/FormBuilder/index.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  DndContext,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  UniqueIdentifier
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { nanoid } from "nanoid";

import { FieldDefinition } from "@/models/fieldDefinition";
import { FieldType } from "@/models/field";
import { FormData } from "@/models/formData";

import FieldPalette from "./FieldPalette";
import DragDropCanvas from "./DragDropCanvas";

const FIELD_LABELS: Record<FieldType, string> = {
  text: "Text Input",
  email: "Email Input",
  url: "URL Input",
  textarea: "Textarea",
  dropdown: "Dropdown",
  checkbox: "Checkbox",
  file: "File Upload",
  phone: "Phone Input",
  address: "Address"
};

interface FormBuilderProps {
  initialFields?: FieldDefinition[];
}

export default function FormBuilder({
  initialFields = []
}: FormBuilderProps) {
  const [fields, setFields] = useState<FieldDefinition[]>(initialFields);
  useEffect(() => {
    setFields(initialFields);
  }, [initialFields]);

  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragStart(_: DragStartEvent) {
    // no-op
  }

  function handleDragOver(event: DragOverEvent) {
    setOverId(event.over?.id ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = event.active.id as string;
    const overId = event.over?.id as string | undefined;
    const existingIds = fields.map(f => f.id);

    // 1) palette → canvas
    if (overId === "canvas" && !existingIds.includes(activeId)) {
      const newField: FieldDefinition = {
        id: nanoid(),
        name: `field_${nanoid()}` as keyof FormData,
        type: activeId as FieldType,
        label: FIELD_LABELS[activeId as FieldType],
        required: false,
        options:
          activeId === "dropdown"
            ? [{ label: "Option 1", value: "option1" }]
            : undefined
      };
      setFields(prev => [...prev, newField]);
    }
    // 2) reorder existing
    else if (
      existingIds.includes(activeId) &&
      existingIds.includes(overId!) &&
      activeId !== overId
    ) {
      setFields(prev =>
        arrayMove(
          prev,
          prev.findIndex(f => f.id === activeId),
          prev.findIndex(f => f.id === overId)
        )
      );
    }

    setOverId(null);
  }

  function handleDragCancel() {
    setOverId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-6 max-w-screen-lg mx-auto px-4">
        {/* Canvas (2/3 width) */}
        <div className="flex-[2]">
          <SortableContext
            items={fields.map(f => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <DragDropCanvas
              fields={fields}
              setFields={setFields}
              isOverCanvas={overId === "canvas"}
            />
          </SortableContext>
        </div>

        {/* Palette (full width of its column) */}
        <div className="flex-1 w-full">
          <FieldPalette />
        </div>
      </div>
    </DndContext>
  );
}
