"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getLeaves,
  getLeavesPaginated,
  getLeaveBalance,
  getTeamLeaveBalances,
  updateLeave,
  applyLeave,
  approveLeave,
  rejectLeave,
  getCurrentUser,
  canApproveLeaves,
} from "@/lib/api";
import { useFilteredUsers } from "@/hooks/useUsersCache";
import RoleGuard from "@/components/RoleGuard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Loader from "@/components/ui/Loader";
import SearchFilter from "@/components/ui/SearchFilter";
import { toast } from "sonner";
import { Search, Plus, Calendar, CheckCircle, XCircle, Clock, User, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate, capitalize } from "@/lib/utils";
import ApplyLeaveForm from "@/components/ApplyLeaveForm";
import EditLeaveForm from "@/components/EditLeaveForm";
import LeaveBalanceCard from "@/components/LeaveBalanceCard";
import Tabs from "@/components/ui/Tabs";
import { motion } from "framer-motion";

export default function LeavesPage() {
  const user = getCurrentUser();
  const userId = user?.id || "u1";
  const [leaves, setLeaves] = useState<any[]>([]);
  const [filteredLeaves, setFilteredLeaves] = useState<any[]>([]);
  const [editingLeave, setEditingLeave] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'my-leaves' | 'team-leaves' | 'team-balances'>('my-leaves');
  const [loadingLeaves, setLoadingLeaves] = useState<Set<string>>(new Set());
  const [approvingLeaves, setApprovingLeaves] = useState<Set<string>>(new Set());
  const [rejectingLeaves, setRejectingLeaves] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [showApplyOnBehalfForm, setShowApplyOnBehalfForm] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState<string | null>(null);
  const [teamBalancesPage, setTeamBalancesPage] = useState(1);
  const [teamBalancesPerPage] = useState(6);
  const queryClient = useQueryClient();

  // Get user role from existing user object
  const userRole = user?.role || "Employee";
  
  // Check if user can approve leaves (HR, Admin, God)
  const canApprove = canApproveLeaves();
  
  // Check if user can view team leave balances (HR, Admin, God, or Employee with reports)
  const canViewTeamBalances = canApprove || userRole === "Employee";
  

  // Fetch leave requests - different scope based on active tab
  const { data, isLoading } = useQuery({
    queryKey: ["leaves", activeTab, userId, currentPage, perPage],
    queryFn: () => {
      const params: Record<string, string> = {
        page: currentPage.toString(),
        per_page: perPage.toString(),
        paginated: "true",
      };
      
      if (activeTab === 'team-leaves' && canViewTeamBalances) {
        params.view = 'team';
        return getLeavesPaginated(params);
      } else {
        params.userId = userId;
        return getLeavesPaginated(params);
      }
    },
    enabled: true, // Always enable the query
    refetchOnWindowFocus: false, // Reduce unnecessary refetches
    staleTime: 30000, // Cache for 30 seconds
  });

  // Fetch leave balance
  const { data: balance, isLoading: loadingBalance } = useQuery({
    queryKey: ["leave-balance", userId],
    queryFn: () => getLeaveBalance(userId),
  });

  // Fetch team leave balances (for managers and HR) - only when on team-leaves tab
  const { data: teamBalances, isLoading: loadingTeamBalances, error: teamBalancesError } = useQuery({
    queryKey: ["team-leave-balances", userId],
    queryFn: () => getTeamLeaveBalances(),
    enabled: canViewTeamBalances && (activeTab === 'team-leaves' || activeTab === 'team-balances'), // Fetch for both team tabs
    staleTime: 60000, // Cache for 1 minute
  });

  // Use global users cache for displaying names in team leave balances
  const { users: usersData } = useFilteredUsers();

  useEffect(() => {
    if (data?.data) {
      setLeaves(data.data);
      setFilteredLeaves(data.data);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
    }
  }, [data]);

  // Cancel leave mutation
  const cancelLeave = useMutation({
    mutationFn: async (leaveId: string) =>
      updateLeave(leaveId, { status: "cancelled" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Leave cancelled successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to cancel leave");
    },
  });

  // Approve leave mutation
  const approveLeaveMutation = useMutation({
    mutationFn: async (leaveId: string) => {
      setApprovingLeaves(prev => new Set(prev).add(leaveId));
      return approveLeave(leaveId);
    },
    onSuccess: (_, leaveId) => {
      setApprovingLeaves(prev => {
        const newSet = new Set(prev);
        newSet.delete(leaveId);
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Leave approved successfully");
    },
    onError: (err: any, leaveId) => {
      setApprovingLeaves(prev => {
        const newSet = new Set(prev);
        newSet.delete(leaveId);
        return newSet;
      });
      toast.error(err.message || "Failed to approve leave");
    },
  });

  // Reject leave mutation
  const rejectLeaveMutation = useMutation({
    mutationFn: async ({ leaveId, reason }: { leaveId: string; reason?: string }) => {
      setRejectingLeaves(prev => new Set(prev).add(leaveId));
      return rejectLeave(leaveId, reason);
    },
    onSuccess: (_, { leaveId }) => {
      setRejectingLeaves(prev => {
        const newSet = new Set(prev);
        newSet.delete(leaveId);
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Leave rejected successfully");
    },
    onError: (err: any, { leaveId }) => {
      setRejectingLeaves(prev => {
        const newSet = new Set(prev);
        newSet.delete(leaveId);
        return newSet;
      });
      toast.error(err.message || "Failed to reject leave");
    },
  });

  const handleSearch = (query: string) => {
    const filtered = leaves.filter(leave =>
      leave.type.toLowerCase().includes(query.toLowerCase()) ||
      leave.reason?.toLowerCase().includes(query.toLowerCase()) ||
      leave.user?.name?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredLeaves(filtered);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilter = (filters: Record<string, string>) => {
    let filtered = leaves;
    
    if (filters.status) {
      filtered = filtered.filter(leave => leave.status === filters.status);
    }
    
    if (filters.type) {
      filtered = filtered.filter(leave => leave.type === filters.type);
    }
    
    setFilteredLeaves(filtered);
  };

  const leaveTypes = useMemo(() => {
    const types = [...new Set(leaves.map(leave => leave.type).filter(Boolean))];
    return types.map(type => ({ value: type!, label: capitalize(type!) }));
  }, [leaves]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-500';
      case 'rejected':
        return 'bg-rose-500';
      case 'pending':
        return 'bg-amber-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Helper function to get user name by ID
  const getUserName = (userId: string) => {
    const users = usersData || [];
    const user = users.find((u: any) => String(u.id) === String(userId));
    return user ? `${user.name} (${user.designation || 'Employee'})` : `Employee ID: ${userId}`;
  };

  // Handle team member selection for details panel
  const handleTeamMemberSelect = (userId: string) => {
    setSelectedTeamMember(selectedTeamMember === userId ? null : userId);
  };

  if (isLoading || loadingBalance) return <Loader />;

  return (
    <div className="space-y-6">
      {/* Tab Navigation for Managers */}
      {canViewTeamBalances && (
        <Card>
          <Tabs
            tabs={[
              { id: 'my-leaves', label: 'My Leaves' },
              { id: 'team-leaves', label: 'Team Leave Requests' },
              { id: 'team-balances', label: 'Team Balances' }
            ]}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as 'my-leaves' | 'team-leaves' | 'team-balances')}
          />
        </Card>
      )}

      {/* My Leaves Tab Content */}
      {(!canViewTeamBalances || activeTab === 'my-leaves') && (
        <>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">Leave Management</h1>
              <p className="text-secondary mt-1">
                {canApprove ? "Review and manage leave requests" : "Apply for and track your leaves"}
              </p>
            </div>
          </div>

          {/* Leave Balance */}
          <LeaveBalanceCard balance={balance?.data || []} />


          {/* Apply Leave Form - Employees only */}
          <RoleGuard allowedRoles={["Employee", "HR"]}>
            <Card>
              <div className="border-b border-gray-700">
                <button
                  onClick={() => setShowApplyForm(!showApplyForm)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Plus className="h-5 w-5 text-indigo-400" />
                    <h3 className="text-lg font-semibold text-white">Apply for Leave</h3>
                  </div>
                  {showApplyForm ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {showApplyForm && (
                <div className="p-4">
                  <ApplyLeaveForm showApplyForField={false} />
                </div>
              )}
            </Card>
          </RoleGuard>

          {/* Apply Leave on Behalf Modal */}
          {showApplyOnBehalfForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Apply Leave on Behalf of Employee</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowApplyOnBehalfForm(false)}
                    className="h-10 w-10 p-0 text-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    ×
                  </Button>
                </div>
                <ApplyLeaveForm showApplyForField={true} />
              </Card>
            </div>
          )}

          {/* Search and Filters */}
          <SearchFilter
            onSearch={handleSearch}
            onFilter={handleFilter}
            searchPlaceholder="Search leaves by type, reason, or employee..."
            filters={[
              {
                key: "status",
                label: "Status",
                options: [
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                ],
              },
              {
                key: "type",
                label: "Leave Type",
                options: leaveTypes,
              },
            ]}
          />

          {/* Leaves List */}
          <div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {activeTab === 'team-leaves' ? "Team Leave Requests" : "My Leave Requests"}
              </h2>
              {activeTab === 'team-leaves' && canApprove && (
                <Button
                  size="sm"
                  onClick={() => setShowApplyOnBehalfForm(true)}
                  className="flex items-center gap-2 self-start md:self-auto"
                >
                  <Plus className="h-4 w-4" />
                  Apply on Behalf
                </Button>
              )}
            </div>
            <Card>
              <div className="space-y-4">
                {filteredLeaves.map((leave, idx) => (
                  <motion.div
                    key={leave.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="p-4 border rounded-lg transition-all duration-200 border-card bg-card hover:bg-white/70 dark:hover:bg-white/5 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-400/50 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-primary">{leave.type}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(leave.status)}`}>
                              {capitalize(leave.status)}
                            </span>
                          </div>
                          
                          {activeTab === 'team-leaves' && leave.user && (
                            <div className="flex items-center gap-2 mb-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-400">
                                {leave.user.name || "Unknown Employee"}
                              </span>
                              {leave.user.designation && (
                                <span className="text-xs text-gray-500">
                                  ({leave.user.designation})
                                </span>
                              )}
                            </div>
                          )}
                          
                          <div className="text-sm text-secondary mb-2">
                            {formatDate(leave.from)} → {formatDate(leave.to)}
                          </div>
                          
                          {leave.reason && (
                            <p className="text-sm text-secondary">{leave.reason}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {leave.status === "pending" && (
                          <>
                            {/* Employee can edit/cancel their own leave */}
                            {leave.userId === userId && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingLeave(leave)}
                                  className="flex items-center gap-1"
                                >
                                  <Edit className="h-3 w-3" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to cancel this leave?")) {
                                      cancelLeave.mutate(leave.id);
                                    }
                                  }}
                                  loading={cancelLeave.isPending}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                            {/* HR/Admin can approve/reject team leaves */}
                            {activeTab === 'team-leaves' && canApprove && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => approveLeaveMutation.mutate(leave.id)}
                                  loading={approvingLeaves.has(leave.id)}
                                  disabled={approvingLeaves.has(leave.id) || rejectingLeaves.has(leave.id)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    const reason = prompt("Reason for rejection:");
                                    if (reason !== null) {
                                      rejectLeaveMutation.mutate({ leaveId: leave.id, reason });
                                    }
                                  }}
                                  loading={rejectingLeaves.has(leave.id)}
                                  disabled={approvingLeaves.has(leave.id) || rejectingLeaves.has(leave.id)}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
        
              {filteredLeaves.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-500 dark:text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">No leave requests found</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {leaves.length === 0 ? "No leave requests yet." : "Try adjusting your search or filters."}
                  </p>
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-700">
                  <div className="text-sm text-gray-400">
                    Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, total)} of {total} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    
                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {/* Team Leaves Tab Content */}
      {canViewTeamBalances && activeTab === 'team-leaves' && (
        <>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">Team Leaves</h1>
              <p className="text-secondary mt-1">Manage your team's leave requests and view leave balances</p>
            </div>
          </div>

          {/* Team Leave Requests List - NEW */}
          <Card>
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Team Leave Requests
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Review and manage leave requests from your team members
              </p>
            </div>

            <div className="space-y-4">
              {filteredLeaves.map((leave, idx) => (
                <motion.div
                  key={leave.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="p-4 border rounded-lg transition-all duration-200 border-card bg-card hover:bg-white/70 dark:hover:bg-white/5 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-400/50 shadow-sm"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                          <h3 className="font-semibold text-primary">{leave.type}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white self-start ${getStatusColor(leave.status)}`}>
                            {capitalize(leave.status)}
                          </span>
                        </div>

                        {leave.user && (
                          <div className="flex items-center gap-2 mb-2">
                              <User className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                              {leave.user.name || "Unknown Employee"}
                            </span>
                            {leave.user.designation && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({leave.user.designation})
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{formatDate(leave.from)} - {formatDate(leave.to)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {canApprove && leave.status === "pending" && (
                      <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                        <Button
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => approveLeaveMutation.mutate(leave.id)}
                          loading={approvingLeaves.has(leave.id)}
                          disabled={approvingLeaves.has(leave.id) || rejectingLeaves.has(leave.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => {
                            const reason = prompt("Reason for rejection:");
                            if (reason !== null) {
                              rejectLeaveMutation.mutate({ leaveId: leave.id, reason });
                            }
                          }}
                          loading={rejectingLeaves.has(leave.id)}
                          disabled={approvingLeaves.has(leave.id) || rejectingLeaves.has(leave.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
            
            {filteredLeaves.length === 0 && (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-500 dark:text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-200 mb-2">No leave requests found</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  No leave requests from your team members yet.
                </p>
              </div>
            )}

            {/* Pagination Controls for Team Leaves */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, total)} of {total} requests
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>

        </>
      )}

      {/* Team Balances Tab Content */}
      {canViewTeamBalances && activeTab === 'team-balances' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-primary dark:text-white">
              Team Leave Balances
            </h2>
            <p className="text-secondary dark:text-gray-300 mt-1">
              Overview of leave balances for your team members
            </p>
          </div>

          {loadingTeamBalances ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 dark:bg-gray-700 h-4 w-32 rounded mb-3"></div>
                  <div className="bg-gray-200 dark:bg-gray-700 h-8 w-24 rounded mb-2"></div>
                  <div className="bg-gray-200 dark:bg-gray-700 h-3 w-40 rounded"></div>
                </div>
              ))}
            </div>
          ) : teamBalancesError ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Error loading team balances
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    {teamBalancesError.message || 'Unable to fetch team leave balance information.'}
                  </div>
                </div>
              </div>
            </div>
          ) : teamBalances?.data && Object.keys(teamBalances.data).length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(teamBalances.data).map(([userId, balances], idx) => {
                const user = usersData?.find(u => u.id === userId);
                const userName = user?.name || 'Unknown User';

                return (
                  <motion.div
                    key={userId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-card border border-card rounded-lg p-4 hover:bg-white/70 dark:hover:bg-white/5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-primary dark:text-white">{userName}</h3>
                        <p className="text-sm text-secondary dark:text-gray-300">{user?.role || 'Employee'}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {(balances as any[]).map((balance, balanceIdx) => {
                        const type = balance.category_name || balance.type || 'Leave';
                        const remaining = balance.remaining_days || balance.remaining || 0;
                        const used = balance.used_days || balance.used || 0;
                        const total = balance.total_days || balance.total || 0;

                        return (
                          <div key={balanceIdx} className="flex justify-between items-center py-1">
                            <span className="text-sm font-medium text-primary dark:text-white capitalize">
                              {type}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold ${
                                remaining > 0
                                  ? 'text-indigo-600 dark:text-indigo-400'
                                  : 'text-red-500 dark:text-red-400'
                              }`}>
                                {remaining}/{total}
                              </span>
                              <span className="text-xs text-secondary dark:text-gray-300">
                                ({used} used)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No team data</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Unable to load team leave balance information.
              </p>
            </div>
          )}
        </div>
      )}


      {/* Edit Leave Modal */}
      {editingLeave && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <EditLeaveForm
              leave={editingLeave}
              onClose={() => setEditingLeave(null)}
              onSuccess={() => {
                setEditingLeave(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
