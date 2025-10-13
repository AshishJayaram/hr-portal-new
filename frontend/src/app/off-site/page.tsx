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
import RoleGuard from "@/components/RoleGuard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Loader from "@/components/ui/Loader";
import SearchFilter from "@/components/ui/SearchFilter";
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
  const [loadingOffSites, setLoadingOffSites] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const queryClient = useQueryClient();

  // Check if user can manage off-sites (HR, Admin, God)
  const canManage = canManageOffSites();

  // Fetch off-site entries - different scope based on view type
  const { data: offSitesData, isLoading, error, refetch } = useQuery({
    queryKey: ["off-sites", viewType, currentPage, perPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: perPage.toString(),
        paginated: "true",
      });

      if (viewType === "team" && canManage) {
        params.append("view", "team");
      } else {
        params.append("userId", userId);
      }

      return getOffSites(params.toString());
    },
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  // Update local state when data changes
  useEffect(() => {
    if (offSitesData?.data) {
      setOffSites(offSitesData.data);
      setTotal(offSitesData.data.length || 0);
      setTotalPages(Math.ceil((offSitesData.data.length || 0) / 10) || 1);
    }
  }, [offSitesData]);

  // Filter off-sites based on search
  useEffect(() => {
    setFilteredOffSites(offSites);
  }, [offSites]);

  const handleSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredOffSites(offSites);
      return;
    }

    const filtered = offSites.filter((offSite) =>
      offSite.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offSite.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offSite.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offSite.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offSite.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredOffSites(filtered);
  };

  const handleFilter = (filters: Record<string, any>) => {
    let filtered = [...offSites];

    if (filters.status) {
      filtered = filtered.filter((offSite) => offSite.status === filters.status);
    }

    if (filters.type) {
      filtered = filtered.filter((offSite) => offSite.type === filters.type);
    }

    setFilteredOffSites(filtered);
  };

  // Create off-site mutation
  const createMutation = useMutation({
    mutationFn: createOffSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["off-sites"] });
      toast.success("Off-site entry created successfully");
      setEditingOffSite(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create off-site entry");
    },
  });

  // Update off-site mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateOffSite(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["off-sites"] });
      toast.success("Off-site entry updated successfully");
      setEditingOffSite(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update off-site entry");
    },
  });

  // Delete off-site mutation
  const deleteMutation = useMutation({
    mutationFn: deleteOffSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["off-sites"] });
      toast.success("Off-site entry deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete off-site entry");
    },
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "planned":
        return "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500/20";
      case "in_progress":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "completed":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "training":
        return "🎓";
      case "meeting":
        return "🤝";
      case "conference":
        return "🏢";
      case "client_visit":
        return "👥";
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
        <div className="flex gap-3">
          {/* View Toggle for HR/Admin */}
          {canManage && (
            <div className="flex bg-gray-100 dark:bg-gray-800/50 rounded-lg p-1">
              <button
                onClick={() => setViewType("self")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewType === "self"
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10"
                }`}
              >
                My Off-sites
              </button>
              <button
                onClick={() => setViewType("team")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewType === "team"
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10"
                }`}
              >
                Team Off-sites
              </button>
            </div>
          )}
          <Button
            onClick={() => setEditingOffSite({})}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Off-site
          </Button>
        </div>
      </div>

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
                      {viewType === "team" 
                        ? "No team off-site entries to display"
                        : "You haven't created any off-site entries yet"
                      }
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
                              </div>
                              {offSite.description && (
                                <p className="text-gray-300 text-sm mb-3">
                                  {offSite.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(offSite.status)}`}>
                              {capitalize(offSite.status)}
                            </span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingOffSite(offSite)}
                                className="text-gray-400 hover:text-white"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMutation.mutate(offSite.id)}
                                className="text-red-400 hover:text-red-300"
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* User info for team view */}
                        {viewType === "team" && offSite.user && (
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
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {offSite.id ? "Updating..." : "Creating..."}
                </div>
              ) : (
                offSite.id ? "Update" : "Create"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

