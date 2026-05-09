"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "react-hot-toast";

// Dropdown options from BSN form
const IDENTIFICATION_OPTIONS = [
  "African/Afrikan",
  "African-American/Black",
  "Afro-diasporic (Afro-Caribbean, Afro-Cubano, Black/African-American, Afro-Brazilian, etc.)",
  "Black/African-American",
  "Black/Afro-Diasporic",
  "Of African Descent (Afro-Caribbean, Afro-Cuban, Afro-Colombian, etc.)"
];

const GENDER_OPTIONS = [
  "Female",
  "Male",
  "Non-Binary",
  "Prefer not to say"
];

const PRIMARY_INDUSTRY_OPTIONS = [
  "☀️ Alternative Energy",
  "🌾 Agriculture/Sustainable Food Production / Land Management",
  "🏘 Community Development",
  "🛖 Eco-friendly Building",
  "💰 Alternative Economics",
  "🧑🏾‍🏫 Education & Cultural Preservation",
  "Environmental Justice/Advocacy",
  "♻️ Green Lifestyle",
  "🆘 Survival/Preparedness",
  "🗑 Waste",
  "💧Water",
  "🧘🏿‍♀️ Wholistic Health"
];

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming", "Washington D.C.",
  "Puerto Rico", "U.S. Virgin Islands", "Guam"
];

const CANADIAN_PROVINCES = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
  "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan",
  "Yukon"
];

const STATE_PROVINCE_OPTIONS = [...US_STATES, ...CANADIAN_PROVINCES].sort();

const MEMBER_LEVEL_OPTIONS = [
  "Member",
  "Core Member",
  "Impact Member",
  "Legacy Member",
  "Featured Member",
  "Free Member"
];

const YES_NO_OPTIONS = ["Yes", "No", "TRUE", "FALSE", "true", "false"];

interface RowData {
  email: string;
  email2: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  website: string;
  bio: string;
  identification: string;
  gender: string;
  phoneUS: string;
  phoneNonUS: string;
  primaryIndustry: string;
  additionalFocus: string;
  naicsCode: string;
  affiliatedEntity: string;
  address: string;
  nearestCity: string;
  country: string;
  stateProvince: string;
  state: string;
  zipCode: string;
  timezone: string;
  includeOnMap: string;
  latitude: string;
  longitude: string;
  memberLevel: string;
  payingMember: string;
  equityMember: string;
  membershipNotes: string;
  sendPaymentEmail: string;
}

const initialRow: RowData = {
  email: "",
  email2: "",
  firstName: "",
  lastName: "",
  organizationName: "",
  website: "",
  bio: "",
  identification: "",
  gender: "",
  phoneUS: "",
  phoneNonUS: "",
  primaryIndustry: "",
  additionalFocus: "",
  naicsCode: "",
  affiliatedEntity: "",
  address: "",
  nearestCity: "",
  country: "",
  stateProvince: "",
  state: "",
  zipCode: "",
  timezone: "",
  includeOnMap: "",
  latitude: "",
  longitude: "",
  memberLevel: "",
  payingMember: "",
  equityMember: "",
  membershipNotes: "",
  sendPaymentEmail: ""
};

