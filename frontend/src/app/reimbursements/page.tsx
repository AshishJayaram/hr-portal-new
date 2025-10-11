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
  DollarSign, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Plus,
  Trash2,
  Eye
} from "lucide-react";
import { getReimbursements, createReimbursement, updateReimbursementStatus, ReimbursementRequest } from "@/lib/api";
import { toast } from "sonner";


export default function ReimbursementsPage() {
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [bills, setBills] = useState<File[]>([]);
  const [statusFilter, setStatusFilter] = useState('');

  const queryClient = useQueryClient();

  const { data: reimbursements, isLoading } = useQuery({
    queryKey: ["reimbursements", statusFilter],
    queryFn: () => getReimbursements(statusFilter || undefined),
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !amount || !date || bills.length === 0) {
      alert("Please fill in all fields and upload at least one bill");
      return;
    }

    createReimbursementMutation.mutate({
      reason,
      amount: parseFloat(amount),
      date,
      bills
    });
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Reimbursements
        </h1>
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
              <h2 className="text-xl font-bold">Create Reimbursement Request</h2>
              <button
                onClick={() => setShowForm(false)}
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
                    Amount *
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
                  {createReimbursementMutation.isPending ? "Creating..." : "Submit Request"}
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
        {reimbursements?.data?.map((request: ReimbursementRequest) => (
          <Card key={request.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-white">{request.reason}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                    {getStatusIcon(request.status)}
                    <span className="ml-1 capitalize">{request.status}</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {formatCurrency(request.amount)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(request.date)}
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {request.bills.length} bill{request.bills.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                {request.status === 'pending' && (
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {reimbursements?.data?.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-2">📄</div>
          <p className="text-gray-400">No reimbursement requests found</p>
        </Card>
      )}
    </div>
  );
}
