// components/FormBuilder/index.tsx
"use client";

import React, { useState, useEffect, useLayoutEffect } from "react";
import dynamic from "next/dynamic";

// 1) Load UMD + CSS client-side
import Formio from "formiojs/dist/formio.full.min.js";
import "formiojs/dist/formio.full.min.css";

// 2) React bindings, client only
const FormioProvider = dynamic(
  () => import("@formio/react").then((m) => m.FormioProvider),
  { ssr: false }
) as React.ComponentType<{ Formio: any; children: React.ReactNode }>;

const ReactFormBuilder = dynamic(
  () => import("@formio/react").then((m) => m.FormBuilder),
  { ssr: false }
) as React.ComponentType<{
  initialForm: any;
  options?: any;
  onChange: (schema: any) => void;
}>;

export interface FormBuilderProps {
  initialJson: any;
  onSave: (schema: any) => void;
}

export default function FormBuilder({ initialJson, onSave }: FormBuilderProps) {
  const [schema, setSchema] = useState<any>(initialJson);

  // If parent ever sends a new initialJson, use it
  useEffect(() => setSchema(initialJson), [initialJson]);

  // Patch out any leftover page-validation hooks just in case
  useLayoutEffect(() => {
    const proto =
      Formio.Webform?.prototype ||
      (Formio.Formio?.Webform && Formio.Formio.Webform.prototype);
    if (proto) {
      proto.hasExtraPages = () => false;
      proto.validationProcessor = () => [];
    }
  }, []);

  return (
    <FormioProvider Formio={Formio}>
      <div style={{ border: "1px solid #ccc", height: "75vh", overflow: "auto", padding: 8 }}>
        <ReactFormBuilder
          initialForm={schema}
          options={{
            // only disable validation/page checks
            noValidate: true,
            noValidatePages: true,
          }}
          onChange={setSchema}
        />
        <button
          style={{
            marginTop: 12,
            padding: "8px 16px",
            background: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
          onClick={() => onSave(schema)}
        >
          Save Form
        </button>
      </div>
    </FormioProvider>
  );
}
