"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState, useEffect } from "react";
import ConfirmationModal from "@/components/common/ConfirmationModal";
import { useRouter } from "next/router";

interface FormVersion {
  _id: string;
  version: number;
  name?: string;
  updatedAt: string;
  status: "draft" | "published";
  master?: boolean;
  masterVersion?: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  isActive: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function FormVersionsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check admin status on component mount
  useEffect(() => {
    const checkAdminStatus = async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/admin/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setAdminUser(data.admin);
          setIsAdmin(true);
        } else {
          localStorage.removeItem('adminToken');
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        localStorage.removeItem('adminToken');
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  const { data, error, mutate } = useSWR<FormVersion[]>(
    isAdmin ? "/api/form-versions?all=true" : null,
    async (url: string) => {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      return response.json();
    }
  );

  const [deleteVersion, setDeleteVersion] = useState<FormVersion | null>(null);

  const handleDelete = async () => {
    if (!deleteVersion) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/form-versions/${deleteVersion.version}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAdmin(false);
    setAdminUser(null);
    router.push('/admin/dashboard');
  };

  // Show loading state while checking admin status
  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking access...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold mb-4 text-red-600">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the Form Versions system.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Please log in to the admin portal to access this page.
          </p>
          <Link 
            href="/admin/dashboard"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Go to Admin Portal
          </Link>
        </div>
      </div>
    );
  }

  if (error)
    return <p className="p-8 text-red-600 text-center">Failed to load versions.</p>;
  if (!data) return <p className="p-8 text-center">Loading versions…</p>;

  // A form is valid if it's a master or has a name that isn't the default "Form X"
  const namedForms = data.filter(form => form.master || (form.name && !form.name.match(/^Form \d+$/)));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link 
            href="/admin/dashboard"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-2"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Admin Portal
          </Link>
          <h1 className="text-3xl font-extrabold">Form Versions</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Admin: {adminUser?.name} ({adminUser?.email})
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>

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