const COLUMNS = [
  { key: "email", label: "EMAIL ADDRESS", required: true, type: "email" },
  { key: "email2", label: "Email 2", required: false, type: "email" },
  { key: "firstName", label: "FIRST NAME", required: true, type: "text" },
  { key: "lastName", label: "LAST NAME", required: true, type: "text" },
  { key: "organizationName", label: "ORGANIZATION NAME", required: false, type: "text" },
  { key: "website", label: "WEBSITE", required: false, type: "url" },
  { key: "bio", label: "BIO", required: true, type: "textarea" },
  { key: "identification", label: "IDENTIFICATION", required: true, type: "select", options: IDENTIFICATION_OPTIONS },
  { key: "gender", label: "GENDER", required: true, type: "select", options: GENDER_OPTIONS },
  { key: "phoneUS", label: "PHONE US/CAN ONLY", required: false, type: "tel" },
  { key: "phoneNonUS", label: "PHONE NON-US/CAN", required: false, type: "tel" },
  { key: "primaryIndustry", label: "PRIMARY INDUSTRY HOUSE", required: true, type: "select", options: PRIMARY_INDUSTRY_OPTIONS },
  { key: "additionalFocus", label: "ADDITIONAL FOCUS AREAS", required: false, type: "select", options: PRIMARY_INDUSTRY_OPTIONS, multi: true },
  { key: "naicsCode", label: "NAICS Code", required: false, type: "text" },
  { key: "affiliatedEntity", label: "AFFILIATED ENTITY", required: false, type: "text" },
  { key: "address", label: "Address", required: true, type: "text" },
  { key: "nearestCity", label: "Location (Nearest City)", required: true, type: "text" },
  { key: "country", label: "Country", required: false, type: "text" },
  { key: "stateProvince", label: "State/Province", required: false, type: "select", options: STATE_PROVINCE_OPTIONS },
  { key: "state", label: "State", required: false, type: "select", options: STATE_PROVINCE_OPTIONS },
  { key: "zipCode", label: "Zip/Postal Code", required: false, type: "text" },
  { key: "timezone", label: "Time zone", required: false, type: "text" },
  { key: "includeOnMap", label: "Include me on Global BSN Map", required: false, type: "select", options: YES_NO_OPTIONS },
  { key: "latitude", label: "LATITUDE (NEW)", required: false, type: "number" },
  { key: "longitude", label: "LONGITUDE (NEW)", required: false, type: "number" },
  { key: "memberLevel", label: "MEMBER LEVEL", required: false, type: "select", options: MEMBER_LEVEL_OPTIONS },
  { key: "payingMember", label: "Paying Member (keep current)", required: false, type: "select", options: YES_NO_OPTIONS },
  { key: "equityMember", label: "Equity Member (keep current)", required: false, type: "select", options: YES_NO_OPTIONS },
  { key: "membershipNotes", label: "Membership Status Notes", required: false, type: "textarea" },
  { key: "sendPaymentEmail", label: "Send Need Payment Email", required: false, type: "select", options: YES_NO_OPTIONS }
];

