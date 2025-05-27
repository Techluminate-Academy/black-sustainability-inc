"use client";

import useSWR from "swr";
import Link from "next/link";

interface FormVersion {
  _id: string;
  version: number;
  updatedAt: string;
  status: "draft" | "published";
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function FormVersionsPage() {
  const { data, error } = useSWR<FormVersion[]>(
    "/api/form-versions?all=true",
    fetcher
  );

  if (error)
    return <p className="p-8 text-red-600 text-center">Failed to load versions.</p>;
  if (!data) return <p className="p-8 text-center">Loading versions…</p>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-8 text-center">Form Versions</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((v) => {
          const isLive = v.status === "published";
          return (
            <div
              key={v._id}
              className={`relative flex flex-col justify-between p-6 border rounded-xl bg-white hover:shadow-lg transition-shadow`}
            >
              {isLive && (
                <span className="absolute top-4 right-4 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                  LIVE
                </span>
              )}

              <div>
                <h2 className="text-2xl font-semibold mb-2">v{v.version}</h2>
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
              </div>

              <Link href={`/schema-editor/${v.version}`}>
                <p className="mt-4 inline-block self-start bg-blue-600 text-white font-medium px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                  Load
                </p>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
