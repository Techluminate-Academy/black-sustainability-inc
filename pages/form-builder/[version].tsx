// pages/form-builder/[version].tsx
import type { GetServerSideProps } from "next";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { connectToDatabase } from "@/lib/mongodb";
import type { Collection } from "mongodb";
import type { FormVersion } from "@/models/formVersion";
import type { FieldDefinition } from "@/models/fieldDefinition";

// Client-only import
const FormBuilder = dynamic(() => import("@/components/FormBuilder"), {
  ssr: false,
});

interface Props {
  version: number;
  initialFields: FieldDefinition[];
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const raw = Array.isArray(params?.version) ? params.version[0] : params?.version;
  const version = parseInt(raw as string, 10);
  if (isNaN(version)) return { notFound: true };

  const { db } = await connectToDatabase();
  const coll = db.collection("formVersions") as Collection<FormVersion>;
  const doc = await coll.findOne({ version });
  if (!doc) return { notFound: true };

  const fields = Array.isArray(doc.fields) ? doc.fields : [];
  return {
    props: {
      version,
      initialFields: JSON.parse(JSON.stringify(fields)),
    },
  };
};

export default function VersionedFormBuilderPage({ version, initialFields }: Props) {
  const initialSchema = useMemo<any>(() => {
    const total = initialFields.length;
    const size = Math.ceil(total / 3);
    const groups = [
      initialFields.slice(0, size),
      initialFields.slice(size, size * 2),
      initialFields.slice(size * 2),
    ];
    return {
      display: "wizard",           // <-- wizard mode
      components: groups.map((group, i) => ({
        type: "panel",
        title: `Step ${i + 1}`,
        key: `page${i + 1}`,
        components: group.map((f) => {
          // map your FieldDefinition → Form.io component
          const compType =
            f.type === "dropdown" ? "select" :
            f.type === "phone"    ? "phoneNumber" :
            f.type === "text"     ? "textfield"  :
            f.type;
          const comp: any = {
            type: compType,
            key: f.name,
            label: f.label,
            input: true,
            required: f.required,
          };
          if (f.options) {
            comp.data = { values: f.options.map(o => ({ label: o.label, value: o.value })) };
            comp.dataSrc = "values";
            comp.valueProperty = "value";
          }
          return comp;
        }),
      })),
    };
  }, [initialFields]);

  const handleSave = async (updatedSchema: any) => {
    const res = await fetch("/api/forms/saveFormSchema", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version, schema: updatedSchema }),
    });
    const { success } = await res.json();
    alert(success ? "Form saved!" : "Save failed");
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl mb-4">Form Builder v{version}</h1>
      <FormBuilder initialJson={initialSchema} onSave={handleSave} />
    </div>
  );
}
