// pages/schema-editor/[version].tsx
import { GetServerSideProps } from "next";
import dynamic from "next/dynamic";
import React from "react";
import { connectToDatabase } from "@/lib/mongodb";
import type { Collection } from "mongodb";
import type { FormVersion } from "@/models/formVersion";

// lazy‐load the editor so it only runs client‐side:
const FormSchemaEditor = dynamic(
  () => import("../../components/FormSchemaEditor"),
  { ssr: false }
);

export type FieldOption = { label: string; value: string };
export type FieldDef = {
    key: string;
    label: string;
    type: "string"|"number"|"boolean"|"textarea"|"select"|"file";
    required: boolean;
    options: { label:string; value:string }[];
  };
  

interface Props {
  version: number;
  initialFields: FieldDef[];
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const raw = Array.isArray(params?.version) ? params.version[0] : params?.version;
  const version = parseInt(raw as string, 10);
  if (isNaN(version)) return { notFound: true };

  const { db } = await connectToDatabase();
  const coll = db.collection("formVersions") as Collection<FormVersion>;
  const doc = await coll.findOne({ version });
  if (!doc) return { notFound: true };

  // Normalize our FieldDef shape
 // pages/schema-editor/[version].tsx

// …

  // Normalize our FieldDef shape
  const initialFields: FieldDef[] = (doc.fields || []).map((f) => {
    // pick the right key from either "key" or the old "name" field
    const fieldKey = typeof f.key === "string" ? f.key : f.name;
    return {
      key: fieldKey,
      label: f.label,
      required: Boolean(f.required),
      type:
        f.type === "dropdown" ? "select" :
        f.type === "file"     ? "file"   :
        f.type === "checkbox" ? "boolean":
        f.type === "number"   ? "number" :
        "string",
      options: Array.isArray(f.options)
        ? f.options.map((o) => ({ label: o.label, value: o.value }))
        : [],
    };
  });

  

  return { props: { version, initialFields } };
};

export default function SchemaEditorPage({ version, initialFields }: Props) {
  const handleSave = (schema: any) => {
    // send this back to your API...
    console.log("Saving version", version, schema);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Edit Your Form Schema v{version}</h1>
      <FormSchemaEditor initialFields={initialFields} onSave={handleSave} />
    </div>
  );
}
