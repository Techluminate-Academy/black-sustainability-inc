import { useState, useEffect } from "react";
import { FormDefinition } from "@/models/fieldDefinition";

export function useFormSchema() {
  const [schema, setSchema] = useState<FormDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/form-versions/version")
      .then(res => res.ok ? res.json() : res.json().then(b => Promise.reject(b.error)))
      .then((doc: FormDefinition) => setSchema(doc))
      .catch(err => setError(String(err)));
  }, []);

  return { schema, error };
}
