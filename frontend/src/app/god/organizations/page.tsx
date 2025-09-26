"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Loader from "@/components/ui/Loader";
import { Organization, getOrganizations, getOrganizationDetails, updateOrganization, deleteOrganization } from "@/lib/api";

export default function OrganizationsManagement() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<{ organization: Organization; admin_user?: any } | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    domain: "",
    description: "",
    is_active: true,
  });
  const queryClient = useQueryClient();

  // Fetch organizations
  const { data: organizations, isLoading: orgsLoading, error: orgsError } = useQuery({
    queryKey: ["god-organizations"],
    queryFn: getOrganizations,
  });

  // Update organization mutation
  const updateOrgMutation = useMutation({
    mutationFn: async ({ id, orgData }: { id: number; orgData: any }) => {
      return await updateOrganization(id, orgData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["god-organizations"] });
      setShowEditModal(false);
      setSelectedOrg(null);
    },
  });

  // Delete organization mutation
  const deleteOrgMutation = useMutation({
    mutationFn: async (id: number) => {
      return await deleteOrganization(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["god-organizations"] });
      setShowViewModal(false);
      setSelectedOrg(null);
    },
  });

  const handleViewOrg = async (org: Organization) => {
    try {
      const orgDetails = await getOrganizationDetails(org.id);
      setSelectedOrg(orgDetails);
      setShowViewModal(true);
    } catch (error) {
      console.error("Failed to fetch organization details:", error);
    }
  };

  const handleEditOrg = (org: Organization) => {
    setSelectedOrg({ organization: org });
    setEditForm({
      name: org.name,
      domain: org.domain,
      description: org.description || "",
      is_active: org.is_active,
    });
    setShowEditModal(true);
  };

  const handleUpdateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOrg) {
      updateOrgMutation.mutate({ id: selectedOrg.organization.id, orgData: editForm });
    }
  };

  const handleDeleteOrg = () => {
    if (selectedOrg && confirm(`Are you sure you want to delete "${selectedOrg.organization.name}"? This action cannot be undone.`)) {
      deleteOrgMutation.mutate(selectedOrg.organization.id);
    }
  };

  if (orgsLoading) {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Organizations Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage all organizations in the platform</p>
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
            {showCreateForm ? "Cancel" : "Create Organization"}
          </Button>
        </div>
      </div>

      {orgsError && (
        <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 mb-6">
          <p className="text-red-800 dark:text-red-200">
            Error loading organizations: {orgsError.message}
          </p>
        </Card>
      )}

      {/* Organizations Grid */}
      {organizations && organizations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => (
            <Card key={org.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {org.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {org.domain}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  org.is_active 
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                }`}>
                  {org.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                {org.description}
              </p>
              
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-500 dark:text-gray-500">
                  Created: {new Date(org.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  <span>👥</span>
                  <span>{org.user_count} users</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewOrg(org)}
                >
                  View Details
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditOrg(org)}
                >
                  Edit
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {organizations?.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-xl font-medium mb-2">No Organizations Found</h3>
            <p>Create your first organization to get started.</p>
          </div>
        </Card>
      )}

      {/* View Organization Details Modal */}
      {showViewModal && selectedOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Organization Details
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
                    <p className="text-gray-900 dark:text-gray-100">{selectedOrg.organization.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Domain
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedOrg.organization.domain}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedOrg.organization.is_active 
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}>
                      {selectedOrg.organization.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      User Count
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedOrg.organization.user_count} users</p>
                  </div>
                </div>
                {selectedOrg.organization.description && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedOrg.organization.description}</p>
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
                      {new Date(selectedOrg.organization.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Updated
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {new Date(selectedOrg.organization.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Admin User Information */}
              {selectedOrg.admin_user && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                    Admin User Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Username
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">{selectedOrg.admin_user.username}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">{selectedOrg.admin_user.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Name
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">{selectedOrg.admin_user.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Role
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">{selectedOrg.admin_user.role}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => {
                  setShowViewModal(false);
                  handleEditOrg(selectedOrg.organization);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Edit Organization
              </Button>
              <Button
                onClick={handleDeleteOrg}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900"
              >
                Delete Organization
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

      {/* Edit Organization Modal */}
      {showEditModal && selectedOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Edit Organization
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateOrg} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Organization Name
                  </label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Tech Corp"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Domain
                  </label>
                  <Input
                    value={editForm.domain}
                    onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
                    placeholder="techcorp.com"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="A leading technology company..."
                  rows={3}
                />
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
                  Active Organization
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={updateOrgMutation.isPending}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {updateOrgMutation.isPending ? "Updating..." : "Update Organization"}
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteOrg}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900"
                >
                  Delete Organization
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
