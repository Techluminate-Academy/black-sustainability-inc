import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';

// Modal component for confirmations
const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText, 
  cancelText = 'Cancel',
  type = 'danger' 
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}) => {
  if (!isOpen) return null;

  const getButtonColors = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700';
      default:
        return 'bg-red-600 hover:bg-red-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-4 py-2 text-white rounded transition-colors ${getButtonColors()}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminUsersPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', name: '' });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const router = useRouter();

  // Modal states
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'danger' as 'danger' | 'warning' | 'info',
    title: '',
    message: '',
    confirmText: '',
    onConfirm: () => {},
  });

  // Helper function to check if a user is the current logged-in user
  const isCurrentUser = (userId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      if (token) {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        return decoded.id === userId;
      }
    } catch (error) {
      console.error('Error checking current user:', error);
    }
    return false;
  };

  const showModal = (config: {
    type: 'danger' | 'warning' | 'info';
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  }) => {
    setModalState({
      isOpen: true,
      ...config,
    });
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

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
          fetchAdminUsers();
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

  const fetchAdminUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAdminUsers(data.admins || []);
      }
    } catch (error) {
      console.error('Failed to fetch admin users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    // Check if user is trying to deactivate themselves
    if (isCurrentUser(userId) && currentStatus) {
      showModal({
        type: 'warning',
        title: 'Cannot Deactivate Own Account',
        message: 'You cannot deactivate your own account. Please ask another admin to deactivate your account.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    const action = currentStatus ? 'deactivate' : 'activate';
    const user = adminUsers.find(u => u._id === userId);

    showModal({
      type: currentStatus ? 'warning' : 'info',
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Admin User`,
      message: `Are you sure you want to ${action} "${user?.email}"?`,
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('adminToken');
          const response = await fetch(`/api/admin/users/${userId}/toggle`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ isActive: !currentStatus }),
          });

          if (response.ok) {
            const data = await response.json();
            showModal({
              type: 'info',
              title: 'Success',
              message: `Admin user ${data.isActive ? 'activated' : 'deactivated'} successfully.`,
              confirmText: 'OK',
              onConfirm: () => {
                fetchAdminUsers(); // Refresh the list
              },
            });
          } else {
            const data = await response.json();
            if (data.code === 'SELF_DEACTIVATION') {
              showModal({
                type: 'warning',
                title: 'Cannot Deactivate Own Account',
                message: 'You cannot deactivate your own account. Please ask another admin to deactivate your account.',
                confirmText: 'OK',
                onConfirm: () => {},
              });
            } else {
              showModal({
                type: 'danger',
                title: 'Error',
                message: data.error || 'Failed to toggle user status',
                confirmText: 'OK',
                onConfirm: () => {},
              });
            }
          }
        } catch (error) {
          console.error('Failed to toggle admin status:', error);
          showModal({
            type: 'danger',
            title: 'Error',
            message: 'Failed to toggle user status',
            confirmText: 'OK',
            onConfirm: () => {},
          });
        }
      },
    });
  };

  const addAdminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    showModal({
      type: 'info',
      title: 'Add New Admin User',
      message: `Are you sure you want to add "${newUser.email}" as an admin user?`,
      confirmText: 'Add User',
      onConfirm: async () => {
        setIsAddingUser(true);
        
        try {
          const token = localStorage.getItem('adminToken');
          const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(newUser),
          });

          if (response.ok) {
            setNewUser({ email: '', name: '' });
            setShowAddForm(false);
            showModal({
              type: 'info',
              title: 'Success',
              message: 'Admin user added successfully.',
              confirmText: 'OK',
              onConfirm: () => {
                fetchAdminUsers(); // Refresh the list
              },
            });
          } else {
            const data = await response.json();
            showModal({
              type: 'danger',
              title: 'Error',
              message: data.error || 'Failed to add admin user',
              confirmText: 'OK',
              onConfirm: () => {},
            });
          }
        } catch (error) {
          console.error('Failed to add admin user:', error);
          showModal({
            type: 'danger',
            title: 'Error',
            message: 'Failed to add admin user',
            confirmText: 'OK',
            onConfirm: () => {},
          });
        } finally {
          setIsAddingUser(false);
        }
      },
    });
  };

  const deleteAdminUser = async (userId: string, userEmail: string) => {
    // Check if user is trying to delete themselves
    if (isCurrentUser(userId)) {
      showModal({
        type: 'warning',
        title: 'Cannot Delete Own Account',
        message: 'You cannot delete your own account. Please ask another admin to delete your account, or contact system administrator.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    showModal({
      type: 'danger',
      title: 'Delete Admin User',
      message: `Are you sure you want to delete admin user "${userEmail}"? This action cannot be undone.`,
      confirmText: 'Delete User',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('adminToken');
          const response = await fetch(`/api/admin/users/${userId}/delete`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            showModal({
              type: 'info',
              title: 'Success',
              message: 'Admin user deleted successfully.',
              confirmText: 'OK',
              onConfirm: () => {
                fetchAdminUsers(); // Refresh the list
              },
            });
          } else {
            const data = await response.json();
            if (data.code === 'SELF_DELETION') {
              showModal({
                type: 'warning',
                title: 'Cannot Delete Own Account',
                message: 'You cannot delete your own account. Please ask another admin to delete your account.',
                confirmText: 'OK',
                onConfirm: () => {},
              });
            } else {
              showModal({
                type: 'danger',
                title: 'Error',
                message: data.error || 'Failed to delete admin user',
                confirmText: 'OK',
                onConfirm: () => {},
              });
            }
          }
        } catch (error) {
          console.error('Failed to delete admin user:', error);
          showModal({
            type: 'danger',
            title: 'Error',
            message: 'Failed to delete admin user',
            confirmText: 'OK',
            onConfirm: () => {},
          });
        }
      },
    });
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
    <AdminLayout currentSection="admin-users">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Users Management</h1>
        <p className="text-gray-600 mt-2">Manage admin user access and permissions</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Admin Users</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                {showAddForm ? 'Cancel' : 'Add User'}
              </button>
              <button
                onClick={fetchAdminUsers}
                disabled={isLoadingUsers}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoadingUsers ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {showAddForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-md font-semibold text-gray-900 mb-4">Add New Admin User</h3>
              <form onSubmit={addAdminUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isAddingUser}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isAddingUser ? 'Adding...' : 'Add User'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {isLoadingUsers ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading admin users...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adminUsers && adminUsers.length > 0 ? (
                    adminUsers.map((user: any) => (
                      <tr key={user._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">
                              {user.email}
                              {isCurrentUser(user._id) && (
                                <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-gray-500">{user.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleAdminStatus(user._id, user.isActive)}
                              className={`px-3 py-1 rounded text-xs font-medium ${
                                isCurrentUser(user._id)
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : user.isActive
                                  ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                  : 'bg-green-100 text-green-800 hover:bg-green-200'
                              }`}
                              disabled={isCurrentUser(user._id)}
                              title={isCurrentUser(user._id) ? 'You cannot deactivate your own account' : `${user.isActive ? 'Deactivate' : 'Activate'} this admin user`}
                            >
                              {isCurrentUser(user._id) 
                                ? `${user.isActive ? 'Deactivate' : 'Activate'} (You)` 
                                : user.isActive ? 'Deactivate' : 'Activate'
                              }
                            </button>
                            <button
                              onClick={() => deleteAdminUser(user._id, user.email)}
                              className={`px-3 py-1 rounded text-xs font-medium ${
                                isCurrentUser(user._id)
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-red-100 text-red-800 hover:bg-red-200'
                              }`}
                              disabled={isCurrentUser(user._id)}
                              title={isCurrentUser(user._id) ? 'You cannot delete your own account' : 'Delete this admin user'}
                            >
                              {isCurrentUser(user._id) ? 'Delete (You)' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                        No admin users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={modalState.onConfirm}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        type={modalState.type}
      />
    </AdminLayout>
  );
};

export default AdminUsersPage; 