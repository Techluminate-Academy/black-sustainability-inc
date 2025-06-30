"use client";

import React, { useState, useEffect } from "react";
import DynamicForm from "@/components/DynamicForm/DynamicForm";
import type { FieldDefinition } from "@/models/fieldDefinition";

export default function OnboardingPage() {
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  // Fetch form fields from the API
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const response = await fetch('/api/form-versions/version');
        const data = await response.json();
        if (data.fields) {
          setFields(data.fields);
          // Initialize form values
          const initialValues: Record<string, any> = {};
          data.fields.forEach((field: FieldDefinition) => {
            initialValues[field.name] = '';
          });
          setFormValues(initialValues);
        }
      } catch (error) {
        console.error('Error fetching form fields:', error);
      }
    };

    fetchFields();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Member Onboarding</h1>
      <DynamicForm 
        fields={fields}
        values={formValues}
      />
    </div>
  );
}
