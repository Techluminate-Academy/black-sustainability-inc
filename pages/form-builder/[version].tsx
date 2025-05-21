// pages/form-builder/[version].tsx

import type { GetServerSideProps } from "next";
import FormBuilder from "@/components/FormBuilder";
import { connectToDatabase } from "@/lib/mongodb";
import type { Collection } from "mongodb";
import type { FormVersion } from "@/models/formVersion";
import type { FieldDefinition } from "@/models/fieldDefinition";

interface Props {
  version: number;
  initialFields: FieldDefinition[];
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  // 1) extract & validate the version param
  const raw = Array.isArray(params?.version) ? params.version[0] : params?.version;
  const version = parseInt(raw as string, 10);
  if (isNaN(version)) {
    return { notFound: true };
  }

  // 2) fetch from the database via your helper
  const { db } = await connectToDatabase();
  // avoid using a generic on collection() to sidestep TS2347
  const coll = db.collection("formVersions") as Collection<FormVersion>;
  const doc = await coll.findOne({ version });
  if (!doc) {
    return { notFound: true };
  }

  // 3) serialize fields for JSON
  const fields = Array.isArray(doc.fields) ? doc.fields : [];

  return {
    props: {
      version,
      initialFields: JSON.parse(JSON.stringify(fields)),
    },
  };
};

export default function VersionedFormBuilderPage({ version, initialFields }: Props) {
  return (
    <div className="p-8">
      <h1 className="text-3xl mb-4">Form Builder v{version}</h1>
      <FormBuilder initialFields={initialFields} />
    </div>
  );
}
