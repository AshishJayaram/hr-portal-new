"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Loader from "@/components/ui/Loader";
import { Organization, PlatformStats, getPlatformStats, getOrganizations, getOrganizationDetails, updateOrganization, deleteOrganization, uploadOrganizationLogo } from "@/lib/api";

interface CreateOrgRequest {
  name: string;
  domain: string;
  description: string;
  admin_user: {
    username: string;
    email: string;
    password: string;
    name: string;
  };
}

export default function GodDashboard() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<{ organization: Organization; admin_user?: any } | null>(null);
  const [createForm, setCreateForm] = useState<CreateOrgRequest>({
    name: "",
    domain: "",
    description: "",
    admin_user: {
      username: "",
      email: "",
      password: "",
      name: "",
    },
  });
  const [editForm, setEditForm] = useState({
    name: "",
    domain: "",
    description: "",
    is_active: true,
    admin_user: {
      username: "",
      email: "",
      name: "",
    },
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  // Fetch platform statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats, error: statsError } = useQuery({
    queryKey: ["god-stats"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const result = await getPlatformStats();
      return result;
    },
    staleTime: 0, // Always fetch fresh data
  });

  // Fetch organizations
  const { data: organizations, isLoading: orgsLoading, refetch: refetchOrgs, error: orgsError } = useQuery({
    queryKey: ["god-organizations"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const result = await getOrganizations();
      return result;
    },
    staleTime: 0, // Always fetch fresh data
  });


  // Create organization mutation
  const createOrgMutation = useMutation({
    mutationFn: async (orgData: CreateOrgRequest) => {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/god/organizations", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(orgData),
      });
      if (!response.ok) throw new Error("Failed to create organization");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["god-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["god-stats"] });
      setShowCreateForm(false);
      setCreateForm({
        name: "",
        domain: "",
        description: "",
        admin_user: { username: "", email: "", password: "", name: "" },
      });
    },
  });

  // Update organization mutation
  const updateOrgMutation = useMutation({
    mutationFn: async ({ id, orgData }: { id: number; orgData: any }) => {
      return await updateOrganization(id, orgData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["god-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["god-stats"] });
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
      queryClient.invalidateQueries({ queryKey: ["god-stats"] });
      setShowViewModal(false);
      setSelectedOrg(null);
    },
  });

  // Upload logo mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async ({ orgId, file }: { orgId: string; file: File }) => {
      return await uploadOrganizationLogo(orgId, file);
    },
    onSuccess: async (data, variables) => {
      // Invalidate organizations query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["god-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["god-stats"] });
      // Invalidate current-user query so logo appears immediately in sidebar/topbar
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      setLogoFile(null);
      
      // If modal is open, refresh the selected organization data
      if (selectedOrg) {
        try {
          const updatedOrgDetails = await getOrganizationDetails(selectedOrg.organization.id);
          setSelectedOrg(updatedOrgDetails);
        } catch (error) {
          console.error('Failed to refresh organization details:', error);
        }
      }
    },
  });

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    createOrgMutation.mutate(createForm);
  };

  const handleViewOrg = async (org: Organization) => {
    try {
      const orgDetails = await getOrganizationDetails(org.id);
      setSelectedOrg(orgDetails);
      setShowViewModal(true);
    } catch (error) {
      // Failed to fetch organization details
    }
  };

  const handleEditOrg = async (org: Organization) => {
    try {
      // Fetch full organization details including admin_user
      const orgDetails = await getOrganizationDetails(org.id);
      setSelectedOrg(orgDetails);
      setEditForm({
        name: orgDetails.organization.name,
        domain: orgDetails.organization.domain,
        description: orgDetails.organization.description || "",
        is_active: orgDetails.organization.is_active,
        admin_user: orgDetails.admin_user ? {
          username: orgDetails.admin_user.username || "",
          email: orgDetails.admin_user.email || "",
          name: orgDetails.admin_user.name || "",
        } : {
          username: "",
          email: "",
          name: "",
        },
      });
      setShowEditModal(true);
    } catch (error) {
      // Fallback if details fetch fails
    setSelectedOrg({ organization: org });
    setEditForm({
      name: org.name,
      domain: org.domain,
      description: org.description || "",
      is_active: org.is_active,
        admin_user: {
          username: "",
          email: "",
          name: "",
        },
    });
    setShowEditModal(true);
    }
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

  const isLoading = statsLoading || orgsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            👑 God Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage organizations and monitor platform statistics
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              refetchStats();
              refetchOrgs();
            }}
            variant="outline"
            className="bg-white/10 border-white/20 text-gray-700 dark:text-gray-300 hover:bg-white/20"
          >
            🔄 Refresh Data
          </Button>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {showCreateForm ? "Cancel" : "Create Organization"}
          </Button>
        </div>
      </div>

      {/* Platform Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => window.location.href = '/god/organizations'}
          >
            <Card 
              className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Organizations</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.total_organizations}</p>
                  <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">Click to manage</p>
                </div>
                <div className="text-4xl">🏢</div>
              </div>
            </Card>
          </div>

          <div 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => window.location.href = '/god/organizations'}
          >
            <Card 
              className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Active Organizations</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">{stats.active_organizations}</p>
                  <p className="text-xs text-green-500 dark:text-green-400 mt-1">Currently active</p>
                </div>
                <div className="text-4xl">✅</div>
              </div>
            </Card>
          </div>

          <div 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => window.location.href = '/god/users'}
          >
            <Card 
              className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Users</p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{stats.total_users}</p>
                  <p className="text-xs text-purple-500 dark:text-purple-400 mt-1">Across all orgs</p>
                </div>
                <div className="text-4xl">👥</div>
              </div>
            </Card>
          </div>

          <div 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => window.location.href = '/god/organizations'}
          >
            <Card 
              className="p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Inactive Organizations</p>
                  <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{stats.total_organizations - stats.active_organizations}</p>
                  <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">Need attention</p>
                </div>
                <div className="text-4xl">⚠️</div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Additional Platform Insights */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Average Users per Org</p>
                <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                  {stats.total_organizations > 0 ? Math.round(stats.total_users / stats.total_organizations) : 0}
                </p>
                <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">Platform efficiency</p>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-teal-200 dark:border-teal-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-teal-600 dark:text-teal-400">Platform Health</p>
                <p className="text-2xl font-bold text-teal-900 dark:text-teal-100">
                  {stats.total_organizations > 0 ? Math.round((stats.active_organizations / stats.total_organizations) * 100) : 0}%
                </p>
                <p className="text-xs text-teal-500 dark:text-teal-400 mt-1">Active rate</p>
              </div>
              <div className="text-3xl">💚</div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Platform Growth</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {stats.total_users > 0 ? 'Growing' : 'New'}
                </p>
                <p className="text-xs text-amber-500 dark:text-amber-400 mt-1">User adoption</p>
              </div>
              <div className="text-3xl">🚀</div>
            </div>
          </Card>
        </div>
      )}

      {/* Create Organization Form */}
      {showCreateForm && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Create New Organization</h2>
          <form onSubmit={handleCreateOrg} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Organization Name</label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="TechCorp Solutions"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Domain</label>
                <Input
                  value={createForm.domain}
                  onChange={(e) => setCreateForm({ ...createForm, domain: e.target.value })}
                  placeholder="techcorp.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="A leading technology company..."
                rows={3}
              />
            </div>
            
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">Admin User Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Admin Username</label>
                  <Input
                    value={createForm.admin_user.username}
                    onChange={(e) => setCreateForm({
                      ...createForm,
                      admin_user: { ...createForm.admin_user, username: e.target.value }
                    })}
                    placeholder="admin"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Admin Email</label>
                  <Input
                    type="email"
                    value={createForm.admin_user.email}
                    onChange={(e) => setCreateForm({
                      ...createForm,
                      admin_user: { ...createForm.admin_user, email: e.target.value }
                    })}
                    placeholder="admin@techcorp.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Admin Name</label>
                  <Input
                    value={createForm.admin_user.name}
                    onChange={(e) => setCreateForm({
                      ...createForm,
                      admin_user: { ...createForm.admin_user, name: e.target.value }
                    })}
                    placeholder="John Smith"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Admin Password</label>
                  <Input
                    type="password"
                    value={createForm.admin_user.password}
                    onChange={(e) => setCreateForm({
                      ...createForm,
                      admin_user: { ...createForm.admin_user, password: e.target.value }
                    })}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={createOrgMutation.isPending}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                {createOrgMutation.isPending ? "Creating..." : "Create Organization"}
              </Button>
              <Button
                type="button"
                onClick={() => setShowCreateForm(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Organizations List */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Organizations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations?.map((org) => (
            <div key={org.id}>
              <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  {org.logo ? (
                    <img 
                      src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${org.logo}`} 
                      alt={`${org.name} logo`}
                      className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-400 text-lg">🏢</span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {org.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {org.domain}
                    </p>
                  </div>
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
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id={`logo-upload-${org.id}`}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        uploadLogoMutation.mutate({ orgId: org.id.toString(), file });
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={uploadLogoMutation.isPending}
                    onClick={() => {
                      const input = document.getElementById(`logo-upload-${org.id}`) as HTMLInputElement;
                      input?.click();
                    }}
                  >
                    {uploadLogoMutation.isPending ? "Updating..." : "Update Logo"}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
          ))}
        </div>
      </div>

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

              {/* Admin User Details Section */}
              {selectedOrg?.admin_user && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                    Admin User Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Username
                      </label>
                      <Input
                        value={editForm.admin_user.username}
                        onChange={(e) => setEditForm({ 
                          ...editForm, 
                          admin_user: { ...editForm.admin_user, username: e.target.value }
                        })}
                        placeholder="admin_username"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </label>
                      <Input
                        type="email"
                        value={editForm.admin_user.email}
                        onChange={(e) => setEditForm({ 
                          ...editForm, 
                          admin_user: { ...editForm.admin_user, email: e.target.value }
                        })}
                        placeholder="admin@example.com"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name
                      </label>
                      <Input
                        value={editForm.admin_user.name}
                        onChange={(e) => setEditForm({ 
                          ...editForm, 
                          admin_user: { ...editForm.admin_user, name: e.target.value }
                        })}
                        placeholder="Admin User Name"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

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
