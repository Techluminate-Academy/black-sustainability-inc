// components/DynamicForm/DynamicForm.tsx
"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent, useMemo } from "react";
import axios from "axios";
import jerryData from "@/data/jerry.json";
import AirtableUtils from "@/pages/api/submitForm";

interface AirtableFieldMeta {
  fieldName: string;
  fieldType: string;
  options: Array<{ id: string; name: string; icon: string | null }>;
}

export interface Option { label: string; value: string; }

export interface FieldConfig {
  id: string;
  name: string;
  type:
    | "text"
    | "email"
    | "url"
    | "textarea"
    | "file"
    | "dropdown"
    | "phone"
    | "checkbox"
    | "address";
  label: string;
  required: boolean;
  options?: Option[];
  step: number;
}

export interface FormConfig {
  version: number;
  updatedAt: string;
  fields: FieldConfig[];
  status: string;
}

export default function DynamicForm() {
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [filePreviews, setFilePreviews] = useState<Record<string, string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);

  const [nameToFieldName, setNameToFieldName] = useState<Record<string, string>>({});
  const [nameToFieldType, setNameToFieldType] = useState<Record<string, string>>({});
  const [nameToFieldOptions, setNameToFieldOptions] = useState<
    Record<string, { id: string; name: string }[]>
  >({});

  // 1) Load the *published* form schema
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/form-versions/version");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Could not load form");
        }
        const doc: FormConfig = await res.json();
        setConfig(doc);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      }
    }
    load();
  }, []);

  // 2) Once schema is in, fetch Airtable metadata
  useEffect(() => {
    if (!config) return;
    (async () => {
      const meta = (await AirtableUtils.fetchTableMetadata()) as AirtableFieldMeta[];
      const fn: Record<string, string> = {};
      const ft: Record<string, string> = {};
      const fo: Record<string, { id: string; name: string }[]> = {};

      meta.forEach((m) => {
        const cfg = config.fields.find(
          (f) => f.label.toLowerCase() === m.fieldName.toLowerCase()
        );
        if (!cfg) return;
        fn[cfg.name] = m.fieldName;
        ft[cfg.name] = m.fieldType;
        if (m.options?.length) fo[cfg.name] = m.options.map(o => ({ id: o.id, name: o.name }));
      });

      setNameToFieldName(fn);
      setNameToFieldType(ft);
      setNameToFieldOptions(fo);
    })();
  }, [config]);

  // 3) Init formData, files & previews from jerry.json
  useEffect(() => {
    if (!config) return;
    const record = (jerryData as any[])[0]?.fields as Record<string, any>;
    const fd: Record<string, any> = {};
    const fl: Record<string, File | null> = {};
    const previews: Record<string, string[]> = {};

    config.fields.forEach((f) => {
      const raw = record[f.label.toUpperCase()] ?? record[f.label];
      if (f.type === "file") {
        // show existing attachments
        if (Array.isArray(raw)) {
          previews[f.name] = raw.map((a: any) => a.url).filter(Boolean);
        }
        fl[f.name] = null;
        fd[f.name] = ""; // will hold the URL after upload
      } else if (f.type === "dropdown") {
        if (Array.isArray(raw)) {
          fd[f.name] = raw;
        } else if (raw != null) {
          fd[f.name] = [raw];
        } else {
          fd[f.name] = [];
        }
      } else if (f.type === "checkbox") {
        fd[f.name] = Boolean(raw);
      } else {
        fd[f.name] = raw ?? "";
      }
    });

    setFormData(fd);
    setFiles(fl);
    setFilePreviews(previews);
  }, [config]);

  // group into steps by `step`
  const steps = useMemo(() => {
    if (!config) return [];
    const map = new Map<number, FieldConfig[]>();
    config.fields.forEach((f) => {
      const s = f.step;
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(f);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([n, fs]) => ({ title: `Step ${n}`, fields: fs }));
  }, [config]);

  if (error) return <p className="text-red-600">Error: {error}</p>;
  if (!config) return <p>Loading form…</p>;
  if (steps.length === 0) return <p>No fields configured.</p>;

  const totalSteps = steps.length;
  const currentGroup = steps[currentStep].fields;

  function handleChange(e: ChangeEvent<any>) {
    const { name, type, checked, multiple, selectedOptions, value } = e.target;
    if (type === "checkbox") {
      setFormData((p) => ({ ...p, [name]: checked }));
    } else if (multiple) {
      const arr = Array.from(selectedOptions).map((o: any) => o.value);
      setFormData((p) => ({ ...p, [name]: arr }));
    } else {
      setFormData((p) => ({ ...p, [name]: value }));
    }
  }

  function validateStep(idx: number) {
    const errs: Record<string, string> = {};
    steps[idx].fields.forEach((f) => {
      if (!f.required) return;
      const val = f.type === "file" ? formData[f.name] : formData[f.name];
      if (val === "" || val == null || (Array.isArray(val) && val.length === 0)) {
        errs[f.name] = "Required";
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // multi-step validation
    for (let i = 0; i < totalSteps; i++) {
      if (!validateStep(i)) {
        setCurrentStep(i);
        return;
      }
    }

    // already‐uploaded or newly‐selected files are already in formData as URLs
    // build Airtable payload
    const payload: Record<string, any> = {};
    config.fields.forEach((f) => {
      const airtableKey = nameToFieldName[f.name];
      const airtableType = nameToFieldType[f.name];
      if (!airtableKey) return;

      // file → attachments
      if (f.type === "file") {
        const url = formData[f.name];
        if (url) {
          payload[airtableKey] =
            airtableType === "multipleAttachments" ? [{ url }] : url;
        }
        return;
      }

      // dropdown
      if (f.type === "dropdown") {
        const raw = formData[f.name];
        const opts = nameToFieldOptions[f.name] || [];
        if (airtableType === "singleSelect") {
          const sel = Array.isArray(raw) ? raw[0] : raw;
          const found = opts.find((o) => o.id === sel);
          payload[airtableKey] = found?.name ?? null;
        } else {
          payload[airtableKey] = Array.isArray(raw)
            ? raw
                .map((id: string) => opts.find((o) => o.id === id)?.name)
                .filter(Boolean)
            : [];
        }
        return;
      }

      // number?
      if (airtableType === "number") {
        const raw = formData[f.name];
        payload[airtableKey] = raw === "" || raw == null ? null : Number(raw);
        return;
      }

      // everything else
      payload[airtableKey] = formData[f.name];
    });

    try {
      await axios.post("/api/updateMember", {
        airtableId: jerryData[0].airtableId,
        fields: payload,
      });
      alert("✅ Updated!");
    } catch (err) {
      console.error(err);
      alert("❌ Failed—see console.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl mx-auto bg-white p-6 rounded-lg shadow space-y-6"
    >
      <h2 className="text-xl font-bold">
        {steps[currentStep].title} ({currentStep + 1}/{totalSteps})
      </h2>

      {currentGroup.map((f) => (
        <div key={f.id}>
          <label className="block font-medium mb-1">
            {f.label}
            {f.required && " *"}
          </label>

          {/* preview existing attachments */}
          {f.type === "file" && filePreviews[f.name]?.length > 0 && (
            <div className="flex space-x-2 mb-2">
              {filePreviews[f.name].map((url) => (
                <img
                  key={url}
                  src={url}
                  className="h-16 w-16 object-cover rounded"
                  alt="preview"
                />
              ))}
            </div>
          )}

          {f.type === "file" ? (
            // immediate upload → store URL in formData[f.name]
            <input
              type="file"
              name={f.name}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const data = new FormData();
                data.append("file", file);
                const res = await axios.post("/api/upload", data, {
                  headers: { "Content-Type": "multipart/form-data" },
                });
                setFormData((p) => ({ ...p, [f.name]: res.data.url }));
                setFilePreviews((p) => ({ ...p, [f.name]: [] }));
              }}
              className="block"
            />
          ) : f.type === "textarea" ? (
            <textarea
              name={f.name}
              value={formData[f.name] || ""}
              onChange={handleChange}
              className="w-full border rounded p-2"
            />
          ) : f.type === "dropdown" && nameToFieldType[f.name] === "singleSelect" ? (
            <select
              name={f.name}
              value={Array.isArray(formData[f.name]) ? formData[f.name][0] : formData[f.name] || ""}
              onChange={handleChange}
              className="w-full border rounded p-2"
            >
              <option value="">Select…</option>
              {nameToFieldOptions[f.name]?.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          ) : f.type === "dropdown" && nameToFieldType[f.name] === "multipleSelects" ? (
            <select
              name={f.name}
              multiple
              value={Array.isArray(formData[f.name]) ? formData[f.name] : []}
              onChange={handleChange}
              className="w-full border rounded p-2"
            >
              {nameToFieldOptions[f.name]?.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          ) : f.type === "checkbox" ? (
            <input
              type="checkbox"
              name={f.name}
              checked={formData[f.name] || false}
              onChange={handleChange}
            />
          ) : (
            <input
              type={
                f.type === "email"
                  ? "email"
                  : f.type === "url"
                  ? "url"
                  : f.type === "phone"
                  ? "tel"
                  : "text"
              }
              name={f.name}
              value={formData[f.name] || ""}
              onChange={handleChange}
              className="w-full border rounded p-2"
            />
          )}

          {errors[f.name] && <p className="text-red-500 text-sm mt-1">{errors[f.name]}</p>}
        </div>
      ))}

      <div className="flex justify-between">
        {currentStep > 0 ? (
          <button
            type="button"
            onClick={() => setCurrentStep((s) => s - 1)}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            ← Previous
          </button>
        ) : (
          <div />
        )}
        {currentStep < totalSteps - 1 ? (
          <button
            type="button"
            onClick={() => validateStep(currentStep) && setCurrentStep((s) => s + 1)}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Next →
          </button>
        ) : (
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">
            Submit
          </button>
        )}
      </div>
    </form>
  );
}