export default function BatchUploadPage() {
  const [rows, setRows] = useState<RowData[]>([{ ...initialRow }]);
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const addRow = () => {
    setRows([...rows, { ...initialRow }]);
  };

  const removeRow = (index: number) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const updateCell = (rowIndex: number, key: keyof RowData, value: string) => {
    const newRows = [...rows];
    newRows[rowIndex] = { ...newRows[rowIndex], [key]: value };
    setRows(newRows);
  };

  const exportToCSV = () => {
    const headers = COLUMNS.map(col => col.label).join(",");
    const csvRows = rows.map(row => 
      COLUMNS.map(col => {
        const value = row[col.key as keyof RowData];
        // Escape commas and quotes in CSV
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || "";
      }).join(",")
    );
    
    const csv = [headers, ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bsn-batch-upload-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("CSV exported successfully!");
  };

  const validateRow = (row: RowData): string[] => {
    const errors: string[] = [];
    COLUMNS.forEach(col => {
      if (col.required && !row[col.key as keyof RowData]) {
        errors.push(`${col.label} is required`);
      }
    });
    return errors;
  };

  const handleSubmit = async () => {
    const allErrors: { row: number; errors: string[] }[] = [];
    
    rows.forEach((row, index) => {
      const errors = validateRow(row);
      if (errors.length > 0) {
        allErrors.push({ row: index + 1, errors });
      }
    });

    if (allErrors.length > 0) {
      toast.error(`Please fix errors in ${allErrors.length} row(s)`);
      allErrors.forEach(({ row, errors }) => {
        console.error(`Row ${row}:`, errors);
      });
      return;
    }

    // Submit to API
    try {
      toast.loading(`Submitting ${rows.length} member(s)...`);
      const response = await fetch('/api/admin/batch-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rows }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      toast.dismiss();
      toast.success(
        `Successfully processed ${data.results.successful} member(s)! ${data.results.failed > 0 ? `${data.results.failed} failed.` : ''}`
      );

      // Show detailed results
      if (data.results.details.errors.length > 0) {
        console.error('Errors:', data.results.details.errors);
        data.results.details.errors.forEach((err: any) => {
          toast.error(`Row ${err.row}: ${err.error}`, { duration: 5000 });
        });
      }

      // Optionally clear or reset the form
      // setRows([{ ...initialRow }]);
    } catch (error: any) {
      toast.dismiss();
      toast.error(`Submission failed: ${error.message}`);
      console.error('Submission error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              BSN Batch Upload Template
            </h1>
            <p className="text-gray-600">
              Fill out member information below. Use dropdowns where provided. For multiple ADDITIONAL FOCUS AREAS, separate with commas.
            </p>
          </div>

          <div className="mb-4 flex gap-2">
            <button
              onClick={addRow}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Add Row
            </button>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Export to CSV
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Submit All
            </button>
          </div>

          <div 
            ref={tableRef}
            className="overflow-x-auto border border-gray-300 rounded-lg"
            style={{ maxHeight: "70vh", overflowY: "auto" }}
          >
            <table className="min-w-full border-collapse">
              <thead className="bg-blue-900 text-white sticky top-0 z-10">
                <tr>
                  <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-center w-16">
                    #
                  </th>
                  {COLUMNS.map((col, colIndex) => (
                    <th
                      key={col.key}
                      className="border border-gray-300 px-2 py-2 text-xs font-bold text-center whitespace-nowrap min-w-[120px]"
                      style={{ width: col.type === "textarea" ? "200px" : "150px" }}
                    >
                      {col.label}
                      {col.required && <span className="text-red-300 ml-1">*</span>}
                    </th>
                  ))}
                  <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-center w-16">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-1 text-center bg-gray-100 font-semibold">
                      {rowIndex + 1}
                    </td>
                    {COLUMNS.map((col, colIndex) => {
                      const cellKey = col.key as keyof RowData;
                      const value = row[cellKey];
                      const isActive = activeCell?.row === rowIndex && activeCell?.col === colIndex;

                      return (
                        <td
                          key={col.key}
                          className="border border-gray-300 px-1 py-1"
                          onClick={() => setActiveCell({ row: rowIndex, col: colIndex })}
                        >
                          {col.type === "select" ? (
                            <select
                              value={value}
                              onChange={(e) => updateCell(rowIndex, cellKey, e.target.value)}
                              className="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
                              style={{ minWidth: "100%" }}
                            >
                              <option value="">Select...</option>
                              {col.options?.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : col.type === "textarea" ? (
                            <textarea
                              value={value}
                              onChange={(e) => updateCell(rowIndex, cellKey, e.target.value)}
                              className="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded resize-none"
                              rows={2}
                              style={{ minWidth: "100%" }}
                            />
                          ) : (
                            <input
                              type={col.type}
                              value={value}
                              onChange={(e) => updateCell(rowIndex, cellKey, e.target.value)}
                              className="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
                              style={{ minWidth: "100%" }}
                              placeholder={col.required ? "Required" : ""}
                            />
                          )}
                        </td>
                      );
                    })}
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      {rows.length > 1 && (
                        <button
                          onClick={() => removeRow(rowIndex)}
                          className="text-red-600 hover:text-red-800 font-bold"
                          title="Remove row"
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p><strong>Instructions:</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Required fields are marked with <span className="text-red-600">*</span></li>
              <li>Use dropdowns for IDENTIFICATION, GENDER, PRIMARY INDUSTRY HOUSE, State/Province, and MEMBER LEVEL</li>
              <li>For ADDITIONAL FOCUS AREAS, you can select multiple values (they will be comma-separated)</li>
              <li>Click "Export to CSV" to download your data</li>
              <li>Click "Submit All" to validate and submit all rows</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
