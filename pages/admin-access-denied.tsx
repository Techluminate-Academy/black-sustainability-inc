import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminAccessDenied() {
  const [adminUser, setAdminUser] = useState<any>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        try {
          const response = await fetch('/api/admin/verify', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setAdminUser(data.admin);
          } else {
            localStorage.removeItem('adminToken');
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem('adminToken');
        }
      }
    };

    checkAdminStatus();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access the admin area.
          </p>
          
          {adminUser && (
            <div className="mb-6 p-3 bg-gray-100 rounded-md">
              <p className="text-sm text-gray-700">
                <strong>Logged in as:</strong> {adminUser.name} ({adminUser.email})
              </p>
            </div>
          )}
          
          <p className="text-sm text-gray-500 mb-6">
            Please log in to the admin portal to access the Form Versions and Schema Editor systems.
          </p>
          
          <div className="space-y-3">
            <Link 
              href="/admin/dashboard"
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Admin Portal
            </Link>
            
            <Link 
              href="/"
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 