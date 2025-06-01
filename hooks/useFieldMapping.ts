import { useState, useEffect } from "react";
import { FieldDefinition } from "@/models/fieldDefinition";
import AirtableUtils from "@/pages/api/submitForm";

export function useFieldMapping(fields: FieldDefinition[] | null) {
  const [nameToAirtable, setNameToAirtable] = useState<Record<string,string>>({});
  const [typeMap, setTypeMap] = useState<Record<string,string>>({});
  const [optionsMap,setOptionsMap] = useState<Record<string,{id:string,name:string}[]>>({});

  useEffect(() => {
    if (!fields) return;
    AirtableUtils.fetchTableMetadata().then((meta) => {
      const fn: Record<string,string> = {};
      const ft: Record<string,string> = {};
      const fo: Record<string,{id:string,name:string}[]> = {};
      meta.forEach(m => {
        const cfg = fields.find(f => f.label.toLowerCase() === m.fieldName.toLowerCase());
        if (!cfg) return;
        fn[cfg.name] = m.fieldName;
        ft[cfg.name] = m.fieldType;
        if (m.options) fo[cfg.name] = m.options.map(o => ({id:o.id,name:o.name}));
      });
      setNameToAirtable(fn);
      setTypeMap(ft);
      setOptionsMap(fo);
    });
  }, [fields]);

  return { nameToAirtable, typeMap, optionsMap };
}
