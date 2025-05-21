// src/components/FormBuilder/index.tsx
"use client";

import React, { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
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

// Human‐readable labels for each FieldType
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
  onChange?: (fields: FieldDefinition[]) => void;
}

export default function FormBuilder({
  initialFields = [],
  onChange
}: FormBuilderProps) {
  const [fields, setFields] = useState<FieldDefinition[]>(initialFields);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const activeId = active.id;
    const overId = over?.id;
    // Build a quick lookup of existing field IDs
    const existingIds = fields.map((f) => f.id);

    // 1) New palette item dropped on canvas?
    if (
      overId === "canvas" &&
      // ensure it's not already on canvas
      !existingIds.includes(activeId as string)
    ) {
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
      setFields((prev) => {
        const next = [...prev, newField];
        onChange?.(next);
        return next;
      });
    }
    // 2) Reorder existing fields?
    else if (
      existingIds.includes(activeId as string) &&
      existingIds.includes(overId as string) &&
      activeId !== overId
    ) {
      setFields((items) => {
        const oldIndex = items.findIndex((f) => f.id === activeId);
        const newIndex = items.findIndex((f) => f.id === overId);
        const next = arrayMove(items, oldIndex, newIndex);
        onChange?.(next);
        return next;
      });
    }
    // else: palette item dropped outside canvas OR existing field dropped on canvas
    // do nothing

    setActiveId(null);
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  function renderDragPreview() {
    if (!activeId) return null;

    // Palette preview
    if (typeof activeId === "string" && FIELD_LABELS[activeId as FieldType]) {
      const type = activeId as FieldType;
      return (
        <div className="p-2 shadow-lg">
          <input
            type={
              type === "textarea"
                ? undefined
                : type === "dropdown"
                ? "text"
                : type
            }
            placeholder={FIELD_LABELS[type]}
            disabled
            className="w-full border rounded p-2 bg-white"
          />
        </div>
      );
    }

    // Existing field preview
    const existing = fields.find((f) => f.id === activeId);
    if (existing) {
      return (
        <div className="p-2 shadow-lg">
          <input
            type={existing.type === "textarea" ? undefined : existing.type}
            placeholder={existing.label}
            disabled
            className="w-full border rounded p-2 bg-gray-100"
          />
        </div>
      );
    }

    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4">
        <FieldPalette />

        <SortableContext
          items={fields.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <DragDropCanvas fields={fields} setFields={setFields} />
        </SortableContext>
      </div>

      <DragOverlay dropAnimation={{ duration: 0, easing: "ease" }}>
        {renderDragPreview()}
      </DragOverlay>
    </DndContext>
  );
}
