"use client";

import React, { useState, useMemo, ChangeEvent } from "react";
import { withTheme, IChangeEvent } from "@rjsf/core";
import type { JSONSchema7 } from "json-schema";
import Validator from "@rjsf/validator-ajv8";
import Bootstrap4Theme from "@rjsf/bootstrap-4";

import type { FieldDef } from "../pages/schema-editor/[version]";

const Form = withTheme(Bootstrap4Theme as any);

type Step = {
  title: string;
  fieldKeys: string[];
};

interface Props {
  initialFields: FieldDef[];
  onSave: (fullSchema: JSONSchema7) => void;
}

export default function FormSchemaEditor({
  initialFields,
  onSave,
}: Props) {
  // Editor fields
  const [fields, setFields] = useState<FieldDef[]>(initialFields);
  // Preview data
  const [formData, setFormData] = useState<Record<string, any>>({});
  // Active step index
  const [activeStep, setActiveStep] = useState(0);
  // Collapse/expand all editors
  const [openAll, setOpenAll] = useState(true);

  // Build the full schema
  const fullSchema = useMemo<JSONSchema7>(
    () => ({
      type: "object",
      required: fields.filter((f) => f.required).map((f) => f.key),
      properties: fields.reduce((acc, f) => {
        const p: any = { title: f.label };
        switch (f.type) {
          case "string":
            p.type = "string";
            break;
          case "textarea":
            p.type = "string";
            p.widget = "textarea";
            break;
          case "number":
            p.type = "number";
            break;
          case "boolean":
            p.type = "boolean";
            break;
          case "select":
            p.type = "string";
            p.enum = (f.options || []).map((o) => o.value);
            break;
          case "file":
            p.type = "string";
            p.format = "data-url";
            break;
        }
        acc[f.key] = p;
        return acc;
      }, {} as Record<string, any>),
    }),
    [fields]
  );

  // Build full uiSchema
  const fullUiSchema = useMemo(
    () =>
      fields.reduce((u, f) => {
        if (f.type === "textarea") {
          u[f.key] = { "ui:widget": "textarea" };
        }
        return u;
      }, {} as Record<string, any>),
    [fields]
  );

  // Split into 3 equal steps
  const steps: Step[] = useMemo(() => {
    const per = Math.ceil(fields.length / 3);
    return [
      { title: "Step 1", fieldKeys: fields.slice(0, per).map((f) => f.key) },
      {
        title: "Step 2",
        fieldKeys: fields.slice(per, per * 2).map((f) => f.key),
      },
      { title: "Step 3", fieldKeys: fields.slice(per * 2).map((f) => f.key) },
    ];
  }, [fields]);

  // Derive schema for only the active step
  const stepSchema = useMemo<JSONSchema7>(() => {
    const chosen = steps[activeStep].fieldKeys
      .map((k) => fields.find((f) => f.key === k))
      .filter(Boolean) as FieldDef[];
    return {
      type: "object",
      required: chosen.filter((f) => f.required).map((f) => f.key),
      properties: chosen.reduce((acc, f) => {
        acc[f.key] = fullSchema.properties![f.key];
        return acc;
      }, {} as Record<string, any>),
    };
  }, [activeStep, steps, fields, fullSchema.properties]);

  // Derive uiSchema for only the active step
  const stepUiSchema = useMemo(() => {
    return steps[activeStep].fieldKeys.reduce((u, key) => {
      if (fullUiSchema[key]) u[key] = fullUiSchema[key];
      return u;
    }, {} as Record<string, any>);
  }, [activeStep, steps, fullUiSchema]);

  // Simple array‐move for CRUD
  const arrayMove = <T,>(arr: T[], from: number, to: number): T[] => {
    const copy = [...arr];
    const [m] = copy.splice(from, 1);
    copy.splice(to, 0, m);
    return copy;
  };

  // CRUD operations
  const addField = () =>
    setFields((fs) => [
      ...fs,
      {
        key: `field${fs.length + 1}`,
        label: "New Field",
        type: "string",
        required: false,
        options: [],
      },
    ]);
  const updateField = (i: number, upd: Partial<FieldDef>) =>
    setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...upd } : f)));
  const removeField = (i: number) =>
    setFields((fs) => fs.filter((_, j) => j !== i));
  const moveField = (i: number, dir: -1 | 1) =>
    setFields((fs) => arrayMove(fs, i, i + dir));

  // Editor input handlers
  const onLabelChange = (i: number, e: ChangeEvent<HTMLInputElement>) =>
    updateField(i, { label: e.target.value });
  const onKeyChange = (i: number, e: ChangeEvent<HTMLInputElement>) =>
    updateField(i, { key: e.target.value });
  const onTypeChange = (i: number, e: ChangeEvent<HTMLSelectElement>) =>
    updateField(i, {
      type: e.target.value as FieldDef["type"],
      options: e.target.value === "select" ? [{ label: "", value: "" }] : [],
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
          const [label, value] = pair.split("|").map((s) => s.trim());
          return { label, value: value || label };
        }),
    });

  return (
    <div className="container-fluid py-4">
      <div className="row gx-4">
        {/* ── LEFT: Schema Editor ── */}
        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Edit Schema</h5>
              <div>
                <button
                  className="btn btn-sm btn-outline-secondary me-2"
                  onClick={() => setOpenAll((o) => !o)}
                >
                  {openAll ? "Collapse All" : "Expand All"}
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={addField}
                >
                  ➕ Add Field
                </button>
              </div>
            </div>
            <div className="card-body">
              {fields.map((f, i) => (
                <div key={i} className="border rounded mb-3">
                  <div className="p-2 bg-light">
                    <strong>
                      {i + 1}. {f.label || "(no label)"}
                    </strong>
                  </div>
                  {openAll && (
                    <div className="p-3">
                      <div className="mb-2">
                        <label className="form-label small">Label</label>
                        <input
                          className="form-control form-control-sm"
                          value={f.label}
                          onChange={(e) => onLabelChange(i, e)}
                        />
                      </div>
                      <div className="mb-2">
                        <label className="form-label small">Key</label>
                        <input
                          className="form-control form-control-sm"
                          value={f.key}
                          onChange={(e) => onKeyChange(i, e)}
                        />
                      </div>
                      <div className="mb-2">
                        <label className="form-label small">Type</label>
                        <select
                          className="form-select form-select-sm"
                          value={f.type}
                          onChange={(e) => onTypeChange(i, e)}
                        >
                          {[
                            "string",
                            "textarea",
                            "number",
                            "boolean",
                            "select",
                            "file",
                          ].map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-check form-switch mb-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={f.required}
                          onChange={(e) => onRequiredChange(i, e)}
                        />
                        <label className="form-check-label small">
                          Required
                        </label>
                      </div>
                      {f.type === "select" && (
                        <div className="mb-2">
                          <label className="form-label small">
                            Options <small>(label|value,…)</small>
                          </label>
                          <input
                            className="form-control form-control-sm"
                            value={(f.options || [])
                              .map((o) => `${o.label}|${o.value}`)
                              .join(", ")}
                            onChange={(e) => onOptionsChange(i, e)}
                          />
                        </div>
                      )}
                      <div className="d-flex justify-content-end gap-2 mt-3">
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => removeField(i)}
                        >
                          🗑️
                        </button>
                        {i > 0 && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => moveField(i, -1)}
                          >
                            ⬆️
                          </button>
                        )}
                        {i < fields.length - 1 && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => moveField(i, +1)}
                          >
                            ⬇️
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Step Navigation & Live Preview ── */}
        <div className="col-md-6">
          <div className="mb-3 d-flex gap-2">
            {steps.map((st, idx) => (
              <button
                key={idx}
                className={`btn btn-sm ${
                  idx === activeStep ? "btn-primary" : "btn-outline-primary"
                }`}
                onClick={() => setActiveStep(idx)}
              >
                {st.title}
              </button>
            ))}
          </div>
          <div
            className="card mb-3"
            style={{ maxHeight: "65vh", overflowY: "auto" }}
          >
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
                onChange={(e: IChangeEvent<Record<string, any>>) =>
                  setFormData(e.formData ?? {})
                }
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
                <button
                  className="btn btn-primary"
                  onClick={() => setActiveStep((s) => s + 1)}
                >
                  Next →
                </button>
              ) : (
                <button
                  className="btn btn-success"
                  onClick={() => onSave(fullSchema)}
                >
                  Save All
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
