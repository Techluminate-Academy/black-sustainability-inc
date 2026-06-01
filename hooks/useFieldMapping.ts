import { useState, useEffect } from "react";
import { FieldDefinition } from "@/models/fieldDefinition";

interface AirtableFieldMetadata {
  fieldName: string;
  fieldType: string;
  options?: Array<{
    id: string;
    name: string;
    icon: string | null;
  }>;
}

export function useFieldMapping(fields: FieldDefinition[] | null) {
  const [nameToAirtable, setNameToAirtable] = useState<Record<string,string>>({});
  const [typeMap, setTypeMap] = useState<Record<string,string>>({});
  const [optionsMap,setOptionsMap] = useState<Record<string,{id:string,name:string}[]>>({});

  useEffect(() => {
    if (!fields) return;
    fetch("/api/airtable/roster-metadata")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load metadata");
        return res.json();
      })
      .then((meta: AirtableFieldMetadata[]) => {
        const fn: Record<string, string> = {};
        const ft: Record<string, string> = {};
        const fo: Record<string, { id: string; name: string }[]> = {};
        meta.forEach((m: AirtableFieldMetadata) => {
          const cfg = fields.find((f) => f.label.toLowerCase() === m.fieldName.toLowerCase());
          if (!cfg) return;
          fn[cfg.name] = m.fieldName;
          ft[cfg.name] = m.fieldType;
          if (m.options) fo[cfg.name] = m.options.map((o) => ({ id: o.id, name: o.name }));
        });
        setNameToAirtable(fn);
        setTypeMap(ft);
        setOptionsMap(fo);
      })
      .catch((err) => console.error("useFieldMapping metadata load failed:", err));
  }, [fields]);

  return { nameToAirtable, typeMap, optionsMap };
}
