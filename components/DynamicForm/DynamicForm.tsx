"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent, useMemo } from "react";
import axios from "axios";
import jerryData from "@/data/jerry.json";
import AirtableUtils from "@/pages/api/submitForm";
import CountryCodeDropdown from "../CountryCodeDropdown/CountryCodeDropdown";
import { allCountries } from "country-telephone-data";

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

interface CountryData {
  dialCode: string;
  name: string;
  iso2: string;
}

export default function DynamicForm() {
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [filePreviews, setFilePreviews] = useState<Record<string, string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);

  const [nameToFieldName, setNameToFieldName] = useState<Record<string, string>>({});
  const [nameToFieldType, setNameToFieldType] = useState<Record<string, string>>({});
  const [nameToFieldOptions, setNameToFieldOptions] = useState<
    Record<string, { id: string; name: string }[]>
  >({});
  const DEFAULT_IMAGES: Record<'photo'|'logo',string> = {
    photo: "/public/default-photo.png",
    logo:  "/public/default-logo.png",
  };
  const internationalOptions = useMemo(
    () =>
      allCountries.map((c: CountryData) => ({
        code: `+${c.dialCode}`,
        country: c.name,
        iso2: c.iso2,
      })),
    []
  );


// above your component:
type RawV2Field = {
  key: string;
  label: string;
  required: boolean;
  type: "string" | "select" | "boolean" | "file" | "textarea" | "phone";
  options?: { label: string; value: string }[];
  step: number;
};
type RawAny = {
  version: number;
  updatedAt: string;
  status: string;
  fields: any[];
};

function normalizeConfig(raw: RawAny): FormConfig {
  const fields: FieldConfig[] = raw.fields.map((f: any) => {
    // 1) v1 already matches FieldConfig?
    if (typeof f.id === "string" && typeof f.name === "string") {
      return f as FieldConfig;
    }
    // 2) v2 shape: { key, label, required, type: "string"|"select"|…, options, step }
    if (typeof f.key === "string" && typeof f.label === "string") {
      let tc: FieldConfig["type"];
      switch (f.type) {
        case "select":   tc = "dropdown";  break;
        case "boolean":  tc = "checkbox";  break;
        case "string":
          // turn `"bio"` into a textarea, everything else plain text
          tc = f.key === "bio" ? "textarea" : "text";
          break;
        default:
          tc = f.type as any; // file, textarea, phone
      }
      return {
        id:       f.key,
        name:     f.key,
        label:    f.label,
        required: f.required,
        options:  f.options?.map((o: any) => ({ label: o.label, value: o.value })),
        step:     f.step,
        type:     tc,
      };
    }
    // 3) you can add more branches here for v3, v4, …
    throw new Error(`Unknown field‐shape in config: ${JSON.stringify(f)}`);
  });

  return {
    version:   raw.version,
    updatedAt: raw.updatedAt,
    status:    raw.status,
    fields,
  };
}

// inside your component, replace your first useEffect with:

