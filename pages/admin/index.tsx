"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import useSWR from "swr";

interface AdminUser {
  _id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  isActive: boolean;
}

interface FormVersion {
  _id: string;
  version: number;
  name?: string;
  updatedAt: string;
  status: "draft" | "published";
  master?: boolean;
  masterVersion?: number;
}

interface AddAdminForm {
  email: string;
  name: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFormVersions, setShowFormVersions] = useState(true);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [addAdminForm, setAddAdminForm] = useState<AddAdminForm>({ email: '', name: '' });
  const [activeSection, setActiveSection] = useState('dashboard');

  // Check if admin is already logged in
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      // Verify token and set logged in state
      verifyToken(token);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/admin/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAdminUser(data.admin);
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem('adminToken');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('adminToken');
    }
  };

  const handleAddAdminInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddAdminForm({
      ...addAdminForm,
      [e.target.name]: e.target.value
    });
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addAdminForm),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Admin user added successfully!');
        setAddAdminForm({ email: '', name: '' });
        setShowAddAdmin(false);
        // Refresh admin users list
        mutate();
      } else {
        setError(data.error || 'Failed to add admin user');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/users/${userId}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        setSuccess(`Admin user ${isActive ? 'deactivated' : 'activated'} successfully!`);
        // Refresh admin users list
        mutate();
      } else {
        setError('Failed to update admin user');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  // SWR for form versions data
  const { data: formVersions, error: formVersionsError } = useSWR<FormVersion[]>(
    isLoggedIn && showFormVersions ? "/api/form-versions?all=true" : null,
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

  // SWR for admin users data
  const { data: adminUsers, error: adminUsersError, mutate } = useSWR<AdminUser[]>(
    isLoggedIn ? "/api/admin/users" : null,
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
      const data = await response.json();
      return data.admins || [];
    }
  );

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Admin Portal
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access admin features
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <p className="text-center text-gray-600">
              Please log in to access this page.
            </p>
            <div className="mt-4">
              <button
                onClick={() => router.push('/admin/login')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderAdminUsersSection = () => (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}


    </>
  );

  const renderAnalyticsSection = () => (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Google Analytics Integration</h3>
          <p className="text-gray-500 mb-6">
            View traffic sources, user behavior, and website performance metrics.
          </p>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Traffic Sources</h4>
              <p className="text-sm text-gray-600 mb-3">Analyze where your visitors are coming from</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-white p-3 rounded border">
                  <div className="text-2xl font-bold text-blue-600">Direct</div>
                  <div className="text-sm text-gray-500">Coming Soon</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-2xl font-bold text-green-600">Organic</div>
                  <div className="text-sm text-gray-500">Coming Soon</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-2xl font-bold text-purple-600">Social</div>
                  <div className="text-sm text-gray-500">Coming Soon</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">User Behavior</h4>
              <p className="text-sm text-gray-600 mb-3">Understand how users interact with your site</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                <div className="bg-white p-3 rounded border">
                  <div className="text-2xl font-bold text-orange-600">Page Views</div>
                  <div className="text-sm text-gray-500">Coming Soon</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-2xl font-bold text-red-600">Bounce Rate</div>
                  <div className="text-sm text-gray-500">Coming Soon</div>
                </div>
              </div>
            </div>
            <div className="text-center">
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Connect Google Analytics
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDashboardSection = () => (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}
      
      {/* Form Versions Section */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Form Versions
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Manage and edit form versions
            </p>
          </div>

          {showFormVersions && (
            <div className="mt-4">
              {formVersionsError ? (
                <p className="text-red-600 text-center">Failed to load form versions.</p>
              ) : !formVersions ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading form versions...</span>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {formVersions
                    .filter(form => form.master || (form.name && !form.name.match(/^Form \d+$/)))
                    .map((v) => {
                      const isLive = v.status === "published";
                      const isMaster = v.master;
                      const isCopy = !v.master && v.masterVersion;
                      
                      return (
                        <div
                          key={v._id}
                          className={`relative p-4 border rounded-lg bg-white hover:shadow-md transition-shadow flex flex-col ${
                            isMaster ? 'border-purple-200 bg-purple-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="absolute top-2 right-2 flex flex-col gap-1">
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

                          <div className="pr-16 flex-1 flex flex-col">
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold mb-1">
                                {v.name}
                                <span className="text-sm font-normal text-gray-500 ml-2">
                                  v{v.version}
                                </span>
                              </h4>
                              <p className="text-gray-500 text-sm mb-2">
                                Updated {new Date(v.updatedAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                              {isCopy && v.masterVersion && (
                                <p className="text-xs text-gray-500 mb-3">
                                  Based on Master v{v.masterVersion}
                                </p>
                              )}
                            </div>
                            
                            <button 
                              onClick={() => {
                                setActiveSection('schema-editor');
                                router.push(`/schema-editor/${v.version}`);
                              }}
                              className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors mt-auto ${
                                isMaster 
                                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}>
                              Edit Schema
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Section */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            System Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Forms</p>
                  <p className="text-2xl font-semibold text-gray-900">{formVersions?.length || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-600 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Analytics</p>
                  <p className="text-2xl font-semibold text-gray-900">Coming Soon</p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-600 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Forms</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formVersions?.filter(f => f.status === "published").length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Coming Soon Section */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Analytics Dashboard
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                View detailed analytics and insights
              </p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              Coming Soon
            </span>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Analytics Dashboard</p>
                <p className="text-sm text-gray-500">Form submissions, user engagement, and performance metrics will be available here.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Users Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Admin Users
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Manage admin user accounts and permissions
              </p>
            </div>
            <button
              onClick={() => setShowAddAdmin(!showAddAdmin)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              {showAddAdmin ? 'Cancel' : 'Add Admin User'}
            </button>
          </div>

          {showAddAdmin && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-md font-medium text-gray-900 mb-3">Add New Admin User</h4>
              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="adminName" className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      id="adminName"
                      name="name"
                      required
                      value={addAdminForm.name}
                      onChange={handleAddAdminInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      id="adminEmail"
                      name="email"
                      required
                      value={addAdminForm.email}
                      onChange={handleAddAdminInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Admin User'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {adminUsersError ? (
            <p className="text-red-600 text-center">Failed to load admin users.</p>
          ) : !adminUsers || !Array.isArray(adminUsers) ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading admin users...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {adminUsers.map((user) => (
                <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => handleToggleAdmin(user._id, user.isActive)}
                      className={`px-3 py-1 text-xs font-medium rounded-md ${
                        user.isActive
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <AdminLayout currentSection={activeSection}>
      {activeSection === 'dashboard' && renderDashboardSection()}
      {activeSection === 'admin-users' && renderAdminUsersSection()}
      {activeSection === 'analytics' && renderAnalyticsSection()}
    </AdminLayout>
  );
} 