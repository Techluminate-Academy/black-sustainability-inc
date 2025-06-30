"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import ConfirmationModal from "@/components/common/ConfirmationModal";

interface FormVersion {
  _id: string;
  version: number;
  name?: string;
  updatedAt: string;
  status: "draft" | "published";
  master?: boolean;
  masterVersion?: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function FormVersionsPage() {
  const { data, error, mutate } = useSWR<FormVersion[]>(
    "/api/form-versions?all=true",
    fetcher
  );

  const [deleteVersion, setDeleteVersion] = useState<FormVersion | null>(null);

  const handleDelete = async () => {
    if (!deleteVersion) return;

    try {
      const response = await fetch(`/api/form-versions/${deleteVersion.version}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete version');
      }

      // Show success message (you can add a toast notification here)
      console.log(result.message);
      
      // Refresh the versions list
      mutate();
    } catch (error) {
      console.error('Error deleting version:', error);
      // Show error message (you can add a toast notification here)
    }

    setDeleteVersion(null);
  };

  if (error)
    return <p className="p-8 text-red-600 text-center">Failed to load versions.</p>;
  if (!data) return <p className="p-8 text-center">Loading versions…</p>;

  // A form is valid if it's a master or has a name that isn't the default "Form X"
  const namedForms = data.filter(form => form.master || (form.name && !form.name.match(/^Form \d+$/)));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-8 text-center">Form Versions</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {namedForms.map((v) => {
          const isLive = v.status === "published";
          const isMaster = v.master;
          const isCopy = !v.master && v.masterVersion;
          
          return (
            <div
              key={v._id}
              className={`relative flex flex-col justify-between p-6 border rounded-xl bg-white hover:shadow-lg transition-shadow ${
                isMaster ? 'border-purple-200 bg-purple-50' : ''
              }`}
            >
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                {isLive && (
                  <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                    LIVE
                  </span>
                )}
                {isMaster && (
                  <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded-full">
                    MASTER
                  </span>
                )}
                {isCopy && (
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
                    COPY
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-2">
                  {v.name}
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    v{v.version}
                  </span>
                </h2>
                <p className="text-gray-500 text-sm">
                  Updated{" "}
                  {new Date(v.updatedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {isCopy && v.masterVersion && (
                  <p className="text-xs text-gray-500 mt-1">
                    Based on Master v{v.masterVersion}
                  </p>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <Link href={`/schema-editor/${v.version}`}>
                  <p className={`inline-block font-medium px-4 py-2 rounded-md transition-colors ${
                    isMaster 
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}>
                    Load
                  </p>
                </Link>
                {!isMaster && !isLive && (
                  <button
                    onClick={() => setDeleteVersion(v)}
                    className="font-medium px-4 py-2 rounded-md transition-colors bg-red-100 text-red-700 hover:bg-red-200"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmationModal
        isOpen={!!deleteVersion}
        onClose={() => setDeleteVersion(null)}
        onConfirm={handleDelete}
        title="Delete Form Version"
        message={`Are you sure you want to delete version ${deleteVersion?.version} of "${deleteVersion?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
