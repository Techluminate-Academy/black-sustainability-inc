import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';

interface FormVersion {
  _id: string;
  version: number;
  name: string;
  status: 'published' | 'draft' | 'archived';
  master: boolean;
  masterVersion?: number;
  updatedAt: string;
  fields: any[];
  isMultiStep: boolean;
}

const AdminFormVersionsPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formVersions, setFormVersions] = useState<FormVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin');
        return;
      }

      try {
        const response = await fetch('/api/admin/verify', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          setIsAuthenticated(true);
          fetchFormVersions();
        } else {
          localStorage.removeItem('adminToken');
          router.push('/admin');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('adminToken');
        router.push('/admin');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const fetchFormVersions = async () => {
    setIsLoadingVersions(true);
    try {
      const token = localStorage.getItem('adminToken');
      console.log('Fetching form versions with token:', token ? 'present' : 'missing');
      
      const response = await fetch('/api/form-versions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Form versions data:', data);
        // The API returns an array directly, not wrapped in a versions property
        const versions = Array.isArray(data) ? data : [];
        console.log('Setting form versions:', versions);
        setFormVersions(versions);
      } else {
        const errorData = await response.json();
        console.error('API error:', errorData);
      }
    } catch (error) {
      console.error('Failed to fetch form versions:', error);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const loadFormVersion = (version: number) => {
    router.push(`/schema-editor/${version}`);
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      published: 'bg-green-100 text-green-800',
      draft: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-800',
    };
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status as keyof typeof statusColors] || statusColors.draft}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getTypeBadge = (isMaster: boolean) => {
    const typeColors = {
      master: 'bg-purple-100 text-purple-800',
      copy: 'bg-blue-100 text-blue-800',
    };
    
    const type = isMaster ? 'master' : 'copy';
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${typeColors[type]}`}>
        {type.toUpperCase()}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You need to be logged in to access this page.</p>
          <button
            onClick={() => router.push('/admin/login')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout currentSection="form-versions">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Form Versions</h1>
        <p className="text-gray-600 mt-2">Manage and customize form configurations</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Available Form Versions</h2>
            <button
              onClick={fetchFormVersions}
              disabled={isLoadingVersions}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoadingVersions ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {isLoadingVersions ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading form versions...</p>
            </div>
          ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {formVersions && formVersions.length > 0 ? (
                formVersions.map((version) => (
                                     <div key={version._id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow flex flex-col h-full">
                     <div className="flex justify-between items-start mb-4">
                       <h3 className="text-lg font-semibold text-gray-900">{version.name}</h3>
                       <div className="flex flex-col gap-1">
                         {getStatusBadge(version.status)}
                         {getTypeBadge(version.master)}
                       </div>
                     </div>
                     
                     <div className="space-y-2 mb-4 flex-grow">
                       <p className="text-sm text-gray-600">
                         Updated: {new Date(version.updatedAt).toLocaleDateString('en-US', {
                           year: 'numeric',
                           month: 'short',
                           day: 'numeric',
                           hour: '2-digit',
                           minute: '2-digit'
                         })}
                       </p>
                       {version.masterVersion && !version.master && (
                         <p className="text-sm text-gray-600">
                           Based on Master v{version.masterVersion}
                         </p>
                       )}
                     </div>
                     
                     <button
                       onClick={() => loadFormVersion(version.version)}
                       className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm mt-auto"
                     >
                       Load Form Version
                     </button>
                   </div>
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <div className="text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium text-gray-900 mb-2">No Form Versions Found</p>
                    <p className="text-gray-600">No form versions are currently available.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-blue-100 mr-4">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-blue-900">Form Version Management</h3>
              <p className="text-sm text-blue-700 mt-1">
                Click on any form version to load and customize it. Each version can be edited independently 
                while maintaining the original structure.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminFormVersionsPage; 