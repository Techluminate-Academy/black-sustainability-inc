// pages/form-versions.tsx
"use client";

import useSWR from "swr";
import Link from "next/link";

interface FormVersion {
  _id: string;
  version: number;
  updatedAt: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function FormVersionsPage() {
  const { data, error } = useSWR<FormVersion[]>("/api/form-versions", fetcher);

  if (error) return <p className="p-8 text-red-600">Failed to load versions.</p>;
  if (!data)  return <p className="p-8">Loading versions…</p>;

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Form Versions</h1>
      <ul className="space-y-4">
        {data.map((v) => (
          <li
            key={v._id}
            className="flex items-center justify-between p-4 border rounded hover:shadow"
          >
            <div>
              <strong className="text-lg">v{v.version}</strong>{" "}
              <span className="text-gray-500">
                ({new Date(v.updatedAt).toLocaleString()})
              </span>
            </div>
            {/* ← change here: use the dynamic segment, not a query string */}
            <Link href={`/schema-editor/${v.version}`}>Load</Link>

          </li>
        ))}
      </ul>
    </div>
  );
}
