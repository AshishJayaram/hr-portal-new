"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Loader from "@/components/Loader";
import { 
  Upload, 
  FileText, 
  IndianRupee, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Plus,
  Trash2,
  Eye,
  User
} from "lucide-react";
import { getReimbursements, createReimbursement, updateReimbursementStatus, deleteReimbursement, ReimbursementRequest } from "@/lib/api";
import { toast } from "sonner";


export default function ReimbursementsPage() {
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [bills, setBills] = useState<File[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [viewingRequest, setViewingRequest] = useState<ReimbursementRequest | null>(null);
  const [editingRequest, setEditingRequest] = useState<ReimbursementRequest | null>(null);
  const [actionModal, setActionModal] = useState<{ type: 'approve' | 'reject' | 'return', request: ReimbursementRequest } | null>(null);
  const [actionMessage, setActionMessage] = useState('');

  const queryClient = useQueryClient();

  const { data: reimbursements, isLoading, error } = useQuery({
    queryKey: ["reimbursements", statusFilter],
    queryFn: () => getReimbursements(statusFilter || undefined),
    onError: (error) => {
      console.error("Reimbursements fetch error:", error);
      toast.error("Failed to load reimbursements");
    },
  });

  const createReimbursementMutation = useMutation({
    mutationFn: (data: { reason: string; amount: number; date: string; bills: File[] }) => 
      createReimbursement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reimbursements"] });
      setShowForm(false);
      resetForm();
      toast.success("Reimbursement request submitted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit reimbursement request");
    },
  });

  const statusUpdateMutation = useMutation({
    mutationFn: ({ id, status, message }: { id: string; status: 'approved' | 'rejected' | 'returned'; message?: string }) =>
      updateReimbursementStatus(id, status, message),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reimbursements"] });
      setActionModal(null);
      setActionMessage('');
      const statusText = variables.status === 'approved' ? 'approved' : variables.status === 'rejected' ? 'rejected' : 'returned for revision';
      toast.success(`Reimbursement request ${statusText} successfully!`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update reimbursement status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteReimbursement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reimbursements"] });
      toast.success("Reimbursement deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete reimbursement");
    },
  });

  const resetForm = () => {
    setReason('');
    setAmount('');
    setDate('');
    setBills([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setBills(prev => [...prev, ...files]);
  };

  const removeBill = (index: number) => {
    setBills(prev => prev.filter((_, i) => i !== index));
  };

  const handleViewRequest = (request: ReimbursementRequest) => {
    setViewingRequest(request);
  };

  const handleEditRequest = (request: ReimbursementRequest) => {
    setEditingRequest(request);
    setReason(request.reason);
    setAmount(request.amount.toString());
    setDate(request.date);
    setShowForm(true);
  };

  const handleCloseView = () => {
    setViewingRequest(null);
  };

  const handleCloseEdit = () => {
    setEditingRequest(null);
    resetForm();
    setShowForm(false);
  };

  const handleApprove = (request: ReimbursementRequest) => {
    setActionModal({ type: 'approve', request });
  };

  const handleReject = (request: ReimbursementRequest) => {
    setActionModal({ type: 'reject', request });
  };

  const handleReturn = (request: ReimbursementRequest) => {
    setActionModal({ type: 'return', request });
  };

  const handleConfirmAction = () => {
    if (!actionModal) return;
    
    if ((actionModal.type === 'reject' || actionModal.type === 'return') && !actionMessage.trim()) {
      toast.error(`Please provide a ${actionModal.type === 'reject' ? 'rejection reason' : 'reason for returning'}`);
      return;
    }

    // Defensive: derive a valid id string and block invalid/zero IDs
    const rawId = (actionModal.request as any)?.id ?? (actionModal.request as any)?.ID ?? (actionModal.request as any)?.Id;
    const idStr = String(rawId || '').trim();
    if (!idStr || idStr === '0' || idStr.toLowerCase() === 'undefined' || idStr.toLowerCase() === 'null') {
      toast.error('Invalid reimbursement ID. Please refresh and try again.');
      return;
    }

    statusUpdateMutation.mutate({
      id: idStr,
      status: actionModal.type === 'return' ? 'returned' : actionModal.type,
      message: actionMessage || undefined,
    });
  };

  const getCurrentUser = () => {
    if (typeof window === "undefined") return null;
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  };

  const isHRorAdmin = () => {
    const user = getCurrentUser();
    return user?.role === "HR" || user?.role === "Admin" || user?.role === "God";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !amount || !date || (bills.length === 0 && !editingRequest)) {
      alert("Please fill in all fields and upload at least one bill");
      return;
    }

    if (editingRequest) {
      // Handle edit - for now, we'll just show a message since we don't have an update API
      toast.info("Edit functionality will be available soon");
      handleCloseEdit();
    } else {
      // Handle create
      createReimbursementMutation.mutate({
        reason,
        amount: parseFloat(amount),
        date,
        bills
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'returned':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      default:
        return <Clock className="h-4 w-4 text-blue-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-400 bg-green-400/10';
      case 'rejected':
        return 'text-red-400 bg-red-400/10';
      case 'returned':
        return 'text-yellow-400 bg-yellow-400/10';
      default:
        return 'text-blue-400 bg-blue-400/10';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Count returned requests for notification badge
  const returnedCount = reimbursements?.data?.filter((r: ReimbursementRequest) => r.status === 'returned').length || 0;

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Reimbursements
          </h1>
          {returnedCount > 0 && !isHRorAdmin() && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-400">
                {returnedCount} {returnedCount === 1 ? 'request' : 'requests'} returned
              </span>
            </span>
          )}
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Disclaimer Popup */}
      {showDisclaimer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-400" />
              <h3 className="text-lg font-bold">Important Notice</h3>
            </div>
            <div className="space-y-3 text-sm text-gray-300">
              <p>Please note the following reimbursement guidelines:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Alcohol bills are not allowed for reimbursement</li>
                <li>Only business-related expenses are eligible</li>
                <li>All bills must be original receipts or invoices</li>
                <li>Expenses must be incurred during business activities</li>
              </ul>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setShowDisclaimer(false)}>
                I Understand
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Create Reimbursement Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {editingRequest ? 'Edit Reimbursement Request' : 'Create Reimbursement Request'}
              </h2>
              <button
                onClick={editingRequest ? handleCloseEdit : () => setShowForm(false)}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Reason for Payment *
                  </label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter reason for reimbursement"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount (₹) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date *
                  </label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Upload Bills *
                </label>
                <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-400 mb-2">
                    Drop files here or click to upload
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer text-indigo-400 hover:text-indigo-300"
                  >
                    Choose files
                  </label>
                </div>
              </div>

              {/* Uploaded Files */}
              {bills.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Uploaded Files:</h4>
                  <div className="space-y-2">
                    {bills.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-300">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeBill(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createReimbursementMutation.isPending}
                >
                  {editingRequest 
                    ? (createReimbursementMutation.isPending ? "Updating..." : "Update Request")
                    : (createReimbursementMutation.isPending ? "Creating..." : "Submit Request")
                  }
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Filter */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'returned', label: 'Returned' }
            ]}
          />
        </div>
      </Card>

      {/* Reimbursements List */}
      <div className="grid gap-4">
        {reimbursements?.data?.map((request: ReimbursementRequest) => {
          // Ensure bills array exists
          const bills = request.bills || [];
          return (
          <Card key={request.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-white">{request.reason}</h3>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status || 'pending')}`}>
                    {getStatusIcon(request.status || 'pending')}
                    <span className="ml-1 capitalize">{request.status || 'pending'}</span>
                  </span>
                </div>
                {request.user && (
                  <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
                    <User className="h-4 w-4" />
                    <span>Raised by: <span className="text-gray-300 font-medium">{request.user.name}</span></span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4" />
                    {formatCurrency(request.amount)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(request.date)}
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {bills.length} bill{bills.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewRequest(request)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                {(request.status || 'pending') === 'pending' && !isHRorAdmin() && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditRequest(request)}
                  >
                    Edit
                  </Button>
                )}
                {/* Delete visible to HR/Admin/God or uploader */}
                {(() => {
                  const user = getCurrentUser();
                  const canDelete = (user?.role === 'HR' || user?.role === 'Admin' || user?.role === 'God' || Number(user?.id) === Number(request.user_id));
                  return canDelete ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const idStr = String(request.id || '').trim();
                        if (!idStr || idStr === '0') {
                          toast.error('Invalid reimbursement ID');
                          return;
                        }
                        if (confirm('Delete this reimbursement request?')) {
                          deleteMutation.mutate(idStr);
                        }
                      }}
                      className="text-red-400 hover:text-red-300 border-red-500/30"
                    >
                      Delete
                    </Button>
                  ) : null;
                })()}
              </div>
            </div>
            
            {/* Rejection/Return Messages */}
            {request.status === 'rejected' && (request as any).rejection_reason && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-400">Rejected</p>
                    <p className="text-sm text-gray-300 mt-1">{(request as any).rejection_reason}</p>
                  </div>
                </div>
              </div>
            )}
            {request.status === 'returned' && (request as any).return_reason && (
              <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-400">Returned for Revision</p>
                    <p className="text-sm text-gray-300 mt-1">{(request as any).return_reason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons for HR/Admin */}
            {isHRorAdmin() && request.status === 'pending' && (
              <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleApprove(request)}
                  className="flex-1 bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-400"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleReturn(request)}
                  className="flex-1 bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30 text-yellow-400"
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Return
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleReject(request)}
                  className="flex-1 bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            )}
          </Card>
          );
        })}
      </div>

      {reimbursements?.data?.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-2">📄</div>
          <p className="text-gray-400">No reimbursement requests found</p>
          {error && (
            <p className="text-red-400 text-sm mt-2">Error: {error.message}</p>
          )}
        </Card>
      )}

      {/* Action Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold capitalize">{actionModal.type} Reimbursement</h2>
              <button
                onClick={() => {
                  setActionModal(null);
                  setActionMessage('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-2">Request: {actionModal.request.reason}</p>
                <p className="text-sm text-gray-400">Amount: {formatCurrency(actionModal.request.amount)}</p>
              </div>

              {actionModal.type !== 'approve' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {actionModal.type === 'reject' ? 'Rejection Reason *' : 'Reason for Return *'}
                  </label>
                  <textarea
                    value={actionMessage}
                    onChange={(e) => setActionMessage(e.target.value)}
                    placeholder={`Explain why you are ${actionModal.type === 'reject' ? 'rejecting' : 'returning'} this request...`}
                    className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 min-h-[100px]"
                    required
                  />
                </div>
              )}

              {actionModal.type === 'approve' && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-gray-300">
                    Are you sure you want to approve this reimbursement request?
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setActionModal(null);
                    setActionMessage('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmAction}
                  disabled={statusUpdateMutation.isPending}
                  className={`flex-1 ${
                    actionModal.type === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : actionModal.type === 'reject'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-yellow-600 hover:bg-yellow-700'
                  }`}
                >
                  {statusUpdateMutation.isPending ? 'Processing...' : `Confirm ${actionModal.type}`}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* View Reimbursement Modal */}
      {viewingRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Reimbursement Details</h2>
              <button
                onClick={handleCloseView}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Reason</label>
                  <p className="text-white">{viewingRequest.reason}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Amount</label>
                  <p className="text-white">{formatCurrency(viewingRequest.amount)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                  <p className="text-white">{formatDate(viewingRequest.date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(viewingRequest.status || 'pending')}`}>
                    {getStatusIcon(viewingRequest.status || 'pending')}
                    <span className="ml-1 capitalize">{viewingRequest.status || 'pending'}</span>
                  </span>
                </div>
              </div>

              {/* Rejection/Return Messages in View Modal */}
              {viewingRequest.status === 'rejected' && (viewingRequest as any).rejection_reason && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-400 mb-1">Rejection Reason</p>
                      <p className="text-sm text-gray-300">{(viewingRequest as any).rejection_reason}</p>
                    </div>
                  </div>
                </div>
              )}
              {viewingRequest.status === 'returned' && (viewingRequest as any).return_reason && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-400 mb-1">Reason for Return</p>
                      <p className="text-sm text-gray-300">{(viewingRequest as any).return_reason}</p>
                      <p className="text-xs text-gray-400 mt-2">Please revise your request and resubmit.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bills */}
              {viewingRequest.bills && viewingRequest.bills.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Attached Bills</label>
                  <div className="space-y-2">
                    {viewingRequest.bills.map((bill, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-300">{bill.file_name}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(bill.file_url, '_blank')}
                        >
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Created</label>
                  <p className="text-gray-400">{viewingRequest.created_at ? formatDate(viewingRequest.created_at) : 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Request ID</label>
                  <p className="text-gray-400">{viewingRequest.id}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleCloseView}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
