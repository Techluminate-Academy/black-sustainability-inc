import { useState, useEffect } from "react";
import { FormData } from "@/models/formData";
import jerryData from "@/data/jerry.json";
import { FieldDefinition } from "@/models/fieldDefinition";

export function usePopulateFormData(
  fields: FieldDefinition[] | null,
  nameToAirtable: Record<string,string>
) {
  const [data, setData] = useState<Partial<FormData>>({});
  const [previews, setPreviews] = useState<Record<string,string[]>>({});

  useEffect(() => {
    if (!fields || !Object.keys(nameToAirtable).length) return;
    const record = (jerryData as any[])[0].fields as Record<string,any>;
    const fd: any = {};
    const pv: Record<string,string[]> = {};

    fields.forEach(f => {
      const key = nameToAirtable[f.name]!;
      const raw = key
        ? record[key]
        : record[f.label.toUpperCase()] ?? record[f.label];

      if (f.type === "file") {
        if (Array.isArray(raw)) pv[f.name] = raw.map((a:any) => a.url);
        fd[f.name] = "";
      } else if (f.type === "dropdown") {
        fd[f.name] = Array.isArray(raw) ? raw : raw!=null ? [raw] : [];
      } else if (f.type === "checkbox") {
        fd[f.name] = !!raw;
      } else {
        fd[f.name] = raw ?? "";
      }
    });

    setData(fd);
    setPreviews(pv);
  }, [fields, nameToAirtable]);

  return { data, previews };
}
