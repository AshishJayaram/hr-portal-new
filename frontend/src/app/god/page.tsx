"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Loader from "@/components/ui/Loader";
import { Organization, PlatformStats, getPlatformStats, getOrganizations } from "@/lib/api";

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
  const queryClient = useQueryClient();

  // Fetch platform statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats, error: statsError } = useQuery({
    queryKey: ["god-stats"],
    queryFn: async () => {
      console.log("Fetching platform stats...");
      const token = localStorage.getItem("token");
      console.log("Token:", token);
      const result = await getPlatformStats();
      console.log("Stats result:", result);
      return result;
    },
    staleTime: 0, // Always fetch fresh data
  });

  // Fetch organizations
  const { data: organizations, isLoading: orgsLoading, refetch: refetchOrgs, error: orgsError } = useQuery({
    queryKey: ["god-organizations"],
    queryFn: async () => {
      console.log("Fetching organizations...");
      const token = localStorage.getItem("token");
      console.log("Token:", token);
      const result = await getOrganizations();
      console.log("Organizations result:", result);
      return result;
    },
    staleTime: 0, // Always fetch fresh data
  });

  // Create organization mutation
  const createOrgMutation = useMutation({
    mutationFn: async (orgData: CreateOrgRequest) => {
      const response = await fetch("http://localhost:8080/api/god/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    createOrgMutation.mutate(createForm);
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

      {/* Debug Information */}
      <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Debug Information</h3>
        <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
          <div>Stats Loading: {statsLoading ? "Yes" : "No"}</div>
          <div>Organizations Loading: {orgsLoading ? "Yes" : "No"}</div>
          <div>Stats Error: {statsError ? JSON.stringify(statsError) : "None"}</div>
          <div>Organizations Error: {orgsError ? JSON.stringify(orgsError) : "None"}</div>
          <div>Stats Data: {stats ? JSON.stringify(stats) : "No data"}</div>
          <div>Organizations Count: {organizations?.length || 0}</div>
          <div>Organizations Data: {organizations ? JSON.stringify(organizations.map(o => ({ name: o.name, user_count: o.user_count }))) : "No data"}</div>
          <div>Token: {typeof window !== "undefined" ? localStorage.getItem("token") : "N/A"}</div>
        </div>
      </Card>
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Organizations</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.total_organizations}</p>
              </div>
              <div className="text-4xl">🏢</div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Active Organizations</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">{stats.active_organizations}</p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Users</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{stats.total_users}</p>
              </div>
              <div className="text-4xl">👥</div>
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
                  onClick={() => {
                    // TODO: Implement view organization details
                    alert(`View details for ${org.name}`);
                  }}
                >
                  View Details
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // TODO: Implement edit organization
                    alert(`Edit ${org.name}`);
                  }}
                >
                  Edit
                </Button>
              </div>
            </Card>
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
    </div>
  );
}
