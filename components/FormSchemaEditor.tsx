// components/FormSchemaEditor.tsx
"use client";

import React, { useState, useMemo, ChangeEvent, useEffect } from "react";
import { withTheme, IChangeEvent } from "@rjsf/core";
import type { JSONSchema7 } from "json-schema";
import Validator from "@rjsf/validator-ajv8";
import Bootstrap4Theme from "@rjsf/bootstrap-4";

import type { FieldDef } from "@/types/schema-editor";
import type { FieldType } from "@/models/field";

const Form = withTheme(Bootstrap4Theme as any);

// user-friendly labels for field types
const TYPE_OPTIONS: Array<{ value: FieldType; label: string }> = [
  { value: "text",     label: "Text"        },
  { value: "textarea", label: "Textarea"    },
  { value: "email",    label: "Email"       },
  { value: "dropdown", label: "Dropdown"    },
  { value: "checkbox", label: "Checkbox"    },
  { value: "file",     label: "File Upload" },
  { value: "phone",    label: "Phone"       },
  { value: "address",  label: "Address"     }
];

type Step = {
  title: string;
  fieldNames: string[];
};

interface Props {
  initialFields: FieldDef[];
  version: number;
}

export default function FormSchemaEditor({ initialFields, version }: Props) {
  const [fields, setFields] = useState<FieldDef[]>(initialFields);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // group by `step` property (1-3)
  const steps: Step[] = useMemo(() => {
    const byStep: Record<number, string[]> = {};
    fields.forEach((f) => {
      const s = f.step ?? 1;
      if (!byStep[s]) byStep[s] = [];
      byStep[s].push(f.name);
    });
    return [1, 2, 3].map((n) => ({
      title: `Step ${n}`,
      fieldNames: byStep[n] || [],
    }));
  }, [fields]);

  // collapse state
  const [openAll, setOpenAll] = useState(true);
  const [openSteps, setOpenSteps] = useState(() => steps.map(() => true));

  // keep openSteps in sync if `steps` length changes
  useEffect(() => {
    setOpenSteps(steps.map(() => openAll));
  }, [steps, openAll]);

  const toggleOpenAll = () => {
    const next = !openAll;
    setOpenAll(next);
    setOpenSteps(steps.map(() => next));
  };
  const toggleStep = (i: number) =>
    setOpenSteps((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  // full JSON Schema for preview
  const fullSchema = useMemo<JSONSchema7>(
    () => ({
      type: "object",
      required: fields.filter((f) => f.required).map((f) => f.name),
      properties: fields.reduce((acc, f) => {
        const p: any = { title: f.label };
        switch (f.type) {
          case "text":
          case "email":
          case "url":
          case "phone":
            p.type = "string";
            break;
          case "textarea":
            p.type = "string";
            p.widget = "textarea";
            break;
          case "dropdown":
            p.type = "string";
            p.enum = f.options.map((o) => o.value);
            break;
          case "checkbox":
            p.type = "boolean";
            break;
          case "file":
            p.type = "string";
            p.format = "data-url";
            break;
          case "address":
            p.type = "string";
            break;
        }
        acc[f.name] = p;
        return acc;
      }, {} as Record<string, any>),
    }),
    [fields]
  );

  const fullUiSchema = useMemo(
    () =>
      fields.reduce((ui, f) => {
        if (f.type === "textarea") ui[f.name] = { "ui:widget": "textarea" };
        return ui;
      }, {} as Record<string, any>),
    [fields]
  );

  // per-step schema/ui
  const stepSchema = useMemo<JSONSchema7>(() => {
    const chosen = steps[activeStep].fieldNames
      .map((name) => fields.find((f) => f.name === name))
      .filter(Boolean) as FieldDef[];
    return {
      type: "object",
      required: chosen.filter((f) => f.required).map((f) => f.name),
      properties: chosen.reduce((acc, f) => {
        acc[f.name] = fullSchema.properties![f.name];
        return acc;
      }, {} as Record<string, any>),
    };
  }, [activeStep, steps, fields, fullSchema.properties]);

  const stepUiSchema = useMemo(() => {
    return steps[activeStep].fieldNames.reduce((ui, name) => {
      if (fullUiSchema[name]) ui[name] = fullUiSchema[name];
      return ui;
    }, {} as Record<string, any>);
  }, [activeStep, steps, fullUiSchema]);

  // helpers
  const arrayMove = <T,>(arr: T[], from: number, to: number) => {
    const copy = [...arr];
    const [m] = copy.splice(from, 1);
    copy.splice(to, 0, m);
    return copy;
  };

  const addField = () => {
    const newId = `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setFields((fs) => [
      ...fs,
      { 
        id: newId,
        name: `field${fs.length + 1}`,
        label: "New Field",
        type: "text",
        required: false,
        options: [],
        step: 1,
        description: "",
        placeholder: ""
      },
    ]);
  };

  const updateField = (i: number, upd: Partial<FieldDef>) =>
    setFields((fs) => fs.map((f, idx) => (idx === i ? { ...f, ...upd } : f)));
  const removeField = (i: number) => setFields((fs) => fs.filter((_, idx) => idx !== i));
  const moveField = (i: number, dir: -1 | 1) =>
    setFields((fs) => arrayMove(fs, i, i + dir));

  // field handlers
  const onLabelChange = (i: number, e: ChangeEvent<HTMLInputElement>) =>
    updateField(i, { label: e.target.value });
  const onNameChange = (i: number, e: ChangeEvent<HTMLInputElement>) =>
    updateField(i, { name: e.target.value });
  const onTypeChange = (i: number, e: ChangeEvent<HTMLSelectElement>) =>
    updateField(i, {
      type: e.target.value as FieldType,
      options: e.target.value === "dropdown" ? [{ label: "", value: "" }] : [],
    });
  const onRequiredChange = (i: number, e: ChangeEvent<HTMLInputElement>) =>
    updateField(i, { required: e.target.checked });
  const onOptionsChange = (i: number, e: ChangeEvent<HTMLInputElement>) =>
    updateField(i, {
      options: e.target.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((pair) => {
          const [label, value] = pair.split("|").map((x) => x.trim());
          return { label, value: value || label };
        }),
    });

  // save draft
  async function saveDraft() {
    setSaving(true);
    try {
      const res = await fetch("/api/form-versions/version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, status: "draft", version }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      alert(`✅ Saved draft version ${json.version}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  // publish live
  async function publish() {
    if (!confirm("Are you sure you want to publish this schema?")) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/form-versions/version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, status: "published", version }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Publish failed");
      alert(`🚀 Published version ${json.version}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="container-fluid py-4">
      <div className="row gx-4">
        {/* LEFT: Editor */}
        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between">
              <h5 className="mb-0">Edit Schema</h5>
              <div>
                <button className="btn btn-sm btn-outline-secondary me-2" onClick={toggleOpenAll}>
                  {openAll ? "Collapse All" : "Expand All"}
                </button>
                <button className="btn btn-sm btn-success me-2" disabled={saving || publishing} onClick={saveDraft}>
                  {saving ? "Saving…" : "Save Draft"}
                </button>
                <button className="btn btn-sm btn-primary me-2" disabled={saving || publishing} onClick={publish}>
                  {publishing ? "Publishing…" : "Publish"}
                </button>
                <button className="btn btn-sm btn-outline-primary" onClick={addField}>
                  Add Field
                </button>
              </div>
            </div>
            <div className="card-body">
              {steps.map((step, si) => (
                <div key={si} className="border rounded mb-3">
                  <div
                    className="p-2 bg-light d-flex justify-content-between"
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleStep(si)}
                  >
                    <strong>{step.title}</strong>
                    <span>{openSteps[si] ? "−" : "+"}</span>
                  </div>
                  {openSteps[si] && (
                    <div className="p-3">
                      {step.fieldNames.map((name) => {
                        const idx = fields.findIndex((f) => f.name === name);
                        const f = fields[idx];
                        return (
                          <div key={name} className="border-bottom mb-3 pb-3">
                            {/* Label */}
                            <div className="mb-2">
                              <label className="form-label small">Label</label>
                              <input
                                className="form-control form-control-sm"
                                value={f.label}
                                onChange={(e) => onLabelChange(idx, e)}
                              />
                            </div>
                            {/* Name */}
                            <div className="mb-2">
                              <label className="form-label small">Name</label>
                              <input
                                className="form-control form-control-sm"
                                value={f.name}
                                onChange={(e) => onNameChange(idx, e)}
                              />
                            </div>
                            {/* Type */}
                            <div className="mb-2">
                              <label className="form-label small">Type</label>
                              <select
                                className="form-select form-select-sm"
                                value={f.type}
                                onChange={(e) => onTypeChange(idx, e)}
                              >
                                {TYPE_OPTIONS.map(({ value, label }) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {/* Required */}
                            <div className="form-check form-switch mb-2">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={f.required}
                                onChange={(e) => onRequiredChange(idx, e)}
                              />
                              <label className="form-check-label small">Required</label>
                            </div>
                            {/* Options for dropdowns */}
                            {f.type === "dropdown" && (
                              <div className="mb-2">
                                <label className="form-label small">
                                  Options <small>(label|value,…)</small>
                                </label>
                                <input
                                  className="form-control form-control-sm"
                                  value={f.options.map((o) => `${o.label}|${o.value}`).join(", ")}
                                  onChange={(e) => onOptionsChange(idx, e)}
                                />
                              </div>
                            )}
                            {/* Step selector */}
                            <div className="mb-2">
                              <label className="form-label small">Step</label>
                              <select
                                className="form-select form-select-sm"
                                value={f.step}
                                onChange={(e) => updateField(idx, { step: Number(e.target.value) })}
                              >
                                {[1, 2, 3].map((n) => (
                                  <option key={n} value={n}>
                                    Step {n}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {/* Actions */}
                            <div className="d-flex justify-content-end gap-2 mt-3">
                              <button className="btn btn-sm btn-danger" onClick={() => removeField(idx)}>
                                🗑️
                              </button>
                              {idx > 0 && (
                                <button className="btn btn-sm btn-secondary" onClick={() => moveField(idx, -1)}>
                                  ⬆️
                                </button>
                              )}
                              {idx < fields.length - 1 && (
                                <button className="btn btn-sm btn-secondary" onClick={() => moveField(idx, 1)}>
                                  ⬇️
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Preview */}
        <div className="col-md-6">
          <div className="mb-3 d-flex gap-2">
            {steps.map((st, i) => (
              <button
                key={i}
                className={`btn btn-sm ${i === activeStep ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setActiveStep(i)}
              >
                {st.title}
              </button>
            ))}
          </div>
          <div className="card mb-3" style={{ maxHeight: "65vh", overflowY: "auto" }}>
            <div className="card-header">
              <h5 className="mb-0">
                {steps[activeStep].title} ({activeStep + 1}/{steps.length})
              </h5>
            </div>
            <div className="card-body rjsf-preview">
              <Form
                schema={stepSchema}
                uiSchema={stepUiSchema}
                formData={formData}
                validator={Validator}
                onChange={(e: IChangeEvent<Record<string, any>>) => setFormData(e.formData || {})}
              />
            </div>
            <div className="card-footer d-flex justify-content-between">
              <button
                className="btn btn-outline-secondary"
                disabled={activeStep === 0}
                onClick={() => setActiveStep((s) => s - 1)}
              >
                ← Previous
              </button>
              {activeStep < steps.length - 1 ? (
                <button className="btn btn-primary" onClick={() => setActiveStep((s) => s + 1)}>
                  Next →
                </button>
              ) : (
                <button className="btn btn-success" disabled={saving} onClick={saveDraft}>
                  {saving ? "Saving…" : "Save Draft"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        :global(.rjsf-preview .form-group) {
          margin-bottom: 1.5rem;
        }
      `}</style>
    </div>
  );
}
