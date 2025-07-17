"use client";

import AdminSidebar from '@/components/admin/AdminSidebar';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AdminUser {
  _id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  isActive: boolean;
}

export default function AdminUsersPage() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const fetchAdminUsers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setError('No admin token found. Please login.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAdminUsers(data.admins);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch admin users');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setError('No admin token found. Please login.');
        return;
      }

      const response = await fetch(`/api/admin/users/${userId}/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (response.ok) {
        // Refresh the admin users list
        fetchAdminUsers();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update user status');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-row">
      <AdminSidebar />
      <main className="flex-1">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link href="/admin/dashboard" className="text-blue-600 hover:text-blue-800 mr-4">
                  ← Back to Dashboard
                </Link>
                <h1 className="text-xl font-semibold text-gray-900">Admin Users</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Admin Users ({adminUsers.length})
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Manage admin user accounts and permissions
                </p>
              </div>
              
              {adminUsers.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-gray-500">No admin users found.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {adminUsers.map((user) => (
                    <li key={user._id} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-medium">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                            <div className="text-xs text-gray-400">
                              Created: {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            onClick={() => toggleUserStatus(user._id, user.isActive)}
                            className={`px-3 py-1 text-sm font-medium rounded-md ${
                              user.isActive
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Registration Instructions */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-blue-900 mb-2">
                Register New Admin Users
              </h3>
              <p className="text-blue-700 mb-4">
                To register new admin users, use the API endpoint with Postman:
              </p>
              <div className="bg-blue-100 p-4 rounded-md">
                <p className="text-sm font-mono text-blue-800">
                  POST /api/admin/register
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  Body: {'{'} "email": "user@example.com", "name": "User Name", "registrationToken": "your-token" {'}'}
                </p>
              </div>
              <p className="text-sm text-blue-600 mt-4">
                Make sure to set the ADMIN_REGISTRATION_TOKEN environment variable for security.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 