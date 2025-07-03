"use client";

import React, { useState, useEffect } from "react";
import { Formik, Form } from "formik";
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
      {fields.length > 0 && Object.keys(formValues).length > 0 && (
        <Formik
          initialValues={formValues}
          onSubmit={(values) => {
            // handle form submission
            console.log(values);
          }}
          enableReinitialize
        >
          <Form>
            <DynamicForm fields={fields} values={formValues} />
            <button type="submit" className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
              Submit
            </button>
          </Form>
        </Formik>
      )}
    </div>
  );
}