useEffect(() => {
  async function loadSchema() {
    try {
      const res = await fetch("/api/form-versions/version");
      console.log(res)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not load form");
      }
      const raw = (await res.json()) as RawAny;
      const norm = normalizeConfig(raw);
      console.log(norm)
      setConfig(norm);
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    }
  }
  loadSchema();
}, []);


  // 2) Fetch Airtable metadata for mapping
  useEffect(() => {
    if (!config) return;
    (async () => {
      const meta = (await AirtableUtils.fetchTableMetadata()) as AirtableFieldMeta[];
      console.log(meta)
      const fn: Record<string, string> = {};
      const ft: Record<string, string> = {};
      const fo: Record<string, { id: string; name: string }[]> = {};
      meta.forEach(m => {
        const cfg = config.fields.find(f => f.label.toLowerCase() === m.fieldName.toLowerCase());
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

  // 3) Initialize formData and file previews
  useEffect(() => {
    if (!config || Object.keys(nameToFieldName).length === 0) return;
    const record = (jerryData as any[])[0]?.fields as Record<string, any>;
    const fd: Record<string, any> = {};
    const previews: Record<string, string[]> = {};

    config.fields.forEach(f => {
      const key = nameToFieldName[f.name];
      const raw = key
        ? record[key]
        : record[f.label.toUpperCase()] ?? record[f.label] ?? record[f.name.toUpperCase()] ?? record[f.name];

      if (f.name === "phoneCountryCode") {
        fd[f.name] = raw ?? "";
      } else if (f.type === "file") {
        if (Array.isArray(raw)) previews[f.name] = raw.map((a: any) => a.url).filter(Boolean);
        fd[f.name] = ""; 
      } else if (f.type === "dropdown") {
        fd[f.name] = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
      } else if (f.type === "checkbox") {
        fd[f.name] = Boolean(raw);
      } else {
        fd[f.name] = raw ?? "";
      }
    });

    setFormData(fd);
    setFilePreviews(previews);
  }, [config, nameToFieldName]);

  const steps = useMemo(() => {
    if (!config) return [];
    const groups = new Map<number, FieldConfig[]>();
    config.fields.forEach(f => {
      groups.set(f.step, [...(groups.get(f.step) || []), f]);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([n, fs]) => ({ title: `Step ${n}`, fields: fs }));
  }, [config]);

  if (error) return <p className="text-red-600">Error: {error}</p>;
  if (!config) return <p>Loading form…</p>;
  if (steps.length === 0) return <p>No fields configured.</p>;

  const totalSteps = steps.length;
  const currentGroup = steps[currentStep].fields;

  const handleChange = (e: ChangeEvent<any>) => {
    const { name, type, checked, multiple, selectedOptions, value, files: fList } = e.target;
    if (type === "checkbox") setFormData(p => ({ ...p, [name]: checked }));
    else if (name === "file" || type === "file") {
      // no-op here—handled in onChange of file input below
    }
    else if (multiple) {
      setFormData(p => ({ ...p, [name]: Array.from(selectedOptions).map((o: any) => o.value) }));
    } else {
      setFormData(p => ({ ...p, [name]: value }));
    }
  };

  const validateStep = (idx: number) => {
    const errs: Record<string, string> = {};
    steps[idx].fields.forEach(f => {
      const val = formData[f.name];
      if (f.required && (val === "" || val == null || (Array.isArray(val) && val.length === 0))) {
        errs[f.name] = "Required";
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
  
    // ⬇️ Bail out early if schema isn't loaded yet
    if (!config) {
      console.error("Form schema not loaded");
      return;
    }
  
    // ─── 1) Multi‐step validation ────────────────────────────────────────────
    for (let i = 0; i < totalSteps; i++) {
      if (!validateStep(i)) {
        setCurrentStep(i);
        return;
      }
    }
  
    // ─── 2) Build Airtable payload ─────────────────────────────────────────
    const payload: Record<string, any> = {};
  
    // We know config is non-null here
    config.fields.forEach((f) => {
      const airtableKey = nameToFieldName[f.name];
      if (!airtableKey) return;
  
      const airtableType = nameToFieldType[f.name];
  
      // ─── FILES ───────────────────────────────────────────────────────────
      if (f.type === "file") {
        const url = formData[f.name];
        if (url) {
          payload[airtableKey] =
            airtableType === "multipleAttachments" ? [{ url }] : url;
        }
        return;
      }
  
      // ─── ADDITIONAL FOCUS AREAS (long‐text override) ──────────────────────
      // treat this as a single long string
      if (airtableKey === "ADDITIONAL FOCUS AREAS") {
        const raw = formData[f.name];
        payload[airtableKey] = Array.isArray(raw)
          ? raw.join(", ")
          : raw ?? "";
        return;
      }
  
      // ─── TEXTAREAS OR MULTILINE FIELDS ────────────────────────────────────
      if (f.type === "textarea" || airtableType === "multilineText") {
        payload[airtableKey] = formData[f.name] ?? "";
        return;
      }
  
      // ─── DROPDOWNS ───────────────────────────────────────────────────────
      if (f.type === "dropdown") {
        const raw = formData[f.name];
        const opts = nameToFieldOptions[f.name] || [];
        if (airtableType === "singleSelect") {
          const sel = Array.isArray(raw) ? raw[0] : raw;
          payload[airtableKey] = opts.find(o => o.id === sel)?.name ?? null;
        } else {
          payload[airtableKey] = Array.isArray(raw)
            ? raw.map(id => opts.find(o => o.id === id)?.name).filter(Boolean)
            : [];
        }
        return;
      }
  
      // ─── PHONE ───────────────────────────────────────────────────────────
      if (f.type === "phone") {
        const [dialCode] = (formData.phoneCountryCode || "").split("-");
        payload[airtableKey] = dialCode + (formData[f.name] || "");
        return;
      }
  
      // ─── NUMBERS ─────────────────────────────────────────────────────────
      if (airtableType === "number") {
        const raw = formData[f.name];
        payload[airtableKey] = raw === "" || raw == null ? null : Number(raw);
        return;
      }
  
      // ─── FALLBACK ────────────────────────────────────────────────────────
      payload[airtableKey] = formData[f.name];
    });
  
    // ─── 3) Fire off the update ─────────────────────────────────────────────
    try {
      await axios.post("/api/updateMember", {
        airtableId: jerryData[0].airtableId,
        fields: payload,
      });
      alert("✅ Updated!");
    } catch (err) {
      console.error("❌ updateMember error:", err);
      alert("❌ Failed—see console.");
    }
  }
  
  

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto bg-white p-6 rounded-lg shadow space-y-6">
      <h2 className="text-xl font-bold">{steps[currentStep].title} ({currentStep+1}/{totalSteps})</h2>

      {currentGroup.map(f => (
  <div key={f.id}>
    <label className="block font-medium mb-1">
      {f.label}{f.required && " *"}
    </label>

    {/* country-code dropdown */}
    {f.name === "phoneCountryCode" ? (
      <CountryCodeDropdown
        value={formData.phoneCountryCode}
        options={internationalOptions}
        onChange={val =>
          setFormData(p => ({ ...p, phoneCountryCode: val }))
        }
      />
    ) : null}

    {/* existing file previews */}
    {f.type === "file" && filePreviews[f.name]?.length > 0 && (
      <div className="flex space-x-2 mb-2">
        {filePreviews[f.name].map(url => (
          <img
            key={url}
            src={url}
            className="h-16 w-16 object-cover rounded"
            alt="preview"
          />
        ))}
      </div>
    )}

    {/* file upload */}
    {f.type === "file" ? (
      <input
        type="file"
        name={f.name}
        onChange={async e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const data = new FormData();
          data.append("file", file);
          const res = await axios.post("/api/upload", data, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          setFormData(p => ({ ...p, [f.name]: res.data.url }));
          setFilePreviews(p => ({ ...p, [f.name]: [] }));
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
    ) : /* single- vs. multi-select based on Airtable metadata */ nameToFieldType[f.name] === "singleSelect" ? (
      <select
        name={f.name}
        value={
          Array.isArray(formData[f.name])
            ? formData[f.name][0]
            : formData[f.name] || ""
        }
        onChange={handleChange}
        className="w-full border rounded p-2"
      >
        <option value="">Select…</option>
        {nameToFieldOptions[f.name]?.map(opt => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </select>
    ) : nameToFieldType[f.name] === "multipleSelects" ? (
      <select
        name={f.name}
        multiple
        value={Array.isArray(formData[f.name]) ? formData[f.name] : []}
        onChange={handleChange}
        className="w-full border rounded p-2"
      >
        {nameToFieldOptions[f.name]?.map(opt => (
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
    ) : /* fallback to text/email/url/phone input */ f.name !== "phoneCountryCode" ? (
      <input
        type={
          f.type === "email" ? "email" :
          f.type === "url"   ? "url"   :
          f.type === "phone" ? "tel"   :
          "text"
        }
        name={f.name}
        value={formData[f.name] || ""}
        onChange={handleChange}
        className="w-full border rounded p-2"
      />
    ) : null}

    {errors[f.name] && (
      <p className="text-red-500 text-sm mt-1">{errors[f.name]}</p>
    )}
  </div>
))}


      <div className="flex justify-between">
        {currentStep > 0 ? (
          <button
            type="button"
            onClick={() => setCurrentStep(s => s - 1)}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            ← Previous
          </button>
        ) : <div />}

        {currentStep < totalSteps - 1 ? (
          <button
            type="button"
            onClick={() => validateStep(currentStep) && setCurrentStep(s => s + 1)}
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

