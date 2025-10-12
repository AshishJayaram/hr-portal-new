"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Loader from "@/components/ui/Loader";
import { User, getUsers, getUser, updateUser, deleteUser } from "@/lib/api";

export default function UsersManagement() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    department: "",
    designation: "",
    role: "",
    is_active: true,
  });
  const queryClient = useQueryClient();

  // Fetch users
  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ["god-users"],
    queryFn: getUsers,
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: number; userData: any }) => {
      return await updateUser(id, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["god-users"] });
      setShowEditModal(false);
      setSelectedUser(null);
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      return await deleteUser(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["god-users"] });
      setShowViewModal(false);
      setSelectedUser(null);
    },
  });

  const handleViewUser = async (user: User) => {
    try {
      const userDetails = await getUser(user.id);
      setSelectedUser(userDetails);
      setShowViewModal(true);
    } catch (error) {
      console.error("Failed to fetch user details:", error);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      department: user.department,
      designation: user.designation || "",
      role: user.role,
      is_active: user.is_active,
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      updateUserMutation.mutate({ id: selectedUser.id, userData: editForm });
    }
  };

  const handleDeleteUser = () => {
    if (selectedUser && confirm(`Are you sure you want to delete "${selectedUser.name}"? This action cannot be undone.`)) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Users Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage all users across all organizations</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => window.location.href = '/god'}
            variant="outline"
          >
            ← Back to Dashboard
          </Button>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {showCreateForm ? "Cancel" : "Create User"}
          </Button>
        </div>
      </div>

      {usersError && (
        <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 mb-6">
          <p className="text-red-800 dark:text-red-200">
            Error loading users: {usersError.message}
          </p>
        </Card>
      )}

      {/* Users Grid */}
      {users && users.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <Card key={user.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {user.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {user.email}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  user.is_active 
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                }`}>
                  {user.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Role:</span>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Department:</span>
                  <span className="text-gray-900 dark:text-gray-100">{user.department}</span>
                </div>
                {user.designation && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Designation:</span>
                    <span className="text-gray-900 dark:text-gray-100">{user.designation}</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-500 dark:text-gray-500">
                  Created: {new Date(user.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  <span>🏢</span>
                  <span>Org ID: {user.organization_id}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewUser(user)}
                >
                  View Details
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditUser(user)}
                >
                  Edit
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {users?.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-medium mb-2">No Users Found</h3>
            <p>Create your first user to get started.</p>
          </div>
        </Card>
      )}

      {/* View User Details Modal */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                User Details
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedUser.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Username
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedUser.username}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedUser.is_active 
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}>
                      {selectedUser.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Role
                    </label>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">
                      {selectedUser.role}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Department
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedUser.department}</p>
                  </div>
                </div>
                {selectedUser.designation && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Designation
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedUser.designation}</p>
                  </div>
                )}
              </div>

              {/* Timestamps */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  Timestamps
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Created At
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {new Date(selectedUser.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Updated
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {new Date(selectedUser.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => {
                  setShowViewModal(false);
                  handleEditUser(selectedUser);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Edit User
              </Button>
              <Button
                onClick={handleDeleteUser}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900"
              >
                Delete User
              </Button>
              <Button
                onClick={() => setShowViewModal(false)}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Edit User
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <Input
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="john@example.com"
                    type="email"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Department
                  </label>
                  <Input
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    placeholder="Engineering"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Designation
                  </label>
                  <Input
                    value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                    placeholder="Software Developer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  required
                >
                  <option value="Employee">Employee</option>
                  <option value="HR">HR</option>
                  <option value="Admin">Admin</option>
                  <option value="God">God</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active User
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {updateUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteUser}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900"
                >
                  Delete User
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
