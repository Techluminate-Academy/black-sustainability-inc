"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

interface PendingBatchUpload {
  _id: string;
  rows: any[];
  submittedAt: string;
  submittedBy?: string;
  status: 'pending' | 'approved' | 'rejected' | 'uploaded';
  uploadedAt?: string;
  uploadedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ReviewBatchUploadsPage() {
  const [uploads, setUploads] = useState<PendingBatchUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUploads, setSelectedUploads] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('pending');

  useEffect(() => {
    fetchUploads();
  }, [filterStatus]);

  const fetchUploads = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/pending-batch-uploads?status=${filterStatus}`);
      const data = await response.json();
      
      if (response.ok) {
        setUploads(data.uploads || []);
      } else {
        toast.error('Failed to load pending uploads');
      }
    } catch (error) {
      toast.error('Error loading pending uploads');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUpload = (uploadId: string) => {
    const newSelected = new Set(selectedUploads);
    if (newSelected.has(uploadId)) {
      newSelected.delete(uploadId);
    } else {
      newSelected.add(uploadId);
    }
    setSelectedUploads(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUploads.size === uploads.length) {
      setSelectedUploads(new Set());
    } else {
      setSelectedUploads(new Set(uploads.map(u => u._id)));
    }
  };

  const handleUpload = async () => {
    if (selectedUploads.size === 0) {
      toast.error('Please select at least one batch upload to upload');
      return;
    }

    try {
      toast.loading(`Uploading ${selectedUploads.size} batch upload(s)...`);
      const response = await fetch('/api/admin/pending-batch-uploads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'upload',
          uploadIds: Array.from(selectedUploads)
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.dismiss();
        toast.success(`Successfully uploaded ${data.results.successful} batch upload(s)!`);
        setSelectedUploads(new Set());
        fetchUploads();
      } else {
        toast.dismiss();
        toast.error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      toast.dismiss();
      toast.error(`Upload failed: ${error.message}`);
    }
  };

  const handleReject = async () => {
    if (selectedUploads.size === 0) {
      toast.error('Please select at least one batch upload to reject');
      return;
    }

    if (!confirm(`Are you sure you want to reject ${selectedUploads.size} batch upload(s)?`)) {
      return;
    }

    try {
      toast.loading(`Rejecting ${selectedUploads.size} batch upload(s)...`);
      const response = await fetch('/api/admin/pending-batch-uploads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reject',
          uploadIds: Array.from(selectedUploads)
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.dismiss();
        toast.success(`Rejected ${selectedUploads.size} batch upload(s)`);
        setSelectedUploads(new Set());
        fetchUploads();
      } else {
        toast.dismiss();
        toast.error(data.error || 'Rejection failed');
      }
    } catch (error: any) {
      toast.dismiss();
      toast.error(`Rejection failed: ${error.message}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading pending uploads...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Review Batch Uploads
            </h1>
            <p className="text-gray-600">
              Review and approve pending batch uploads before they are uploaded to Airtable.
            </p>
          </div>

          <div className="mb-4 flex gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="uploaded">Uploaded</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="flex-1"></div>

            {selectedUploads.size > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleUpload}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Upload Selected ({selectedUploads.size})
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Reject Selected ({selectedUploads.size})
                </button>
              </div>
            )}
          </div>

          {uploads.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No {filterStatus || 'pending'} batch uploads found.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  checked={selectedUploads.size === uploads.length && uploads.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-600">
                  Select All ({uploads.length} total)
                </span>
              </div>

              {uploads.map((upload) => (
                <div
                  key={upload._id}
                  className="border border-gray-300 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedUploads.has(upload._id)}
                      onChange={() => handleSelectUpload(upload._id)}
                      className="mt-1 w-4 h-4 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-semibold text-lg">
                          {upload.rows.length} Member(s)
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          upload.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          upload.status === 'uploaded' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {upload.status.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">
                          Submitted: {formatDate(upload.submittedAt)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600 mb-3">
                        <div>
                          <strong>Emails:</strong> {upload.rows.map((r: any) => r.email).join(', ')}
                        </div>
                        <div>
                          <strong>Submitted By:</strong> {upload.submittedBy || 'Unknown'}
                        </div>
                        {upload.uploadedAt && (
                          <div>
                            <strong>Uploaded:</strong> {formatDate(upload.uploadedAt)}
                          </div>
                        )}
                      </div>

                      <details className="mt-2">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                          View Details ({upload.rows.length} rows)
                        </summary>
                        <div className="mt-3 overflow-x-auto">
                          <table className="min-w-full text-sm border border-gray-300">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="border px-2 py-1 text-left">Email</th>
                                <th className="border px-2 py-1 text-left">Name</th>
                                <th className="border px-2 py-1 text-left">Organization</th>
                                <th className="border px-2 py-1 text-left">Industry</th>
                              </tr>
                            </thead>
                            <tbody>
                              {upload.rows.map((row: any, index: number) => (
                                <tr key={index}>
                                  <td className="border px-2 py-1">{row.email}</td>
                                  <td className="border px-2 py-1">
                                    {row.firstName} {row.lastName}
                                  </td>
                                  <td className="border px-2 py-1">{row.organizationName || '-'}</td>
                                  <td className="border px-2 py-1">{row.primaryIndustry || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
