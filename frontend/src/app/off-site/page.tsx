"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOffSites,
  createOffSite,
  updateOffSite,
  deleteOffSite,
  getCurrentUser,
  canManageOffSites,
} from "@/lib/api";
import { useFilteredUsers } from "@/hooks/useUsersCache";
import RoleGuard from "@/components/RoleGuard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Loader from "@/components/ui/Loader";
import SearchFilter from "@/components/ui/SearchFilter";
import Tabs from "@/components/ui/Tabs";
import { toast } from "sonner";
import { Search, Plus, Calendar, CheckCircle, XCircle, Clock, User, Edit, Trash2, MapPin, Briefcase } from "lucide-react";
import { formatDate, capitalize } from "@/lib/utils";
import { motion } from "framer-motion";

export default function OffSitePage() {
  const user = getCurrentUser();
  const userId = user?.id || "u1";
  const [offSites, setOffSites] = useState<any[]>([]);
  const [filteredOffSites, setFilteredOffSites] = useState<any[]>([]);
  const [editingOffSite, setEditingOffSite] = useState<any>(null);
  const [viewType, setViewType] = useState<'self' | 'team'>('self');
  const [activeTab, setActiveTab] = useState<'my-offsites' | 'team-offsites'>('my-offsites');
  const [loadingOffSites, setLoadingOffSites] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const queryClient = useQueryClient();

  // Check if user can manage off-sites (HR, Admin, God)
  const canManage = canManageOffSites();
  
  // Get user role from existing user object
  const userRole = user?.role || "Employee";
  
  // Use global users cache for checking if user is a manager
  const { users: usersData } = useFilteredUsers();

  // Check if current user is a manager (has subordinates)
  // Anyone with subordinates is considered a manager, regardless of role
  const isManager = useMemo(() => {
    if (canManage) return true; // HR, Admin, God are always managers
    
    const users = usersData || [];
    const currentUserId = String(userId);
    // Check if any user has this user as their manager
    // This works for any role - if you have subordinates, you're a manager
    // Handle both number and string formats for manager_id
    return users.some((u: any) => {
      const managerId = u.manager_id;
      if (managerId === null || managerId === undefined) return false;
      // Convert both to strings for comparison
      return String(managerId) === currentUserId;
    });
  }, [canManage, usersData, userId]);
  
  // Check if user can view team off-sites (HR, Admin, God, or anyone who has subordinates)
  const canViewTeamOffSites = canManage || isManager;

  // Fetch off-site entries - different scope based on active tab
  const { data: offSitesData, isLoading, error, refetch } = useQuery({
    queryKey: ["off-sites", activeTab, currentPage, perPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: perPage.toString(),
        paginated: "true",
      });

      if (activeTab === "team-offsites" && canViewTeamOffSites) {
        params.append("view", "team");
      } else {
        params.append("userId", userId);
      }

      return getOffSites(params.toString());
    },
    refetchOnWindowFocus: false, // Reduce unnecessary refetches
    staleTime: 60000, // Cache for 1 minute
  });

  // Update local state when data changes
  useEffect(() => {
    if (offSitesData?.data) {
      setOffSites(offSitesData.data);
      setTotal(offSitesData.data.length || 0);
      setTotalPages(Math.ceil((offSitesData.data.length || 0) / 10) || 1);
    } else {
      setOffSites([]);
      setTotal(0);
      setTotalPages(1);
    }
  }, [offSitesData]);

  // Filter off-sites based on search
  useEffect(() => {
    setFilteredOffSites(offSites);
  }, [offSites]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createOffSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["off-sites"] });
      setEditingOffSite(null);
      toast.success("Off-site entry created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create off-site entry");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateOffSite(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["off-sites"] });
      setEditingOffSite(null);
      toast.success("Off-site entry updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update off-site entry");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteOffSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["off-sites"] });
      toast.success("Off-site entry deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete off-site entry");
    },
  });

  const handleSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredOffSites(offSites);
      return;
    }

    const filtered = offSites.filter((offSite) =>
      offSite.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offSite.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offSite.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offSite.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOffSites(filtered);
  };

  const handleFilter = (filters: Record<string, string>) => {
    let filtered = offSites;

    if (filters.status) {
      filtered = filtered.filter((offSite) => offSite.status === filters.status);
    }

    if (filters.type) {
      filtered = filtered.filter((offSite) => offSite.type === filters.type);
    }

    setFilteredOffSites(filtered);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this off-site entry?")) {
      deleteMutation.mutate(id);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "training":
        return "🎓";
      case "meeting":
        return "🤝";
      case "conference":
        return "🎤";
      case "client_visit":
        return "🏢";
      default:
        return "💼";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Off-site Tracker</h1>
          <p className="text-gray-400">Track and manage off-site work activities</p>
        </div>
        <Button
          onClick={() => setEditingOffSite({})}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Off-site
        </Button>
      </div>

      {/* Tab Navigation for Managers */}
      {canViewTeamOffSites && (
        <Card>
          <Tabs
            tabs={[
              { id: 'my-offsites', label: 'My Off-sites' },
              { id: 'team-offsites', label: 'Team Off-sites' }
            ]}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as 'my-offsites' | 'team-offsites')}
          />
        </Card>
      )}

      {/* My Off-sites Tab Content */}
      {(!canViewTeamOffSites || activeTab === 'my-offsites') && (
        <>
          {/* Search and Filters */}
          <SearchFilter
            onSearch={handleSearch}
            onFilter={handleFilter}
            searchPlaceholder="Search off-sites by title, description, location, or type..."
            filters={[
              {
                key: "status",
                label: "Status",
                options: [
                  { value: "", label: "All Statuses" },
                  { value: "planned", label: "Planned" },
                  { value: "in_progress", label: "In Progress" },
                  { value: "completed", label: "Completed" },
                  { value: "cancelled", label: "Cancelled" },
                ],
              },
              {
                key: "type",
                label: "Type",
                options: [
                  { value: "", label: "All Types" },
                  { value: "training", label: "Training" },
                  { value: "meeting", label: "Meeting" },
                  { value: "conference", label: "Conference" },
                  { value: "client_visit", label: "Client Visit" },
                  { value: "other", label: "Other" },
                ],
              },
            ]}
          />

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 mb-6">
              {error.message || "Failed to load off-site entries"}
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader />
            </div>
          ) : (
            <>
              {/* Off-sites List */}
              <div className="grid gap-6">
                {filteredOffSites.length === 0 ? (
                  <Card>
                    <div className="text-center py-12">
                      <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-300 mb-2">
                        No Off-site Entries Found
                      </h3>
                      <p className="text-gray-400 mb-6">
                        You haven't created any off-site entries yet
                      </p>
                      <Button
                        onClick={() => setEditingOffSite({})}
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Off-site Entry
                      </Button>
                    </div>
                  </Card>
                ) : (
                  filteredOffSites.map((offSite, index) => (
                    <motion.div
                      key={offSite.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="hover:bg-gray-800/50 transition-colors">
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start gap-4">
                              <div className="text-2xl">
                                {getTypeIcon(offSite.type)}
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold text-white mb-1">
                                  {offSite.title}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {formatDate(offSite.start_date)} - {formatDate(offSite.end_date)}
                                  </span>
                                  {offSite.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-4 w-4" />
                                      {offSite.location}
                                    </span>
                                  )}
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    offSite.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                    offSite.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                    offSite.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                  }`}>
                                    {capitalize(offSite.status)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {/* Allow users to edit their own off-sites, or HR/Admin/God to edit any */}
                              {(canManage || offSite.user_id === userId) && (
                                <>
                                  <button
                                    onClick={() => setEditingOffSite(offSite)}
                                    className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                    title="Edit off-site"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(offSite.id)}
                                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Delete off-site"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {offSite.description && (
                            <p className="text-gray-300 mb-4 line-clamp-2">
                              {offSite.description}
                            </p>
                          )}
                          
                          {/* User info for team view */}
                          {offSite.user && (
                            <div className="flex items-center gap-2 text-sm text-gray-400 pt-3 border-t border-gray-700">
                              <User className="h-4 w-4" />
                              <span>{offSite.user.name}</span>
                              {offSite.user.designation && (
                                <span className="text-gray-500">• {offSite.user.designation}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Team Off-sites Tab Content */}
      {canViewTeamOffSites && activeTab === 'team-offsites' && (
        <>
          <Card>
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Team Off-sites
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                View and manage off-site activities for your team members
              </p>
            </div>

            {/* Team Off-sites List */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
                  <p className="text-gray-400 mt-2">Loading team off-sites...</p>
                </div>
              ) : filteredOffSites.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">
                    No Team Off-site Entries Found
                  </h3>
                  <p className="text-gray-400 mb-6">
                    No team members have created off-site entries yet
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredOffSites.map((offSite, index) => (
                    <motion.div
                      key={offSite.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card className="hover:shadow-lg transition-shadow">
                        <div className="p-6">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-start gap-3">
                              <div className="text-2xl flex-shrink-0">
                                {getTypeIcon(offSite.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                  <h3 className="text-lg font-semibold text-white truncate">
                                    {offSite.title}
                                  </h3>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium self-start ${
                                    offSite.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                    offSite.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                    offSite.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                  }`}>
                                    {capitalize(offSite.status)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-400 mb-3">
                                  {offSite.user_name || 'Unknown User'}
                                </p>

                                {offSite.description && (
                                  <p className="text-gray-300 mb-3 line-clamp-2">
                                    {offSite.description}
                                  </p>
                                )}

                                <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                                  {offSite.location && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-4 w-4 flex-shrink-0" />
                                      <span className="truncate">{offSite.location}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">
                                      {formatDate(offSite.start_date)} - {formatDate(offSite.end_date)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {canManage && (
                              <div className="flex gap-2 sm:justify-end">
                                <button
                                  onClick={() => setEditingOffSite(offSite)}
                                  className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                  title="Edit off-site"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(offSite.id)}
                                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                  title="Delete off-site"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Add/Edit Off-site Modal */}
      {editingOffSite !== null && (
        <OffSiteModal
          offSite={editingOffSite}
          onClose={() => setEditingOffSite(null)}
          onSave={(data: any) => {
            if (editingOffSite.id) {
              updateMutation.mutate({ id: editingOffSite.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

// Off-site Modal Component
function OffSiteModal({ offSite, onClose, onSave, isLoading }: any) {
  const [formData, setFormData] = useState({
    title: offSite.title || "",
    description: offSite.description || "",
    location: offSite.location || "",
    type: offSite.type || "training",
    status: offSite.status || "planned",
    start_date: offSite.start_date ? offSite.start_date.split('T')[0] : "",
    end_date: offSite.end_date ? offSite.end_date.split('T')[0] : "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    
    if (!formData.start_date || !formData.end_date) {
      toast.error("Start date and end date are required");
      return;
    }
    
    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      toast.error("End date cannot be before start date");
      return;
    }

    onSave({
      ...formData,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date).toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-white mb-4">
          {offSite.id ? "Edit Off-site Entry" : "Add Off-site Entry"}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={3}
              placeholder="Enter description..."
            />
          </div>
          
          <Input
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Enter location..."
          />
          
          <Select
            label="Type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            options={[
              { value: "training", label: "Training" },
              { value: "meeting", label: "Meeting" },
              { value: "conference", label: "Conference" },
              { value: "client_visit", label: "Client Visit" },
              { value: "other", label: "Other" },
            ]}
          />
          
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { value: "planned", label: "Planned" },
              { value: "in_progress", label: "In Progress" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              required
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : offSite.id ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}