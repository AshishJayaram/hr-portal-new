"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";
import Button from "@/components/ui/Button";
import { getFeedback, getArchivedFeedback, updateFeedbackStatus, deleteFeedback, archiveFeedback, deleteAllFeedback } from "@/lib/api";
import { Archive } from "lucide-react";
import { useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Edit, Trash2, CheckCircle, Clock, AlertTriangle, XCircle, FolderArchive, Inbox } from "lucide-react";

export default function GodFeedbackPage() {
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  // Track editing state per feedback item
  const [editingStates, setEditingStates] = useState<Record<string, { status: string; resolution: string }>>({});
  
  const queryClient = useQueryClient();

  // Fetch active feedback
  const { data: feedback, isLoading } = useQuery({
    queryKey: ["god-feedback"],
    queryFn: async () => {
      const result = await getFeedback();
      return result;
    },
    enabled: activeTab === "active",
  });

  // Fetch archived feedback
  const { data: archivedFeedback, isLoading: isLoadingArchived } = useQuery({
    queryKey: ["god-feedback-archived"],
    queryFn: async () => {
      const result = await getArchivedFeedback();
      return result;
    },
    enabled: activeTab === "archived",
  });

  // Get the appropriate feedback based on active tab
  const currentFeedbackData = activeTab === "active" ? feedback : archivedFeedback;
  const currentIsLoading = activeTab === "active" ? isLoading : isLoadingArchived;

  // Filter feedback
  const filteredFeedback = (currentFeedbackData?.data || []).filter((item: any) => {
    const matchesSearch = 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, resolution }: { id: string; status: string; resolution?: string }) => {
      return await updateFeedbackStatus(id, status, resolution);
    },
    onSuccess: (_, variables) => {
      // Invalidate all feedback queries to refresh list and stats
      queryClient.invalidateQueries({ queryKey: ["god-feedback"] });
      queryClient.invalidateQueries({ queryKey: ["god-feedback-archived"] });
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-stats"] });
      // Clear editing state for this specific item
      setEditingStates(prev => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
    },
    onError: (error: any) => {
      alert(`Failed to update status: ${error?.message || 'Unknown error'}`);
    },
  });

  const archiveFeedbackMutation = useMutation({
    mutationFn: async (id: string) => {
      return await archiveFeedback(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["god-feedback"] });
      queryClient.invalidateQueries({ queryKey: ["god-feedback-archived"] });
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-stats"] });
    },
    onError: (error: any) => {
      alert(`Failed to archive feedback: ${error?.message || 'Unknown error'}`);
    },
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: async (id: string) => {
      return await deleteFeedback(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["god-feedback"] });
      queryClient.invalidateQueries({ queryKey: ["god-feedback-archived"] });
    },
    onError: (error: any) => {
      alert(`Failed to delete feedback: ${error?.message || 'Unknown error'}`);
    },
  });

  const deleteAllFeedbackMutation = useMutation({
    mutationFn: async () => {
      return await deleteAllFeedback();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["god-feedback"] });
      queryClient.invalidateQueries({ queryKey: ["god-feedback-archived"] });
    },
    onError: (error: any) => {
      alert(`Failed to delete all feedback: ${error?.message || 'Unknown error'}`);
    },
  });

  const handleStatusUpdate = (id: string) => {
    // Ensure we're using a numeric ID, not a fallback string like "idx-0"
    if (id.startsWith('idx-')) {
      console.error('❌ Cannot update feedback: Invalid ID format', id);
      alert("Error: Invalid feedback ID. Please refresh the page and try again.");
      return;
    }
    
    const editingState = editingStates[id];
    if (!editingState || !editingState.status) {
      alert("Please select a status");
      return;
    }
    updateStatusMutation.mutate({ 
      id: String(id), // Ensure it's a string of the numeric ID
      status: editingState.status,
      resolution: editingState.resolution || undefined 
    });
  };

  const startEditing = (id: string, currentStatus: string) => {
    setEditingStates(prev => ({
      ...prev,
      [id]: {
        status: currentStatus,
        resolution: ''
      }
    }));
  };

  const cancelEditing = (id: string) => {
    setEditingStates(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateEditingStatus = (id: string, status: string) => {
    setEditingStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        status
      }
    }));
  };

  const updateEditingResolution = (id: string, resolution: string) => {
    setEditingStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        resolution
      }
    }));
  };

  const handleArchive = (id: string) => {
    // Ensure we're using a numeric ID, not a fallback string like "idx-0"
    if (id.startsWith('idx-') || id.startsWith('temp-')) {
      console.error('❌ Cannot archive feedback: Invalid ID format', id);
      alert("Error: Invalid feedback ID. Please refresh the page and try again.");
      return;
    }
    
    if (!confirm("Are you sure you want to archive this feedback? Archived items will be hidden from the main list.")) {
      return;
    }
    archiveFeedbackMutation.mutate(String(id));
  };

  const handleDelete = (id: string) => {
    // Ensure we're using a numeric ID, not a fallback string like "idx-0"
    if (id.startsWith('idx-') || id.startsWith('temp-')) {
      console.error('❌ Cannot delete feedback: Invalid ID format', id);
      alert("Error: Invalid feedback ID. Please refresh the page and try again.");
      return;
    }
    
    if (!confirm("Are you sure you want to permanently delete this feedback? This action cannot be undone.")) {
      return;
    }
    deleteFeedbackMutation.mutate(String(id));
  };

  // Pagination
  const totalPages = Math.ceil(filteredFeedback.length / itemsPerPage);
  const paginatedFeedback = filteredFeedback.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          💬 Feedback & Bug Reports
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View and manage all user feedback and bug reports
        </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            if (confirm("⚠️ WARNING: This will permanently delete ALL feedback and bug reports for this organization. This action cannot be undone!\n\nAre you absolutely sure you want to continue?")) {
              deleteAllFeedbackMutation.mutate();
            }
          }}
          disabled={deleteAllFeedbackMutation.isPending || filteredFeedback.length === 0}
          className="text-red-600 hover:text-red-700 hover:border-red-600 dark:text-red-400 dark:hover:text-red-300"
        >
          {deleteAllFeedbackMutation.isPending ? "Deleting..." : "Delete All Feedback"}
        </Button>
      </div>

      {/* Tabs */}
      <Card className="p-0">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              setActiveTab("active");
              setCurrentPage(1);
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === "active"
                ? "border-b-2 border-purple-600 text-purple-600 dark:text-purple-400"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Inbox className="h-4 w-4" />
            Active Feedback
            {feedback?.data?.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                {feedback.data.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("archived");
              setCurrentPage(1);
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === "archived"
                ? "border-b-2 border-purple-600 text-purple-600 dark:text-purple-400"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <FolderArchive className="h-4 w-4" />
            Archived
            {archivedFeedback && archivedFeedback.data && archivedFeedback.data.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                {archivedFeedback.data.length}
              </span>
            )}
          </button>
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Search by message, user name, or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: "all", label: "All Status" },
              { value: "open", label: "Open" },
              { value: "pending", label: "Pending" },
              { value: "in_progress", label: "In Progress" },
              { value: "resolved", label: "Resolved" },
              { value: "closed", label: "Closed" },
            ]}
          />
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {feedback?.data?.length || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Open</div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {feedback?.data?.filter((f: any) => f.status === 'open' || f.status === 'pending').length || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">In Progress</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {feedback?.data?.filter((f: any) => f.status === 'in_progress').length || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Resolved</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {feedback?.data?.filter((f: any) => f.status === 'resolved' || f.status === 'closed').length || 0}
          </div>
        </Card>
      </div>

      {/* Feedback List */}
      {currentIsLoading ? (
        <div className="flex justify-center py-12">
          <Loader />
        </div>
      ) : paginatedFeedback.length > 0 ? (
        <>
          <div className="space-y-4">
            {paginatedFeedback.map((item: any, index: number) => {
              // Ensure unique key even if ID is missing
              const itemKey = item.id || item.ID || `feedback-${index}`;
              // CRITICAL: Use actual ID for API calls, fallback to temporary ID for display
              let actualId = item.id || item.ID;
              // If still no ID, create a temporary one based on content to identify the item
              if (!actualId && item.created_at && item.title) {
                actualId = `temp-${new Date(item.created_at).getTime()}-${item.title?.substring(0, 10).replace(/\s/g, '-')}`;
              }
              const itemIdStr = actualId ? String(actualId) : `idx-${index}`;
              // If no actual ID exists, use a temporary ID based on created_at and title
              return (
              <div key={itemKey} onClick={(e) => e.stopPropagation()}>
              <Card className="p-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    {/* User Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                        {item.is_anonymous || item.isAnonymous 
                          ? '?' 
                          : (item.user?.name || item.user?.username || 'A').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {item.is_anonymous || item.isAnonymous 
                            ? 'Anonymous' 
                            : (item.user?.name || item.user?.username || item.user_id || 'Unknown')}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.is_anonymous || item.isAnonymous 
                            ? 'Anonymous submission' 
                            : (item.user?.email || 'N/A')}
                        </p>
                      </div>
                    </div>

                    {/* Title */}
                    {item.title && (
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {item.title}
                      </h4>
                    )}

                    {/* Message/Description */}
                    <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                      {item.description || item.message || 'No description provided'}
                    </p>

                    {/* Type and Priority */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {item.type && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        </span>
                      )}
                      {item.priority && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          item.priority === 'critical' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' :
                          item.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300' :
                          item.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                          'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        }`}>
                          {item.priority.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Images */}
                    {item.images && item.images.length > 0 && (
                      <div className="flex gap-2 flex-wrap mb-3">
                        {item.images.map((img: string, idx: number) => (
                          <a
                            key={idx}
                            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${img}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                          >
                            <span>📷</span>
                            <span>Image {idx + 1}</span>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Submitted: {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>

                  {/* Status Badge and Actions */}
                  <div className="flex-shrink-0 flex flex-col gap-2 items-end">
                    {editingStates[String(actualId)] !== undefined ? (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <Select
                          value={editingStates[String(actualId)]?.status || ''}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateEditingStatus(String(actualId), e.target.value);
                          }}
                          options={[
                            { value: 'open', label: 'Open' },
                            { value: 'in_progress', label: 'In Progress' },
                            { value: 'resolved', label: 'Resolved' },
                            { value: 'closed', label: 'Closed' },
                          ]}
                        />
                        {(editingStates[String(actualId)]?.status === 'resolved' || editingStates[String(actualId)]?.status === 'closed') && (
                          <textarea
                            value={editingStates[String(actualId)]?.resolution || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateEditingResolution(String(actualId), e.target.value);
                            }}
                            placeholder="Resolution notes (optional)..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                            rows={2}
                          />
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(String(actualId)); // Use actualId
                            }}
                            disabled={updateStatusMutation.isPending}
                          >
                            {updateStatusMutation.isPending ? "Updating..." : "Save"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEditing(String(actualId)); // Use actualId
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status || 'open')}`}>
                          {(item.status || 'open').replace('_', ' ').toUpperCase()}
                        </span>
                        <div className="flex gap-2">
                          {!String(actualId).startsWith('temp-') && !String(actualId).startsWith('idx-') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(String(actualId), item.status || 'open');
                            }}
                            title="Change status"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Change Status
                          </Button>
                          )}
                          {String(actualId).startsWith('temp-') && (
                            <span className="text-xs text-orange-600 dark:text-orange-400 px-2 py-1 bg-orange-100 dark:bg-orange-900 rounded">
                              ID Missing
                            </span>
                          )}
                          {!String(actualId).startsWith('temp-') && !String(actualId).startsWith('idx-') && (
                          <>
                          {activeTab === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchive(String(actualId));
                            }}
                            title="Archive feedback (hide from list)"
                            className="text-blue-400 hover:text-blue-300 hover:border-blue-400"
                            disabled={archiveFeedbackMutation.isPending}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(String(actualId));
                            }}
                            title="Permanently delete feedback"
                            className="text-red-400 hover:text-red-300 hover:border-red-400"
                            disabled={deleteFeedbackMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          </>
                          )}
                          {String(actualId).startsWith('temp-') && (
                            <span className="text-xs text-yellow-600 dark:text-yellow-400 px-2 py-1 bg-yellow-100 dark:bg-yellow-900 rounded">
                              No ID
                    </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Card>
              </div>
              );
            })}
          </div>

          {/* Pagination */}
          {filteredFeedback.length > 0 && (
            <Card className="p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredFeedback.length)} of {filteredFeedback.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">Items per page:</label>
                    <Select
                      value={String(itemsPerPage)}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      options={[
                        { value: "5", label: "5" },
                        { value: "10", label: "10" },
                        { value: "20", label: "20" },
                        { value: "50", label: "50" },
                        { value: "100", label: "100" },
                      ]}
                    />
                  </div>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
                      title="First page"
                    >
                      ««
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
                      title="Last page"
                    >
                      »»
                    </button>
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="p-12 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-medium mb-2">
              {searchQuery || statusFilter !== "all" ? "No Matching Feedback" : "No Feedback Yet"}
            </h3>
            <p>
              {searchQuery || statusFilter !== "all" 
                ? "Try adjusting your search or filters."
                : "All user feedback and bug reports will appear here."}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

