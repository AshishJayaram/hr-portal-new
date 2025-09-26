"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUser, updateUser, getUsers, toCanonicalRole, getCompanySettings, getLeaveCategories, getLeaveAllocations, updateLeaveAllocation, createLeaveAllocation } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Loader from "@/components/ui/Loader";
import { computePayslipFromCTC } from "@/lib/payroll";
import { toast } from "sonner";
import { LeaveCategory, LeaveAllocation } from "@/lib/api";

export default function EditEmployeePage() {
  // Read id from search params (?id=123)
  const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const id = search?.get('id') || '';
  return <EditEmployeeForm id={id} />;
}

function EditEmployeeForm({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    username: "",
    designation: "",
    role: "Employee" as "Employee" | "Manager" | "HR" | "Admin",
    department: "",
    manager_id: "",
    ctc: "",
  });
  const [managerQuery, setManagerQuery] = useState("");
  const [selectedManagerName, setSelectedManagerName] = useState("");
  const [leaveAllocations, setLeaveAllocations] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'details' | 'leaves' | 'ctc'>('details');
  const [ctcData, setCtcData] = useState({
    annualCTC: 0,
    lopDays: 0,
    tdsOverride: 0,
  });

  const { data: user, isLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: () => getUser(id),
  });

  const { data: managers } = useQuery({
    queryKey: ["users", managerQuery],
    queryFn: () => getUsers(managerQuery ? { q: managerQuery } : {}),
  });

  const companyId = typeof window !== 'undefined' ? (localStorage.getItem('companyId') || 'demo-company') : 'demo-company';
  const { data: companySettings } = useQuery({
    queryKey: ["company-settings", companyId],
    queryFn: () => getCompanySettings(companyId),
  });

  const { data: leaveCategories } = useQuery({
    queryKey: ["leave-categories"],
    queryFn: () => getLeaveCategories(),
  });

  const { data: currentAllocations } = useQuery({
    queryKey: ["leave-allocations", id],
    queryFn: () => getLeaveAllocations(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (user?.data) {
      setFormData({
        username: user.data.name || user.data.email || "",
        designation: user.data.designation || "",
        role: user.data.role,
        department: user.data.department || "",
        manager_id: (user.data as any).managerId || (user.data as any).manager_id || "",
        ctc: user.data.ctc ? String(user.data.ctc) : "",
      });
      
      // Initialize CTC data
      if (user.data.ctc) {
        setCtcData({
          annualCTC: user.data.ctc,
          lopDays: 0,
          tdsOverride: 0,
        });
      }
    }
  }, [user]);

  // Initialize leave allocations from current data
  useEffect(() => {
    if (currentAllocations?.data && leaveCategories?.data) {
      const allocations: Record<string, number> = {};
      currentAllocations.data.forEach((allocation: LeaveAllocation) => {
        allocations[allocation.categoryId] = allocation.totalDays;
      });
      setLeaveAllocations(allocations);
    }
  }, [currentAllocations, leaveCategories]);

  const mutation = useMutation({
    mutationFn: (body: any) => updateUser(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Employee updated successfully");
      router.push("/employees");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update employee");
    },
  });

  const leaveAllocationMutation = useMutation({
    mutationFn: async () => {
      if (!currentAllocations?.data || !leaveCategories?.data) return;
      
      const currentYear = new Date().getFullYear();
      const promises: Promise<any>[] = [];
      
      // Update existing allocations or create new ones
      Object.entries(leaveAllocations).forEach(([categoryId, days]) => {
        const existingAllocation = currentAllocations.data.find(
          (a: LeaveAllocation) => a.categoryId === categoryId && a.year === currentYear
        );
        
        if (existingAllocation) {
          // Update existing allocation
          promises.push(updateLeaveAllocation(id, existingAllocation.id, {
            totalDays: Number(days),
            remainingDays: Number(days) - existingAllocation.usedDays,
          }));
        } else {
          // Create new allocation
          const category = leaveCategories.data.find((c: LeaveCategory) => c.id === categoryId);
          if (category && Number(days) > 0) {
            promises.push(createLeaveAllocation(id, {
              categoryId,
              categoryName: category.name,
              totalDays: Number(days),
              usedDays: 0,
              remainingDays: Number(days),
              year: currentYear,
            }));
          }
        }
      });
      
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-allocations", id] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance", id] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
      toast.success("Leave allocations updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update leave allocations");
    },
  });

  const ctcMutation = useMutation({
    mutationFn: (ctcValue: number) => updateUser(id, { ctc: ctcValue }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["salary-slips"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("CTC updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update CTC");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent self-assignment as manager
    if (formData.manager_id && String(formData.manager_id) === String(id)) {
      toast.error("An employee cannot be assigned as their own manager");
      return;
    }
    
    mutation.mutate({
      username: formData.username,
      designation: formData.designation,
      role: toCanonicalRole(formData.role),
      department: formData.department,
      manager_id: formData.manager_id ? String(formData.manager_id) : undefined, // Convert to string to match backend
    } as any);
  };

  if (isLoading) return <Loader />;

  if (!user?.data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Employee not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Employee</h1>
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          Back
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-white/5 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'details'
              ? 'bg-white/10 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Employee Details
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'leaves'
              ? 'bg-white/10 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Leave Allocations
        </button>
        <button
          onClick={() => setActiveTab('ctc')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'ctc'
              ? 'bg-white/10 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          CTC Management
        </button>
      </div>

      {activeTab === 'details' && (
        <>
          <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Input
                  label="Username (name or email)"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
                <Input
                  label="Designation"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="e.g., Software Engineer, Manager"
                />
                <Select
                  label="Role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  options={[
                    { value: "Employee", label: "Employee" },
                    { value: "Manager", label: "Manager" },
                    { value: "HR", label: "HR" },
                  ]}
                />
            <Input
              label="Department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
                <div>
                  <label className="block text-sm mb-2">Manager (search and select)</label>
                  <Input value={managerQuery} onChange={(e) => setManagerQuery(e.target.value)} placeholder="Search by name or ID..." />
                  {formData.manager_id && String(formData.manager_id) === String(id) && (
                    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                      ⚠️ An employee cannot be assigned as their own manager
                    </div>
                  )}
                  <div className="mt-2 max-h-48 overflow-y-auto border border-white/10 rounded">
                    {(managers?.data || [])
                      .filter((u: any) => String(u.id) !== String(id)) // Exclude current employee
                      .map((u: any) => (
                      <button
                        type="button"
                        key={u.id}
                        className={`w-full text-left px-3 py-2 hover:bg-white/10 ${String(formData.manager_id) === String(u.id) ? 'bg-white/5' : ''}`}
                        onClick={() => { setFormData({ ...formData, manager_id: String(u.id) }); setManagerQuery(`${u.name} (ID: ${u.id})`); setSelectedManagerName(u.name); }}
                      >
                        {u.name} <span className="text-xs text-gray-400">(ID: {u.id})</span>
                      </button>
                    ))}
                    {(!managers?.data || managers.data.filter((u: any) => String(u.id) !== String(id)).length === 0) && (
                      <div className="px-3 py-2 text-sm text-gray-400">No other users available</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  loading={mutation.isPending}
                  disabled={formData.manager_id && String(formData.manager_id) === String(id)}
                >
                  Update Employee
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </>
      )}

      {activeTab === 'leaves' && (
        <LeaveAllocationManager
          categories={leaveCategories?.data || []}
          allocations={leaveAllocations}
          currentAllocations={currentAllocations?.data || []}
          onAllocationChange={setLeaveAllocations}
          onSave={leaveAllocationMutation.mutate}
          isLoading={leaveAllocationMutation.isPending}
        />
      )}

      {activeTab === 'ctc' && (
        <CTCManager
          ctcData={ctcData}
          onCtcDataChange={setCtcData}
          onSave={ctcMutation.mutate}
          isLoading={ctcMutation.isPending}
          companySettings={companySettings?.data}
        />
      )}
    </div>
  );
}

function LeaveAllocationManager({
  categories,
  allocations,
  currentAllocations,
  onAllocationChange,
  onSave,
  isLoading,
}: {
  categories: LeaveCategory[];
  allocations: Record<string, number>;
  currentAllocations: LeaveAllocation[];
  onAllocationChange: (allocations: Record<string, number>) => void;
  onSave: () => void;
  isLoading: boolean;
}) {
  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4">Leave Allocations</h3>
      <div className="space-y-4">
        {categories.filter(category => category.isActive).map((category) => {
          const currentAllocation = currentAllocations.find(
            (a: LeaveAllocation) => a.categoryId === category.id
          );
          const usedDays = currentAllocation?.usedDays || 0;
          const totalDays = allocations[category.id] || category.defaultDays;
          
          return (
            <div key={category.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-primary">{category.name}</h4>
                  <p className="text-sm text-secondary">{category.description}</p>
                </div>
                <div className="text-right text-sm">
                  <div className="text-muted">Used: {usedDays} days</div>
                  <div className="text-muted">Remaining: {totalDays - usedDays} days</div>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Total Days Allocated
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={String(totalDays)}
                    onChange={(e) => onAllocationChange({
                      ...allocations,
                      [category.id]: Number(e.target.value) || 0
                    })}
                    placeholder={String(category.defaultDays)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Default Days (from category)
                  </label>
                  <Input
                    type="number"
                    value={String(category.defaultDays)}
                    disabled
                    className="bg-gray-100 dark:bg-gray-800"
                  />
                </div>
              </div>
              
              {usedDays > 0 && (
                <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-400">
                    ⚠️ This employee has already used {usedDays} days. 
                    Reducing total allocation may affect their remaining balance.
                  </p>
                </div>
              )}
            </div>
          );
        })}
        
        {categories.filter(category => category.isActive).length === 0 && (
          <div className="text-center py-8 text-secondary">
            No active leave categories configured.
          </div>
        )}
      </div>
      
      <div className="mt-6 flex gap-3">
        <Button onClick={onSave} loading={isLoading}>
          Save Leave Allocations
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reset Changes
        </Button>
      </div>
    </Card>
  );
}

function CTCManager({
  ctcData,
  onCtcDataChange,
  onSave,
  isLoading,
  companySettings,
}: {
  ctcData: { annualCTC: number; lopDays: number; tdsOverride: number };
  onCtcDataChange: (data: { annualCTC: number; lopDays: number; tdsOverride: number }) => void;
  onSave: (ctcValue: number) => void;
  isLoading: boolean;
  companySettings: any;
}) {
  const handleSave = () => {
    onSave(ctcData.annualCTC);
  };

  const breakdown = companySettings ? computePayslipFromCTC(ctcData.annualCTC, companySettings, { 
    lopDays: ctcData.lopDays, 
    tdsOverride: ctcData.tdsOverride 
  }) : null;

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4">CTC Management</h3>
      
      <div className="space-y-6">
        {/* CTC Input Section */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Annual CTC (₹)
            </label>
            <Input
              type="number"
              min="0"
              value={String(ctcData.annualCTC)}
              onChange={(e) => onCtcDataChange({
                ...ctcData,
                annualCTC: Number(e.target.value) || 0
              })}
              placeholder="Enter annual CTC"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              LOP Days
            </label>
            <Input
              type="number"
              min="0"
              max="31"
              value={String(ctcData.lopDays)}
              onChange={(e) => onCtcDataChange({
                ...ctcData,
                lopDays: Number(e.target.value) || 0
              })}
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              TDS Override (₹)
            </label>
            <Input
              type="number"
              min="0"
              value={String(ctcData.tdsOverride)}
              onChange={(e) => onCtcDataChange({
                ...ctcData,
                tdsOverride: Number(e.target.value) || 0
              })}
              placeholder="0"
            />
          </div>
        </div>

        {/* CTC Breakdown Preview */}
        {breakdown && (
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <h4 className="font-semibold text-primary mb-4">CTC Breakdown Preview</h4>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="text-sm text-secondary">
                  Annual CTC: ₹{ctcData.annualCTC.toLocaleString('en-IN')}
                </div>
                <div className="text-sm text-secondary">
                  Monthly CTC: ₹{breakdown.monthlyCTC.toLocaleString('en-IN')}
                </div>
                {ctcData.lopDays > 0 && (
                  <div className="text-sm text-yellow-400">
                    LOP Days: {ctcData.lopDays}
                  </div>
                )}
                {ctcData.tdsOverride > 0 && (
                  <div className="text-sm text-blue-400">
                    TDS Override: ₹{ctcData.tdsOverride.toLocaleString('en-IN')}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-primary">Earnings</div>
                {Object.entries(breakdown.earnings).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="capitalize">{k}</span>
                    <span>₹{v.toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm border-t border-card pt-2">
                  <span>Total</span>
                  <span>₹{breakdown.totals.totalEarnings.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-primary">Deductions</div>
                <div className="flex justify-between text-sm">
                  <span>Employee PF</span>
                  <span>₹{breakdown.deductions.empPF.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Professional Tax</span>
                  <span>₹{breakdown.deductions.professionalTax.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>ESI</span>
                  <span>₹{breakdown.deductions.esi.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-semibold text-primary border-t border-card pt-2">
                  <span>Net Pay</span>
                  <span className="text-green-600 dark:text-green-400">₹{breakdown.totals.netPay.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button onClick={handleSave} loading={isLoading} disabled={ctcData.annualCTC <= 0}>
            Save CTC
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reset Changes
          </Button>
        </div>
      </div>
    </Card>
  );
}
