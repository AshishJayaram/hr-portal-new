"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getLeaves,
  getLeaveBalance,
  updateLeave,
  applyLeave,
  approveLeave,
  rejectLeave,
  getCurrentUser,
  canApproveLeaves,
} from "@/lib/api";
import RoleGuard from "@/components/RoleGuard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Loader from "@/components/ui/Loader";
import SearchFilter from "@/components/ui/SearchFilter";
import { toast } from "sonner";
import { Search, Plus, Calendar, CheckCircle, XCircle, Clock, User } from "lucide-react";
import { formatDate, capitalize } from "@/lib/utils";
import ApplyLeaveForm from "@/components/ApplyLeaveForm";
import LeaveBalanceCard from "@/components/LeaveBalanceCard";
import { motion } from "framer-motion";

export default function LeavesPage() {
  const user = getCurrentUser();
  const userId = user?.id || "u1";
  const [leaves, setLeaves] = useState<any[]>([]);
  const [filteredLeaves, setFilteredLeaves] = useState<any[]>([]);
  const queryClient = useQueryClient();

  // Fetch leave requests - different scope based on role
  const { data, isLoading } = useQuery({
    queryKey: ["leaves"],
    queryFn: () => getLeaves(canApproveLeaves() ? {} : { userId: userId }),
  });

  // Fetch leave balance
  const { data: balance, isLoading: loadingBalance } = useQuery({
    queryKey: ["leave-balance", userId],
    queryFn: () => getLeaveBalance(userId),
  });

  useEffect(() => {
    if (data?.data) {
      setLeaves(data.data);
      setFilteredLeaves(data.data);
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
    mutationFn: approveLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Leave approved successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to approve leave");
    },
  });

  // Reject leave mutation
  const rejectLeaveMutation = useMutation({
    mutationFn: ({ leaveId, reason }: { leaveId: string; reason?: string }) =>
      rejectLeave(leaveId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Leave rejected successfully");
    },
    onError: (err: any) => {
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
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading || loadingBalance) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">
            Leave Management
          </h1>
          <p className="text-secondary mt-1">
            {canApproveLeaves() ? "Review and manage leave requests" : "Apply for and track your leaves"}
          </p>
        </div>
      </div>

      {/* Leave Balance */}
      <LeaveBalanceCard balance={balance?.data || []} />

      {/* Apply Leave Form - Employees only */}
      <RoleGuard allowedRoles={["Employee", "Manager", "HR"]}>
        <Card title="Apply for Leave">
          <ApplyLeaveForm />
        </Card>
      </RoleGuard>

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
      <Card title={canApproveLeaves() ? "All Leave Requests" : "My Leave Requests"}>
        <div className="space-y-4">
          {filteredLeaves.map((leave, idx) => (
            <motion.div
              key={leave.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="p-4 border rounded-lg transition-colors border-card bg-white/60 hover:bg-white/80 dark:border-white/10 dark:bg-transparent dark:hover:bg-white/5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-primary">{leave.type}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                        {capitalize(leave.status)}
                      </span>
                    </div>
                    
                    {canApproveLeaves() && (
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-400">
                          {leave.user?.name || "Unknown Employee"}
                        </span>
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
                      {/* Employee can cancel their own leave */}
                      {leave.userId === userId && (
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
                      )}
                      {/* Managers/HR can approve/reject */}
                      <RoleGuard allowedRoles={["Manager", "HR", "Admin"]}>
                        <Button
                          size="sm"
                          onClick={() => approveLeaveMutation.mutate(leave.id)}
                          loading={approveLeaveMutation.isPending}
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
                          loading={rejectLeaveMutation.isPending}
                        >
                          Reject
                        </Button>
                      </RoleGuard>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {filteredLeaves.length === 0 && (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No leave requests found</h3>
            <p className="text-gray-400">
              {leaves.length === 0 ? "No leave requests yet." : "Try adjusting your search or filters."}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
